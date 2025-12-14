import { useState, useCallback } from "react";

interface UseClipboardOptions {
  /** 복사 성공 후 리셋 시간 (ms) */
  timeout?: number;
  /** 복사 성공 시 콜백 */
  onSuccess?: () => void;
  /** 복사 실패 시 콜백 */
  onError?: (error: Error) => void;
}

/**
 * 클립보드 복사 훅
 * Clipboard API를 사용하여 텍스트를 클립보드에 복사
 */
export function useClipboard(options: UseClipboardOptions = {}) {
  const { timeout = 2000, onSuccess, onError } = options;

  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const copy = useCallback(
    async (text: string) => {
      if (!navigator.clipboard) {
        const error = new Error("Clipboard API not supported");
        setError(error);
        onError?.(error);
        return false;
      }

      try {
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        setError(null);
        onSuccess?.();

        // Reset after timeout
        setTimeout(() => {
          setIsCopied(false);
        }, timeout);

        return true;
      } catch (err) {
        const error = err as Error;
        setError(error);
        setIsCopied(false);
        onError?.(error);
        return false;
      }
    },
    [timeout, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setIsCopied(false);
    setError(null);
  }, []);

  return {
    copy,
    isCopied,
    error,
    reset,
  };
}

/**
 * 클립보드에서 읽기 (권한 필요)
 */
export function useClipboardRead() {
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<Error | null>(null);

  const read = useCallback(async () => {
    if (!navigator.clipboard) {
      const error = new Error("Clipboard API not supported");
      setError(error);
      return "";
    }

    try {
      const text = await navigator.clipboard.readText();
      setText(text);
      setError(null);
      return text;
    } catch (err) {
      const error = err as Error;
      setError(error);
      setText("");
      return "";
    }
  }, []);

  return {
    read,
    text,
    error,
  };
}

/**
 * Fallback 복사 함수 (구형 브라우저 대응)
 */
export function copyToClipboardFallback(text: string): boolean {
  try {
    // Create temporary textarea
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);

    // Select and copy
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const success = document.execCommand("copy");

    // Cleanup
    document.body.removeChild(textarea);

    return success;
  } catch (error) {
    console.error("Fallback copy failed:", error);
    return false;
  }
}

/**
 * 범용 복사 함수 (자동으로 fallback 사용)
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern API first
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.warn("Clipboard API failed, trying fallback:", error);
    }
  }

  // Fallback for older browsers
  return copyToClipboardFallback(text);
}
