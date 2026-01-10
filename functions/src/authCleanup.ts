import * as functionsV1 from "firebase-functions/v1";
import * as crypto from "crypto";

import { admin, db, DELETED_USER_NAME, batchUpdateSnapshot } from "./core";

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
    // Firestore에서 대량 삭제 시 500 제한을 피하기 위해 반복 삭제
    // (orderBy __name__ 은 문서ID 기반으로 안정적인 페이지네이션)
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
    // path 예: user_notifications/{uid}/items
    const col = db.collection(path);
    await deleteQueryInBatches(col);
}

export const cleanupUserDataOnAuthDelete = functionsV1
    .region("asia-northeast3")
    .auth.user()
    .onDelete(async (user) => {
        const uid = user.uid;

        // 0) 30일 뒤 개인 데이터 purge 예약
        // - 공개로 남는 글/답글은 이미 익명화 처리되므로, 여기서는 "유저 전용" 데이터 삭제만 예약합니다.
        const purgeAtDate = new Date();
        purgeAtDate.setDate(purgeAtDate.getDate() + 30);
        await db
            .collection("user_purge_queue")
            .doc(uid)
            .set({
                uid,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                purgeAt: admin.firestore.Timestamp.fromDate(purgeAtDate),
                reason: "account_deleted",
            }, { merge: true })
            .catch(() => { });

        // 1) users/{uid} 익명화/표시용 필드 정리
        await db
            .collection("users")
            .doc(uid)
            .set(
                {
                    nickname: DELETED_USER_NAME,
                    nicknameLower: DELETED_USER_NAME.toLowerCase(),
                    displayName: DELETED_USER_NAME,
                    photoURL: null,
                    profileImage: "",
                    bio: "",
                    isDeleted: true,
                    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
                    email: admin.firestore.FieldValue.delete(),
                    consents: admin.firestore.FieldValue.delete(),
                },
                { merge: true },
            )
            .catch(() => { });

        // 2) follows 정리 (양방향)
        const follows = db.collection("follows");
        await Promise.all([
            deleteQueryInBatches(follows.where("followerUid", "==", uid)),
            deleteQueryInBatches(follows.where("followingUid", "==", uid)),
        ]).catch(() => { });

        // 3) posts 작성자 익명화
        const myPostsSnap = await db.collection("posts").where("authorUid", "==", uid).get();
        await batchUpdateSnapshot(myPostsSnap, {
            authorUid: null,
            author: DELETED_USER_NAME,
            authorNickname: DELETED_USER_NAME,
            authorDeleted: true,
        }).catch(() => { });

        // 4) replies(컬렉션그룹) 작성자 익명화
        const myRepliesSnap = await db.collectionGroup("replies").where("authorUid", "==", uid).get();
        await batchUpdateSnapshot(myRepliesSnap, {
            authorUid: null,
            author: DELETED_USER_NAME,
            authorNickname: DELETED_USER_NAME,
            authorDeleted: true,
        }).catch(() => { });

        // 5) guideReplyAuthorUid 참조 익명화
        const guidePostsSnap = await db.collection("posts").where("guideReplyAuthorUid", "==", uid).get();
        await batchUpdateSnapshot(guidePostsSnap, {
            guideReplyAuthorUid: null,
            guideReplyAuthor: DELETED_USER_NAME,
        }).catch(() => { });

        // 8) 재가입 제한용 deletedEmails 기록 (30일)
        if (user.email) {
            const hash = crypto.createHash("sha256").update(user.email.trim().toLowerCase()).digest("hex");
            const expireDate = new Date();
            expireDate.setDate(expireDate.getDate() + 30);

            await db
                .collection("deletedEmails")
                .doc(hash)
                .set({
                    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
                    expireAt: admin.firestore.Timestamp.fromDate(expireDate),
                })
                .catch(() => { });
        }
    });
