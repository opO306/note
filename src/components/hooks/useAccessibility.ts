import { useState, useEffect, useCallback, useRef } from "react";

/**
 * 포커스 가능한 요소 선택자
 */
const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
].join(', ');

/**
 * 포커스 트랩 훅
 */
export function useFocusTrap(active: boolean = true) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      FOCUSABLE_ELEMENTS
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    // 초기 포커스
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      // Shift + Tab (역방향)
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      }
      // Tab (정방향)
      else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [active]);

  return containerRef;
}

/**
 * 키보드 네비게이션 훅
 */
export function useKeyboardNavigation(
  items: any[],
  options: {
    onSelect?: (index: number) => void;
    loop?: boolean;
    orientation?: 'vertical' | 'horizontal';
  } = {}
) {
  const { onSelect, loop = true, orientation = 'vertical' } = options;
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isVertical = orientation === 'vertical';
      const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
      const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

      if (e.key === nextKey) {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev + 1;
          if (next >= items.length) {
            return loop ? 0 : prev;
          }
          return next;
        });
      } else if (e.key === prevKey) {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev - 1;
          if (next < 0) {
            return loop ? items.length - 1 : prev;
          }
          return next;
        });
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect?.(focusedIndex);
      } else if (e.key === 'Home') {
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setFocusedIndex(items.length - 1);
      }
    },
    [focusedIndex, items.length, loop, orientation, onSelect]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
  };
}

/**
 * 스크린 리더 알림 훅
 */
export function useScreenReader() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // 메시지 읽은 후 제거
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  return { announce };
}

/**
 * 고대비 모드 감지 훅
 */
export function useHighContrast(): boolean {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    // Windows High Contrast 모드 감지
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setIsHighContrast(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  return isHighContrast;
}

/**
 * 포커스 관리 훅
 */
export function useFocusManagement() {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, []);

  const moveFocus = useCallback((element: HTMLElement | null) => {
    if (element) {
      element.focus();
    }
  }, []);

  return {
    saveFocus,
    restoreFocus,
    moveFocus,
  };
}

/**
 * ARIA 라이브 리전 훅
 */
export function useAriaLive() {
  const [liveRegion, setLiveRegion] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const region = document.createElement('div');
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    document.body.appendChild(region);
    setLiveRegion(region);

    return () => {
      if (region.parentNode) {
        document.body.removeChild(region);
      }
    };
  }, []);

  const announce = useCallback(
    (message: string) => {
      if (liveRegion) {
        liveRegion.textContent = message;
      }
    },
    [liveRegion]
  );

  return { announce };
}

/**
 * 포커스 가능한 요소 찾기
 */
export function getFocusableElements(
  container: HTMLElement | null
): HTMLElement[] {
  if (!container) return [];

  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_ELEMENTS)
  );
}

/**
 * 첫 번째/마지막 포커스 가능한 요소 찾기
 */
export function getFirstFocusableElement(
  container: HTMLElement | null
): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[0] || null;
}

export function getLastFocusableElement(
  container: HTMLElement | null
): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[elements.length - 1] || null;
}

/**
 * 포커스 링 가시성 훅
 */
export function useFocusVisible() {
  const [isFocusVisible, setIsFocusVisible] = useState(false);

  useEffect(() => {
    let hadKeyboardEvent = false;

    const handleKeyDown = () => {
      hadKeyboardEvent = true;
    };

    const handleMouseDown = () => {
      hadKeyboardEvent = false;
    };

    const handleFocus = () => {
      setIsFocusVisible(hadKeyboardEvent);
    };

    const handleBlur = () => {
      setIsFocusVisible(false);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('focus', handleFocus, true);
    window.addEventListener('blur', handleBlur, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('mousedown', handleMouseDown, true);
      window.removeEventListener('focus', handleFocus, true);
      window.removeEventListener('blur', handleBlur, true);
    };
  }, []);

  return isFocusVisible;
}

/**
 * 텍스트 크기 조절 훅
 */
export function useTextSize() {
  const [textSize, setTextSize] = useState<'small' | 'medium' | 'large'>('medium');

  useEffect(() => {
    const savedSize = localStorage.getItem('textSize') as 'small' | 'medium' | 'large';
    if (savedSize) {
      setTextSize(savedSize);
      applyTextSize(savedSize);
    }
  }, []);

  const applyTextSize = (size: 'small' | 'medium' | 'large') => {
    const root = document.documentElement;
    switch (size) {
      case 'small':
        root.style.fontSize = '14px';
        break;
      case 'medium':
        root.style.fontSize = '16px';
        break;
      case 'large':
        root.style.fontSize = '18px';
        break;
    }
  };

  const changeTextSize = (size: 'small' | 'medium' | 'large') => {
    setTextSize(size);
    applyTextSize(size);
    localStorage.setItem('textSize', size);
  };

  return {
    textSize,
    changeTextSize,
  };
}

/**
 * 건너뛰기 링크 관리 훅
 */
export function useSkipLinks() {
  const skipToContent = useCallback((contentId: string) => {
    const content = document.getElementById(contentId);
    if (content) {
      content.focus();
      content.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return { skipToContent };
}

/**
 * 랜드마크 네비게이션 훅
 */
export function useLandmarkNavigation() {
  const navigateToLandmark = useCallback((landmarkType: string) => {
    const landmark = document.querySelector(`[role="${landmarkType}"]`) as HTMLElement;
    if (landmark) {
      landmark.focus();
      landmark.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return { navigateToLandmark };
}

/**
 * ARIA 속성 헬퍼
 */
export function getAriaProps(options: {
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  expanded?: boolean;
  pressed?: boolean;
  selected?: boolean;
  hidden?: boolean;
  live?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  role?: string;
  current?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
}) {
  const props: Record<string, any> = {};

  if (options.label) props['aria-label'] = options.label;
  if (options.labelledBy) props['aria-labelledby'] = options.labelledBy;
  if (options.describedBy) props['aria-describedby'] = options.describedBy;
  if (options.expanded !== undefined) props['aria-expanded'] = options.expanded;
  if (options.pressed !== undefined) props['aria-pressed'] = options.pressed;
  if (options.selected !== undefined) props['aria-selected'] = options.selected;
  if (options.hidden !== undefined) props['aria-hidden'] = options.hidden;
  if (options.live) props['aria-live'] = options.live;
  if (options.atomic !== undefined) props['aria-atomic'] = options.atomic;
  if (options.role) props['role'] = options.role;
  if (options.current !== undefined) props['aria-current'] = options.current;

  return props;
}
