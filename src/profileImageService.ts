// src/profileImageService.ts
// ✅ 프로필 이미지 업로드 + 서버 반영 전부 이 파일에서 처리

import { auth, db, storage } from "./firebase";
import { updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * 프로필 이미지를 Firebase Storage에 업로드하고,
 * Auth photoURL + Firestore users/{uid}.photoURL 을 업데이트한 뒤
 * 최종 image URL 을 반환한다.
 */
export async function uploadAndUpdateProfileImage(file: File): Promise<string> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error("로그인된 사용자가 없습니다.");
    }

    const uid = currentUser.uid;

    // 1) Storage에 업로드
    const storageRef = ref(storage, `profileImages/${uid}`);
    await uploadBytes(storageRef, file);

    // 2) 다운로드 URL 가져오기
    const downloadURL = await getDownloadURL(storageRef);

    // 3) Auth 사용자 프로필 photoURL 업데이트
    await updateProfile(currentUser, {
        photoURL: downloadURL,
    });

    // 4) Firestore users/{uid} 문서에도 photoURL 반영
    await setDoc(
        doc(db, "users", uid),
        {
            photoURL: downloadURL,
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );

    // 5) 호출한 쪽에서 상태/캐시를 업데이트할 수 있도록 URL 반환
    return downloadURL;
}
