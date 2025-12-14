// src/utils/imageOptimization.ts

/**
 * 이미지 URL에 캐시 버스팅(Cache Busting) 파라미터 추가
 */
export function optimizeImageUrl(url: string, version?: string | number): string {
  if (!url || typeof url !== "string") return "";

  try {
    const urlObj = new URL(url);
    if (version) {
      urlObj.searchParams.set("v", String(version));
    }
    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * ✅ Firebase "Resize Images" Extension 호환 URL 생성기
 * 원본 파일명 뒤에 _200x200 같은 접미사를 붙여 썸네일 URL로 변환합니다.
 */
export function getResizedImageUrl(url: string, size: number): string {
  if (!url || typeof url !== "string") return "";
  if (size <= 0) return url;

  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;

    // 파일 확장자 앞부분을 찾아 _SIZE x SIZE 를 추가
    const match = path.match(/(.*)(\.[\w\d]+)$/);
    if (!match) return url;

    const [_, basePath, extension] = match;
    // 정사각형 썸네일 가정
    const newPath = `${basePath}_${size}x${size}${extension}`;

    urlObj.pathname = newPath;
    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * 🔄 기존 코드 호환성 유지: getOptimizedImageUrl
 * (이전 코드가 이 이름을 쓰고 있으므로 getResizedImageUrl로 연결)
 */
export function getOptimizedImageUrl(
  url: string,
  width?: number,
  _height?: number
): string {
  // width가 있으면 리사이징 시도, 없으면 원본 반환
  if (width) {
    return getResizedImageUrl(url, width);
  }
  return url;
}

/**
 * ✅ 이미지 프리로딩 (DOM 방식 -> JS 객체 방식 개선)
 * priority 인자는 호환성을 위해 남겨두지만, JS Image 객체에서는 자동 처리됩니다.
 */
export function preloadImage(
  src: string,
  _priority?: "high" | "normal" | "low"
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error("Image source is required"));
      return;
    }

    const img = new Image();
    img.src = src;

    if (img.complete) {
      resolve();
      return;
    }

    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
  });
}

/**
 * 여러 이미지 병렬 프리로딩
 */
export function preloadImages(
  sources: string[],
  _priority?: "high" | "normal" | "low"
): Promise<void[]> {
  return Promise.all(
    sources.map((src) => preloadImage(src).catch((err) => {
      console.warn(err);
    }))
  );
}

/**
 * ⚠️ [복구됨] 이미지 로딩 우선순위 결정
 * OptimizedAvatar.tsx에서 이 함수를 사용 중이라 복구했습니다.
 */
export function getImagePriority(
  size?: number,
  loading?: "lazy" | "eager"
): "high" | "normal" | "low" {
  if (loading === "eager") return "high";
  if (size && size >= 80) return "normal";
  return "low";
}

/**
 * 이미지 fetchpriority 속성 값 변환
 */
export function getFetchPriority(
  priority: "high" | "normal" | "low"
): "high" | "auto" | "low" {
  if (priority === "high") return "high";
  if (priority === "low") return "low";
  return "auto";
}

/**
 * React Avatar 컴포넌트용 추천 사이즈 계산
 */
export function getRecommendedAvatarSize(displaySize: number): number {
  if (displaySize <= 64) return 64;
  if (displaySize <= 128) return 128;
  if (displaySize <= 256) return 256;
  return 512;
}