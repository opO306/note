import { useEffect, useRef } from 'react';

interface UseScrollRestorationOptions {
  key: string;
  debounceMs?: number;
}

/**
 * 스크롤 위치를 저장하고 복원하는 커스텀 훅
 * 화면 전환 시 스크롤 위치를 유지합니다
 */
export function useScrollRestoration({
  key,
  debounceMs = 100,
}: UseScrollRestorationOptions) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRestoringRef = useRef(false);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    // 저장된 스크롤 위치 복원
    const savedPosition = sessionStorage.getItem(`scroll-${key}`);
    if (savedPosition && !isRestoringRef.current) {
      isRestoringRef.current = true;
      // RAF를 사용하여 부드럽게 복원
      requestAnimationFrame(() => {
        scrollElement.scrollTop = parseInt(savedPosition, 10);
        // 복원 후 약간의 딜레이를 두고 플래그 해제
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 100);
      });
    }

    // 스크롤 이벤트 핸들러 (debounced)
    const handleScroll = () => {
      if (isRestoringRef.current) return;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        sessionStorage.setItem(
          `scroll-${key}`,
          scrollElement.scrollTop.toString()
        );
      }, debounceMs);
    };

    // passive 이벤트 리스너로 성능 최적화
    scrollElement.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [key, debounceMs]);

  return scrollRef;
}
