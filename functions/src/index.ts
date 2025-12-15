// functions/src/index.ts

// v2 Functions API
import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import { onCall, HttpsError, onCallGenkit } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as crypto from "crypto";
import { sendPushNotification } from "./notificationService";
// Firebase Admin
import { admin, db } from "./firebaseAdmin";

// 🚨 [수정 1] Genkit & Telemetry 설정
import { enableFirebaseTelemetry } from "@genkit-ai/firebase";
import { genkit, z } from "genkit";
import { vertexAI } from "@genkit-ai/vertexai";

// ⚠️ 외부 파일에서 가져오는 트리거들
export { aiModerationReview } from "./aiModeration";
export { aiAutoReply } from "./aiAutoReply";
export { sendMorningRecommendations } from "./dailyRecommendations";
export { generateWeeklyQuiz } from "./weeklyQuiz";
export { calcWeeklyStats } from "./weeklyStats";

// 🚨 [수정 2] 텔레메트리 활성화
enableFirebaseTelemetry();

const DELETED_USER_NAME = "탈퇴한 사용자";
const REPORT_NEEDS_REVIEW_THRESHOLD = 1; // 검토 필요 상태로 변경되는 신고 수
const REPORT_AUTO_HIDE_THRESHOLD = 10;    // 자동 숨김 처리되는 신고 수

// ─────────────────────────────────────────────────────
// 0. 공통 유틸리티 & 설정
// ─────────────────────────────────────────────────────

// 1. 욕설/인신공격 필터 설정
const FALLBACK_BAD_WORDS = [
    "fuck", "shit", "bitch", "asshole", "sex",
    "병신", "씨발", "좆", "새끼", "개새", "개새끼", "ㅅㅂ", "ㅂㅅ", "ㅄ", "ㅈㄴ",
];

// 🚨 [수정 3] 정규식 변경: 공백(\s)을 유지하도록 수정 (오작동 방지)
const NORMALIZE_REGEX = /[^a-zA-Z0-9가-힣\s]/g;
const BAD_WORDS_CACHE_TTL_MS = 5 * 60 * 1000;
let cachedBadWords: string[] = FALLBACK_BAD_WORDS;
let cachedAt = 0;

function normalize(text: string): string {
    // 특수문자만 제거하고 공백은 남김
    return text.toLowerCase().replace(NORMALIZE_REGEX, "");
}

async function getBadWords(): Promise<string[]> {
    const now = Date.now();
    if (now - cachedAt < BAD_WORDS_CACHE_TTL_MS && cachedBadWords.length > 0) {
        return cachedBadWords;
    }
    try {
        const doc = await db.collection("config").doc("profanity").get();
        const data = doc.exists ? (doc.data() as any) : {};
        const words = Array.isArray(data?.words) ? (data.words as string[]) : [];

        // DB 단어들도 normalize (공백 유지 확인)
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

// 🚨 [수정 4] 단어 단위 매칭 로직 개선
async function findProfanity(text?: string): Promise<string | null> {
    if (!text || typeof text !== "string") return null;

    const cleanText = normalize(text);
    const badWords = await getBadWords();

    // 텍스트를 공백 기준으로 단어 배열(토큰)로 만듭니다.
    const tokens = cleanText.split(/\s+/).filter(t => t.length > 0);

    for (const badWord of badWords) {
        // 1. "개 새끼"처럼 공백이 포함된 욕설은, 원래 문장에 포함되어 있는지 검사합니다.
        if (badWord.includes(" ")) {
            if (cleanText.includes(badWord)) {
                return badWord; // 찾았으니 즉시 반환
            }
        }
        // 2. "병신"처럼 공백 없는 욕설은, 우리가 만든 단어 배열(토큰)에 정확히 일치하는 단어가 있는지 검사합니다.
        //    이렇게 하면 "새로운" 이라는 단어가 "새" 라는 욕설로 잘못 감지되는 일을 막을 수 있습니다.
        else {
            if (tokens.includes(badWord)) {
                return badWord; // 찾았으니 즉시 반환
            }
        }
    }

    return null; // 모든 검사를 통과했으면 욕설이 없는 것입니다.
}

async function containsProfanity(text?: string): Promise<boolean> {
    const word = await findProfanity(text);
    return word !== null;
}

// 2. Rate-limit (도배 방지)
const RATE_LIMIT_MS = 5000;
const RATE_LIMIT_COLLECTION = "rateLimits";

async function checkRateLimit(uid: string, action: string) {
    if (!uid) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    const docId = `${uid}_${action}`;
    const ref = db.collection(RATE_LIMIT_COLLECTION).doc(docId);
    const now = Date.now();
    const snap = await ref.get();
    const data = snap.exists ? (snap.data() as any) : {};
    const last = typeof data.last === "number" ? data.last : 0;

    if (now - last < RATE_LIMIT_MS) {
        throw new HttpsError("resource-exhausted", "잠시 후 다시 시도해주세요.");
    }
    await ref.set({ last: now }, { merge: true });
}

// ✅ 신뢰도 업데이트 헬퍼
async function updateTrustScore(transaction: admin.firestore.Transaction, userId: string, delta: number, reason: string) {
    const userRef = db.collection("users").doc(userId);
    const userSnap = await transaction.get(userRef);
    if (!userSnap.exists) return;

    const userData = userSnap.data();
    const currentScore = typeof userData?.trustScore === "number" ? userData.trustScore : 30;

    // 점수는 0~100 사이로 제한
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

// ─────────────────────────────────────────────────────
// 3. Firestore Triggers
// ─────────────────────────────────────────────────────

// ✅ 1. 게시글 생성 트리거
export const onPostCreated = onDocumentCreated(
    { document: "posts/{postId}", region: "asia-northeast3" },
    async (event: any) => {
        const snapshot = event.data;
        if (!snapshot) return;
        const post = snapshot.data() as any;
        const userId = post.authorUid || post.userId;

        try {
            const title = post.title || "";
            const content = post.content || "";
            const tags = Array.isArray(post.tags) ? post.tags : [];

            let detectedWord = await findProfanity(title);
            if (!detectedWord) detectedWord = await findProfanity(content);
            if (!detectedWord) {
                for (const t of tags) {
                    const res = await findProfanity(String(t));
                    if (res) { detectedWord = res; break; }
                }
            }

            if (detectedWord && !post.hidden) {
                logger.warn(`🚫 [자동 숨김] 문서: ${snapshot.id}, 감지된 단어: "${detectedWord}"`);
                await snapshot.ref.update({
                    hidden: true,
                    hiddenReason: `profanity_filter: ${detectedWord}`,
                    autoHiddenAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                return;
            }
        } catch (error) {
            logger.error("[profanity] 게시글 필터 처리 실패", { error: (error as Error).message });
        }

        if (userId) {
            await db.runTransaction(async (t) => {
                const userRef = db.collection("users").doc(userId);
                const userSnap = await t.get(userRef);
                if (!userSnap.exists) return;

                const currentCount = (userSnap.data()?.postCount || 0) + 1;
                t.update(userRef, { postCount: currentCount });

                if (currentCount === 1) {
                    const achRef = userRef.collection("achievements").doc("first_post");
                    const achSnap = await t.get(achRef);
                    if (!achSnap.exists) {
                        t.set(achRef, {
                            id: "first_post",
                            title: "첫 발걸음",
                            description: "첫 게시글을 작성했습니다.",
                            acquiredAt: admin.firestore.FieldValue.serverTimestamp(),
                            isRead: false
                        });
                    }
                }
            });
        }
    },
);

// ✅ 2. 게시글 수정 트리거
export const onPostUpdated = onDocumentUpdated(
    { document: "posts/{postId}", region: "asia-northeast3" },
    async (event: any) => {
        const before = event.data?.before?.data() as any;
        const after = event.data?.after?.data() as any;
        if (!before || !after) return;

        const postRef = event.data?.after?.ref;
        let shouldUpdate = false;
        const updatePayload: any = {};

        try {
            // 수정 시에도 개선된 containsProfanity 사용
            const hasBadTitle = await containsProfanity(after.title);
            const hasBadContent = await containsProfanity(after.content);
            const hasBadTag = (await Promise.all((after.tags || []).map((t: any) => containsProfanity(String(t))))).some((v) => v);

            if ((hasBadTitle || hasBadContent || hasBadTag) && !after.hidden) {
                updatePayload.hidden = true;
                updatePayload.hiddenReason = "profanity_filter_update";
                updatePayload.autoHiddenAt = admin.firestore.FieldValue.serverTimestamp();
                shouldUpdate = true;
            }
        } catch (e) { }

        try {
            const beforeReplies = before.replies || [];
            const afterReplies = after.replies || [];
            if (afterReplies.length > beforeReplies.length) {
                const updatedReplies = [...afterReplies];
                let repliesChanged = false;
                for (let i = 0; i < afterReplies.length; i++) {
                    const reply = afterReplies[i] || {};
                    const prev = beforeReplies[i];
                    if ((!prev || prev.hidden !== true) && !reply.hidden) {
                        if (await containsProfanity(reply.content)) {
                            updatedReplies[i] = { ...reply, hidden: true, hiddenReason: "profanity_filter" };
                            repliesChanged = true;
                        }
                    }
                }
                if (repliesChanged) {
                    updatePayload.replies = updatedReplies;
                    shouldUpdate = true;
                }
            }
        } catch (e) { }

        if (shouldUpdate && postRef) await postRef.update(updatePayload);
    },
);

// ✅ 3. 신고 접수 트리거
export const onReportCreated = onDocumentCreated(
    { document: "reports/{reportId}", region: "asia-northeast3" },
    async (event: any) => {
        const snapshot = event.data;
        if (!snapshot) return;

        const report = snapshot.data();
        const { targetType, targetId, postId } = report;
        const reportRef = snapshot.ref;

        if (!targetType || !targetId) return;

        // A. 댓글 신고
        if (targetType === "reply") {
            if (!postId) return;
            const postRef = db.collection("posts").doc(String(postId));

            await db.runTransaction(async (tx) => {
                const postSnap = await tx.get(postRef);
                if (!postSnap.exists) return;

                const postData = postSnap.data() as any;
                const replies = postData.replies || [];
                const index = replies.findIndex((r: any) => String(r.id) === String(targetId));

                if (index === -1) return;

                const originalReply = replies[index];
                const prevCount = originalReply.reportCount || 0;
                const newCount = prevCount + 1;

                const updatedReply = {
                    ...originalReply,
                    reportCount: newCount,
                };

                const updateReportPayload: any = {};

                if (newCount >= REPORT_NEEDS_REVIEW_THRESHOLD) {
                    updateReportPayload.status = "needs_review";
                    updateReportPayload.priority = "high";
                }

                if (newCount >= REPORT_AUTO_HIDE_THRESHOLD) {
                    updatedReply.hidden = true;
                    // 배열 내부는 JS Date 사용 (Timestamp 객체 변환)
                    updatedReply.autoHiddenAt = new Date();
                    updateReportPayload.status = "auto_hidden";
                    updateReportPayload.autoHidden = true;
                }

                const newReplies = [...replies];
                newReplies[index] = updatedReply;

                tx.update(postRef, { replies: newReplies });

                if (Object.keys(updateReportPayload).length > 0) {
                    tx.update(reportRef, updateReportPayload);
                }
            });
            return;
        }

        // B. 게시글 신고
        if (targetType === "post") {
            const targetRef = db.collection("posts").doc(String(targetId));

            await db.runTransaction(async (tx) => {
                const targetSnap = await tx.get(targetRef);
                if (!targetSnap.exists) return;

                const targetData = targetSnap.data() as any;
                const prevCount = targetData.reportCount || 0;
                const newCount = prevCount + 1;

                const updateTargetPayload: any = {
                    reportCount: admin.firestore.FieldValue.increment(1),
                    lastReportedAt: admin.firestore.FieldValue.serverTimestamp(),
                };
                const updateReportPayload: any = {};

                if (newCount >= REPORT_NEEDS_REVIEW_THRESHOLD) {
                    updateReportPayload.status = "needs_review";
                    updateReportPayload.priority = "high";
                }

                if (newCount >= REPORT_AUTO_HIDE_THRESHOLD) {
                    updateTargetPayload.hidden = true;
                    updateTargetPayload.autoHiddenAt = admin.firestore.FieldValue.serverTimestamp();
                    updateReportPayload.status = "auto_hidden";
                    updateReportPayload.autoHidden = true;
                }

                tx.update(targetRef, updateTargetPayload);

                if (Object.keys(updateReportPayload).length > 0) {
                    tx.update(reportRef, updateReportPayload);
                }
            });
        }
    }
);

// ✅ 4. 신고 확정(관리자) 트리거
export const onReportStatusChanged = onDocumentUpdated(
    { document: "reports/{reportId}", region: "asia-northeast3" },
    async (event: any) => {
        const before = event.data?.before;
        const after = event.data?.after;
        if (!before || !after) return;

        const prev = before.data();
        const next = after.data();

        if (prev.status === next.status || next.status !== "confirmed") return;

        const { targetAuthorUid, reporterUid, targetType, targetId, postId } = next;

        if (!targetType || !targetId) {
            logger.warn("[report] 신고 확정 실패: 필수 정보 누락", { targetType, targetId });
            return;
        }

        const rootDocRef = targetType === "post"
            ? db.collection("posts").doc(targetId)
            : db.collection("posts").doc(String(postId));

        await db.runTransaction(async (tx) => {
            const rootDocSnap = await tx.get(rootDocRef);
            if (!rootDocSnap.exists) return;

            // 1. 신뢰도 업데이트 (작성자 -10, 신고자 +1)
            if (targetAuthorUid) {
                // 트랜잭션 내에서 직접 신뢰도 업데이트
                const targetUserRef = db.collection("users").doc(targetAuthorUid);
                const targetUserSnap = await tx.get(targetUserRef);
                if (targetUserSnap.exists) {
                    const targetUserData = targetUserSnap.data();
                    const currentScore = typeof targetUserData?.trustScore === "number" ? targetUserData.trustScore : 30;
                    const newScore = Math.max(0, Math.min(100, currentScore - 10));
                    if (currentScore !== newScore) {
                        tx.update(targetUserRef, {
                            trustScore: newScore,
                            trustLogs: admin.firestore.FieldValue.arrayUnion({
                                id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                                delta: -10,
                                reason: "report_confirmed_penalty",
                                prevScore: currentScore,
                                newScore,
                                createdAt: new Date(),
                            })
                        });
                    }
                }
            }
            if (reporterUid) {
                // 트랜잭션 내에서 직접 신뢰도 업데이트
                const reporterUserRef = db.collection("users").doc(reporterUid);
                const reporterUserSnap = await tx.get(reporterUserRef);
                if (reporterUserSnap.exists) {
                    const reporterUserData = reporterUserSnap.data();
                    const currentScore = typeof reporterUserData?.trustScore === "number" ? reporterUserData.trustScore : 30;
                    const newScore = Math.max(0, Math.min(100, currentScore + 1));
                    if (currentScore !== newScore) {
                        tx.update(reporterUserRef, {
                            trustScore: newScore,
                            trustLogs: admin.firestore.FieldValue.arrayUnion({
                                id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                                delta: 1,
                                reason: "report_confirmed_reward",
                                prevScore: currentScore,
                                newScore,
                                createdAt: new Date(),
                            })
                        });
                    }
                }
            }

            // 2. 콘텐츠 숨김 처리 (hidden: true)
            if (targetType === "post") {
                const postData = rootDocSnap.data() as any;
                if (!postData.hidden) {
                    tx.update(rootDocRef, {
                        hidden: true,
                        hiddenReason: "report_confirmed",
                        confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                }
            } else if (targetType === "reply") {
                const postData = rootDocSnap.data() as any;
                const replies = postData.replies || [];
                const index = replies.findIndex((r: any) => String(r.id) === String(targetId));

                if (index !== -1 && !replies[index].hidden) {
                    const newReplies = [...replies];
                    newReplies[index] = {
                        ...newReplies[index],
                        hidden: true,
                        hiddenReason: "report_confirmed",
                        autoHiddenAt: new Date(), // 배열 내부는 Date 객체
                    };
                    tx.update(rootDocRef, { replies: newReplies });
                }
            }
        });
    }
);

// 5. 유저 탈퇴 시 후처리
export const onUserDeleted = onDocumentUpdated({ document: "users/{uid}", region: "asia-northeast3" }, async (event) => {
    const after = event.data?.after?.data();
    if (after?.isDeleted !== true) return;
});

// ─────────────────────────────────────────────────────
// 4. Callable Functions (클라이언트에서 호출)
// ─────────────────────────────────────────────────────

export const awardLumens = onCall({ region: "asia-northeast3" }, async (request) => {
    const { auth, data } = request;
    if (!auth) throw new HttpsError("unauthenticated", "로그인 필요");
    await checkRateLimit(auth.uid, "awardLumens");
    const { reason, amount, achievementId } = data as any;

    if (typeof amount !== "number" || amount <= 0 || amount > 1000000) throw new HttpsError("invalid-argument", "유효하지 않은 amount");

    await db.runTransaction(async (transaction) => {
        const userRef = db.collection("users").doc(auth.uid);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists) throw new HttpsError("failed-precondition", "유저 없음");

        const userData = userSnap.data() as any;
        if (achievementId && (userData.lumenTransactions || []).some((t: any) => t.achievementId === achievementId)) {
            throw new HttpsError("already-exists", "이미 보상 받음");
        }

        const lumenTxn = {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
            amount, reason, timestamp: Date.now(), achievementId: achievementId ?? null,
        };

        transaction.set(userRef, {
            lumenBalance: admin.firestore.FieldValue.increment(amount),
            lumenTotalEarned: admin.firestore.FieldValue.increment(amount),
            lumenTransactions: admin.firestore.FieldValue.arrayUnion(lumenTxn),
        }, { merge: true });
    });
    return { success: true };
});

export const purchaseTitle = onCall({ region: "asia-northeast3" }, async (request) => {
    const { auth, data } = request;
    if (!auth) throw new HttpsError("unauthenticated", "로그인 필요");
    await checkRateLimit(auth.uid, "purchaseTitle");
    const { titleId } = data as any;

    await db.runTransaction(async (transaction) => {
        const userRef = db.collection("users").doc(auth.uid);
        const titleRef = db.collection("titles").doc(titleId);
        const [userSnap, titleSnap] = await Promise.all([transaction.get(userRef), transaction.get(titleRef)]);

        if (!titleSnap.exists || !userSnap.exists) throw new HttpsError("not-found", "데이터 없음");

        const price = titleSnap.data()?.price || 0;
        const balance = userSnap.data()?.lumenBalance || 0;

        if (balance < price) throw new HttpsError("failed-precondition", "잔액 부족");

        const purchasedRef = userRef.collection("purchasedTitles").doc(titleId);
        if ((await transaction.get(purchasedRef)).exists) return;

        transaction.update(userRef, {
            lumenBalance: balance - price,
            lumenTotalSpent: admin.firestore.FieldValue.increment(price),
            lumenTransactions: admin.firestore.FieldValue.arrayUnion({
                id: `title_${Date.now()}_${titleId}`, amount: -price, reason: `칭호 구매: ${titleId}`, timestamp: Date.now(), titleId
            })
        });
        transaction.set(purchasedRef, { titleId, purchasedAt: admin.firestore.FieldValue.serverTimestamp(), price, equipped: false });
    });
    return { success: true };
});

export const selectGuide = onCall({ region: "asia-northeast3" }, async (request) => {
    const { auth, data } = request;
    if (!auth) throw new HttpsError("unauthenticated", "로그인 필요");
    await checkRateLimit(auth.uid, "selectGuide");
    const { postId, replyId } = data as any;
    const GUIDE_REWARD = 5;

    await db.runTransaction(async (transaction) => {
        const postRef = db.collection("posts").doc(postId);
        const postSnap = await transaction.get(postRef);
        if (!postSnap.exists) throw new HttpsError("not-found", "글 없음");
        const postData = postSnap.data() as any;

        if ((postData.authorUid || postData.authorId) !== auth.uid) throw new HttpsError("permission-denied", "작성자만 가능");
        if (postData.guideReplyId) throw new HttpsError("failed-precondition", "이미 채택됨");

        const replies = postData.replies || [];
        const targetReply = replies.find((r: any) => r.id === replyId);
        if (!targetReply) throw new HttpsError("not-found", "답글 없음");

        const replyAuthorUid = targetReply.authorUid || targetReply.authorId;
        if (replyAuthorUid === auth.uid) throw new HttpsError("failed-precondition", "자작 채택 불가");

        const updatedReplies = replies.map((r: any) => r.id === replyId ? { ...r, isGuide: true } : r);
        const replyUserRef = db.collection("users").doc(replyAuthorUid);

        transaction.update(postRef, { guideReplyId: replyId, guideReplyAuthorUid: replyAuthorUid, replies: updatedReplies });
        transaction.set(replyUserRef, {
            guideCount: admin.firestore.FieldValue.increment(1),
            lumenBalance: admin.firestore.FieldValue.increment(GUIDE_REWARD),
            lumenTotalEarned: admin.firestore.FieldValue.increment(GUIDE_REWARD),
            lumenTransactions: admin.firestore.FieldValue.arrayUnion({
                id: `guide_${postId}_${replyId}`, amount: GUIDE_REWARD, reason: "길잡이 보상", timestamp: Date.now()
            })
        }, { merge: true });
    });
    return { success: true };
});

async function batchUpdateSnapshot(snapshot: admin.firestore.QuerySnapshot, updateFields: Record<string, any>) {
    if (snapshot.empty) return;
    let batch = db.batch();
    let count = 0;
    for (const doc of snapshot.docs) {
        batch.update(doc.ref, updateFields);
        count++;
        if (count >= 400) { await batch.commit(); batch = db.batch(); count = 0; }
    }
    if (count > 0) await batch.commit();
}

// 🚨 [새로 추가할 함수] 게시글 작성자 변경 + 해당 글에 달린 내 댓글 닉네임까지 변경하는 함수
async function updatePostsWithRepliesForDeletedUser(
    snapshot: admin.firestore.QuerySnapshot,
    uid: string,
    deletedName: string
) {
    if (snapshot.empty) return;

    let batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();

        // 1. 게시글 자체의 작성자 정보 변경 준비
        const updates: any = {
            authorUid: null,
            authorNickname: deletedName,
            authorDeleted: true
        };

        // 2. 게시글 안에 'replies' 배열이 있다면, 내 댓글을 찾아 닉네임 변경
        if (Array.isArray(data.replies)) {
            let hasChanges = false;
            const updatedReplies = data.replies.map((reply: any) => {
                // 댓글 작성자 ID 확인 (코드 스타일에 따라 필드명이 다를 수 있어 체크)
                const replyAuthorId = reply.authorUid || reply.authorId || reply.userId;

                // 내 댓글이면 닉네임 변경
                if (replyAuthorId === uid) {
                    hasChanges = true;
                    return {
                        ...reply,
                        authorNickname: deletedName, // 닉네임 덮어쓰기
                        authorDeleted: true
                    };
                }
                return reply;
            });

            // 변경된 내용이 있으면 업데이트 목록에 추가
            if (hasChanges) {
                updates.replies = updatedReplies;
            }
        }

        batch.update(doc.ref, updates);
        count++;

        // 배치 한도(500개) 안전하게 처리
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
export const deleteAccount = onCall({ region: "asia-northeast3" }, async (request) => {
    const { auth } = request;
    if (!auth) throw new HttpsError("unauthenticated", "로그인 필요");
    const uid = auth.uid;

    // 1. 유저 문서 정보를 '탈퇴한 사용자'로 변경
    await db.runTransaction(async (tx) => {
        const userRef = db.collection("users").doc(uid);
        if (!(await tx.get(userRef)).exists) return;

        tx.set(userRef, {
            nickname: DELETED_USER_NAME,
            displayName: DELETED_USER_NAME,
            photoURL: null,
            bio: "",
            isDeleted: true,
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            // 이메일 필드 삭제 (재가입 방지 해시만 남김)
            email: admin.firestore.FieldValue.delete()
        }, { merge: true });
    });

    // 2. 팔로우/팔로잉 관계 삭제
    const followsRef = db.collection("follows");
    const [snap1, snap2] = await Promise.all([
        followsRef.where("followerUid", "==", uid).get(),
        followsRef.where("followingUid", "==", uid).get()
    ]);

    let batch = db.batch();
    let cnt = 0;
    [...snap1.docs, ...snap2.docs].forEach(d => {
        batch.delete(d.ref);
        cnt++;
        if (cnt >= 400) { batch.commit(); batch = db.batch(); cnt = 0; }
    });
    if (cnt > 0) await batch.commit();

    // 🚨 [수정된 부분] 내가 쓴 게시글 처리 (게시글 작성자명 변경 + 그 글 안의 내 댓글 이름 변경)
    // 기존 batchUpdateSnapshot 대신 방금 만든 새 함수를 사용합니다.
    const myPostsSnapshot = await db.collection("posts").where("authorUid", "==", uid).get();
    await updatePostsWithRepliesForDeletedUser(myPostsSnapshot, uid, DELETED_USER_NAME);

    // 🚨 [기존 유지] 내가 '길잡이'로 채택된 글의 정보 수정 (단순 필드 수정이므로 기존 함수 사용)
    await batchUpdateSnapshot(
        await db.collection("posts").where("guideReplyAuthorUid", "==", uid).get(),
        { guideReplyAuthorUid: null, guideReplyAuthor: DELETED_USER_NAME }
    );

    // 4. Auth 계정 삭제 및 이메일 해시 저장
    try { await admin.auth().deleteUser(uid); } catch (e) { }

    if (auth.token.email) {
        const hash = crypto.createHash("sha256").update(auth.token.email.trim().toLowerCase()).digest("hex");

        // 👇 [추가] 만료일 계산: 오늘 + 30일
        const expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + 30);

        await db.collection("deletedEmails").doc(hash).set({
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            cooldownDays: 30,
            // 👇 [필수] 이 필드가 있어야 나중에 자동으로 지워집니다!
            expireAt: admin.firestore.Timestamp.fromDate(expireDate)
        }, { merge: true });
    }
    return { success: true };
});

export const spendLumens = onCall({ region: "asia-northeast3" }, async (request) => {
    const { auth, data } = request;
    if (!auth) throw new HttpsError("unauthenticated", "로그인 필요");
    const { amount, reason } = data as any;
    if (amount <= 0) throw new HttpsError("invalid-argument", "0보다 커야 함");

    await db.runTransaction(async (tx) => {
        const userRef = db.collection("users").doc(auth.uid);
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists || (userSnap.data()?.lumenBalance || 0) < amount) throw new HttpsError("failed-precondition", "잔액 부족");

        tx.update(userRef, {
            lumenBalance: admin.firestore.FieldValue.increment(-amount),
            lumenTotalSpent: admin.firestore.FieldValue.increment(amount),
            lumenTransactions: admin.firestore.FieldValue.arrayUnion({
                id: `spend_${Date.now()}_${auth.uid}`, amount: -amount, reason, timestamp: Date.now()
            })
        });
    });
    return { success: true };
});

export const checkRejoinAllowed = onCall({ region: "asia-northeast3" }, async (request) => {
    const email = (request.data as any).email;
    if (!email) throw new HttpsError("invalid-argument", "이메일 필요");
    const hash = crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
    const snap = await db.collection("deletedEmails").doc(hash).get();

    if (!snap.exists) return { allowed: true, remainingDays: 0 };
    const data = snap.data() as any;
    const diffDays = (new Date().getTime() - data.deletedAt.toDate().getTime()) / (1000 * 3600 * 24);
    if (diffDays >= (data.cooldownDays || 7)) return { allowed: true, remainingDays: 0 };
    throw new HttpsError("failed-precondition", "쿨타임 중", { remainingDays: Math.ceil((data.cooldownDays || 7) - diffDays) });
});

export const toggleLantern = onCall({ region: "asia-northeast3" }, async (request) => {
    const { auth, data } = request;
    if (!auth) throw new HttpsError("unauthenticated", "로그인 필요");
    const { postId } = data as any;

    await db.runTransaction(async (tx) => {
        const postRef = db.collection("posts").doc(postId);
        const postSnap = await tx.get(postRef);
        if (!postSnap.exists) throw new HttpsError("not-found", "글 없음");

        const postData = postSnap.data()!;
        const authorUid = postData.authorUid || postData.userId;

        const lanternRef = db.collection("user_lanterns").doc(auth.uid).collection("posts").doc(postId);
        const exists = (await tx.get(lanternRef)).exists;

        if (exists) {
            tx.delete(lanternRef);
            // 등불 카운트 감소 (lanterns와 lanternCount 둘 다 업데이트)
            tx.update(postRef, { 
                lanterns: admin.firestore.FieldValue.increment(-1),
                lanternCount: admin.firestore.FieldValue.increment(-1)
            });
            if (authorUid && authorUid !== auth.uid) {
                // 트랜잭션 내에서 직접 신뢰도 업데이트 (await 제거)
                const userRef = db.collection("users").doc(authorUid);
                const userSnap = await tx.get(userRef);
                if (userSnap.exists) {
                    const userData = userSnap.data();
                    const currentScore = typeof userData?.trustScore === "number" ? userData.trustScore : 30;
                    const newScore = Math.max(0, Math.min(100, currentScore - 1));
                    if (currentScore !== newScore) {
                        tx.update(userRef, {
                            trustScore: newScore,
                            trustLogs: admin.firestore.FieldValue.arrayUnion({
                                id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                                delta: -1,
                                reason: "lantern_removed",
                                prevScore: currentScore,
                                newScore,
                                createdAt: new Date(),
                            })
                        });
                    }
                }
            }
        } else {
            tx.set(lanternRef, { postId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
            // 등불 카운트 증가 (lanterns와 lanternCount 둘 다 업데이트)
            tx.update(postRef, { 
                lanterns: admin.firestore.FieldValue.increment(1),
                lanternCount: admin.firestore.FieldValue.increment(1)
            });
            if (authorUid && authorUid !== auth.uid) {
                // 트랜잭션 내에서 직접 신뢰도 업데이트 (await 제거)
                const userRef = db.collection("users").doc(authorUid);
                const userSnap = await tx.get(userRef);
                if (userSnap.exists) {
                    const userData = userSnap.data();
                    const currentScore = typeof userData?.trustScore === "number" ? userData.trustScore : 30;
                    const newScore = Math.max(0, Math.min(100, currentScore + 1));
                    if (currentScore !== newScore) {
                        tx.update(userRef, {
                            trustScore: newScore,
                            trustLogs: admin.firestore.FieldValue.arrayUnion({
                                id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                                delta: 1,
                                reason: "lantern_received",
                                prevScore: currentScore,
                                newScore,
                                createdAt: new Date(),
                            })
                        });
                    }
                }
            }
        }
    });
    return { success: true };
});

export const toggleReplyLantern = onCall({ region: "asia-northeast3" }, async (request) => {
    const { auth, data } = request;
    if (!auth) throw new HttpsError("unauthenticated", "로그인 필요");
    const { postId, replyId } = data as any;

    if (!postId || typeof postId !== "string") throw new HttpsError("invalid-argument", "postId 필요");
    if (replyId === undefined || replyId === null || Number.isNaN(Number(replyId))) {
        throw new HttpsError("invalid-argument", "replyId 필요");
    }
    const replyIdNum = Number(replyId);

    await db.runTransaction(async (tx) => {
        const postRef = db.collection("posts").doc(postId);
        const postSnap = await tx.get(postRef);
        if (!postSnap.exists) throw new HttpsError("not-found", "글 없음");

        const compositeId = `${replyIdNum}_${auth.uid}`;
        const replyLanternRef = postRef.collection("replyLanterns").doc(compositeId);
        const userReplyLanternRef = db.collection("user_lanterns").doc(auth.uid).collection("replies").doc(String(replyIdNum));

        const exists = (await tx.get(replyLanternRef)).exists;

        if (exists) {
            tx.delete(replyLanternRef);
            tx.delete(userReplyLanternRef);
        } else {
            tx.set(replyLanternRef, {
                uid: auth.uid,
                replyId: replyIdNum,
                postId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            tx.set(userReplyLanternRef, {
                replyId: replyIdNum,
                postId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
    });

    return { success: true };
});

export const setNickname = onCall({ region: "asia-northeast3" }, async (request) => {
    const { auth, data } = request;
    if (!auth) throw new HttpsError("unauthenticated", "로그인 필요");
    await checkRateLimit(auth.uid, "setNickname");
    const nickname = (data as any).nickname;

    if (!/^[가-힣a-zA-Z0-9]{2,12}$/.test(nickname) || nickname === DELETED_USER_NAME) throw new HttpsError("invalid-argument", "닉네임 규칙 위반");

    const snap = await db.collection("users").where("nickname", "==", nickname).limit(1).get();
    if (!snap.empty && snap.docs[0].id !== auth.uid) throw new HttpsError("already-exists", "중복된 닉네임");

    await db.collection("users").doc(auth.uid).set({ nickname, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return { success: true, nickname };
});

export const completeOnboarding = onCall({ region: "asia-northeast3" }, async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "로그인 필요");
    await db.collection("users").doc(request.auth.uid).set({ onboardingComplete: true, communityGuidelinesAgreed: true }, { merge: true });
    return { success: true };
});

// 6. 차단 / 차단 해제 (사용자 관계 관리)
export const blockUser = onCall({ region: "asia-northeast3" }, async (request) => {
    const { auth, data } = request;
    if (!auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const targetUserId = (data as any).targetUserId;
    if (!targetUserId || typeof targetUserId !== "string") {
        throw new HttpsError("invalid-argument", "대상 유저 ID가 필요합니다.");
    }
    if (targetUserId === auth.uid) {
        throw new HttpsError("invalid-argument", "자기 자신은 차단할 수 없습니다.");
    }

    const myUid = auth.uid;
    const batch = db.batch();

    const myRef = db.collection("users").doc(myUid);
    const targetRef = db.collection("users").doc(targetUserId);

    const targetSnap = await targetRef.get();
    if (!targetSnap.exists) throw new HttpsError("not-found", "존재하지 않는 사용자입니다.");

    batch.set(
        myRef,
        { blockedUserIds: admin.firestore.FieldValue.arrayUnion(targetUserId) },
        { merge: true }
    );

    const myFollowRef = db.collection("follows").doc(`${myUid}_${targetUserId}`);
    const myFollowSnap = await myFollowRef.get();
    if (myFollowSnap.exists) {
        batch.delete(myFollowRef);
        batch.update(myRef, { followingCount: admin.firestore.FieldValue.increment(-1) });
        batch.update(targetRef, { followerCount: admin.firestore.FieldValue.increment(-1) });
    }

    const targetFollowRef = db.collection("follows").doc(`${targetUserId}_${myUid}`);
    const targetFollowSnap = await targetFollowRef.get();
    if (targetFollowSnap.exists) {
        batch.delete(targetFollowRef);
        batch.update(targetRef, { followingCount: admin.firestore.FieldValue.increment(-1) });
        batch.update(myRef, { followerCount: admin.firestore.FieldValue.increment(-1) });
    }

    await batch.commit();
    return { success: true };
});

export const unblockUser = onCall({ region: "asia-northeast3" }, async (request) => {
    const { auth, data } = request;
    if (!auth) throw new HttpsError("unauthenticated", "로그인 필요");

    const targetUserId = (data as any).targetUserId;
    if (!targetUserId) throw new HttpsError("invalid-argument", "ID 필요");

    const myRef = db.collection("users").doc(auth.uid);

    await myRef.update({
        blockedUserIds: admin.firestore.FieldValue.arrayRemove(targetUserId)
    });

    return { success: true };
});

// ─────────────────────────────────────────────────────
// 🚀 Genkit 설정 (Vertex AI)
// ─────────────────────────────────────────────────────

const ai = genkit({
    plugins: [
        vertexAI({
            location: "us-central1",
            // 🚨 [수정 1] 존재하지 않는 옵션이므로 삭제합니다.
            // googleAuthApiClient: { skipGCECheck: true }, 
        }),
    ],
});

// AI에게 시 생성을 요청하는 작업의 '설계도'를 정의합니다.
const generatePoemFlow = ai.defineFlow(
    {
        name: "generatePoemFlow",
        inputSchema: z.object({ subject: z.string() }),
        outputSchema: z.object({ poem: z.string() }),
    },
    async (input) => {
        const { subject } = input;

        // 실제로 AI 모델을 호출하여 결과를 받아옵니다.
        const { text } = await ai.generate({
            model: "gemini-2.0-flash-lite-001",
            prompt: `"${subject}"에 대한 짧고 감성적인 시를 한국어로 써줘.`,
        });

        // 🚨 [수정 2] text() -> text (괄호 제거)
        // text는 이미 문자열이므로 함수처럼 호출할 필요가 없습니다.
        return { poem: text };
    }
);

// 위에서 만든 '설계도(Flow)'를 실제로 호출 가능한 Firebase 함수로 만듭니다.
export const generatePoem = onCallGenkit(
    {
        region: "asia-northeast3",
    },
    generatePoemFlow
);

export const onFollowCreated = onDocumentCreated(
    { document: "follows/{followId}", region: "asia-northeast3" },
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) return;

        const data = snapshot.data();
        const followerUid = data.followerUid;   // 나 (팔로우 거는 사람)
        const followingUid = data.followingUid; // 너 (팔로우 당하는 사람)

        if (!followerUid || !followingUid) return;
        const followId = event.params.followId;
        const batch = db.batch();

        // 1. 내(follower) '팔로잉' 숫자 +1
        const followerRef = db.collection("users").doc(followerUid);
        batch.update(followerRef, {
            followingCount: admin.firestore.FieldValue.increment(1)
        });

        // 2. 상대(following) '팔로워' 숫자 +1
        const followingRef = db.collection("users").doc(followingUid);
        batch.update(followingRef, {
            followerCount: admin.firestore.FieldValue.increment(1),
            lastFollowedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await batch.commit();

        const notifRef = db.doc(`user_notifications/${followingUid}/items/${followId}`);

        try {
            await notifRef.create({
                type: "follow",
                fromUid: followerUid,
                toUid: followingUid,
                followId,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } catch (e) {
            logger.warn("follow notification create skipped/failed", { followId, error: String(e) });
        }
    }
);

// 7-2. 언팔로우 발생 시 (-1)
export const onFollowDeleted = onDocumentDeleted(
    { document: "follows/{followId}", region: "asia-northeast3" },
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) return;

        const data = snapshot.data();
        const followerUid = data.followerUid;
        const followingUid = data.followingUid;

        if (!followerUid || !followingUid) return;

        const batch = db.batch();

        // 1. 내 '팔로잉' 숫자 -1
        const followerRef = db.collection("users").doc(followerUid);
        batch.update(followerRef, {
            followingCount: admin.firestore.FieldValue.increment(-1)
        });

        // 2. 상대 '팔로워' 숫자 -1
        const followingRef = db.collection("users").doc(followingUid);
        batch.update(followingRef, {
            followerCount: admin.firestore.FieldValue.increment(-1)
        });

        await batch.commit();
    }
);

// ✅ [추가] 게시글/댓글 변경 감지 (댓글 알림 + 멘션 알림)
export const onPostUpdatedForNotifications = onDocumentUpdated(
    { document: "posts/{postId}", region: "asia-northeast3" },
    async (event: any) => {
        const before = event.data?.before?.data();
        const after = event.data?.after?.data();
        const postId = event.params.postId;

        if (!before || !after) return;

        // 1. 새로운 댓글이 달렸는지 확인 (배열 길이가 늘어남)
        const beforeReplies = before.replies || [];
        const afterReplies = after.replies || [];

        if (afterReplies.length > beforeReplies.length) {
            // 새로 추가된 댓글 찾기 (마지막에 추가됐다고 가정)
            const newReply = afterReplies[afterReplies.length - 1];
            const authorUid = after.authorUid || after.userId; // 글 작성자
            const replyAuthorUid = newReply.authorUid || newReply.userId; // 댓글 작성자
            const replyContent = newReply.content || "";

            // 🅰️ [댓글 알림] 글 작성자에게 알림 (내 글에 내가 쓴건 제외)
            if (authorUid && authorUid !== replyAuthorUid) {
                await sendPushNotification({
                    targetUid: authorUid,
                    type: "reply",
                    title: "내 글에 새 댓글이 달렸어요 💬",
                    body: `${newReply.authorNickname}: ${replyContent.substring(0, 30)}...`,
                    link: `/post/${postId}`
                });
            }

            // 🅱️ [멘션 알림] 본문에서 @닉네임 찾기
            // 예: "안녕하세요 @홍길동 님 반갑습니다" -> ["@홍길동"]
            const mentionRegex = /@([가-힣a-zA-Z0-9_]+)/g;
            const matches = replyContent.match(mentionRegex);

            if (matches && matches.length > 0) {
                const mentionedNicknames = [...new Set(matches.map((m: string) => m.substring(1)))]; // @ 제거 및 중복 제거

                // 닉네임으로 UID 찾아서 알림 (DB 쿼리 필요)
                // *성능을 위해 최대 3명까지만 처리*
                for (const nickname of mentionedNicknames.slice(0, 3)) {
                    const userQuery = await db.collection("users").where("nickname", "==", nickname).limit(1).get();

                    if (!userQuery.empty) {
                        const targetUser = userQuery.docs[0];
                        const targetUid = targetUser.id;

                        // 자기를 멘션한건 제외
                        if (targetUid !== replyAuthorUid) {
                            await sendPushNotification({
                                targetUid: targetUid,
                                type: "mention",
                                title: "누군가 나를 언급했어요 📢",
                                body: `${newReply.authorNickname}님이 답글에서 회원님을 언급했습니다.`,
                                link: `/post/${postId}`
                            });
                        }
                    }
                }
            }
        }
    }
);