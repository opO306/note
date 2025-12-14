import { useState, useCallback } from "react";

export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

interface UseShareOptions {
  /** 공유 성공 시 콜백 */
  onSuccess?: () => void;
  /** 공유 실패 시 콜백 */
  onError?: (error: Error) => void;
  /** 공유 취소 시 콜백 */
  onCancel?: () => void;
}

/**
 * Web Share API를 사용한 공유 훅
 */
export function useShare(options: UseShareOptions = {}) {
  const { onSuccess, onError, onCancel } = options;

  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Web Share API 지원 여부 확인
  const isSupported = typeof navigator !== "undefined" && !!navigator.share;

  // 특정 데이터 타입 지원 여부 확인
  const canShareFiles =
    typeof navigator !== "undefined" &&
    navigator.canShare &&
    navigator.canShare({ files: [] });

  const share = useCallback(
    async (data: ShareData) => {
      if (!isSupported) {
        const error = new Error("Web Share API not supported");
        setError(error);
        onError?.(error);
        return false;
      }

      // Validate data
      if (!data.title && !data.text && !data.url && !data.files) {
        const error = new Error("At least one share data field is required");
        setError(error);
        onError?.(error);
        return false;
      }

      setIsSharing(true);
      setError(null);

      try {
        await navigator.share(data);
        setIsSharing(false);
        onSuccess?.();
        return true;
      } catch (err) {
        setIsSharing(false);

        const error = err as Error;

        // AbortError means user cancelled
        if (error.name === "AbortError") {
          onCancel?.();
          return false;
        }

        setError(error);
        onError?.(error);
        return false;
      }
    },
    [isSupported, onSuccess, onError, onCancel]
  );

  return {
    share,
    isSharing,
    isSupported,
    canShareFiles,
    error,
  };
}

/**
 * 간단한 텍스트 공유 훅
 */
export function useTextShare(options: UseShareOptions = {}) {
  const { share, ...rest } = useShare(options);

  const shareText = useCallback(
    async (text: string, title?: string) => {
      return share({ text, title });
    },
    [share]
  );

  return {
    shareText,
    ...rest,
  };
}

/**
 * URL 공유 훅
 */
export function useUrlShare(options: UseShareOptions = {}) {
  const { share, ...rest } = useShare(options);

  const shareUrl = useCallback(
    async (url: string, title?: string, text?: string) => {
      return share({ url, title, text });
    },
    [share]
  );

  return {
    shareUrl,
    ...rest,
  };
}

/**
 * 파일 공유 훅
 */
export function useFileShare(options: UseShareOptions = {}) {
  const { share, canShareFiles, ...rest } = useShare(options);

  const shareFiles = useCallback(
    async (files: File[], title?: string, text?: string) => {
      if (!canShareFiles) {
        const error = new Error("File sharing not supported");
        options.onError?.(error);
        return false;
      }

      return share({ files, title, text });
    },
    [share, canShareFiles, options]
  );

  return {
    shareFiles,
    canShareFiles,
    ...rest,
  };
}
