import { useEffect, useState, useRef, useCallback } from "react";

/**
 * 애니메이션 설정
 */
export interface AnimationConfig {
  /** 애니메이션 지속 시간 (ms) */
  duration?: number;
  /** 지연 시간 (ms) */
  delay?: number;
  /** 이징 함수 */
  easing?: string;
  /** 반복 횟수 (-1은 무한) */
  iterations?: number;
  /** 애니메이션 방향 */
  direction?: "normal" | "reverse" | "alternate" | "alternate-reverse";
}

/**
 * 스태거 애니메이션 설정
 */
export interface StaggerConfig extends AnimationConfig {
  /** 각 아이템 간 지연 시간 (ms) */
  staggerDelay?: number;
  /** 최대 지연 시간 (ms) */
  maxDelay?: number;
}

/**
 * 기본 애니메이션 설정
 */
export const DEFAULT_ANIMATION: AnimationConfig = {
  duration: 300,
  delay: 0,
  easing: "ease-out",
  iterations: 1,
  direction: "normal",
};

/**
 * 프리셋 이징 함수
 */
export const EASINGS = {
  linear: "linear",
  easeIn: "cubic-bezier(0.4, 0, 1, 1)",
  easeOut: "cubic-bezier(0, 0, 0.2, 1)",
  easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  sharp: "cubic-bezier(0.4, 0, 0.6, 1)",
  bounce: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
  spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
} as const;

/**
 * 애니메이션 진행 상태
 */
export type AnimationState = "idle" | "running" | "paused" | "finished";

/**
 * 마운트 애니메이션 훅
 */
export function useMountAnimation(
  config: AnimationConfig = {}
): { isVisible: boolean; shouldRender: boolean } {
  const [isVisible, setIsVisible] = useState(false);
  const shouldRender = true;

  useEffect(() => {
    // 마운트 시 애니메이션
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, config.delay || 0);

    return () => clearTimeout(timer);
  }, [config.delay]);

  return { isVisible, shouldRender };
}

/**
 * 스태거 애니메이션 훅
 */
export function useStaggerAnimation(
  itemCount: number,
  config: StaggerConfig = {}
) {
  const {
    staggerDelay = 50,
    maxDelay = 1000,
    delay = 0,
  } = config;

  const [visibleItems, setVisibleItems] = useState(new Set<number>());

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];  // ✅ 브라우저용으로 변경

    for (let i = 0; i < itemCount; i++) {
      const itemDelay = Math.min(
        delay + i * staggerDelay,
        delay + maxDelay
      );

      const timer = setTimeout(() => {
        setVisibleItems((prev) => new Set([...prev, i]));
      }, itemDelay);

      timers.push(timer);
    }

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [itemCount, staggerDelay, maxDelay, delay]);

  const isVisible = useCallback(
    (index: number) => visibleItems.has(index),
    [visibleItems]
  );

  const getDelay = useCallback(
    (index: number) => {
      return Math.min(index * staggerDelay, maxDelay);
    },
    [staggerDelay, maxDelay]
  );

  return {
    isVisible,
    getDelay,
    visibleCount: visibleItems.size,
    totalCount: itemCount,
    isComplete: visibleItems.size === itemCount,
  };
}

/**
 * 스크롤 애니메이션 훅
 */
export function useScrollAnimation(
  threshold = 0.1,
  config: AnimationConfig = {}
) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
          }, config.delay || 0);

          // 한 번만 실행
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, config.delay]);

  return { ref, isVisible };
}

/**
 * 애니메이션 상태 관리 훅
 */
export function useAnimationState(initialState: AnimationState = "idle") {
  const [state, setState] = useState<AnimationState>(initialState);

  const start = useCallback(() => setState("running"), []);
  const pause = useCallback(() => setState("paused"), []);
  const finish = useCallback(() => setState("finished"), []);
  const reset = useCallback(() => setState("idle"), []);

  return {
    state,
    isRunning: state === "running",
    isPaused: state === "paused",
    isFinished: state === "finished",
    isIdle: state === "idle",
    start,
    pause,
    finish,
    reset,
  };
}

/**
 * 카운터 애니메이션 훅
 */
export function useCountAnimation(
  targetValue: number,
  duration = 1000,
  easing: (t: number) => number = (t) => t
) {
  const [currentValue, setCurrentValue] = useState(0);
  const frameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const startValue = currentValue;
    const delta = targetValue - startValue;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(progress);

      setCurrentValue(startValue + delta * easedProgress);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        startTimeRef.current = undefined;
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [targetValue, duration, easing, currentValue]);

  return Math.round(currentValue);
}

/**
 * 타이핑 애니메이션 훅
 */
export function useTypingAnimation(
  text: string,
  speed = 50,
  config: {
    delay?: number;
    cursor?: boolean;
    cursorChar?: string;
    onComplete?: () => void;
  } = {}
) {
  const { delay = 0, cursor = false, cursorChar = "|", onComplete } = config;
  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let currentIndex = 0;
    let startTimer: ReturnType<typeof setTimeout>;   // ✅ 264번 줄
    let typingTimer: ReturnType<typeof setTimeout>;  // ✅ 265번 줄

    const type = () => {
      if (currentIndex < text.length) {
        setDisplayText(text.slice(0, currentIndex + 1));
        currentIndex++;
        typingTimer = setTimeout(type, speed);
      } else {
        setIsComplete(true);
        onComplete?.();
      }
    };

    startTimer = setTimeout(() => {
      type();
    }, delay);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(typingTimer);
    };
  }, [text, speed, delay, onComplete]);

  const cursorText = cursor && !isComplete ? cursorChar : "";
  return displayText + cursorText;
}

/**
 * 프로그레스 애니메이션 훅
 */
export function useProgressAnimation(
  targetProgress: number,
  duration = 500
) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startProgress = progress;
    const delta = targetProgress - startProgress;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);

      // easeOutCubic
      const easedProgress = 1 - Math.pow(1 - rawProgress, 3);

      setProgress(startProgress + delta * easedProgress);

      if (rawProgress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [targetProgress, duration, progress]);

  return Math.min(Math.max(progress, 0), 100);
}

/**
 * 시퀀스 애니메이션 훅
 */
export function useSequenceAnimation(
  steps: Array<{
    action: () => void;
    delay?: number;
  }>
) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const play = useCallback(() => {
    setIsPlaying(true);
    setCurrentStep(0);
  }, []);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
  }, []);

  useEffect(() => {
    if (!isPlaying || currentStep >= steps.length) {
      if (currentStep >= steps.length) {
        setIsPlaying(false);
      }
      return;
    }

    const step = steps[currentStep];
    step.action();

    const timer = setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
    }, step.delay || 0);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, steps]);

  return {
    currentStep,
    isPlaying,
    isComplete: currentStep >= steps.length,
    play,
    pause,
    reset,
  };
}

/**
 * 이징 함수들
 */
export const easingFunctions = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) =>
    t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInQuart: (t: number) => t * t * t * t,
  easeOutQuart: (t: number) => 1 - --t * t * t * t,
  easeInOutQuart: (t: number) =>
    t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t,
  easeInQuint: (t: number) => t * t * t * t * t,
  easeOutQuint: (t: number) => 1 + --t * t * t * t * t,
  easeInOutQuint: (t: number) =>
    t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t,
  easeInElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
        ? 1
        : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  },
  easeOutElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
        ? 1
        : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  easeInBounce: (t: number) => 1 - easingFunctions.easeOutBounce(1 - t),
  easeOutBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
};

/**
 * 리듀스드 모션 확인
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  return prefersReducedMotion;
}
