// functions/src/weeklyQuiz.ts

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { admin, db } from "./firebaseAdmin";
import { VertexAI, SchemaType } from "@google-cloud/vertexai"; // npm install @google-cloud/vertexai

// ─────────────────────────────────────────────────────────────
// 1. 설정 및 인터페이스
// ─────────────────────────────────────────────────────────────

interface QuizQuestion {
    id: string;
    question: string;
    options: string[]; // [opt1, opt2, opt3, opt4]
    correctIndex: number;
    explanation: string;
    sourcePostId?: string;
    verified: boolean;
}

interface WeeklyQuiz {
    weekId: string;
    subCategory: string;
    startDate: admin.firestore.Timestamp;
    endDate: admin.firestore.Timestamp;
    questions: QuizQuestion[];
    rewards: {
        perfect: number;
        partial: number;
    };
}

const PROJECT_ID = process.env.GCLOUD_PROJECT || process.env.VERTEX_PROJECT_ID; // Firebase 배포 시 GCLOUD_PROJECT 자동 설정됨
const LOCATION = "us-central1"; // Gemini 2.0은 us-central1에서만 사용 가능
const MODEL_ID = "gemini-2.5-flash"; // Gemini 2.5 Flash 모델 사용

const QUIZ_COLLECTION = "weekly_quizzes";
const QUESTIONS_PER_CATEGORY = 5; // 한 주차, 한 카테고리당 문제 수 (적절히 조절)
const REWARDS = {
    perfect: 5,
    partial: 1,
};

// Vertex AI 클라이언트 초기화
const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
const model = vertexAI.getGenerativeModel({
    model: MODEL_ID,
    generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 1024,
        responseMimeType: "application/json", // 🚀 핵심: 무조건 JSON으로만 응답하게 강제
    },
});

// ─────────────────────────────────────────────────────────────
// 2. 날짜 헬퍼 함수
// ─────────────────────────────────────────────────────────────

function getWeekId(date: Date): string {
    const kst = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const year = kst.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((kst.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${year}-W${weekNumber.toString().padStart(2, "0")}`;
}

function getWeekStartEnd(weekId: string): { start: Date; end: Date } {
    const [year, week] = weekId.split("-W").map(Number);
    const startOfYear = new Date(year, 0, 1);
    const firstMonday = new Date(startOfYear); // 1월 1일

    // 첫 월요일 찾기
    const day = startOfYear.getDay();
    const diff = startOfYear.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    firstMonday.setDate(diff);

    // weekNumber에 따른 날짜 계산 (간단 보정)
    // ISO 8601 주차 계산은 복잡하므로, 여기서는 프로젝트 규칙에 맞게 단순화
    const weekStart = new Date(year, 0, 1);
    weekStart.setDate(weekStart.getDate() + (week - 1) * 7 - weekStart.getDay() + 1);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return { start: weekStart, end: weekEnd };
}

// ─────────────────────────────────────────────────────────────
// 3. 데이터 수집 로직
// ─────────────────────────────────────────────────────────────

async function collectSubCategoryPosts(
    subCategory: string,
    limit: number = 30,
): Promise<Array<{ id: string; title: string; content: string; hasGuide: boolean; lanterns: number; replyCount: number }>> {
    // 2주 이내 게시글 중 조회
    const twoWeeksAgo = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    );

    const postsSnap = await db
        .collection("posts")
        .where("subCategory", "==", subCategory)
        .where("createdAt", ">=", twoWeeksAgo)
        .where("hidden", "==", false) // 인덱스 필요 (createdAt DESC, hidden ASC)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

    const posts = postsSnap.docs
        .map((doc) => {
            const data = doc.data();
            const replies = Array.isArray(data.replies) ? data.replies : [];
            const hasGuide = replies.some((r: any) => r?.isGuide === true);

            return {
                id: doc.id,
                title: (data.title || "").trim(),
                content: (data.content || "").trim(),
                hasGuide,
                lanterns: data.lanterns || data.lanternCount || 0,
                replyCount: data.replyCount || replies.length || 0,
            };
        })
        // ✅ 영양가 없는 게시글 필터링
        .filter((post) => {
            // 제목이 너무 짧거나 비어있으면 제외
            if (!post.title || post.title.length < 3) return false;
            
            // 내용이 너무 짧거나 비어있으면 제외 (최소 50자 이상)
            if (!post.content || post.content.length < 50) return false;
            
            // 의미 없는 단어들만 있는 경우 제외
            const meaninglessPatterns = /^(테스트|안녕|하이|ㅎㅎ|ㅋㅋ|ㅇㅇ|\.|,|\s)+$/i;
            if (meaninglessPatterns.test(post.title) || meaninglessPatterns.test(post.content.slice(0, 20))) {
                return false;
            }
            
            return true;
        });

    // 🚀 개선: '길잡이 채택'이 된 게시글을 우선순위로 정렬
    // 그 다음 등불 수, 댓글 수 순으로 정렬
    posts.sort((a, b) => {
        // 1순위: 길잡이 채택 여부
        if (b.hasGuide !== a.hasGuide) {
            return b.hasGuide ? 1 : -1;
        }
        // 2순위: 등불 수
        if (b.lanterns !== a.lanterns) {
            return b.lanterns - a.lanterns;
        }
        // 3순위: 댓글 수
        return b.replyCount - a.replyCount;
    });

    return posts.slice(0, 15); // 상위 15개만 후보로 사용
}

// ─────────────────────────────────────────────────────────────
// 4. AI 생성 로직 (Vertex AI SDK 사용)
// ─────────────────────────────────────────────────────────────

async function generateQuestionWithAI(
    postTitle: string,
    postContent: string,
    subCategory: string,
): Promise<QuizQuestion | null> {

    // JSON 스키마 정의 (AI가 이 형식에 정확히 맞춰서 뱉어줌)
    const schema = {
        type: SchemaType.OBJECT,
        properties: {
            question: { type: SchemaType.STRING },
            options: {
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING },
                minItems: 4,
                maxItems: 4
            },
            correctIndex: { type: SchemaType.INTEGER },
            explanation: { type: SchemaType.STRING },
        },
        required: ["question", "options", "correctIndex", "explanation"],
    };

    const prompt = `
    당신은 커뮤니티 게시글을 바탕으로 퀴즈를 만드는 AI입니다.
    다음 게시글 내용을 읽고, 독해력/상식 퀴즈를 1개 만들어주세요.

    [게시글 정보]
    - 카테고리: ${subCategory}
    - 제목: ${postTitle}
    - 본문: ${postContent.slice(0, 1500)}

    [조건]
    1. 문제는 게시글의 핵심 내용이나 사실 관계를 묻는 것이어야 합니다.
    2. 선택지는 4개이며, 정답은 1개입니다.
    3. correctIndex는 0부터 3 사이의 정수입니다.
    4. 해설(explanation)은 정답인 이유를 2문장 이내로 설명하세요.
    5. 한국어로 작성하세요.
    `;

    try {
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema, // 스키마 강제
            }
        });

        const text = result.response.candidates?.[0].content.parts[0].text;
        if (!text) return null;

        const parsed = JSON.parse(text);

        return {
            id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            question: parsed.question,
            options: parsed.options,
            correctIndex: parsed.correctIndex,
            explanation: parsed.explanation,
            sourcePostId: "", // 호출부에서 채움
            verified: false,  // 호출부에서 검증 후 true 변경
        };

    } catch (error) {
        logger.error("[weeklyQuiz] 문제 생성 오류", { error });
        return null;
    }
}

async function verifyQuestion(
    quiz: QuizQuestion,
    postContent: string
): Promise<{ isValid: boolean; reason?: string }> {
    // 검증 단계에서는 JSON 모드를 쓰지 않고 간단한 텍스트 답변을 받아 판단 (비용 절약)
    const prompt = `
    다음 퀴즈가 주어진 본문 내용과 일치하고 논리적으로 타당한지 검증해줘.
    
    [본문]
    ${postContent.slice(0, 1000)}

    [퀴즈]
    문제: ${quiz.question}
    선택지: ${quiz.options.join(", ")}
    정답: ${quiz.options[quiz.correctIndex]}
    해설: ${quiz.explanation}

    [지시]
    문제가 타당하면 "TRUE"라고만 대답하고, 
    오류가 있거나(정답이 틀림, 본문에 없는 내용 등) 문제가 이상하면 "FALSE: 이유" 형식으로 대답해.
    `;

    try {
        // 검증용 모델은 가볍게 설정
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "text/plain" }
        });

        const response = result.response.candidates?.[0].content.parts[0].text?.trim() || "";

        if (response.startsWith("TRUE")) {
            return { isValid: true };
        } else {
            return { isValid: false, reason: response };
        }
    } catch (e) {
        // 검증 중 에러나면 일단 통과시키거나 스킵 (여기선 안전하게 스킵)
        logger.warn("[weeklyQuiz] 검증 중 에러", e);
        return { isValid: false, reason: "Verification Error" };
    }
}

async function getRecentSubCategories(limit = 5): Promise<string[]> {
    const oneWeekAgo = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    );

    // ✅ 비용 절감: 최근 글 수 감소 (200 → 100)
    const snap = await db
        .collection("posts")
        .where("createdAt", ">=", oneWeekAgo)
        .where("hidden", "==", false)
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();

    const counts: Record<string, number> = {};
    snap.docs.forEach((d) => {
        const sub = (d.data().subCategory || "").trim();
        if (sub) counts[sub] = (counts[sub] || 0) + 1;
    });

    // 글이 많은 순으로 상위 N개 리턴
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([sub]) => sub);
}

// ─────────────────────────────────────────────────────────────
// 5. 메인 스케줄러
// ─────────────────────────────────────────────────────────────

export const generateWeeklyQuiz = onSchedule(
    {
        schedule: "0 9 * * 1", // 매주 월요일 오전 9시 (한국 시간)
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
        timeoutSeconds: 540, // 9분
        memory: "1GiB",
    },
    async () => {
        const now = new Date();
        const weekId = getWeekId(now);
        const { start, end } = getWeekStartEnd(weekId);

        logger.info(`[weeklyQuiz] Start generating for ${weekId}`);

        // 1. 핫한 서브카테고리 선정
        // ✅ 비용 절감: 서브카테고리 수 감소 (3 → 2)
        const subCategories = await getRecentSubCategories(2); // 상위 2개 카테고리만

        for (const subCategory of subCategories) {
            const posts = await collectSubCategoryPosts(subCategory);
            const questions: QuizQuestion[] = [];

            logger.info(`[weeklyQuiz] Processing ${subCategory} - Found ${posts.length} posts`);

            for (const post of posts) {
                if (questions.length >= QUESTIONS_PER_CATEGORY) break;

                // 2. 문제 생성
                const generated = await generateQuestionWithAI(post.title, post.content, subCategory);
                if (!generated) continue;

                // 3. 문제 검증
                const verification = await verifyQuestion(generated, post.content);
                if (!verification.isValid) {
                    logger.warn(`[weeklyQuiz] Invalid question filtered: ${verification.reason}`);
                    continue;
                }

                generated.sourcePostId = post.id;
                generated.verified = true;
                questions.push(generated);

                // Rate Limit 방지용 딜레이 (1초)
                await new Promise(r => setTimeout(r, 1000));
            }

            if (questions.length > 0) {
                // 4. DB 저장
                const quizDocId = `${weekId}_${subCategory}`;
                const quizData: WeeklyQuiz = {
                    weekId,
                    subCategory,
                    startDate: admin.firestore.Timestamp.fromDate(start),
                    endDate: admin.firestore.Timestamp.fromDate(end),
                    questions,
                    rewards: REWARDS,
                };

                await db.collection(QUIZ_COLLECTION).doc(quizDocId).set(quizData);
                logger.info(`[weeklyQuiz] Saved ${questions.length} questions for ${quizDocId}`);
            }
        }

        logger.info("[weeklyQuiz] Finished.");
    },
);