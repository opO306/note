// force deploy v11 - Force Korean System Prompt
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { VertexAI } from "@google-cloud/vertexai";
import * as admin from "firebase-admin";

export async function generateAiReply(rawInput: string, postTitle: string): Promise<string> {
    const projectId = process.env.GCLOUD_PROJECT || "dddd-e6a52";

    const vertex_ai = new VertexAI({
        project: projectId,
        location: "us-central1"
    });

    const model = vertex_ai.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
        }
    });

    const systemPrompt = `
        당신은 '비유노트'라는 한국 커뮤니티 앱의 따뜻하고 친절한 'AI 길잡이'입니다.
        사용자가 쓴 게시글을 보고, 공감하거나 도움이 되는 댓글을 남겨주세요.

        [게시글 제목]: ${postTitle}
        [게시글 내용]: ${rawInput}

        [답변 규칙]
        1. 무조건 '한국어(Korean)'로만 작성하세요. 영어를 쓰지 마세요.
        2. 상대방을 존중하는 존댓말(해요체)을 사용하세요.
        3. 내용이 짧거나 'ㅋㅋㅋ' 같은 의성어만 있어도, 그 감정에 맞춰 즐겁게 반응해주세요.
        4. 답변은 3~4문장 정도로 자연스럽게 작성하세요.
        5. 사전적 설명(예: "이것은 웃음을 의미합니다")은 절대 하지 마세요. 대화하듯이 반응하세요.
        6. 비유와 묘사를 활용하여 이해하기 쉽고 구체적으로 설명해주세요. 추상적인 개념도 일상적인 예시나 비유로 풀어내세요.
    `;

    const result = await model.generateContent(systemPrompt);
    const response = result.response;

    let replyText = "";
    if (response.candidates && response.candidates.length > 0) {
        replyText = response.candidates[0].content.parts[0].text || "";
    }

    if (!replyText) {
        throw new Error("AI 응답이 비어있습니다.");
    }

    return replyText;
}

export const aiAutoReply = onCall(
    {
        region: "asia-northeast3",
    },
    async (request) => {
        // 1. 인증 확인
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
        }

        // 2. 데이터 수신
        // 클라이언트에서 보낸 날것의 게시글 내용
        const rawInput = request.data.prompt || request.data.content;
        const postId = request.data.postId;
        const postTitle = request.data.postTitle || ""; // 제목도 받으면 좋습니다

        if (!rawInput || typeof rawInput !== 'string') {
            throw new HttpsError("invalid-argument", "내용이 없습니다.");
        }
        if (!postId) {
            throw new HttpsError("invalid-argument", "postId가 없습니다.");
        }

        try {
            // DB 초기화
            if (!admin.apps.length) {
                admin.initializeApp();
            }
            const db = admin.firestore();

            const replyText = await generateAiReply(rawInput, postTitle);

            // 4. DB 저장
            const postRef = db.collection("posts").doc(String(postId));

            const newReply = {
                id: Date.now(),
                content: replyText,
                author: "AI 길잡이",
                authorUid: "AI_BOT",
                authorAvatar: null,
                createdAt: new Date(),
                isAi: true,
                aiLabel: "Gemini 2.5",
                lanterns: 0,
                isGuide: false
            };

            await postRef.update({
                replies: admin.firestore.FieldValue.arrayUnion(newReply),
                replyCount: admin.firestore.FieldValue.increment(1)
            });

            return { success: true, reply: replyText };


        } catch (error: any) {
            logger.error("[aiAutoReply] 오류:", error);
            throw new HttpsError("internal", "오류가 발생했습니다.");
        }
    }
);