import { useState, useEffect } from "react";
import { Button } from "./button";
import { ArrowUp } from "lucide-react";
import { cn } from "./utils";

interface ScrollToTopProps {
  /** 버튼을 표시할 스크롤 위치 (px) */
  threshold?: number;
  /** 스크롤할 컨테이너의 ref (없으면 window) */
  containerRef?: React.RefObject<HTMLElement>;
  /** 버튼 위치 */
  position?: "bottom-right" | "bottom-left" | "bottom-center";
  /** 추가 클래스명 */
  className?: string;
  /** 부드러운 스크롤 여부 */
  smooth?: boolean;
}

/**
 * 맨 위로 스크롤 버튼
 * 일정 위치 이하로 스크롤하면 표시됨
 */
export function ScrollToTop({
  threshold = 300,
  containerRef,
  position = "bottom-right",
  className,
  smooth = true,
}: ScrollToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const container = containerRef?.current || window;
    
    const handleScroll = () => {
      if (containerRef?.current) {
        // 컨테이너가 있는 경우
        const scrollTop = containerRef.current.scrollTop;
        setIsVisible(scrollTop > threshold);
      } else {
        // window 스크롤
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        setIsVisible(scrollTop > threshold);
      }
    };

    // 초기 확인
    handleScroll();

    // 스크롤 이벤트 리스너 등록
    if (containerRef?.current) {
      containerRef.current.addEventListener("scroll", handleScroll);
    } else {
      window.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (containerRef?.current) {
        containerRef.current.removeEventListener("scroll", handleScroll);
      } else {
        window.removeEventListener("scroll", handleScroll);
      }
    };
  }, [threshold, containerRef]);

  const scrollToTop = () => {
    if (containerRef?.current) {
      containerRef.current.scrollTo({
        top: 0,
        behavior: smooth ? "smooth" : "auto",
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: smooth ? "smooth" : "auto",
      });
    }
  };

  const positionClasses = {
    "bottom-right": "bottom-20 right-4",
    "bottom-left": "bottom-20 left-4",
    "bottom-center": "bottom-20 left-1/2 -translate-x-1/2",
  };

  if (!isVisible) return null;

  return (
    <Button
      size="icon"
      onClick={scrollToTop}
      className={cn(
        "fixed z-40 h-12 w-12 rounded-full shadow-lg",
        "transition-all duration-300",
        "hover:scale-110 active:scale-95",
        "safe-nav-bottom",
        positionClasses[position],
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10",
        className
      )}
      aria-label="맨 위로 스크롤"
    >
      <ArrowUp className="w-5 h-5" />
    </Button>
  );
}

/**
 * 스크롤 진행률 표시 버튼
 */
export function ScrollProgressButton({
  threshold = 100,
  containerRef,
  position = "bottom-right",
  className,
}: Omit<ScrollToTopProps, "smooth">) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const container = containerRef?.current;
    
    const handleScroll = () => {
      if (container) {
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        const totalScrollable = scrollHeight - clientHeight;
        const progress = (scrollTop / totalScrollable) * 100;
        
        setScrollProgress(Math.min(progress, 100));
        setIsVisible(scrollTop > threshold);
      } else {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;
        const totalScrollable = scrollHeight - clientHeight;
        const progress = (scrollTop / totalScrollable) * 100;
        
        setScrollProgress(Math.min(progress, 100));
        setIsVisible(scrollTop > threshold);
      }
    };

    handleScroll();

    if (container) {
      container.addEventListener("scroll", handleScroll);
    } else {
      window.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      } else {
        window.removeEventListener("scroll", handleScroll);
      }
    };
  }, [threshold, containerRef]);

  const scrollToTop = () => {
    if (containerRef?.current) {
      containerRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } else {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const positionClasses = {
    "bottom-right": "bottom-20 right-4",
    "bottom-left": "bottom-20 left-4",
    "bottom-center": "bottom-20 left-1/2 -translate-x-1/2",
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className={cn(
        "fixed z-40 h-12 w-12 rounded-full shadow-lg",
        "transition-all duration-300",
        "hover:scale-110 active:scale-95",
        "safe-nav-bottom",
        "bg-card border-2 border-primary",
        positionClasses[position],
        className
      )}
      aria-label={`맨 위로 스크롤 (${Math.round(scrollProgress)}%)`}
      style={{
        background: `conic-gradient(
          var(--primary) ${scrollProgress * 3.6}deg,
          var(--muted) ${scrollProgress * 3.6}deg
        )`,
      }}
    >
      <div className="absolute inset-1 bg-card rounded-full flex items-center justify-center">
        <ArrowUp className="w-5 h-5 text-primary" />
      </div>
    </button>
  );
}

/**
 * 스크롤 위치 추적 훅
 */
export function useScrollPosition(containerRef?: React.RefObject<HTMLElement>) {
  const [scrollPosition, setScrollPosition] = useState({
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
    progress: 0,
  });

  useEffect(() => {
    const container = containerRef?.current;

    const handleScroll = () => {
      if (container) {
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        const totalScrollable = scrollHeight - clientHeight;
        const progress = totalScrollable > 0 ? (scrollTop / totalScrollable) * 100 : 0;

        setScrollPosition({
          scrollTop,
          scrollHeight,
          clientHeight,
          progress: Math.min(progress, 100),
        });
      } else {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;
        const totalScrollable = scrollHeight - clientHeight;
        const progress = totalScrollable > 0 ? (scrollTop / totalScrollable) * 100 : 0;

        setScrollPosition({
          scrollTop,
          scrollHeight,
          clientHeight,
          progress: Math.min(progress, 100),
        });
      }
    };

    handleScroll();

    if (container) {
      container.addEventListener("scroll", handleScroll);
    } else {
      window.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll);
      } else {
        window.removeEventListener("scroll", handleScroll);
      }
    };
  }, [containerRef]);

  return scrollPosition;
}
