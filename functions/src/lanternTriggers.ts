import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { admin, db } from "./firebaseAdmin";

/**
 * 등불(좋아요) 트리거
 * 경로: posts/{postId}/lanterns/{uid}
 * - 생성 시 posts.lanterns(또는 lanternCount) +1
 * - 삭제 시 -1
 *
 * 클라이언트 규칙에서 posts의 집계 필드는 수정 불가이므로
 * 집계는 서버 트리거로만 반영한다.
 */

async function adjustLanternCount(postId: string, delta: number) {
  if (!postId || delta === 0) return;

  const postRef = db.collection("posts").doc(postId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(postRef);
    if (!snap.exists) {
      logger.warn("[lantern] post not found", { postId });
      return;
    }

    tx.update(postRef, {
      lanterns: admin.firestore.FieldValue.increment(delta),
      lanternCount: admin.firestore.FieldValue.increment(delta),
    });
  });
}

export const lanternCreatedV2 = onDocumentCreated(
  { document: "posts/{postId}/lanterns/{uid}", region: "asia-northeast3" },
  async (event: any) => {
    const { postId } = event.params;
    await adjustLanternCount(postId, 1);
  },
);

export const lanternDeletedV2 = onDocumentDeleted(
  { document: "posts/{postId}/lanterns/{uid}", region: "asia-northeast3" },
  async (event: any) => {
    const { postId } = event.params;
    await adjustLanternCount(postId, -1);
  },
);

/**
 * 답글 등불(좋아요) 트리거
 * 경로: posts/{postId}/replyLanterns/{compositeId} (예: "{replyId}_{uid}")
 * - 생성 시 해당 게시글의 replies 배열에서 reply.id == replyId 인 항목의 lanterns 를 +1
 * - 삭제 시 -1
 * - replies 배열 전체를 트랜잭션으로 갱신한다.
 */

async function adjustReplyLanternCount(postId: string, replyIdRaw: string, delta: number) {
  if (!postId || !replyIdRaw || delta === 0) return;

  const replyId = Number(replyIdRaw);
  if (Number.isNaN(replyId)) {
    logger.warn("[reply lantern] invalid replyId", { postId, replyIdRaw });
    return;
  }

  const postRef = db.collection("posts").doc(postId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(postRef);
    if (!snap.exists) {
      logger.warn("[reply lantern] post not found", { postId, replyId });
      return;
    }

    const data = snap.data() as any;
    const replies: any[] = Array.isArray(data?.replies) ? data.replies : [];

    const updatedReplies = replies.map((r) => {
      if (r?.id === replyId) {
        const current = typeof r?.lanterns === "number" ? r.lanterns : 0;
        return {
          ...r,
          lanterns: Math.max(0, current + delta),
        };
      }
      return r;
    });

    tx.update(postRef, { replies: updatedReplies });
  });
}

export const replyLanternCreatedV2 = onDocumentCreated(
  { document: "posts/{postId}/replyLanterns/{compositeId}", region: "asia-northeast3" },
  async (event: any) => {
    const { postId, compositeId } = event.params;
    const [replyIdRaw] = (compositeId ?? "").split("_");
    await adjustReplyLanternCount(postId, replyIdRaw, 1);
  },
);

export const replyLanternDeletedV2 = onDocumentDeleted(
  { document: "posts/{postId}/replyLanterns/{compositeId}", region: "asia-northeast3" },
  async (event: any) => {
    const { postId, compositeId } = event.params;
    const [replyIdRaw] = (compositeId ?? "").split("_");
    await adjustReplyLanternCount(postId, replyIdRaw, -1);
  },
);

