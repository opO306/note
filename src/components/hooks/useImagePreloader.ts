import { useEffect, useState } from "react";

interface UseImagePreloaderOptions {
  images: string[];
  enabled?: boolean;
}

interface PreloadState {
  loaded: Set<string>;
  failed: Set<string>;
  isLoading: boolean;
  progress: number;
}

/**
 * Hook to preload multiple images
 * Useful for preloading thumbnails or critical images
 */
export function useImagePreloader({
  images,
  enabled = true,
}: UseImagePreloaderOptions): PreloadState {
  const [state, setState] = useState<PreloadState>({
    loaded: new Set(),
    failed: new Set(),
    isLoading: false,
    progress: 0,
  });

  useEffect(() => {
    if (!enabled || images.length === 0) return;

    setState((prev) => ({ ...prev, isLoading: true }));

    const loaded = new Set<string>();
    const failed = new Set<string>();
    let completed = 0;

    // 🔹 언마운트 후에는 setState를 막기 위한 플래그
    let isCancelled = false;

    const updateProgress = () => {
      if (isCancelled) return;

      const progress = (completed / images.length) * 100;
      setState({
        loaded,
        failed,
        isLoading: completed < images.length,
        progress,
      });
    };

    const preloadImage = (src: string): Promise<void> => {
      return new Promise((resolve) => {
        const img = new Image();

        img.onload = () => {
          loaded.add(src);
          completed++;
          updateProgress();
          resolve();
        };

        img.onerror = () => {
          failed.add(src);
          completed++;
          updateProgress();
          resolve();
        };

        img.src = src;
      });
    };

    // Preload images in parallel
    Promise.all(images.map((src) => preloadImage(src)));

    return () => {
      // 🔹 더 이상 progress 업데이트 하지 않도록 막기
      isCancelled = true;

      // Cleanup: 상태 초기화 (기존 동작 유지)
      setState({
        loaded: new Set(),
        failed: new Set(),
        isLoading: false,
        progress: 0,
      });
    };
  }, [images, enabled]);


  return state;
}

/**
 * Preload a single image
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));

    img.src = src;
  });
}

/**
 * Preload multiple images
 */
export function preloadImages(sources: string[]): Promise<void[]> {
  return Promise.all(sources.map((src) => preloadImage(src)));
}
