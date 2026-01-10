import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";

import { admin, db } from "./core";

const PURGE_QUEUE_COLLECTION = "user_purge_queue";

async function batchDeleteDocs(refs: admin.firestore.DocumentReference[]) {
    if (!refs.length) return;

    let batch = db.batch();
    let count = 0;

    for (const ref of refs) {
        batch.delete(ref);
        count++;

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

async function deleteQueryInBatches(query: admin.firestore.Query) {
    let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;

    while (true) {
        let q = query.orderBy(admin.firestore.FieldPath.documentId()).limit(400);
        if (lastDoc) q = q.startAfter(lastDoc);

        const snap = await q.get();
        if (snap.empty) return;

        await batchDeleteDocs(snap.docs.map((d) => d.ref));
        lastDoc = snap.docs[snap.docs.length - 1];
    }
}

async function deleteSubcollectionDocs(path: string) {
    const col = db.collection(path);
    await deleteQueryInBatches(col);
}

async function purgeUserPrivateData(uid: string) {
    // 개인 데이터(공개 글/댓글은 익명화로 유지, 여기서는 "유저 전용" 데이터만 삭제)
    await Promise.all([
        // 알림
        deleteSubcollectionDocs(`user_notifications/${uid}/items`).catch(() => { }),
        db.doc(`user_notifications/${uid}`).delete().catch(() => { }),

        // 등불/좋아요
        deleteSubcollectionDocs(`user_lanterns/${uid}/posts`).catch(() => { }),
        db.doc(`user_lanterns/${uid}`).delete().catch(() => { }),

        // 북마크
        deleteSubcollectionDocs(`user_bookmarks/${uid}/posts`).catch(() => { }),
        db.doc(`user_bookmarks/${uid}`).delete().catch(() => { }),

        // 아침 추천 다이제스트
        deleteSubcollectionDocs(`user_morning_digest/${uid}/items`).catch(() => { }),
        db.doc(`user_morning_digest/${uid}`).delete().catch(() => { }),

        // 개인화 활동 로그
        deleteSubcollectionDocs(`user_activity/${uid}/viewLogs`).catch(() => { }),
        deleteSubcollectionDocs(`user_activity/${uid}/searchLogs`).catch(() => { }),
        db.doc(`user_activity/${uid}`).delete().catch(() => { }),

        // 알림 설정(클라에서 쓰는 컬렉션)
        db.doc(`user_notification_settings/${uid}`).delete().catch(() => { }),

        // 구매한 칭호(서브컬렉션)
        deleteSubcollectionDocs(`users/${uid}/purchasedTitles`).catch(() => { }),
    ]);

    // 테마 구매 히스토리(전역 컬렉션)
    await deleteQueryInBatches(db.collection("theme_purchases").where("userId", "==", uid)).catch(() => { });

    // 프로필 이미지 Storage (커스텀 업로드만)
    try {
        await admin.storage().bucket().file(`profileImages/${uid}`).delete({ ignoreNotFound: true } as any);
    } catch {
        // ignore
    }
}

export const purgeDeletedUsers = onSchedule(
    {
        schedule: "20 4 * * *", // 매일 04:20 KST
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
        timeoutSeconds: 540,
        memory: "1GiB",
    },
    async () => {
        const now = admin.firestore.Timestamp.now();

        const queueSnap = await db
            .collection(PURGE_QUEUE_COLLECTION)
            .where("purgeAt", "<=", now)
            .orderBy("purgeAt", "asc")
            .limit(10)
            .get();

        if (queueSnap.empty) {
            logger.info("[purgeDeletedUsers] no due items");
            return;
        }

        logger.info("[purgeDeletedUsers] start", { count: queueSnap.size });

        for (const docSnap of queueSnap.docs) {
            const uid = docSnap.id;
            try {
                await purgeUserPrivateData(uid);
                await docSnap.ref.delete().catch(() => { });
                logger.info("[purgeDeletedUsers] purged", { uid });
            } catch (error: any) {
                logger.error("[purgeDeletedUsers] failed", {
                    uid,
                    error: error?.message,
                });
            }
        }

        logger.info("[purgeDeletedUsers] done", { processed: queueSnap.size });
    },
);
