// src/utils/profileImageUtils.ts
// 프로필 이미지 관련 유틸리티 함수

/**
 * 구글 프로필 이미지 URL인지 확인
 * @param url 확인할 URL
 * @returns 구글 프로필 이미지 URL이면 true
 */
export function isGoogleProfileImage(url: string | null | undefined): boolean {
    if (!url || typeof url !== "string") return false;
    
    const lowerUrl = url.toLowerCase();
    return (
        lowerUrl.includes("googleusercontent.com") ||
        lowerUrl.includes("googleapis.com") ||
        lowerUrl.includes("lh3.googleusercontent.com") ||
        lowerUrl.includes("lh4.googleusercontent.com") ||
        lowerUrl.includes("lh5.googleusercontent.com") ||
        lowerUrl.includes("lh6.googleusercontent.com")
    );
}

/**
 * 프로필 이미지 URL에서 구글 기본 이미지를 필터링
 * 구글 프로필 이미지면 null을 반환하고, 그 외에는 원본 URL 반환
 * @param url 필터링할 URL
 * @returns 구글 이미지가 아니면 원본 URL, 구글 이미지면 null
 */
export function filterGoogleProfileImage(url: string | null | undefined): string | null {
    if (!url || typeof url !== "string") return null;
    
    if (isGoogleProfileImage(url)) {
        return null; // 구글 이미지는 필터링
    }
    
    return url; // 우리가 관리하는 이미지 URL
}

/**
 * 프로필 이미지 URL 우선순위에 따라 최종 URL 결정
 * 1. profileImage (우리가 관리하는 커스텀 이미지)
 * 2. photoURL (Firestore에 저장된 URL, 구글 이미지 제외)
 * 3. null (기본 API 아바타 사용)
 * 
 * @param profileImage 우리가 관리하는 프로필 이미지 URL
 * @param photoURL Firestore의 photoURL
 * @returns 최종 프로필 이미지 URL (없으면 null)
 */
export function getProfileImageUrl(
    profileImage: string | null | undefined,
    photoURL: string | null | undefined
): string | null {
    // 1. profileImage 우선
    if (profileImage && typeof profileImage === "string" && profileImage.trim().length > 0) {
        return filterGoogleProfileImage(profileImage);
    }
    
    // 2. photoURL 사용 (구글 이미지 필터링)
    if (photoURL && typeof photoURL === "string" && photoURL.trim().length > 0) {
        return filterGoogleProfileImage(photoURL);
    }
    
    // 3. 둘 다 없으면 null (기본 API 아바타 사용)
    return null;
}

