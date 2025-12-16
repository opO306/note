import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { HttpsError } from "firebase-functions/v2/https";

// =====================================================
// 1. Firebase Admin SDK 초기화 및 내보내기 (Export)
// =====================================================
// 이 파일이 로드될 때 한 번만 실행되어야 합니다.
admin.initializeApp();

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
