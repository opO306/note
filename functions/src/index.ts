import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentDeleted, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as functionsV1 from "firebase-functions/v1"; // v1 함수를 위해 추가

if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

setGlobalOptions({ region: "asia-northeast3" });

/* ---------- v1 (Auth Trigger) ---------- */
export const createUserDoc = functionsV1
  .region("asia-northeast3")
  .auth.user()
  .onCreate(async (user) => {
    const ref = admin.firestore().doc(`users/${user.uid}`);
    if ((await ref.get()).exists) return;            // idempotent

    await ref.set({
      nickname: "",
      email: user.email ?? "",
      profileImage: "",
      role: "user",
      trustScore: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      onboardingComplete: false,
    });
  });

/**
 * ✅ 관리자 클레임 부여(Callable)
 * - 이미 admin인 사용자만 다른 사용자에게 admin을 부여 가능
 * - 최초 1명 부트스트랩은 아래 2-2 스크립트로 처리
 *
 * 커스텀 클레임은 Admin SDK로 설정하고, Rules에서는 request.auth.token으로 검사
 */
export const setAdminClaim = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Login required.");
  if (req.auth.token.admin !== true) throw new HttpsError("permission-denied", "Admin only.");

  const targetUid = String(req.data?.uid || "");
  const makeAdmin = Boolean(req.data?.admin);

  if (!targetUid) throw new HttpsError("invalid-argument", "uid is required.");

  // 주의: setCustomUserClaims는 기존 클레임을 덮어쓸 수 있으므로 병합 처리 권장
  const user = await admin.auth().getUser(targetUid);
  const prev = user.customClaims || {};
  const next = { ...prev, admin: makeAdmin };

  await admin.auth().setCustomUserClaims(targetUid, next);

  return { ok: true, uid: targetUid, admin: makeAdmin };
});

/**
 * ✅ 댓글 생성 트리거: posts 집계/메타 업데이트 + 알림 생성(중복 방지)
 *
 * Firestore 트리거는 at-least-once 이므로, idempotency(중복 호출 대비)가 필요
 * 여기서는 commentId 기반의 event marker 문서로 중복을 차단합니다.
 */
export const onCommentCreated = onDocumentCreated("posts/{postId}/comments/{commentId}", async (event) => {
  const { postId, commentId } = event.params;
  const snap = event.data;
  if (!snap) return;

  const comment = snap.data() as {
    authorUid: string;
    nickname?: string;
    profileImage?: string;
    createdAt?: admin.firestore.Timestamp;
    postId: string;
  };

  // 1) 이벤트 중복 방지 마커
  const markerRef = db.doc(`posts/${postId}/_commentEvents/${commentId}`);
  const postRef = db.doc(`posts/${postId}`);

  await db.runTransaction(async (tx) => {
    const marker = await tx.get(markerRef);
    if (marker.exists) return; // 이미 처리됨

    const postSnap = await tx.get(postRef);
    if (!postSnap.exists) {
      // 글이 삭제된 경우 등: 마커만 남기지 않도록 여기서 중단
      throw new HttpsError("not-found", "Post not found.");
    }

    const post = postSnap.data() as { authorUid: string };

    // 마커 기록(처리됨)
    tx.create(markerRef, {
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      type: "commentCreated",
    });

    // posts 집계/메타 업데이트
    tx.update(postRef, {
      commentCount: admin.firestore.FieldValue.increment(1),
      lastCommentAt: admin.firestore.FieldValue.serverTimestamp(),
      lastCommentAuthorUid: comment.authorUid,
      lastCommentNickname: comment.nickname || null,
      lastCommentProfileImage: comment.profileImage || null,
    });

    // 2) 알림 생성 (작성자에게만, 자기 댓글은 제외)
    if (post.authorUid && post.authorUid !== comment.authorUid) {
      const notiId = `comment_${postId}_${commentId}`; // 결정적 ID로 중복 방지
      const notiRef = db.doc(`user_notifications/${post.authorUid}/items/${notiId}`);

      tx.set(notiRef, {
        toUid: post.authorUid,
        fromUid: comment.authorUid,
        type: "comment",
        postId,
        commentId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
      }, { merge: false });
    }
  });
});

/**
 * ✅ 댓글 삭제 트리거: commentCount 감소(중복 방지)
 * - lastComment* 정합성까지 완벽히 맞추려면 "최신 댓글 재조회"가 필요하지만,
 *   비용/복잡도 증가가 크므로 우선 count만 안전하게 맞추는 형태.
 */
export const onCommentDeleted = onDocumentDeleted("posts/{postId}/comments/{commentId}", async (event) => {
  const { postId, commentId } = event.params;

  const markerRef = db.doc(`posts/${postId}/_commentEvents_deleted/${commentId}`);
  const postRef = db.doc(`posts/${postId}`);

  await db.runTransaction(async (tx) => {
    const marker = await tx.get(markerRef);
    if (marker.exists) return;

    const postSnap = await tx.get(postRef);
    if (!postSnap.exists) return;

    tx.create(markerRef, {
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      type: "commentDeleted",
    });

    tx.update(postRef, {
      commentCount: admin.firestore.FieldValue.increment(-1),
    });
  });
});

export const onGuideSelected = onDocumentUpdated("posts/{postId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;

  // guide가 "없음 -> 설정됨"일 때만
  if (before.guideCommentId != null) return;
  if (after.guideCommentId == null) return;

  const postId = event.params.postId;
  const commentId = String(after.guideCommentId);

  // 댓글 문서 로드
  const commentRef = db.doc(`posts/${postId}/comments/${commentId}`);
  const commentSnap = await commentRef.get();
  if (!commentSnap.exists) return;

  const c = commentSnap.data() as any;

  // 댓글에 표시
  await commentRef.set({ isGuide: true, guideMarkedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

  // (옵션) 알림: 댓글 작성자에게
  const toUid = c.authorUid;
  const notiId = `guide_${postId}_${commentId}`; // 결정적 ID로 중복 방지
  await db.doc(`user_notifications/${toUid}/items/${notiId}`).set({
    toUid,
    fromUid: after.authorUid,
    type: "guide_selected",
    postId,
    commentId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    read: false,
  }, { merge: false });

  // (옵션) 보상/점수: 트랜잭션으로 안전하게
  // await db.doc(`users/${toUid}`).update({ lumenBalance: admin.firestore.FieldValue.increment(10) });
});


/* ---------- v2 Functions (Explicit Imports) ---------- */
// aiAutoReply.ts
export { aiAutoReply } from "./aiAutoReply";

// aiModeration.ts
export { aiModerationReview } from "./aiModeration";

// weeklyQuiz.ts
export { generateWeeklyQuiz } from "./weeklyQuiz";

// triggers.ts
export { onPostCreated, onPostUpdated, onNotificationCreated, onLanternCreated } from "./triggers"; // onReportCreated, onReportStatusChanged, onFollowCreated, onFollowDeleted 제거

// callable.ts
export { finalizeOnboarding, deleteAccount, verifyLogin, toggleLantern, toggleReplyLantern, awardLumens, purchaseTitle, selectGuide, callSagesBell, verifyThemePurchase, mergeUserData } from "./callable";

// dailyRecommendations.ts
export { sendMorningRecommendations } from "./dailyRecommendations";

// ai.ts
export { generatePoem } from "./ai";

// weeklyStats.ts
export { calcWeeklyStats } from "./weeklyStats";

// lanternTriggers.ts
export { lanternCreatedV2, lanternDeletedV2, replyLanternCreatedV2, replyLanternDeletedV2 } from "./lanternTriggers";

// aiScheduler.ts
export { autoAiReply } from "./aiScheduler";

// reportTriggers.ts
export { onReportCreated, onReportStatusChanged } from "./reportTriggers"; // 직접 내보냄

// followTriggers.ts
export { followCreatedV2, followDeletedV2 } from "./followTriggers"; // 직접 내보냄

// trustTriggers.ts
export { trustReportCreated, trustReportStatusUpdated, trustLanternCreated, trustLanternDeleted, trustReplyLanternCreated, trustPostCreated } from "./trustTriggers";

// authCleanup.ts
export { cleanupUserDataOnAuthDelete } from "./authCleanup";

// purgeDeletedUsers.ts
export { purgeDeletedUsers } from "./purgeDeletedUsers";
