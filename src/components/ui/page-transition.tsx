import { ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./utils";

export type TransitionType =
  | "fade"
  | "slide"
  | "scale"
  | "slideUp"
  | "slideDown"
  | "slideLeft"
  | "slideRight"
  | "scaleRotate"
  | "flip";

interface PageTransitionProps {
  children: ReactNode;
  /** 전환 타입 */
  type?: TransitionType;
  /** 지속 시간 (초) */
  duration?: number;
  /** 페이지 키 (변경 시 애니메이션 트리거) */
  pageKey: string;
  /** 추가 클래스명 */
  className?: string;
}

/**
 * 페이지 전환 애니메이션 래퍼
 */
export function PageTransition({
  children,
  type = "fade",
  duration = 0.3,
  pageKey,
  className,
}: PageTransitionProps) {
  const variants = getTransitionVariants(type);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={variants}
        transition={{
          duration,
          ease: [0.4, 0, 0.2, 1], // easeInOut
        }}
        className={cn("w-full h-full", className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * 전환 타입별 variants
 */
function getTransitionVariants(type: TransitionType) {
  switch (type) {
    case "fade":
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };

    case "slide":
      return {
        initial: { x: "100%", opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: "-100%", opacity: 0 },
      };

    case "slideUp":
      return {
        initial: { y: "100%", opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: "-100%", opacity: 0 },
      };

    case "slideDown":
      return {
        initial: { y: "-100%", opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: "100%", opacity: 0 },
      };

    case "slideLeft":
      return {
        initial: { x: "-100%", opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: "100%", opacity: 0 },
      };

    case "slideRight":
      return {
        initial: { x: "100%", opacity: 0 },
        animate: { x: 0, opacity: 1 },
        exit: { x: "-100%", opacity: 0 },
      };

    case "scale":
      return {
        initial: { scale: 0.8, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        exit: { scale: 0.8, opacity: 0 },
      };

    case "scaleRotate":
      return {
        initial: { scale: 0.5, rotate: -10, opacity: 0 },
        animate: { scale: 1, rotate: 0, opacity: 1 },
        exit: { scale: 0.5, rotate: 10, opacity: 0 },
      };

    case "flip":
      return {
        initial: { rotateY: 90, opacity: 0 },
        animate: { rotateY: 0, opacity: 1 },
        exit: { rotateY: -90, opacity: 0 },
      };

    default:
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      };
  }
}

/**
 * 모달/다이얼로그 전환 애니메이션
 */
export function DialogTransition({
  children,
  open,
  onOpenChange,
}: {
  children: ReactNode;
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 배경 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange?.(false)}
          />

          {/* 다이얼로그 컨텐츠 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{
              duration: 0.2,
              ease: [0.4, 0, 0.2, 1],
            }}
            className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Sheet 전환 애니메이션 (슬라이드 인)
 */
export function SheetTransition({
  children,
  open,
  side = "right",
}: {
  children: ReactNode;
  open: boolean;
  side?: "left" | "right" | "top" | "bottom";
}) {
  const getSlideVariants = () => {
    switch (side) {
      case "left":
        return {
          initial: { x: "-100%" },
          animate: { x: 0 },
          exit: { x: "-100%" },
        };
      case "right":
        return {
          initial: { x: "100%" },
          animate: { x: 0 },
          exit: { x: "100%" },
        };
      case "top":
        return {
          initial: { y: "-100%" },
          animate: { y: 0 },
          exit: { y: "-100%" },
        };
      case "bottom":
        return {
          initial: { y: "100%" },
          animate: { y: 0 },
          exit: { y: "100%" },
        };
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial="initial"
          animate="animate"
          exit="exit"
          variants={getSlideVariants()}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
          }}
          className="fixed z-50"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * 탭 전환 애니메이션
 */
export function TabTransition({
  children,
  tabKey,
  direction = "horizontal",
}: {
  children: ReactNode;
  tabKey: string;
  direction?: "horizontal" | "vertical";
}) {
  const variants =
    direction === "horizontal"
      ? {
          initial: { x: 10, opacity: 0 },
          animate: { x: 0, opacity: 1 },
          exit: { x: -10, opacity: 0 },
        }
      : {
          initial: { y: 10, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          exit: { y: -10, opacity: 0 },
        };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={variants}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Collapse 애니메이션
 */
export function CollapseTransition({
  children,
  isOpen,
}: {
  children: ReactNode;
  isOpen: boolean;
}) {
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * 드롭다운 애니메이션
 */
export function DropdownTransition({
  children,
  isOpen,
}: {
  children: ReactNode;
  isOpen: boolean;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * 툴팁 애니메이션
 */
export function TooltipTransition({
  children,
  isOpen,
  side = "top",
}: {
  children: ReactNode;
  isOpen: boolean;
  side?: "top" | "bottom" | "left" | "right";
}) {
  const getVariants = () => {
    switch (side) {
      case "top":
        return { initial: { y: 5, opacity: 0 }, animate: { y: 0, opacity: 1 } };
      case "bottom":
        return { initial: { y: -5, opacity: 0 }, animate: { y: 0, opacity: 1 } };
      case "left":
        return { initial: { x: 5, opacity: 0 }, animate: { x: 0, opacity: 1 } };
      case "right":
        return { initial: { x: -5, opacity: 0 }, animate: { x: 0, opacity: 1 } };
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial="initial"
          animate="animate"
          exit="initial"
          variants={getVariants()}
          transition={{ duration: 0.1 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * 줌 인/아웃 전환
 */
export function ZoomTransition({
  children,
  isOpen,
}: {
  children: ReactNode;
  isOpen: boolean;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
