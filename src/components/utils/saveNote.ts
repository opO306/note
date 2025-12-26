// src/utils/saveNote.ts
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/firebase"; // 네 프로젝트 firebase 경로에 맞춰 수정

export async function saveNoteFromPost(params: {
    postId: string;
    title: string;
    body: string;
}) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("NOT_LOGGED_IN");

    await addDoc(collection(db, "notes"), {
        uid,
        title: params.title.trim(),
        body: params.body,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        source: "post",
        postId: params.postId,
    });
}
