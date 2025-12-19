import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as crypto from "crypto";

// core.ts 파일에서 공유 모듈과 함수를 가져옵니다.
import {
    db,
    admin,
    checkRateLimit,
    batchUpdateSnapshot,
    DELETED_USER_NAME,
    updateTrustScore // 🚨 [수정 1] updateTrustScore를 import 목록에 추가합니다.
} from "./core";

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

    const snap = await db.collection("users").where("nicknameLower", "==", nicknameLower).limit(1).get();
    if (!snap.empty && snap.docs[0].id !== auth.uid) {
        throw new HttpsError("already-exists", "이미 사용 중인 닉네임입니다.");
    }

    const userRef = db.collection("users").doc(auth.uid);
    await db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        const now = admin.firestore.FieldValue.serverTimestamp();
        const payload: any = {
            nickname,
            nicknameLower,
            onboardingComplete: true,
            communityGuidelinesAgreed: true,
            updatedAt: now,
        };

        if (!userSnap.exists) {
            payload.createdAt = now;
            payload.role = "user";
            payload.trustScore = 30;
        }

        const picture = auth.token?.picture;
        if (picture && !userSnap.data()?.photoURL) {
            payload.photoURL = picture;
        }

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
 * 4. 게시글 등불 켜기/끄기 (좋아요 기능)
 */
export const toggleLantern = onCall({ region: "asia-northeast3" }, async (request) => {
    // ... (이전과 동일한 코드, 이제 updateTrustScore를 찾을 수 있음)
    const { auth, data } = request;
    if (!auth) throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    const postId = data?.postId as string;
    if (!postId) throw new HttpsError("invalid-argument", "postId가 필요합니다.");

    const postRef = db.collection("posts").doc(postId);
    const lanternRef = db.collection("user_lanterns").doc(auth.uid).collection("posts").doc(postId);

    await db.runTransaction(async (tx) => {
        const postSnap = await tx.get(postRef);
        if (!postSnap.exists) throw new HttpsError("not-found", "게시글을 찾을 수 없습니다.");

        const authorUid = postSnap.data()?.authorUid;
        const lanternSnap = await tx.get(lanternRef);

        if (lanternSnap.exists) {
            tx.delete(lanternRef);
            tx.update(postRef, { lanternCount: admin.firestore.FieldValue.increment(-1) });
            if (authorUid && authorUid !== auth.uid) {
                await updateTrustScore(tx, authorUid, -1, "lantern_removed");
            }
        } else {
            tx.set(lanternRef, { postId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
            tx.update(postRef, { lanternCount: admin.firestore.FieldValue.increment(1) });
            if (authorUid && authorUid !== auth.uid) {
                await updateTrustScore(tx, authorUid, 1, "lantern_received");
            }
        }
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
    if (!postId || !replyId) throw new HttpsError("invalid-argument", "postId와 replyId가 필요합니다.");

    const GUIDE_REWARD = 5;

    const postRef = db.collection("posts").doc(postId);
    const replyRef = postRef.collection("replies").doc(replyId);

    await db.runTransaction(async (tx) => {
        const [postSnap, replySnap] = await Promise.all([tx.get(postRef), tx.get(replyRef)]);
        if (!postSnap.exists || !replySnap.exists) throw new HttpsError("not-found", "게시글 또는 댓글을 찾을 수 없습니다.");

        const postData = postSnap.data()!;
        const replyData = replySnap.data()!;

        if (postData.authorUid !== auth.uid) throw new HttpsError("permission-denied", "게시글 작성자만 길잡이를 채택할 수 있습니다.");
        if (postData.guideReplyId) throw new HttpsError("failed-precondition", "이미 길잡이가 채택된 글입니다.");

        const replyAuthorUid = replyData.authorUid;
        if (replyAuthorUid === auth.uid) throw new HttpsError("failed-precondition", "자신의 댓글은 길잡이로 채택할 수 없습니다.");
        if (!replyAuthorUid) throw new HttpsError("data-loss", "댓글 작성자 정보가 없습니다.");

        const replyUserRef = db.collection("users").doc(replyAuthorUid);

        tx.update(postRef, { guideReplyId: replyId, guideReplyAuthorUid: replyAuthorUid });
        tx.update(replyRef, { isGuide: true });
        tx.set(replyUserRef, {
            guideCount: admin.firestore.FieldValue.increment(1),
            lumenBalance: admin.firestore.FieldValue.increment(GUIDE_REWARD),
            lumenTotalEarned: admin.firestore.FieldValue.increment(GUIDE_REWARD),
        }, { merge: true });
    });
    return { success: true };
});