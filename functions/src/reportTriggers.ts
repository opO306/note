import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { admin, db } from "./firebaseAdmin";

const REPORT_NEEDS_REVIEW_THRESHOLD = 3;
const REPORT_AUTO_HIDE_THRESHOLD = 5;

export const onReportCreated = onDocumentCreated("reports/{reportId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;

  const report = snapshot.data() as any;
  const { targetType, targetId, postId } = report;

  if (!targetType || !targetId) {
    console.error("[report] 잘못된 신고 데이터입니다.", report);
    return;
  }

  const reportRef = snapshot.ref;

  // 댓글 신고인 경우: posts/{postId}.replies[] 안에서 처리
  if (targetType === "reply") {
    if (!postId) {
      console.warn("[report] 댓글 신고에 postId가 없습니다.", { reportId: snapshot.id, report });
      return;
    }

    const postRef = db.collection("posts").doc(String(postId));

    await db.runTransaction(async (tx) => {
      const postSnap = await tx.get(postRef);
      if (!postSnap.exists) {
        console.warn("[report] 댓글 신고 대상 게시글을 찾을 수 없습니다.", { postId, targetId });
        return;
      }

      const postData = postSnap.data() as any;
      const replies: any[] = Array.isArray(postData.replies) ? postData.replies : [];

      const index = replies.findIndex(
        (r) => String(r.id ?? "") === String(targetId)
      );

      if (index === -1) {
        console.warn("[report] 댓글 신고 대상 reply를 찾을 수 없습니다.", {
          postId,
          targetId,
        });
        return;
      }

      const originalReply = replies[index] || {};
      const prevCount: number =
        typeof originalReply.reportCount === "number" ? originalReply.reportCount : 0;
      const newCount = prevCount + 1;

      // 댓글 객체 업데이트
      const updatedReply = {
        ...originalReply,
        reportCount: newCount,
      };

      // 신고 문서 업데이트 내용
      const updateReport: any = {};

      // 3회 이상 → needs_review
      if (newCount >= REPORT_NEEDS_REVIEW_THRESHOLD) {
        updateReport.status = "needs_review";
        updateReport.priority = "high";
      }

      // 5회 이상 → 자동 숨김
      if (newCount >= REPORT_AUTO_HIDE_THRESHOLD) {
        updatedReply.hidden = true;
        updatedReply.autoHiddenAt = admin.firestore.Timestamp.now();
        updateReport.status = "auto_hidden";
        updateReport.autoHidden = true;
      }

      // replies 배열 교체
      const updatedReplies = [...replies];
      updatedReplies[index] = updatedReply;

      const updateTarget: any = {
        replies: updatedReplies,
        lastReportedAt: admin.firestore.Timestamp.now(), // 배열 밖 필드에는 Timestamp 가능
      };

      tx.update(postRef, updateTarget);

      if (Object.keys(updateReport).length > 0) {
        tx.update(reportRef, updateReport);
      }
    });

    return;
  }

  // ─────────────────────────────────────
  // 여기부터는 게시글 신고(targetType === "post") 처리
  // ─────────────────────────────────────
  const targetRef = db.collection("posts").doc(String(targetId));

  await db.runTransaction(async (tx) => {
    const targetSnap = await tx.get(targetRef);
    if (!targetSnap.exists) {
      console.warn("[report] 대상 게시글을 찾을 수 없습니다.", { targetId });
      return;
    }

    const targetData = targetSnap.data() || {};
    const prevCount: number = targetData.reportCount ?? 0;
    const newCount = prevCount + 1;

    const updateTarget: any = {
      reportCount: admin.firestore.FieldValue.increment(1),
      lastReportedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const updateReport: any = {};

    if (newCount >= REPORT_NEEDS_REVIEW_THRESHOLD) {
      updateReport.status = "needs_review";
      updateReport.priority = "high";
    }

    if (newCount >= REPORT_AUTO_HIDE_THRESHOLD) {
      updateTarget.hidden = true;
      updateTarget.autoHiddenAt = admin.firestore.FieldValue.serverTimestamp();
      updateReport.status = "auto_hidden";
      updateReport.autoHidden = true;
    }

    tx.update(targetRef, updateTarget);

    if (Object.keys(updateReport).length > 0) {
      tx.update(reportRef, updateReport);
    }
  });
});


/**
 * 신고 상태 변경 트리거:
 *  - status가 confirmed로 바뀌는 순간:
 *    1) 작성자 trustScore 감소
 *    2) (선택) 신고자 trustScore 소폭 증가
 *    3) 대상 글/댓글 hidden = true 로 숨김
 */
export const onReportStatusChanged = onDocumentUpdated("reports/{reportId}", async (event) => {
  const before = event.data?.before;
  const after = event.data?.after;
  if (!before || !after) return;

  const prev = before.data() as any;
  const next = after.data() as any;

  const prevStatus = prev.status;
  const nextStatus = next.status;

  if (prevStatus === nextStatus) return;

  if (nextStatus === "confirmed" && prevStatus !== "confirmed") {
    const targetAuthorUid: string | undefined = next.targetAuthorUid;
    const reporterUid: string | undefined = next.reporterUid;
    const targetType: "post" | "reply" | undefined = next.targetType;
    const targetId: string | undefined = next.targetId;
    const postId: string | undefined = next.postId;

    if (!targetType || !targetId) {
      console.warn("[report] confirmed 신고에 필요한 필드가 없습니다.(target)", {
        targetAuthorUid,
        targetType,
        targetId,
      });
      return;
    }

    // 작성자/신고자 UID → trustScore 조정용
    const authorRef = targetAuthorUid
      ? db.collection("users").doc(targetAuthorUid)
      : null;

    const reporterRef = reporterUid
      ? db.collection("users").doc(reporterUid)
      : null;

    // 게시글 신고: posts/{targetId} 숨김
    if (targetType === "post") {
      const postRef = db.collection("posts").doc(String(targetId));

      await db.runTransaction(async (tx) => {
        const [targetSnap, authorSnap, reporterSnap] = await Promise.all([
          tx.get(postRef),
          authorRef ? tx.get(authorRef) : Promise.resolve(null),
          reporterRef ? tx.get(reporterRef) : Promise.resolve(null),
        ]);

        // 작성자 trustScore 감소
        if (authorRef && authorSnap && authorSnap.exists) {
          const authorData = authorSnap.data() || {};
          const prevScore: number = authorData.trustScore ?? 30;
          const newScore = Math.max(0, prevScore - 10);
          tx.update(authorRef, { trustScore: newScore });
        }

        // 신고자 trustScore 소폭 증가
        if (reporterRef && reporterSnap && reporterSnap.exists) {
          const reporterData = reporterSnap.data() || {};
          const prevScore: number = reporterData.trustScore ?? 30;
          const newScore = Math.min(100, prevScore + 1);
          tx.update(reporterRef, { trustScore: newScore });
        }

        if (targetSnap.exists) {
          const targetData = targetSnap.data() || {};
          if (!targetData.hidden) {
            tx.update(postRef, {
              hidden: true,
              hiddenReason: "report_confirmed",
              autoHiddenAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }
      });

      return;
    }

    // 댓글 신고: posts/{postId}.replies[] 안의 해당 reply만 숨김
    if (targetType === "reply") {
      if (!postId) {
        console.warn("[report] 댓글 confirmed인데 postId가 없습니다.", {
          targetId,
        });
        return;
      }

      const postRef = db.collection("posts").doc(String(postId));

      await db.runTransaction(async (tx) => {
        const [postSnap, authorSnap, reporterSnap] = await Promise.all([
          tx.get(postRef),
          authorRef ? tx.get(authorRef) : Promise.resolve(null),
          reporterRef ? tx.get(reporterRef) : Promise.resolve(null),
        ]);

        // trustScore 조정 (게시글과 동일)
        if (authorRef && authorSnap && authorSnap.exists) {
          const authorData = authorSnap.data() || {};
          const prevScore: number = authorData.trustScore ?? 30;
          const newScore = Math.max(0, prevScore - 10);
          tx.update(authorRef, { trustScore: newScore });
        }

        if (reporterRef && reporterSnap && reporterSnap.exists) {
          const reporterData = reporterSnap.data() || {};
          const prevScore: number = reporterData.trustScore ?? 30;
          const newScore = Math.min(100, prevScore + 1);
          tx.update(reporterRef, { trustScore: newScore });
        }

        if (!postSnap.exists) {
          console.warn("[report] 댓글 confirmed 대상 게시글이 없습니다.", {
            postId,
            targetId,
          });
          return;
        }

        const postData = postSnap.data() as any;
        const replies: any[] = Array.isArray(postData.replies)
          ? postData.replies
          : [];

        const index = replies.findIndex(
          (r) => String(r.id ?? "") === String(targetId)
        );

        if (index === -1) {
          console.warn("[report] 댓글 confirmed 대상 reply를 찾지 못했습니다.", {
            postId,
            targetId,
          });
          return;
        }

        const reply = replies[index] || {};

        if (reply.hidden === true) {
          // 이미 숨겨져 있으면 아무 것도 안 함
          return;
        }

        const updatedReply = {
          ...reply,
          hidden: true,
          hiddenReason: "report_confirmed",
          autoHiddenAt: admin.firestore.Timestamp.now(),
        };

        const updatedReplies = [...replies];
        updatedReplies[index] = updatedReply;

        tx.update(postRef, {
          replies: updatedReplies,
        });
      });
    }
  }
});
