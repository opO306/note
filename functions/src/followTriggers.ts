import { onDocumentCreated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import { admin, db } from "./firebaseAdmin";

/**
 * follows/{followId} 문서 스키마 (클라이언트에서 쓰는 구조)
 * {
 *   followerUid: string;     // 팔로우 거는 사람
 *   followerNickname: string;
 *   followingUid: string;    // 팔로우 당하는 사람
 *   followingNickname: string;
 *   createdAt: Timestamp;
 * }
 */

async function incrementFollowCounts(followerUid: string, followingUid: string, delta: number) {
    if (!followerUid || !followingUid) return;
    if (followerUid === followingUid) return; // 자기 자신 팔로우 방어

    const followerRef = db.collection("users").doc(followerUid);
    const followingRef = db.collection("users").doc(followingUid);

    await db.runTransaction(async (tx) => {
        const [followerSnap, followingSnap] = await Promise.all([
            tx.get(followerRef),
            tx.get(followingRef),
        ]);

        if (!followerSnap.exists || !followingSnap.exists) {
            logger.warn("[follow] user doc missing", { followerUid, followingUid });
            return;
        }

        tx.set(
            followerRef,
            { followingCount: admin.firestore.FieldValue.increment(delta) },
            { merge: true },
        );
        tx.set(
            followingRef,
            { followerCount: admin.firestore.FieldValue.increment(delta) },
            { merge: true },
        );
    });
}

// 팔로우 생성 → 카운트 +1
export const followCreatedV2 = onDocumentCreated(
    { document: "follows/{followId}", region: "asia-northeast3" },
    async (event: any) => {
        const data = event.data?.data() as any;
        if (!data) return;

        const followerUid = data.followerUid as string | undefined;
        const followingUid = data.followingUid as string | undefined;

        if (!followerUid || !followingUid) {
            logger.warn("[follow] invalid follow doc", { params: event.params });
            return;
        }

        await incrementFollowCounts(followerUid, followingUid, 1);
    });

// 팔로우 삭제(언팔) → 카운트 -1
export const followDeletedV2 = onDocumentDeleted(
    { document: "follows/{followId}", region: "asia-northeast3" },
    async (event: any) => {
        const data = event.data?.data() as any;
        if (!data) return;

        const followerUid = data.followerUid as string | undefined;
        const followingUid = data.followingUid as string | undefined;

        if (!followerUid || !followingUid) {
            logger.warn("[follow] invalid follow doc on delete", { params: event.params });
            return;
        }

        await incrementFollowCounts(followerUid, followingUid, -1);
    },
);

