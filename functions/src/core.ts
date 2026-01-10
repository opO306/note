import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { HttpsError } from "firebase-functions/v2/https";

// =====================================================
// 1. Firebase Admin SDK 초기화 및 내보내기 (Export)
// =====================================================
// 이 파일이 로드될 때 한 번만 실행되어야 합니다.
if (admin.apps.length === 0) {
    admin.initializeApp();
}

/** Firestore 데이터베이스 인스턴스 */
export const db = admin.firestore();

/** Firebase Admin 네임스페이스 (auth, storage 등 접근 시 사용) */
export { admin };


// =====================================================
// 2. 공통 상수 (Constants)
// =====================================================

/** 사용자 탈퇴 시 대체될 기본 닉네임 */
export const DELETED_USER_NAME = "탈퇴한 사용자";

/** 관리자 검토가 필요한 상태로 변경되는 신고 횟수 임계값 */
export const REPORT_NEEDS_REVIEW_THRESHOLD = 1;

/** 콘텐츠가 자동으로 숨김 처리되는 신고 횟수 임계값 */
export const REPORT_AUTO_HIDE_THRESHOLD = 10;

/** Rate-limit (도배 방지) 기본 제한 시간 (밀리초) */
const RATE_LIMIT_MS = 5000;

/** 욕설 필터링 시 사용할 기본(Fallback) 단어 목록 */
const FALLBACK_BAD_WORDS = [
    "fuck", "shit", "bitch", "asshole", "sex",
    "병신", "씨발", "좆", "새끼", "개새", "개새끼", "ㅅㅂ", "ㅂㅅ", "ㅄ", "ㅈㄴ",
];

/** 욕설 목록 캐시 유지 시간 (밀리초) - 5분 */
const BAD_WORDS_CACHE_TTL_MS = 5 * 60 * 1000;


// =====================================================
// 3. 욕설 필터링 유틸리티 (Profanity Filter)
// =====================================================

// 정규식: 알파벳, 숫자, 한글, 공백(\s)을 제외한 모든 문자를 제거
const NORMALIZE_REGEX = /[^a-zA-Z0-9가-힣\s]/g;

// 캐시 변수
let cachedBadWords: string[] = FALLBACK_BAD_WORDS;
let cachedAt = 0;

/**
 * 텍스트를 소문자로 변환하고 특수문자를 제거하여 정규화합니다.
 * @param text - 원본 문자열
 * @returns 정규화된 문자열
 */
function normalize(text: string): string {
    return text.toLowerCase().replace(NORMALIZE_REGEX, "");
}

/**
 * Firestore 또는 캐시에서 금칙어 목록을 가져옵니다.
 * @returns 정규화된 금칙어 문자열 배열
 */
export async function getBadWords(): Promise<string[]> {
    const now = Date.now();
    if (now - cachedAt < BAD_WORDS_CACHE_TTL_MS && cachedBadWords.length > 0) {
        return cachedBadWords;
    }
    try {
        const doc = await db.collection("config").doc("profanity").get();
        const data = doc.exists ? (doc.data() as any) : {};
        const words = Array.isArray(data?.words) ? (data.words as string[]) : [];

        const normalized = words
            .filter((w) => typeof w === "string" && w.trim().length > 1)
            .map((w) => normalize(w))
            .filter(w => w.length > 0);

        cachedBadWords = normalized.length > 0 ? normalized : FALLBACK_BAD_WORDS.map(normalize);
        cachedAt = now;
    } catch (error) {
        logger.error("[profanity] 금칙어 목록 조회 실패 - fallback 사용", {
            error: (error as Error).message,
        });
        cachedBadWords = FALLBACK_BAD_WORDS.map(normalize);
        cachedAt = now;
    }
    return cachedBadWords;
}

/**
 * 주어진 텍스트에서 금칙어를 찾아 반환합니다. (단어 단위 매칭)
 * @param text - 검사할 문자열
 * @returns 발견된 첫 번째 금칙어 또는 null
 */
export async function findProfanity(text?: string): Promise<string | null> {
    if (!text || typeof text !== "string") return null;

    const cleanText = normalize(text);
    const badWords = await getBadWords();
    const tokens = cleanText.split(/\s+/).filter(t => t.length > 0);

    for (const badWord of badWords) {
        if (badWord.includes(" ")) { // "개 새끼" 처럼 공백 포함 욕설
            if (cleanText.includes(badWord)) return badWord;
        } else { // "병신" 처럼 공백 없는 욕설
            if (tokens.includes(badWord)) return badWord;
        }
    }
    return null;
}

/**
 * 주어진 텍스트에 금칙어가 포함되어 있는지 여부를 반환합니다.
 * @param text - 검사할 문자열
 * @returns 금칙어 포함 여부 (boolean)
 */
export async function containsProfanity(text?: string): Promise<boolean> {
    const word = await findProfanity(text);
    return word !== null;
}

// =====================================================
// 5. 개인정보 유출 감지 (Personal Information Detection)
// =====================================================

/**
 * 텍스트에서 개인정보 유출 여부를 감지합니다.
 * @param text - 검사할 텍스트
 * @returns 개인정보 유출 여부 및 감지된 유형
 */
export function detectPersonalInfo(text: string): {
    hasPersonalInfo: boolean;
    detectedTypes: string[];
} {
    if (!text || typeof text !== "string") {
        return { hasPersonalInfo: false, detectedTypes: [] };
    }

    const detected: string[] = [];
    const normalized = text.replace(/\s/g, ""); // 공백 제거

    // 전화번호 패턴 (010-1234-5678, 01012345678, 010 1234 5678 등)
    const phoneRegex = /(01[0-9])[-.\s]?(\d{3,4})[-.\s]?(\d{4})/g;
    if (phoneRegex.test(text)) {
        detected.push("phone");
    }

    // 이메일 패턴
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    if (emailRegex.test(text)) {
        detected.push("email");
    }

    // 주소 패턴 (도로명 주소, 지번 주소)
    const addressRegex = /(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주).*(시|도|군|구|동|로|길|번지)/g;
    if (addressRegex.test(text)) {
        detected.push("address");
    }

    // 주민등록번호 패턴 (민감 정보)
    const ssnRegex = /\d{6}[-.\s]?\d{7}/g;
    if (ssnRegex.test(normalized)) {
        detected.push("ssn");
    }

    // 계좌번호 패턴 (은행 계좌번호)
    const accountRegex = /(\d{3,4})[-.\s]?(\d{4,6})[-.\s]?(\d{4,8})/g;
    if (accountRegex.test(normalized) && normalized.length > 10) {
        detected.push("account");
    }

    return {
        hasPersonalInfo: detected.length > 0,
        detectedTypes: detected
    };
}

// =====================================================
// 6. 신뢰도 기반 제재 시스템 (Trust-based Restrictions)
// =====================================================

/**
 * 사용자의 신뢰도에 따른 활동 제한을 확인합니다.
 * @param uid - 사용자 UID
 * @returns 활동 가능 여부 및 제한 사유
 */
export async function checkUserRestrictions(uid: string): Promise<{
    canPost: boolean;
    canReply: boolean;
    restrictions: string[];
}> {
    if (!uid) {
        return {
            canPost: false,
            canReply: false,
            restrictions: ["no_uid"]
        };
    }

    try {
        const userSnap = await db.collection("users").doc(uid).get();
        if (!userSnap.exists) {
            return {
                canPost: false,
                canReply: false,
                restrictions: ["user_not_found"]
            };
        }

        const userData = userSnap.data();
        const trustScore = typeof userData?.trustScore === "number" ? userData.trustScore : 30;
        const isDeleted = userData?.isDeleted === true;

        const restrictions: string[] = [];

        // 탈퇴한 사용자
        if (isDeleted) {
            return {
                canPost: false,
                canReply: false,
                restrictions: ["user_deleted"]
            };
        }

        // 신뢰도 0 이하: 모든 활동 제한
        if (trustScore <= 0) {
            return {
                canPost: false,
                canReply: false,
                restrictions: ["trust_score_too_low"]
            };
        }

        // 신뢰도 10 이하: 게시물 작성 제한
        if (trustScore <= 10) {
            restrictions.push("post_restricted");
        }

        // 신뢰도 20 이하: 답글 작성 제한
        if (trustScore <= 20) {
            restrictions.push("reply_restricted");
        }

        return {
            canPost: trustScore > 10,
            canReply: trustScore > 20,
            restrictions
        };
    } catch (error) {
        logger.error("[checkUserRestrictions] 오류", { uid, error: (error as Error).message });
        // 오류 발생 시 제한하지 않음 (기본값 허용)
        return {
            canPost: true,
            canReply: true,
            restrictions: []
        };
    }
}

// =====================================================
// 7. 스팸 감지 시스템 (Spam Detection)
// =====================================================

/**
 * 사용자의 최근 콘텐츠를 가져옵니다.
 * @param userId - 사용자 UID
 * @param type - 콘텐츠 타입 ("post" | "reply")
 * @param timeWindowMs - 시간 범위 (밀리초)
 * @param limit - 최대 개수
 */
async function getRecentUserContent(
    userId: string,
    type: "post" | "reply",
    timeWindowMs: number,
    limit: number = 10
): Promise<Array<{ content: string; createdAt: any }>> {
    try {
        const now = Date.now();
        const cutoffTime = now - timeWindowMs;

        if (type === "post") {
            const postsSnap = await db.collection("posts")
                .where("authorUid", "==", userId)
                .orderBy("createdAt", "desc")
                .limit(limit)
                .get();

            return postsSnap.docs
                .map(doc => {
                    const data = doc.data();
                    const createdAt = data.createdAt;
                    const createdAtMs = createdAt?.toMillis ? createdAt.toMillis() : (typeof createdAt === "number" ? createdAt : Date.now());

                    if (createdAtMs < cutoffTime) return null;

                    return {
                        content: `${data.title || ""} ${data.content || ""}`.trim(),
                        createdAt: createdAt
                    };
                })
                .filter((item): item is { content: string; createdAt: any } => item !== null);
        } else {
            // 답글의 경우 posts 컬렉션의 replies 배열에서 찾아야 함
            // ✅ 비용 절감: 최근 게시물 수 감소 (50 → 30)
            const postsSnap = await db.collection("posts")
                .orderBy("createdAt", "desc")
                .limit(30) // 최근 30개 게시물만 확인
                .get();

            const recentReplies: Array<{ content: string; createdAt: any }> = [];

            for (const postDoc of postsSnap.docs) {
                const postData = postDoc.data();
                const replies = postData.replies || [];

                for (const reply of replies) {
                    if (reply.authorUid === userId) {
                        const createdAt = reply.createdAt;
                        const createdAtMs = createdAt?.toMillis ? createdAt.toMillis() : (typeof createdAt === "number" ? createdAt : Date.now());

                        if (createdAtMs >= cutoffTime) {
                            recentReplies.push({
                                content: reply.content || "",
                                createdAt: createdAt
                            });

                            if (recentReplies.length >= limit) break;
                        }
                    }
                }

                if (recentReplies.length >= limit) break;
            }

            return recentReplies.sort((a, b) => {
                const aMs = a.createdAt?.toMillis ? a.createdAt.toMillis() : (typeof a.createdAt === "number" ? a.createdAt : 0);
                const bMs = b.createdAt?.toMillis ? b.createdAt.toMillis() : (typeof b.createdAt === "number" ? b.createdAt : 0);
                return bMs - aMs;
            });
        }
    } catch (error) {
        logger.error("[getRecentUserContent] 오류", { userId, type, error: (error as Error).message });
        return [];
    }
}

/**
 * 두 텍스트의 유사도를 계산합니다 (간단한 Jaccard 유사도 사용).
 * @param text1 - 첫 번째 텍스트
 * @param text2 - 두 번째 텍스트
 * @returns 유사도 (0.0 ~ 1.0)
 */
function calculateSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    // 정규화: 소문자 변환, 공백 제거, 특수문자 제거
    const normalize = (text: string) => {
        return text.toLowerCase()
            .replace(/[^\w가-힣\s]/g, "")
            .replace(/\s+/g, " ")
            .trim();
    };

    const norm1 = normalize(text1);
    const norm2 = normalize(text2);

    if (norm1.length === 0 || norm2.length === 0) return 0;

    // 완전 일치
    if (norm1 === norm2) return 1.0;

    // 단어 집합으로 변환
    const words1 = new Set(norm1.split(/\s+/).filter(w => w.length > 1));
    const words2 = new Set(norm2.split(/\s+/).filter(w => w.length > 1));

    if (words1.size === 0 || words2.size === 0) return 0;

    // Jaccard 유사도 계산
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
}

/**
 * 광고성 키워드를 감지합니다.
 * @param text - 검사할 텍스트
 * @returns 광고성 키워드 포함 여부
 */
function detectAdvertisementKeywords(text: string): boolean {
    if (!text || typeof text !== "string") return false;

    const normalized = text.toLowerCase();

    // 광고성 키워드 목록
    const adKeywords = [
        "구매", "할인", "무료", "광고", "홍보", "링크", "클릭", "이벤트",
        "특가", "세일", "쿠폰", "적립", "포인트", "가입", "추천인",
        "bit.ly", "tinyurl", "goo.gl", "short.link", "http://", "https://",
        "www.", ".com", ".kr", "카톡", "문의", "연락", "상담",
        "지금", "지금만", "한정", "오늘", "오늘만"
    ];

    // 키워드가 3개 이상 포함되면 광고로 의심
    const matchedKeywords = adKeywords.filter(keyword => normalized.includes(keyword));

    if (matchedKeywords.length >= 3) {
        return true;
    }

    // URL 패턴이 여러 개 있으면 광고로 의심
    const urlPattern = /(https?:\/\/|www\.)[^\s]+/gi;
    const urls = normalized.match(urlPattern);
    if (urls && urls.length >= 2) {
        return true;
    }

    return false;
}

/**
 * 스팸 콘텐츠를 감지합니다.
 * @param userId - 사용자 UID
 * @param content - 검사할 콘텐츠
 * @param type - 콘텐츠 타입 ("post" | "reply")
 * @returns 스팸 여부 및 사유
 */
export async function detectSpam(
    userId: string,
    content: string,
    type: "post" | "reply"
): Promise<{ isSpam: boolean; reason?: string }> {
    if (!userId || !content) {
        return { isSpam: false };
    }

    try {
        // 1. 시간당 게시물 수 체크 (1시간 기준)
        // ✅ 비용 절감: 조회 개수 감소 (20 → 5, 유사도 검사에 충분)
        const oneHourAgo = 60 * 60 * 1000;
        const recentContent = await getRecentUserContent(userId, type, oneHourAgo, 5);

        // 게시물: 1시간에 10개 이상
        // 답글: 1시간에 20개 이상
        const maxAllowed = type === "post" ? 10 : 20;
        if (recentContent.length >= maxAllowed) {
            return { isSpam: true, reason: "too_frequent" };
        }

        // 2. 유사 콘텐츠 감지 (최근 3개와 비교) - ✅ 비용 절감: 5개 → 3개
        const recentForSimilarity = recentContent.slice(0, 3);
        for (const recent of recentForSimilarity) {
            const similarity = calculateSimilarity(content, recent.content);
            // 80% 이상 유사하면 스팸으로 판단
            if (similarity > 0.8) {
                return { isSpam: true, reason: "duplicate_content" };
            }
        }

        // 3. 광고성 키워드 감지
        if (detectAdvertisementKeywords(content)) {
            // 광고 키워드가 감지되면 AI로 재확인하는 것이 좋지만,
            // 비용 절감을 위해 일단 키워드 기반으로만 처리
            // (향후 AI 모더레이션에서 재확인 가능)
            return { isSpam: true, reason: "advertisement" };
        }

        // 4. 매우 짧은 반복 콘텐츠 감지 (10자 이하 반복)
        if (content.length <= 10 && recentContent.length >= 3) {
            const isRepeated = recentContent
                .slice(0, 3)
                .some(recent => calculateSimilarity(content, recent.content) > 0.9);
            if (isRepeated) {
                return { isSpam: true, reason: "repeated_short_content" };
            }
        }

        return { isSpam: false };
    } catch (error) {
        logger.error("[detectSpam] 오류", { userId, type, error: (error as Error).message });
        // 오류 발생 시 스팸으로 판단하지 않음 (안전한 기본값)
        return { isSpam: false };
    }
}

// =====================================================
// 8. 통합 모더레이션 함수 (Unified Moderation)
// =====================================================

/**
 * 모더레이션 결과 타입
 */
export interface ModerationResult {
    allowed: boolean;           // 게시 허용 여부
    hidden: boolean;            // 자동 숨김 여부
    needsReview: boolean;        // 관리자 검토 필요 여부
    reasons: string[];           // 차단/숨김 사유
}

/**
 * 콘텐츠에 대한 통합 모더레이션을 수행합니다.
 * 모든 검사를 통합하여 일관된 결과를 반환합니다.
 * 
 * @param userId - 사용자 UID
 * @param title - 제목 (게시물의 경우)
 * @param content - 본문 내용
 * @param type - 콘텐츠 타입 ("post" | "reply")
 * @param tags - 태그 배열 (게시물의 경우, 선택적)
 * @returns 모더레이션 결과
 */
export async function moderateContent(
    userId: string,
    title: string,
    content: string,
    type: "post" | "reply",
    tags?: string[]
): Promise<ModerationResult> {
    const result: ModerationResult = {
        allowed: true,
        hidden: false,
        needsReview: false,
        reasons: []
    };

    if (!userId) {
        result.allowed = false;
        result.reasons.push("no_user_id");
        return result;
    }

    try {
        // 1. 신뢰도 기반 제재 확인
        const restrictions = await checkUserRestrictions(userId);
        if (type === "post" && !restrictions.canPost) {
            result.allowed = false;
            result.reasons.push(...restrictions.restrictions);
            return result;
        }
        if (type === "reply" && !restrictions.canReply) {
            result.allowed = false;
            result.reasons.push(...restrictions.restrictions);
            return result;
        }

        // 2. Rate Limiting 확인 (이미 트리거에서 처리되지만, 여기서도 확인 가능)
        // 주의: 이 함수는 트리거 내부에서 호출되므로 Rate Limit은 이미 체크됨
        // 따라서 여기서는 스킵하거나, 별도 호출 시에만 체크

        const fullText = type === "post" ? `${title} ${content}` : content;

        // 3. 욕설 필터링
        const profanityWord = await findProfanity(title || "");
        if (!profanityWord) {
            const contentProfanity = await findProfanity(content);
            if (contentProfanity) {
                result.hidden = true;
                result.reasons.push(`profanity: ${contentProfanity}`);
            }
        } else {
            result.hidden = true;
            result.reasons.push(`profanity: ${profanityWord}`);
        }

        // 태그 욕설 검사 (게시물만)
        if (type === "post" && tags && tags.length > 0) {
            for (const tag of tags) {
                const tagProfanity = await findProfanity(String(tag));
                if (tagProfanity) {
                    result.hidden = true;
                    result.reasons.push(`profanity_tag: ${tagProfanity}`);
                    break;
                }
            }
        }

        // 4. 개인정보 유출 감지
        const personalInfo = detectPersonalInfo(fullText);
        if (personalInfo.hasPersonalInfo) {
            result.hidden = true;
            result.reasons.push(`personal_info: ${personalInfo.detectedTypes.join(",")}`);
        }

        // 5. 스팸 감지 (숨김 처리되지 않은 경우만)
        if (!result.hidden) {
            const spamCheck = await detectSpam(userId, fullText, type);
            if (spamCheck.isSpam) {
                result.hidden = true;
                result.reasons.push(`spam: ${spamCheck.reason}`);
            }
        }

        // 최종 결과: 숨김 처리되면 허용되지 않음
        if (result.hidden) {
            result.allowed = false;
        }

        return result;
    } catch (error) {
        logger.error("[moderateContent] 오류", { userId, type, error: (error as Error).message });
        // 오류 발생 시 안전하게 허용 (기본값)
        return {
            allowed: true,
            hidden: false,
            needsReview: true, // 오류 발생 시 검토 필요 플래그
            reasons: ["moderation_error"]
        };
    }
}


// =====================================================
// 4. 공통 헬퍼 함수 (Common Helpers)
// =====================================================

/**
 * 특정 작업에 대한 사용자의 요청 빈도를 제한합니다 (도배 방지).
 * @param uid - 사용자 UID
 * @param action - 작업의 종류 (예: "createPost", "purchaseTitle")
 */
export async function checkRateLimit(uid: string, action: string) {
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const docId = `${uid}_${action}`;
    const ref = db.collection("rateLimits").doc(docId);
    const now = Date.now();
    const snap = await ref.get();
    const data = snap.exists ? (snap.data() as any) : {};
    const last = typeof data.last === "number" ? data.last : 0;

    if (now - last < RATE_LIMIT_MS) {
        throw new HttpsError("resource-exhausted", "잠시 후 다시 시도해주세요.");
    }
    await ref.set({ last: now }, { merge: true });
}

/**
 * 트랜잭션 내에서 사용자의 신뢰도 점수를 안전하게 업데이트하고 로그를 남깁니다.
 * @param transaction - Firestore 트랜잭션 객체
 * @param userId - 대상 사용자 UID
 * @param delta - 변경할 점수 (예: 10, -5)
 * @param reason - 점수 변경 사유 코드 (예: "report_confirmed_penalty")
 */
export async function updateTrustScore(transaction: admin.firestore.Transaction, userId: string, delta: number, reason: string) {
    const userRef = db.collection("users").doc(userId);
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists) return;

    const userData = userSnap.data();
    const currentScore = typeof userData?.trustScore === "number" ? userData.trustScore : 30;
    const newScore = Math.max(0, Math.min(100, currentScore + delta));

    if (currentScore !== newScore) {
        transaction.update(userRef, {
            trustScore: newScore,
            trustLogs: admin.firestore.FieldValue.arrayUnion({
                id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                delta,
                reason,
                prevScore: currentScore,
                newScore,
                createdAt: new Date(),
            })
        });
    }
}

/**
 * 대량의 문서 스냅샷을 배치로 나누어 업데이트합니다.
 * @param snapshot - 업데이트할 문서들의 QuerySnapshot
 * @param updateFields - 적용할 업데이트 필드 객체
 */
export async function batchUpdateSnapshot(snapshot: admin.firestore.QuerySnapshot, updateFields: Record<string, any>) {
    if (snapshot.empty) return;

    let batch = db.batch();
    let count = 0;
    for (const doc of snapshot.docs) {
        batch.update(doc.ref, updateFields);
        count++;
        // Firestore 배치 쓰기는 한 번에 최대 500개까지 가능하므로 안전하게 400개에서 끊습니다.
        if (count >= 400) {
            await batch.commit();
            batch = db.batch();
            count = 0;
        }
    }
    if (count > 0) {
        await batch.commit();
    }
}
