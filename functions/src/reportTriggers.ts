import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { admin, db } from "./firebaseAdmin";
import * as logger from "firebase-functions/logger";

// ─────────────────────────────────────────────────────────────
// 1. 설정 및 인터페이스
// ─────────────────────────────────────────────────────────────

const REPORT_NEEDS_REVIEW_THRESHOLD = 3;
const REPORT_AUTO_HIDE_THRESHOLD = 5;

interface ReplyData {
  id: string;
  authorUid?: string;
  content: string;
  reportCount?: number;
  hidden?: boolean;
  autoHiddenAt?: admin.firestore.Timestamp;
  moderationStatus?: "pending" | "approved" | "rejected" | "needs_review" | "action_needed" | "error"; // moderationStatus 추가
  clientIp?: string; // clientIp 추가
  guestId?: string; // guestId 추가
  [key: string]: any;
}

interface PostData {
  authorUid?: string;
  reportCount?: number;
  hidden?: boolean;
  replies?: ReplyData[];
  moderationStatus?: "pending" | "approved" | "rejected" | "needs_review" | "action_needed" | "error"; // moderationStatus 추가
  clientIp?: string; // clientIp 추가
  guestId?: string; // guestId 추가
  [key: string]: any;
}

interface ReportData {
  targetType: "post" | "reply";
  targetId: string;
  postId?: string; // 댓글 신고일 경우 필수
  targetAuthorUid?: string;
  reporterUid?: string;
  status?: string;
  [key: string]: any;
}

// ─────────────────────────────────────────────────────────────
// 2. 헬퍼 함수 (트랜잭션 내부용)
// ─────────────────────────────────────────────────────────────

/**
 * 트랜잭션 내에서 유저의 신뢰도를 업데이트하는 헬퍼
 */
async function updateUserTrustScore(
  tx: admin.firestore.Transaction,
  userId: string,
  delta: number
) {
  const userRef = db.collection("users").doc(userId);
  const userSnap = await tx.get(userRef);

  if (!userSnap.exists) return;

  const userData = userSnap.data();
  const currentScore = typeof userData?.trustScore === "number" ? userData.trustScore : 30;

  // 0 ~ 100 사이로 점수 제한
  const newScore = Math.max(0, Math.min(100, currentScore + delta));

  if (currentScore !== newScore) {
    tx.update(userRef, {
      trustScore: newScore,
      // (옵션) 변동 로그를 남기고 싶다면 아래 주석 해제
      /*
      trustLogs: admin.firestore.FieldValue.arrayUnion({
          delta,
          reason: "report_confirmed",
          createdAt: admin.firestore.Timestamp.now()
      })
      */
    });
  }
}

// ─────────────────────────────────────────────────────────────
// 3. Cloud Functions 트리거
// ─────────────────────────────────────────────────────────────

/**
 * 신고 생성 시 트리거 (onReportCreated)
 * - 신고 카운트 증가
 * - 임계치 도달 시 상태 변경 (needs_review) 또는 자동 숨김 (auto_hidden)
 */
export const onReportCreated = onDocumentCreated(
  { document: "reports/{reportId}", region: "asia-northeast3" },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;

    const report = snapshot.data() as ReportData;
    const { targetType, targetId, postId } = report;
    const reportRef = snapshot.ref;

    if (!targetType || !targetId) {
      logger.error("[report] 잘못된 신고 데이터입니다.", report);
      return;
    }

    // A. 댓글 신고 처리 (replies 배열 수정)
    if (targetType === "reply") {
      if (!postId) {
        logger.warn("[report] 댓글 신고에 postId가 없습니다.", { reportId: snapshot.id });
        return;
      }

      const postRef = db.collection("posts").doc(String(postId));

      await db.runTransaction(async (tx) => {
        const postSnap = await tx.get(postRef);
        if (!postSnap.exists) return;

        const postData = postSnap.data() as PostData;
        const replies = postData.replies || [];
        const index = replies.findIndex((r) => String(r.id) === String(targetId));

        if (index === -1) return;

        const originalReply = replies[index];
        const prevCount = originalReply.reportCount || 0;
        const newCount = prevCount + 1;

        // 업데이트할 내용 준비
        const updatedReply: ReplyData = {
          ...originalReply,
          reportCount: newCount,
        };

        const updateReportPayload: any = {};

        // 3회 이상 -> 검토 필요
        if (newCount >= REPORT_NEEDS_REVIEW_THRESHOLD) {
          updateReportPayload.status = "needs_review";
          updateReportPayload.priority = "high";
        }

        // 5회 이상 -> 자동 숨김
        if (newCount >= REPORT_AUTO_HIDE_THRESHOLD) {
          updatedReply.hidden = true;
          updatedReply.autoHiddenAt = admin.firestore.Timestamp.now(); // 배열 내부는 Timestamp 객체 사용
          updateReportPayload.status = "auto_hidden";
          updateReportPayload.autoHidden = true;
          updatedReply.moderationStatus = "rejected"; // 자동 숨김 시 moderationStatus 업데이트
        }

        const newReplies = [...replies];
        newReplies[index] = updatedReply;

        tx.update(postRef, {
          replies: newReplies,
          lastReportedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        if (Object.keys(updateReportPayload).length > 0) {
          tx.update(reportRef, updateReportPayload);
        }
      });
      return;
    }

    // B. 게시글 신고 처리 (Post 문서 수정)
    if (targetType === "post") {
      const targetRef = db.collection("posts").doc(String(targetId));

      await db.runTransaction(async (tx) => {
        const targetSnap = await tx.get(targetRef);
        if (!targetSnap.exists) return;

        const targetData = targetSnap.data() as PostData;
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
          updateTargetPayload.moderationStatus = "rejected"; // 자동 숨김 시 moderationStatus 업데이트
        }

        tx.update(targetRef, updateTargetPayload);

        if (Object.keys(updateReportPayload).length > 0) {
          tx.update(reportRef, updateReportPayload);
        }
      });
    }
  }
);

/**
 * 신고 상태 변경 트리거 (onReportStatusChanged)
 * - 관리자가 'confirmed'로 변경 시 수행
 * 1) 작성자 신뢰도 차감 (-10)
 * 2) 신고자 신뢰도 보상 (+1)
 * 3) 대상 콘텐츠 강제 숨김 처리
 */
export const onReportStatusChanged = onDocumentUpdated(
  { document: "reports/{reportId}", region: "asia-northeast3" },
  async (event) => {
    const before = event.data?.before;
    const after = event.data?.after;
    if (!before || !after) return;

    const prev = before.data() as ReportData;
    const next = after.data() as ReportData;

    // 상태가 변하지 않았거나, confirmed가 아닌 경우 무시
    if (prev.status === next.status || next.status !== "confirmed") return;

    const { targetAuthorUid, reporterUid, targetType, targetId, postId } = next;

    if (!targetType || !targetId) {
      logger.warn("[report] 신고 확정 실패: 필수 정보 누락", { targetType, targetId });
      return;
    }

    // 게시글/댓글 공통 로직: 트랜잭션 하나로 처리
    const rootDocRef = targetType === "post"
      ? db.collection("posts").doc(targetId)
      : db.collection("posts").doc(String(postId)); // 댓글이면 부모 글이 루트

    await db.runTransaction(async (tx) => {
      // 1. 문서 존재 확인
      const rootDocSnap = await tx.get(rootDocRef);
      if (!rootDocSnap.exists) return;

      // 2. 신뢰도 업데이트 (작성자 -10, 신고자 +1)
      if (targetAuthorUid) {
        await updateUserTrustScore(tx, targetAuthorUid, -10);
      }
      if (reporterUid) {
        await updateUserTrustScore(tx, reporterUid, 1);
      }

      // 3. 콘텐츠 숨김 처리 (hidden: true) 및 IP/계정 차단
      if (targetType === "post") {
        const postData = rootDocSnap.data() as PostData;
        if (!postData.hidden) {
          tx.update(rootDocRef, {
            hidden: true,
            hiddenReason: "report_confirmed",
            confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
            moderationStatus: "rejected", // 관리자 확정 시 moderationStatus 업데이트
          });

          // IP 차단 로직
          if (postData.clientIp) {
            await db.collection("blockedIPs").doc(postData.clientIp).set({
                ip: postData.clientIp,
                reason: "Report Confirmed (Post)",
                blockedAt: admin.firestore.FieldValue.serverTimestamp(),
                triggeredByReportId: after.id,
                triggeredByPostId: targetId,
            });
            logger.warn(`[Report Trigger] 신고 확정으로 IP(${postData.clientIp}) 자동 차단됨 (게시글: ${targetId}).`);
          }
          
          // 계정 정지 로직 (일반 사용자 또는 게스트 ID)
          if (postData.authorUid) { // 일반 사용자
              await tx.update(db.collection("users").doc(postData.authorUid), {
                  isSuspended: true,
                  suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
                  suspendedReason: "Report Confirmed (Post)",
              });
              logger.warn(`[Report Trigger] 신고 확정으로 사용자 UID(${postData.authorUid}) 정지됨 (게시글: ${targetId}).`);
          } else if (postData.guestId) { // 게스트 사용자
              await db.collection("suspendedGuestIds").doc(postData.guestId).set({
                  guestId: postData.guestId,
                  reason: "Report Confirmed (Post)",
                  suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
                  triggeredByReportId: after.id,
                  triggeredByPostId: targetId,
              });
              logger.warn(`[Report Trigger] 신고 확정으로 게스트 ID(${postData.guestId}) 정지됨 (게시글: ${targetId}).`);
          }
        }
      } else if (targetType === "reply") {
        const postData = rootDocSnap.data() as PostData;
        const replies = postData.replies || [];
        const index = replies.findIndex((r) => String(r.id) === String(targetId));

        if (index !== -1 && !replies[index].hidden) {
          const newReplies = [...replies];
          newReplies[index] = {
            ...newReplies[index],
            hidden: true,
            hiddenReason: "report_confirmed",
            autoHiddenAt: admin.firestore.Timestamp.now(),
            moderationStatus: "rejected", // 관리자 확정 시 moderationStatus 업데이트
          };
          tx.update(rootDocRef, { replies: newReplies });

          // IP 차단 로직
          if (replies[index].clientIp) {
            await db.collection("blockedIPs").doc(replies[index].clientIp!).set({
                ip: replies[index].clientIp,
                reason: "Report Confirmed (Reply)",
                blockedAt: admin.firestore.FieldValue.serverTimestamp(),
                triggeredByReportId: after.id,
                triggeredByPostId: postId,
                triggeredByReplyId: targetId,
            });
            logger.warn(`[Report Trigger] 신고 확정으로 IP(${replies[index].clientIp}) 자동 차단됨 (댓글: ${targetId}).`);
          }

          // 계정 정지 로직 (일반 사용자 또는 게스트 ID)
          if (replies[index].authorUid) { // 일반 사용자
              await tx.update(db.collection("users").doc(replies[index].authorUid!), {
                  isSuspended: true,
                  suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
                  suspendedReason: "Report Confirmed (Reply)",
              });
              logger.warn(`[Report Trigger] 신고 확정으로 사용자 UID(${replies[index].authorUid}) 정지됨 (댓글: ${targetId}).`);
          } else if (replies[index].guestId) { // 게스트 사용자
              await db.collection("suspendedGuestIds").doc(replies[index].guestId!).set({
                  guestId: replies[index].guestId,
                  reason: "Report Confirmed (Reply)",
                  suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
                  triggeredByReportId: after.id,
                  triggeredByPostId: postId,
                  triggeredByReplyId: targetId,
              });
              logger.warn(`[Report Trigger] 신고 확정으로 게스트 ID(${replies[index].guestId}) 정지됨 (댓글: ${targetId}).`);
          }
        }
      }
    });
  }
);
