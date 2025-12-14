// src/profileImageService.ts
import { auth, db, storage } from "./firebase";
import { updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * 이미지 리사이징 및 압축
 * - 최대 변: 512px
 * - 형식: WebP (미지원 시 JPEG)
 * - 개선점: 작지만 용량이 큰 파일도 강제 압축
 */
async function resizeProfileImage(file: File, maxSize = 512, quality = 0.82): Promise<File> {
    if (typeof window === "undefined" || typeof document === "undefined") return file;
    if (!file.type.startsWith("image/")) return file;

    // 1. 이미지 로드 (URL.createObjectURL 사용으로 속도/메모리 개선)
    const objectUrl = URL.createObjectURL(file);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = objectUrl;
    });

    // 메모리 해제
    URL.revokeObjectURL(objectUrl);

    const { width, height } = img;

    // 2. 리사이즈 필요 여부 계산
    let scale = Math.min(1, maxSize / Math.max(width, height));

    // 💡 추가: 크기가 작아도 용량이 1MB 이상이면 강제 리사이징(압축) 진행
    if (scale >= 1 && file.size < 1024 * 1024) {
        return file;
    }

    // 3. Canvas에 그리기
    const targetW = Math.round(width * scale);
    const targetH = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    // 이미지 품질 보정을 위한 설정 (선택 사항)
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, targetW, targetH);

    // 4. Blob 변환 (WebP 우선)
    const preferredType = "image/webp";
    let mime = preferredType;

    // 브라우저가 WebP 지원하는지 확인하는 간단한 트릭
    const dataUrl = canvas.toDataURL(preferredType);
    if (!dataUrl.startsWith(`data:${preferredType}`)) {
        mime = "image/jpeg";
    }

    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), mime, quality);
    });

    if (!blob) return file;

    return new File([blob], file.name, {
        type: mime,
        lastModified: Date.now(),
    });
}

/**
 * 프로필 이미지 업로드 및 프로필 갱신
 */
export async function uploadAndUpdateProfileImage(file: File): Promise<string> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("로그인된 사용자가 없습니다.");

    const uid = currentUser.uid;

    try {
        // 1) 리사이징 (오래 걸릴 수 있으므로 가장 먼저)
        const optimizedFile = await resizeProfileImage(file);

        // 2) Storage 업로드 (덮어쓰기)
        const storageRef = ref(storage, `profileImages/${uid}`);
        await uploadBytes(storageRef, optimizedFile);

        // 3) 다운로드 URL 획득
        const downloadURL = await getDownloadURL(storageRef);

        // 4) ⚡ 병렬 처리: Auth 업데이트와 Firestore 업데이트를 동시에 실행
        await Promise.all([
            // Auth 프로필 (전역에서 씀)
            updateProfile(currentUser, { photoURL: downloadURL }),

            // Firestore 사용자 문서 (세부 정보용)
            setDoc(doc(db, "users", uid), {
                photoURL: downloadURL,
                updatedAt: serverTimestamp(),
            }, { merge: true })
        ]);

        return downloadURL;
    } catch (error) {
        console.error("프로필 이미지 업로드 실패:", error);
        throw error; // UI에서 에러 메시지를 띄울 수 있게 던짐
    }
}