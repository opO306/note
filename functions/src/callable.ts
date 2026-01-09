import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as crypto from "crypto";

// core.ts 파일에서 공유 모듈과 함수를 가져옵니다.
import {
    db,
    admin,
    checkRateLimit,
    batchUpdateSnapshot,
    DELETED_USER_NAME,
    updateTrustScore, // 🚨 [수정 1] updateTrustScore를 import 목록에 추가합니다.
    containsProfanity // ✅ 닉네임 욕설 필터링용
} from "./core";
import { sendPushNotification, callSagesForQuestion } from "./notificationService";

// =====================================================
// Callable Functions (Client-invokable)
// =====================================================

/**
 * 1. 온보딩(닉네임 설정) 최종 완료 처리
 */
export const finalizeOnboarding = onCall({ region: "asia-northeast3" }, async (request) => {
    // ... (이전과 동일한 코드)
    const { auth, data } = request;
    if (!auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const nickname = String(data?.nickname ?? "").trim();
    const nicknameLower = nickname.toLowerCase();

    if (!/^[가-힣a-zA-Z0-9]{2,12}$/.test(nickname) || nickname === DELETED_USER_NAME) {
        throw new HttpsError("invalid-argument", "닉네임은 2~12자의 한글, 영문, 숫자만 사용할 수 있습니다.");
    }

    // ✅ 욕설 필터링 검사
    if (await containsProfanity(nickname)) {
        throw new HttpsError("invalid-argument", "부적절한 단어가 포함된 닉네임은 사용할 수 없습니다.");
    }

    const snap = await db.collection("users").where("nicknameLower", "==", nicknameLower).limit(1).get();
    if (!snap.empty && snap.docs[0].id !== auth.uid) {
        throw new HttpsError("already-exists", "이미 사용 중인 닉네임입니다.");
    }

    const userRef = db.collection("users").doc(auth.uid);
    await db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);

        if (userSnap.exists && userSnap.get("onboardingComplete")) {
            logger.info("User already onboarded, skipping update.", { uid: auth.uid });
            return; // 이미 처리됨
        }

        const now = admin.firestore.FieldValue.serverTimestamp();
        const payload: any = {
            nickname,
            nicknameLower,
            // onboardingComplete와 communityGuidelinesAgreed는 각각 가이드라인/웰컴 화면에서 설정됨
            updatedAt: now,
        };

        if (!userSnap.exists) {
            payload.createdAt = now;
            payload.role = "user";
            payload.trustScore = 30;
        }

        // 구글 프로필 이미지는 사용하지 않음 (Dicebear만 사용)
        // const picture = auth.token?.picture;
        // if (picture && !userSnap.data()?.photoURL) {
        //     payload.photoURL = picture;
        // }

        if (auth.token.email) {
            payload.email = auth.token.email;
        }

        tx.set(userRef, payload, { merge: true });
    });

    return { success: true, nickname };
});

/**
 * 2. 회원 탈퇴 처리
 */
export const deleteAccount = onCall({ region: "asia-northeast3" }, async (request) => {
    // ... (이전과 동일한 코드)
    const { auth } = request;
    if (!auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    const uid = auth.uid;

    const userRef = db.collection("users").doc(uid);
    await userRef.set({
        nickname: DELETED_USER_NAME,
        nicknameLower: DELETED_USER_NAME.toLowerCase(),
        displayName: DELETED_USER_NAME,
        photoURL: null,
        bio: "",
        isDeleted: true,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        email: admin.firestore.FieldValue.delete()
    }, { merge: true });

    const followsRef = db.collection("follows");
    const [followingSnap, followerSnap] = await Promise.all([
        followsRef.where("followerUid", "==", uid).get(),
        followsRef.where("followingUid", "==", uid).get()
    ]);
    const batch = db.batch();
    followingSnap.forEach(doc => batch.delete(doc.ref));
    followerSnap.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    const myPostsSnap = await db.collection("posts").where("authorUid", "==", uid).get();
    await batchUpdateSnapshot(myPostsSnap, {
        authorUid: null,
        author: DELETED_USER_NAME,
        authorNickname: DELETED_USER_NAME,
        authorDeleted: true
    });

    // 🚨 [수정 2] '==' 주변의 따옴표 오타를 수정합니다.
    const myRepliesSnap = await db.collectionGroup('replies').where('authorUid', '==', uid).get();
    await batchUpdateSnapshot(myRepliesSnap, {
        authorUid: null,
        author: DELETED_USER_NAME,
        authorNickname: DELETED_USER_NAME,
        authorDeleted: true
    });

    const guidePostsSnap = await db.collection("posts").where("guideReplyAuthorUid", "==", uid).get();
    await batchUpdateSnapshot(guidePostsSnap, {
        guideReplyAuthorUid: null,
        guideReplyAuthor: DELETED_USER_NAME
    });

    try {
        await admin.auth().deleteUser(uid);
    } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
            throw error;
        }
    }

    if (auth.token.email) {
        const hash = crypto.createHash("sha256").update(auth.token.email.trim().toLowerCase()).digest("hex");
        const expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + 30);
        await db.collection("deletedEmails").doc(hash).set({
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            expireAt: admin.firestore.Timestamp.fromDate(expireDate)
        });
    }

    return { success: true };
});

/**
 * 3. 로그인 검증
 */
export const verifyLogin = onCall({ region: "asia-northeast3" }, async (request) => {
    // ... (이전과 동일한 코드)
    const { auth } = request;
    if (!auth || !auth.token.email) {
        throw new HttpsError("unauthenticated", "인증 정보가 없습니다.");
    }
    const { email, uid } = auth.token;

    const hash = crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
    const banSnap = await db.collection("deletedEmails").doc(hash).get();
    if (banSnap.exists) {
        throw new HttpsError("failed-precondition", "탈퇴한 이력이 있는 계정으로는 재가입할 수 없습니다. 30일 후에 다시 시도해주세요.");
    }

    const userSnap = await db.collection("users").doc(uid).get();
    return { success: true, isNewUser: !userSnap.exists };
});


/**
 * 4. 게시글 등불 켜기/끄기 (좋아요 기능) - 수정된 버전
 */
export const toggleLantern = onCall({ region: "asia-northeast3" }, async (request) => {
    const { auth, data } = request;
    if (!auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    const postId = data?.postId as string;
    if (!postId) throw new HttpsError("invalid-argument", "postId가 필요합니다.");

    const postRef = db.collection("posts").doc(postId);
    const lanternRef = db.collection("user_lanterns").doc(auth.uid).collection("posts").doc(postId);

    await db.runTransaction(async (tx) => {
        // =========================================================
        // [Phase 1] 모든 읽기 (READS) - 먼저 다 읽어옵니다.
        // =========================================================

        // 1. 게시글 읽기
        const postSnap = await tx.get(postRef);
        if (!postSnap.exists) throw new HttpsError("not-found", "게시글을 찾을 수 없습니다.");
        const authorUid = postSnap.data()?.authorUid;

        // 2. 내 등불 여부 읽기
        const lanternSnap = await tx.get(lanternRef);

        // 3. (중요) 작성자 정보 미리 읽기 (updateTrustScore 내부 로직을 밖으로 꺼냄)
        // 작성자가 있고 본인이 아닐 경우에만 유저 정보를 읽습니다.
        let authorRef: admin.firestore.DocumentReference | null = null;
        let authorSnap: admin.firestore.DocumentSnapshot | null = null;

        if (authorUid && authorUid !== auth.uid) {
            authorRef = db.collection("users").doc(authorUid);
            authorSnap = await tx.get(authorRef);
        }

        // =========================================================
        // [Phase 2] 모든 쓰기 (WRITES) - 읽기가 끝난 후 실행합니다.
        // =========================================================

        if (lanternSnap.exists) {
            // [끄기]
            tx.delete(lanternRef);
            tx.update(postRef, { lanternCount: admin.firestore.FieldValue.increment(-1) });

            // 신뢰도 차감 (수동 업데이트)
            if (authorRef && authorSnap && authorSnap.exists) {
                // updateTrustScore 함수 대신 직접 업데이트하여 트랜잭션 규칙 준수
                tx.update(authorRef, {
                    trustScore: admin.firestore.FieldValue.increment(-1)
                });
            }
        } else {
            // [켜기]
            tx.set(lanternRef, { postId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
            tx.update(postRef, { lanternCount: admin.firestore.FieldValue.increment(1) });

            // 신뢰도 증가 (수동 업데이트)
            if (authorRef && authorSnap && authorSnap.exists) {
                tx.update(authorRef, {
                    trustScore: admin.firestore.FieldValue.increment(1)
                });
            }
        }
    });

    return { success: true };
});

/**
 * 4-1. 답글 등불 켜기/끄기 (좋아요 기능)
 */
export const toggleReplyLantern = onCall({ region: "asia-northeast3" }, async (request) => {
    const { auth, data } = request;
    if (!auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const postId = data?.postId as string;
    const replyId = data?.replyId;

    if (!postId) throw new HttpsError("invalid-argument", "postId가 필요합니다.");
    if (replyId === undefined || replyId === null) {
        throw new HttpsError("invalid-argument", "replyId가 필요합니다.");
    }

    const postRef = db.collection("posts").doc(postId);
    // 답글 등불 경로: posts/{postId}/replyLanterns/{replyId}_{uid}
    const compositeId = `${replyId}_${auth.uid}`;
    const replyLanternRef = postRef.collection("replyLanterns").doc(compositeId);

    await db.runTransaction(async (tx) => {
        // 1. 게시글 읽기 (존재 여부 확인)
        const postSnap = await tx.get(postRef);
        if (!postSnap.exists) {
            throw new HttpsError("not-found", "게시글을 찾을 수 없습니다.");
        }

        // 2. 답글 등불 여부 읽기
        const replyLanternSnap = await tx.get(replyLanternRef);

        if (replyLanternSnap.exists) {
            // [끄기] - 문서 삭제 (트리거가 자동으로 replies 배열의 lanterns 카운트를 -1)
            tx.delete(replyLanternRef);
        } else {
            // [켜기] - 문서 생성 (트리거가 자동으로 replies 배열의 lanterns 카운트를 +1)
            tx.set(replyLanternRef, {
                replyId: Number(replyId),
                uid: auth.uid,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    });

    return { success: true };
});

/**
 * 4-2. 루멘 보상 지급 (업적 달성 등)
 */
export const awardLumens = onCall({ region: "asia-northeast3" }, async (request) => {
    const { auth, data } = request;
    if (!auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    await checkRateLimit(auth.uid, "awardLumens");

    const amount = data?.amount as number;
    const reason = data?.reason as string;
    const achievementId = data?.achievementId as string | undefined;

    if (!amount || amount <= 0) {
        throw new HttpsError("invalid-argument", "유효한 보상 금액이 필요합니다.");
    }
    if (!reason || typeof reason !== "string") {
        throw new HttpsError("invalid-argument", "보상 사유가 필요합니다.");
    }

    await db.runTransaction(async (tx) => {
        const userRef = db.collection("users").doc(auth.uid);
        const userSnap = await tx.get(userRef);

        if (!userSnap.exists) {
            throw new HttpsError("not-found", "사용자 정보를 찾을 수 없습니다.");
        }

        const currentBalance = userSnap.data()?.lumenBalance || 0;
        const currentTotal = userSnap.data()?.lumenTotalEarned || 0;

        const transactionRecord = {
            id: `award_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            amount,
            reason,
            timestamp: Date.now(),
            achievementId: achievementId || null,
            type: "award",
        };

        tx.update(userRef, {
            lumenBalance: admin.firestore.FieldValue.increment(amount),
            lumenTotalEarned: admin.firestore.FieldValue.increment(amount),
            lumenTransactions: admin.firestore.FieldValue.arrayUnion(transactionRecord),
        });
    });

    return { success: true };
});

/**
 * 5. 칭호 구매
 */
export const purchaseTitle = onCall({ region: "asia-northeast3" }, async (request) => {
    // ... (이전과 동일한 코드)
    const { auth, data } = request;
    if (!auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    await checkRateLimit(auth.uid, "purchaseTitle");
    const titleId = data?.titleId as string;
    if (!titleId) throw new HttpsError("invalid-argument", "titleId가 필요합니다.");

    await db.runTransaction(async (tx) => {
        const userRef = db.collection("users").doc(auth.uid);
        const titleRef = db.collection("titles").doc(titleId);
        const [userSnap, titleSnap] = await Promise.all([tx.get(userRef), tx.get(titleRef)]);

        if (!userSnap.exists || !titleSnap.exists) throw new HttpsError("not-found", "사용자 또는 칭호 정보를 찾을 수 없습니다.");

        const price = titleSnap.data()?.price || 0;
        const balance = userSnap.data()?.lumenBalance || 0;
        if (balance < price) throw new HttpsError("failed-precondition", "루멘 잔액이 부족합니다.");

        const purchasedRef = userRef.collection("purchasedTitles").doc(titleId);
        if ((await tx.get(purchasedRef)).exists) throw new HttpsError("already-exists", "이미 구매한 칭호입니다.");

        tx.update(userRef, {
            lumenBalance: admin.firestore.FieldValue.increment(-price),
            lumenTotalSpent: admin.firestore.FieldValue.increment(price),
        });
        tx.set(purchasedRef, { titleId, purchasedAt: admin.firestore.FieldValue.serverTimestamp(), price });
    });
    return { success: true };
});

/**
 * 6. 길잡이(채택) 댓글 선택
 */
export const selectGuide = onCall({ region: "asia-northeast3" }, async (request) => {
    // ... (이전과 동일한 코드)
    const { auth, data } = request;
    if (!auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    await checkRateLimit(auth.uid, "selectGuide");

    const { postId, replyId } = data as any;

    // postId / replyId 유효성 및 문자열 캐스팅 (Firestore 문서 ID는 문자열이어야 함)
    const postIdStr = String(postId ?? "").trim();
    const replyIdStr = String(replyId ?? "").trim();

    if (!postIdStr || !replyIdStr) {
        throw new HttpsError("invalid-argument", "postId와 replyId가 필요합니다.");
    }

    const GUIDE_REWARD = 5;
    const SAGES_BELL_BONUS_REWARD = 10; // 현자의 종으로 채택된 경우 추가 보상

    const postRef = db.collection("posts").doc(postIdStr);
    const replyIdNum = typeof replyId === "number" ? replyId : parseInt(replyIdStr, 10);

    await db.runTransaction(async (tx) => {
        const postSnap = await tx.get(postRef);
        if (!postSnap.exists) throw new HttpsError("not-found", "게시글을 찾을 수 없습니다.");

        const postData = postSnap.data()!;
        const replies = (postData.replies || []) as any[];

        // replies 배열에서 replyId와 일치하는 답글 찾기
        const replyIndex = replies.findIndex((r: any) => {
            const rId = typeof r.id === "number" ? r.id : parseInt(String(r.id || ""), 10);
            return rId === replyIdNum;
        });

        if (replyIndex === -1) {
            throw new HttpsError("not-found", "답글을 찾을 수 없습니다.");
        }

        const replyData = replies[replyIndex];

        if (postData.authorUid !== auth.uid) {
            throw new HttpsError("permission-denied", "게시글 작성자만 길잡이를 채택할 수 있습니다.");
        }
        if (postData.guideReplyId) {
            throw new HttpsError("failed-precondition", "이미 길잡이가 채택된 글입니다.");
        }

        const replyAuthorUid = replyData.authorUid;
        if (replyAuthorUid === auth.uid) {
            throw new HttpsError("failed-precondition", "자신의 댓글은 길잡이로 채택할 수 없습니다.");
        }
        if (!replyAuthorUid) {
            throw new HttpsError("data-loss", "댓글 작성자 정보가 없습니다.");
        }

        // 현자의 종으로 호출된 글인지 확인
        const isSagesBell = postData.useSagesBell === true;
        const totalReward = isSagesBell ? GUIDE_REWARD + SAGES_BELL_BONUS_REWARD : GUIDE_REWARD;
        const trustScoreBonus = isSagesBell ? SAGES_BELL_BONUS_REWARD : 0;

        // replies 배열에서 해당 답글의 isGuide를 true로 업데이트
        const updatedReplies = [...replies];
        updatedReplies[replyIndex] = { ...replyData, isGuide: true };

        const replyUserRef = db.collection("users").doc(replyAuthorUid);

        tx.update(postRef, {
            guideReplyId: replyIdNum,
            guideReplyAuthorUid: replyAuthorUid,
            replies: updatedReplies,
        });

        // 보상 지급 (현자의 종으로 채택된 경우 추가 보상)
        tx.set(replyUserRef, {
            guideCount: admin.firestore.FieldValue.increment(1),
            lumenBalance: admin.firestore.FieldValue.increment(totalReward),
            lumenTotalEarned: admin.firestore.FieldValue.increment(totalReward),
            trustScore: admin.firestore.FieldValue.increment(trustScoreBonus), // 현자의 종 보너스 신뢰도
        }, { merge: true });
    });

    // ✅ 길잡이 선택 알림 발송
    try {
        const postSnap = await postRef.get();
        if (postSnap.exists) {
            const postData = postSnap.data()!;
            const replies = (postData.replies || []) as any[];
            const replyData = replies.find((r: any) => {
                const rId = typeof r.id === "number" ? r.id : parseInt(String(r.id || ""), 10);
                return rId === replyIdNum;
            });

            if (replyData) {
                const replyAuthorUid = replyData.authorUid;
                const postTitle = postData.title || "게시글";
                const postAuthorNickname = postData.author || "작성자";

                if (replyAuthorUid && replyAuthorUid !== auth.uid) {
                    // 1. Firestore에 알림 문서 생성
                    const notifRef = db
                        .collection("user_notifications")
                        .doc(replyAuthorUid)
                        .collection("items")
                        .doc();

                    const nowMs = Date.now();
                    const isSagesBell = postData.useSagesBell === true;
                    const notificationTitle = isSagesBell
                        ? "🌟 현자의 종으로 채택되었어요! (보너스 보상)"
                        : "길잡이로 채택되었어요 ⭐";
                    const notificationBody = isSagesBell
                        ? `"${postTitle.substring(0, 30)}${postTitle.length > 30 ? '...' : ''}" 글에서 회원님의 답변이 현자의 종으로 선택되었습니다! 추가 보상이 지급되었어요.`
                        : `"${postTitle.substring(0, 30)}${postTitle.length > 30 ? '...' : ''}" 글에서 회원님의 답변이 길잡이로 선택되었습니다.`;

                    await notifRef.set({
                        id: notifRef.id,
                        type: "guide",
                        priority: "high",
                        title: notificationTitle,
                        message: notificationBody,
                        timestamp: nowMs,
                        read: false,
                        data: {
                            postId: postIdStr,
                            replyId: replyIdNum,
                            userId: auth.uid,
                            userName: postAuthorNickname,
                        },
                        toUserUid: replyAuthorUid,
                        fromUserUid: auth.uid,
                        categoryId: postData.categoryId ?? postData.category ?? null,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    });

                    // 2. 푸시 알림 발송 (onNotificationCreated 트리거가 자동으로 처리하지만, 여기서도 직접 발송)
                    await sendPushNotification({
                        targetUid: replyAuthorUid,
                        type: "guide_selected",
                        title: notificationTitle,
                        body: notificationBody,
                        link: `/post/${postIdStr}`
                    });
                }
            }
        }
    } catch (error) {
        // 알림 발송 실패는 로그만 남기고 계속 진행
        logger.error("[selectGuide] 알림 발송 실패", error);
    }

    return { success: true };
});

/**
 * 7. 현자의 종 호출 (질문 작성 시 고수들에게 알림 발송)
 */
export const callSagesBell = onCall({ region: "asia-northeast3" }, async (request) => {
    const { auth, data } = request;
    if (!auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const { postId, categoryId, questionTitle } = data as any;

    if (!postId || !categoryId || !questionTitle) {
        throw new HttpsError("invalid-argument", "postId, categoryId, questionTitle이 필요합니다.");
    }

    const questionLink = `/post/${postId}`;
    const successCount = await callSagesForQuestion(categoryId, questionTitle, questionLink);

    return { success: true, notifiedCount: successCount };
});

/**
 * 8. 테마 구매 (인앱 구매 검증)
 */
export const verifyThemePurchase = onCall({ region: "asia-northeast3" }, async (request) => {
    const { auth, data } = request;
    if (!auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    await checkRateLimit(auth.uid, "verifyThemePurchase");

    const themeId = data?.themeId as string;
    const transactionId = data?.transactionId as string;
    const receipt = data?.receipt as string;
    const platform = data?.platform as string; // "android" | "ios"

    if (!themeId || !transactionId || !receipt || !platform) {
        throw new HttpsError("invalid-argument", "themeId, transactionId, receipt, platform이 필요합니다.");
    }

    // TODO: 실제 구매 영수증 검증 로직 추가
    // Google Play Billing 또는 App Store 영수증 검증
    // 현재는 기본적인 검증만 수행

    const userRef = db.collection("users").doc(auth.uid);

    await db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) throw new HttpsError("not-found", "사용자 정보를 찾을 수 없습니다.");

        const purchasedThemes = userSnap.data()?.purchasedThemes || [];

        if (purchasedThemes.includes(themeId)) {
            throw new HttpsError("already-exists", "이미 구매한 테마입니다.");
        }

        // 구매 내역 저장 (중복 구매 방지)
        const purchaseHistoryRef = db.collection("theme_purchases").doc(transactionId);
        const purchaseSnap = await tx.get(purchaseHistoryRef);

        if (purchaseSnap.exists) {
            throw new HttpsError("already-exists", "이미 처리된 구매입니다.");
        }

        // 구매 내역 저장
        tx.set(purchaseHistoryRef, {
            userId: auth.uid,
            themeId,
            transactionId,
            platform,
            receipt,
            purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 사용자에게 테마 추가
        tx.update(userRef, {
            purchasedThemes: admin.firestore.FieldValue.arrayUnion(themeId),
        });
    });

    return { success: true };
});

/**
 * 9. 사용자 데이터 병합 (익명 계정 -> 기존 계정)
 * `auth/credential-already-in-use` 케이스 처리용
 * 클라이언트에서 호출 시 fromUid는 반드시 현재 로그인된 익명 UID여야 함.
 */
export const mergeUserData = onCall({ region: "asia-northeast3" }, async (request) => {
    const { auth, data } = request;
    if (!auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");

    const fromUid = auth.uid; // 클라이언트에서 넘어온 auth.uid는 익명 계정의 UID
    const toUid = data?.toUid as string; // 기존 구글 계정의 UID

    if (!toUid || fromUid === toUid) {
        throw new HttpsError("invalid-argument", "유효한 toUid가 필요하며, fromUid와 달라야 합니다.");
    }

    // 1. fromUid (익명 계정)와 toUid (기존 계정)의 user 문서를 가져옵니다.
    const fromUserRef = db.collection("users").doc(fromUid);
    const toUserRef = db.collection("users").doc(toUid);

    // Firestore 트랜잭션을 사용하여 원자성 보장
    await db.runTransaction(async (tx) => {
        const [fromUserSnap, toUserSnap] = await Promise.all([
            tx.get(fromUserRef),
            tx.get(toUserRef),
        ]);

        if (!fromUserSnap.exists) {
            throw new HttpsError("not-found", `Source user ${fromUid} not found.`);
        }
        if (!toUserSnap.exists) {
            throw new HttpsError("not-found", `Target user ${toUid} not found.`);
        }

        const fromUserData = fromUserSnap.data()!;
        const toUserData = toUserSnap.data()!;

        // 2. fromUid의 데이터를 toUid로 병합
        // 이관 규칙: toUid에 없는 필드는 추가, lumenBalance와 lumenTotalEarned는 합산
        const mergedUserData: any = {
            ...toUserData,
            ...fromUserData,
            // 닉네임, 이메일, 프로필 이미지는 기존 계정(toUid)의 것을 유지하거나, 클라이언트에서 선택하도록 할 수 있음.
            // 여기서는 toUid의 것을 우선 유지하는 것으로 가정. (클라이언트에서 업데이트 가능)
            nickname: toUserData.nickname || fromUserData.nickname || "",
            email: toUserData.email || fromUserData.email || "",
            profileImage: toUserData.profileImage || fromUserData.profileImage || "",
            onboardingComplete: toUserData.onboardingComplete || fromUserData.onboardingComplete || false,
            communityGuidelinesAgreed: toUserData.communityGuidelinesAgreed || fromUserData.communityGuidelinesAgreed || false,
            lumenBalance: (toUserData.lumenBalance || 0) + (fromUserData.lumenBalance || 0),
            lumenTotalEarned: (toUserData.lumenTotalEarned || 0) + (fromUserData.lumenTotalEarned || 0),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // 배열 필드 병합 (예: purchasedThemes)
        const mergedPurchasedThemes = Array.from(new Set([
            ...(toUserData.purchasedThemes || []),
            ...(fromUserData.purchasedThemes || []),
        ]));
        mergedUserData.purchasedThemes = mergedPurchasedThemes;

        // toUid 문서 업데이트
        tx.set(toUserRef, mergedUserData);

        // 3. fromUid가 작성한 데이터들의 authorUid를 toUid로 업데이트
        const batch = db.batch();

        // Posts
        const postsSnap = await db.collection("posts").where("authorUid", "==", fromUid).get();
        postsSnap.docs.forEach(doc => {
            batch.update(doc.ref, { authorUid: toUid });
        });

        // Replies (컬렉션 그룹)
        const repliesSnap = await db.collectionGroup("replies").where("authorUid", "==", fromUid).get();
        repliesSnap.docs.forEach(doc => {
            batch.update(doc.ref, { authorUid: toUid });
        });

        // User Lanterns (fromUid의 등불 정보를 toUid로 복사/병합)
        const fromLanternsSnap = await db.collection("user_lanterns").doc(fromUid).collection("posts").get();
        for (const doc of fromLanternsSnap.docs) {
            const toLanternRef = db.collection("user_lanterns").doc(toUid).collection("posts").doc(doc.id);
            tx.set(toLanternRef, doc.data(), { merge: true }); // 기존 등불이 있으면 병합
            tx.delete(doc.ref); // fromUid의 등불 삭제
        }

        // User Notifications (toUserUid가 fromUid인 알림을 toUid로 업데이트)
        const notificationsToSnap = await db.collectionGroup("items").where("toUserUid", "==", fromUid).get();
        notificationsToSnap.docs.forEach(doc => {
            batch.update(doc.ref, { toUserUid: toUid });
        });

        // User Notifications (fromUserUid가 fromUid인 알림을 toUid로 업데이트) - 옵션
        const notificationsFromSnap = await db.collectionGroup("items").where("fromUserUid", "==", fromUid).get();
        notificationsFromSnap.docs.forEach(doc => {
            batch.update(doc.ref, { fromUserUid: toUid });
        });

        // Follows (followerUid 또는 followingUid가 fromUid인 경우 toUid로 업데이트)
        const followsAsFollowerSnap = await db.collection("follows").where("followerUid", "==", fromUid).get();
        followsAsFollowerSnap.docs.forEach(doc => {
            batch.update(doc.ref, { followerUid: toUid });
        });

        const followsAsFollowingSnap = await db.collection("follows").where("followingUid", "==", fromUid).get();
        followsAsFollowingSnap.docs.forEach(doc => {
            batch.update(doc.ref, { followingUid: toUid });
        });

        // Theme Purchases (userId가 fromUid인 구매 내역을 toUid로 업데이트)
        const themePurchasesSnap = await db.collection("theme_purchases").where("userId", "==", fromUid).get();
        themePurchasesSnap.docs.forEach(doc => {
            batch.update(doc.ref, { userId: toUid });
        });

        // 기타 컬렉션 (필요 시 추가)

        await batch.commit();

        // 4. fromUid의 user 문서 삭제
        tx.delete(fromUserRef);
    });

    // 5. Firebase Authentication에서 fromUid 사용자 삭제
    try {
        await admin.auth().deleteUser(fromUid);
        logger.info(`Successfully deleted auth user ${fromUid}`);
    } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
            logger.error("Error deleting auth user for merge:", error);
            throw new HttpsError("internal", `Failed to delete source auth user: ${error.message}`);
        }
        logger.info(`Auth user ${fromUid} not found, likely already deleted.`);
    }

    return { success: true };
});