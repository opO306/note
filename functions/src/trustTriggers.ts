import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { admin, db } from "./firebaseAdmin";

/**
 * 신뢰도(Trust Score) 서버 집계 트리거 모음
 * - posts/{postId}/reports/{reportId} 생성/상태변경
 * - lanterns, replies, guides 등 이벤트를 users/{uid}의 trustScore에 반영
 *
 * 단순화된 예시:
 *   - 신고 생성 시: 신고 대상 trustScore -2 (최소 0까지)
 *   - 신고 승인/처리 시: 추가 -3
 *   - 등불 받음: +0.2 (최대 100)
 *
 * 필요 시 정책에 맞게 가중치를 조정하세요.
 */

const clampTrust = (value: number) => Math.max(0, Math.min(100, value));

async function applyTrustDelta(uid: string, delta: number, reason: string) {
    if (!uid) return;
    const userRef = db.collection("users").doc(uid);

    await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists) throw new HttpsError("not-found", "user not found");

        const current = typeof snap.data()?.trustScore === "number" ? snap.data()!.trustScore : 30;
        const next = clampTrust(current + delta);

        tx.update(userRef, {
            trustScore: next,
            trustLogs: admin.firestore.FieldValue.arrayUnion({
                id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                delta,
                reason,
                ts: admin.firestore.FieldValue.serverTimestamp(),
            }),
        });
    });
}

/**
 * 신고 생성 시 신뢰도 감소
 * 경로: reports/{reportId}
 * - targetType: "post" | "reply"
 * - targetAuthorUid: 신고 대상 UID
 */
export const trustReportCreated = onDocumentCreated(
    { document: "reports/{reportId}", region: "asia-northeast3" },
    async (event) => {
        const data = event.data?.data() as any;
        if (!data) return;

        // 정책 변경: 신고 생성만으로는 신뢰도 변화 없음
        return;
    }
);

/**
 * 신고 상태 변경 시 추가 감소 (예: 'approved'로 확정)
 */
export const trustReportStatusUpdated = onDocumentUpdated(
    { document: "reports/{reportId}", region: "asia-northeast3" },
    async (event) => {
        const before = event.data?.before?.data() as any;
        const after = event.data?.after?.data() as any;
        if (!before || !after) return;

        const targetUid = after.targetAuthorUid;
        if (!targetUid) return;

        // 상태가 pending -> approved 로 바뀐 경우만 반영
        if (before.status !== "approved" && after.status === "approved") {
            try {
                await applyTrustDelta(targetUid, -10, "report_approved");
            } catch (error) {
                logger.error("[trust] report_approved apply delta failed", { error });
            }
        }
    }
);

/**
 * 등불 집계 트리거에 연동: posts/{postId}/lanterns/{uid}
 * - 글 작성자 신뢰도 소폭 가산
 */
export const trustLanternCreated = onDocumentCreated(
    { document: "posts/{postId}/lanterns/{uid}", region: "asia-northeast3" },
    async (event) => {
        const { postId } = event.params;
        const postSnap = await db.collection("posts").doc(postId).get();
        if (!postSnap.exists) return;
        const post = postSnap.data() as any;
        const authorUid = post?.authorUid;
        if (!authorUid) return;

        // 길잡이(guide) 유형의 글에만 신뢰도 보너스 적용
        const postType = (post?.type || post?.postType || "").toString().toLowerCase();
        const isGuidePost = postType === "guide" || post?.isGuide === true;
        if (!isGuidePost) return;

        try {
            await applyTrustDelta(authorUid, +0.5, "lantern_received_guide");
        } catch (error) {
            logger.error("[trust] lantern_received apply delta failed", { error });
        }
    }
);

export const trustLanternDeleted = onDocumentUpdated(
    { document: "posts/{postId}", region: "asia-northeast3" },
    async (event) => {
        // 단순화: lanterns 감소를 신뢰도에 바로 반영하지 않음
    }
);

/**
 * 답글 등불: posts/{postId}/replyLanterns/{compositeId}
 */
export const trustReplyLanternCreated = onDocumentCreated(
    { document: "posts/{postId}/replyLanterns/{compositeId}", region: "asia-northeast3" },
    async (event) => {
        const { postId, compositeId } = event.params;
        const [replyIdRaw] = (compositeId ?? "").split("_");
        const replyId = Number(replyIdRaw);
        if (Number.isNaN(replyId)) return;

        const postSnap = await db.collection("posts").doc(postId).get();
        if (!postSnap.exists) return;
        const post = postSnap.data() as any;
        const replies: any[] = Array.isArray(post?.replies) ? post.replies : [];
        const reply = replies.find((r) => r?.id === replyId);
        const authorUid = reply?.authorUid;
        if (!authorUid) return;

        try {
            await applyTrustDelta(authorUid, +0.1, "reply_lantern_received");
        } catch (error) {
            logger.error("[trust] reply_lantern_received apply delta failed", { error });
        }
    }
);

/**
 * 게시글 작성 트리거: posts/{postId} 생성 시 기본 신뢰도 복구 (옵션)
 * - 스팸성 생성이 많다면 rate limit로 대체 가능
 */
export const trustPostCreated = onDocumentCreated(
    { document: "posts/{postId}", region: "asia-northeast3" },
    async (event) => {
        const post = event.data?.data() as any;
        if (!post) return;
        // 정책 변경: 게시글 작성 시 신뢰도 보너스 없음
        return;
    }
);

