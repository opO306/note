import { ReactNode, Children } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./utils";

interface StaggerListProps {
  children: ReactNode;
  /** 각 아이템 간 지연 (초) */
  staggerDelay?: number;
  /** 초기 지연 (초) */
  initialDelay?: number;
  /** 애니메이션 타입 */
  variant?: "fade" | "slideUp" | "slideLeft" | "scale" | "blur";
  /** 추가 클래스명 */
  className?: string;
  /** 애니메이션 비활성화 */
  disableAnimation?: boolean;
}

/**
 * 스태거 리스트 애니메이션
 */
export function StaggerList({
  children,
  staggerDelay = 0.05,
  initialDelay = 0,
  variant = "fade",
  className,
  disableAnimation = false,
}: StaggerListProps) {
  const childArray = Children.toArray(children);

  if (disableAnimation) {
    return <div className={className}>{children}</div>;
  }

  const variants = getListVariants(variant);

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: initialDelay,
          },
        },
      }}
    >
      {childArray.map((child, index) => (
        <motion.div key={index} variants={variants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

/**
 * 리스트 variants
 */
function getListVariants(variant: string) {
  switch (variant) {
    case "fade":
      return {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      };

    case "slideUp":
      return {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      };

    case "slideLeft":
      return {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0 },
      };

    case "scale":
      return {
        hidden: { opacity: 0, scale: 0.8 },
        visible: { opacity: 1, scale: 1 },
      };

    case "blur":
      return {
        hidden: { opacity: 0, filter: "blur(10px)" },
        visible: { opacity: 1, filter: "blur(0px)" },
      };

    default:
      return {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      };
  }
}

/**
 * 애니메이티드 리스트 아이템
 */
export function AnimatedListItem({
  children,
  index,
  variant = "slideUp",
  className,
}: {
  children: ReactNode;
  index: number;
  variant?: "fade" | "slideUp" | "slideLeft" | "scale";
  className?: string;
}) {
  const variants = getListVariants(variant);

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={variants}
      transition={{
        delay: index * 0.05,
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * 그리드 스태거 애니메이션
 */
export function StaggerGrid({
  children,
  columns = 2,
  staggerDelay = 0.05,
  variant = "scale",
  className,
}: {
  children: ReactNode;
  columns?: number;
  staggerDelay?: number;
  variant?: "fade" | "slideUp" | "scale";
  className?: string;
}) {
  const childArray = Children.toArray(children);
  const variants = getListVariants(variant);

  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-3",
        columns === 4 && "grid-cols-4",
        className
      )}
    >
      {childArray.map((child, index) => (
        <motion.div
          key={index}
          custom={index}
          initial="hidden"
          animate="visible"
          variants={variants}
          transition={{
            delay: index * staggerDelay,
            duration: 0.3,
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

/**
 * 추가/제거 애니메이션이 있는 리스트
 */
export function AnimatedList<T extends { id: string | number }>({
  items,
  renderItem,
  keyExtractor = (item) => item.id,
  variant = "slideUp",
  className,
}: {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor?: (item: T) => string | number;
  variant?: "fade" | "slideUp" | "slideLeft" | "scale";
  className?: string;
}) {
  const variants = getListVariants(variant);

  return (
    <div className={className}>
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <motion.div
            key={keyExtractor(item)}
            layout
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={variants}
            transition={{
              layout: { duration: 0.3 },
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 },
            }}
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * 인피니트 스크롤 리스트 애니메이션
 */
export function InfiniteScrollList({
  children,
  staggerDelay = 0.03,
  variant = "fade",
  className,
}: {
  children: ReactNode;
  staggerDelay?: number;
  variant?: "fade" | "slideUp";
  className?: string;
}) {
  const childArray = Children.toArray(children);
  const variants = getListVariants(variant);

  return (
    <div className={className}>
      {childArray.map((child, index) => (
        <motion.div
          key={index}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "50px" }}
          variants={variants}
          transition={{
            delay: (index % 10) * staggerDelay, // 10개씩 그룹화
            duration: 0.3,
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

/**
 * 레이아웃 애니메이션이 있는 리스트
 */
export function LayoutAnimatedList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const childArray = Children.toArray(children);

  return (
    <div className={className}>
      <AnimatePresence>
        {childArray.map((child, index) => (
          <motion.div
            key={index}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              layout: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 },
            }}
          >
            {child}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * 카드 플립 애니메이션
 */
export function FlipCard({
  front,
  back,
  isFlipped,
  onClick,
  className,
}: {
  front: ReactNode;
  back: ReactNode;
  isFlipped: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <motion.div
      className={cn("relative cursor-pointer", className)}
      onClick={onClick}
      style={{ perspective: 1000 }}
    >
      <AnimatePresence mode="wait">
        {!isFlipped ? (
          <motion.div
            key="front"
            initial={{ rotateY: 0 }}
            animate={{ rotateY: 0 }}
            exit={{ rotateY: 90 }}
            transition={{ duration: 0.3 }}
            style={{ backfaceVisibility: "hidden" }}
          >
            {front}
          </motion.div>
        ) : (
          <motion.div
            key="back"
            initial={{ rotateY: -90 }}
            animate={{ rotateY: 0 }}
            exit={{ rotateY: -90 }}
            transition={{ duration: 0.3 }}
            style={{ backfaceVisibility: "hidden" }}
          >
            {back}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * 드래그 정렬 가능한 리스트
 */
export function DraggableList<T extends { id: string | number }>({
  items,
  onReorder,
  renderItem,
  className,
}: {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {items.map((item, index) => (
        <motion.div
          key={item.id}
          layout
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          whileDrag={{ scale: 1.05, zIndex: 1 }}
          transition={{
            layout: { type: "spring", stiffness: 300, damping: 30 },
          }}
        >
          {renderItem(item, index)}
        </motion.div>
      ))}
    </div>
  );
}

/**
 * 호버 카드 애니메이션
 */
export function HoverCard({
  children,
  className,
  hoverScale = 1.03,
}: {
  children: ReactNode;
  className?: string;
  hoverScale?: number;
}) {
  return (
    <motion.div
      className={className}
      whileHover={{
        scale: hoverScale,
        y: -2,
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 펄스 애니메이션
 */
export function PulseAnimation({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      animate={{
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 바운스 애니메이션
 */
export function BounceAnimation({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      animate={{
        y: [0, -10, 0],
      }}
      transition={{
        duration: 0.6,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 회전 애니메이션
 */
export function SpinAnimation({
  children,
  className,
  duration = 1,
}: {
  children: ReactNode;
  className?: string;
  duration?: number;
}) {
  return (
    <motion.div
      className={className}
      animate={{
        rotate: 360,
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "linear",
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * 쉐이크 애니메이션
 */
export function ShakeAnimation({
  children,
  className,
  trigger,
}: {
  children: ReactNode;
  className?: string;
  trigger: boolean;
}) {
  return (
    <motion.div
      className={className}
      animate={
        trigger
          ? {
              x: [0, -10, 10, -10, 10, 0],
              transition: { duration: 0.4 },
            }
          : {}
      }
    >
      {children}
    </motion.div>
  );
}
