// src/components/ui/delayed-loading-overlay.tsx
import { useState, useEffect } from "react";
import { LoadingOverlay } from "./loading-animations";

interface DelayedLoadingOverlayProps {
  delay?: number; // 로딩 표시까지의 지연 시간 (ms)
  variant?: "default" | "blur";
  message?: string;
}

/**
 * ✅ 조건부 로딩 오버레이
 * 일정 시간(기본 200ms) 이상 걸릴 때만 로딩을 표시합니다.
 * 빠른 전환에서는 깜빡임 없이 즉시 전환되고,
 * 느린 전환에서는 사용자에게 진행 중임을 알립니다.
 */
export function DelayedLoadingOverlay({
  delay = 200,
  variant = "blur",
  message,
}: DelayedLoadingOverlayProps) {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    // delay 시간 후에 로딩 표시
    const timer = setTimeout(() => {
      setShowLoading(true);
    }, delay);

    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      clearTimeout(timer);
    };
  }, [delay]);

  return <LoadingOverlay isLoading={showLoading} variant={variant} message={message} />;
}

