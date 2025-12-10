import { ReactNode, useEffect, useRef } from "react";
import { cn } from "./utils";

interface FocusTrapProps {
  children: ReactNode;
  /** 포커스 트랩 활성화 여부 */
  enabled?: boolean;
  /** 초기 포커스할 요소 선택자 */
  initialFocus?: string;
  /** 포커스 복원 여부 */
  restoreFocus?: boolean;
  /** 추가 클래스명 */
  className?: string;
}

/**
 * 포커스 트랩 컴포넌트
 * 모달, 다이얼로그 등에서 포커스를 가두는 역할
 */
export function FocusTrap({
  children,
  enabled = true,
  initialFocus,
  restoreFocus = true,
  className,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;

    // 이전 포커스 저장
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    // 포커스 가능한 요소 찾기
    const getFocusableElements = (): HTMLElement[] => {
      const selector = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(', ');

      return Array.from(container.querySelectorAll<HTMLElement>(selector));
    };

    // 초기 포커스 설정
    const setInitialFocus = () => {
      if (initialFocus) {
        const element = container.querySelector<HTMLElement>(initialFocus);
        if (element) {
          element.focus();
          return;
        }
      }

      // initialFocus가 없으면 첫 번째 포커스 가능한 요소에 포커스
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    };

    setInitialFocus();

    // 탭 키 핸들링
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      // Shift + Tab (역방향)
      if (e.shiftKey) {
        if (activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      }
      // Tab (정방향)
      else {
        if (activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // 클린업
    return () => {
      container.removeEventListener('keydown', handleKeyDown);

      // 포커스 복원
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [enabled, initialFocus, restoreFocus]);

  return (
    <div ref={containerRef} className={cn("focus-trap", className)}>
      {children}
    </div>
  );
}

/**
 * 자동 포커스 컴포넌트
 */
export function AutoFocus({
  children,
  enabled = true,
  delay = 0,
}: {
  children: ReactNode;
  enabled?: boolean;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || !ref.current) return;

    const timer = setTimeout(() => {
      const firstFocusable = ref.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }, delay);

    return () => clearTimeout(timer);
  }, [enabled, delay]);

  return <div ref={ref}>{children}</div>;
}

/**
 * 포커스 가드 (포커스 트랩 시작/끝 표시)
 */
export function FocusGuard({ onFocus }: { onFocus: () => void }) {
  return (
    <div
      tabIndex={0}
      onFocus={onFocus}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        overflow: 'hidden',
      }}
    />
  );
}

/**
 * 포커스 영역 (특정 영역 내에서만 포커스 이동)
 */
export function FocusScope({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const container = ref.current;

      if (!container) return;

      // 포커스가 영역 밖으로 나가면 첫 번째 요소로 이동
      if (!container.contains(target)) {
        const firstFocusable = container.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
