import { motion } from "motion/react";
import { cn } from "./utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  variant?: "default" | "dots" | "bars" | "pulse" | "ring" | "lantern";
}

/**
 * 로딩 스피너
 */
export function LoadingSpinner({
  size = "md",
  className,
  variant = "default",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  if (variant === "dots") {
    return <DotsLoader size={size} className={className} />;
  }

  if (variant === "bars") {
    return <BarsLoader size={size} className={className} />;
  }

  if (variant === "pulse") {
    return <PulseLoader size={size} className={className} />;
  }

  if (variant === "ring") {
    return <RingLoader size={size} className={className} />;
  }

  if (variant === "lantern") {
    return <LanternLoader size={size} className={className} />;
  }

  // Default spinner
  return (
    <Loader2
      className={cn(
        "animate-spin text-primary",
        sizeClasses[size],
        className
      )}
    />
  );
}

/**
 * 점 로더
 */
function DotsLoader({
  size,
  className,
}: {
  size: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2.5 h-2.5",
    lg: "w-3.5 h-3.5",
    xl: "w-4 h-4",
  };

  const dotSize = dotSizes[size];

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={cn("rounded-full bg-primary", dotSize)}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: index * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/**
 * 바 로더
 */
function BarsLoader({
  size,
  className,
}: {
  size: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const barHeights = {
    sm: "h-4",
    md: "h-6",
    lg: "h-8",
    xl: "h-10",
  };

  const barWidth = {
    sm: "w-0.5",
    md: "w-1",
    lg: "w-1.5",
    xl: "w-2",
  };

  const height = barHeights[size];
  const width = barWidth[size];

  return (
    <div className={cn("flex items-end gap-1", className)}>
      {[0, 1, 2, 3, 4].map((index) => (
        <motion.div
          key={index}
          className={cn("bg-primary rounded-full", width)}
          style={{ height: "40%" }}
          animate={{
            scaleY: [0.4, 1, 0.4],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: index * 0.1,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/**
 * 펄스 로더
 */
function PulseLoader({
  size,
  className,
}: {
  size: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
    xl: "w-20 h-20",
  };

  const circleSize = sizes[size];

  return (
    <div className={cn("relative", circleSize, className)}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="absolute inset-0 rounded-full border-2 border-primary"
          animate={{
            scale: [1, 2, 2],
            opacity: [1, 0, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: index * 0.5,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

/**
 * 링 로더
 */
function RingLoader({
  size,
  className,
}: {
  size: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "w-8 h-8 border-2",
    md: "w-12 h-12 border-3",
    lg: "w-16 h-16 border-4",
    xl: "w-20 h-20 border-4",
  };

  const ringSize = sizes[size];

  return (
    <motion.div
      className={cn(
        "rounded-full border-primary/30 border-t-primary",
        ringSize,
        className
      )}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
}

/**
 * 랜턴 로더 (비유노트 전용)
 */
function LanternLoader({
  size,
  className,
}: {
  size: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-14 h-14",
    xl: "w-18 h-18",
  };

  const lanternSize = sizes[size];

  return (
    <div className={cn("relative", lanternSize, className)}>
      {/* 랜턴 본체 */}
      <motion.div
        className="w-full h-full rounded-lg bg-gradient-to-b from-primary/80 to-primary flex items-center justify-center"
        animate={{
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* 불빛 */}
        <motion.div
          className="w-1/2 h-1/2 rounded-full bg-yellow-300"
          animate={{
            scale: [0.8, 1.2, 0.8],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>

      {/* 빛 효과 */}
      <motion.div
        className="absolute inset-0 rounded-lg bg-primary/20 blur-xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

/**
 * 스켈레톤 로더
 */
export function SkeletonLoader({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "text" | "circular" | "rectangular";
}) {
  const variantClasses = {
    default: "rounded",
    text: "rounded h-4",
    circular: "rounded-full",
    rectangular: "rounded-none",
  };

  return (
    <motion.div
      className={cn(
        "bg-muted",
        variantClasses[variant],
        className
      )}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

/**
 * 진행률 바 애니메이션
 */
export function ProgressBar({
  progress,
  className,
  showPercentage = false,
  variant = "default",
}: {
  progress: number;
  className?: string;
  showPercentage?: boolean;
  variant?: "default" | "gradient" | "striped";
}) {
  return (
    <div className={cn("relative w-full", className)}>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn(
            "h-full rounded-full",
            variant === "default" && "bg-primary",
            variant === "gradient" &&
              "bg-gradient-to-r from-primary to-primary/60",
            variant === "striped" &&
              "bg-primary bg-[length:1rem_1rem] bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)]"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          transition={{
            duration: 0.5,
            ease: "easeOut",
          }}
        />
      </div>
      {showPercentage && (
        <motion.span
          className="absolute -top-6 left-0 text-xs font-medium text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {Math.round(progress)}%
        </motion.span>
      )}
    </div>
  );
}

/**
 * 원형 진행률 로더
 */
export function CircularProgress({
  progress,
  size = 60,
  strokeWidth = 4,
  className,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* 배경 원 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted"
        />
        {/* 진행률 원 */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          className="text-primary"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
        {Math.round(progress)}%
      </div>
    </div>
  );
}

/**
 * 풀스크린 로딩 오버레이
 */
export function LoadingOverlay({
  isLoading,
  message,
  variant = "default",
}: {
  isLoading: boolean;
  message?: string;
  variant?: "default" | "blur";
}) {
  if (!isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80",
        variant === "blur" && "backdrop-blur-sm"
      )}
    >
      <LoadingSpinner size="lg" variant="lantern" />
      {message && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-4 text-sm text-muted-foreground"
        >
          {message}
        </motion.p>
      )}
    </motion.div>
  );
}

/**
 * 버튼 로딩 상태
 */
export function ButtonLoading({
  isLoading,
  children,
  loadingText = "로딩 중...",
}: {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
}) {
  return (
    <div className="relative">
      <div className={cn(isLoading && "invisible")}>{children}</div>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center gap-2">
          <LoadingSpinner size="sm" />
          <span>{loadingText}</span>
        </div>
      )}
    </div>
  );
}

/**
 * 타이핑 인디케이터 (채팅용)
 */
export function TypingIndicator({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="w-2 h-2 rounded-full bg-muted-foreground"
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: index * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/**
 * 페이지 로딩 상태
 */
export function PageLoading({
  variant = "spinner",
}: {
  variant?: "spinner" | "skeleton" | "dots";
}) {
  if (variant === "skeleton") {
    return (
      <div className="p-4 space-y-4">
        <SkeletonLoader className="h-8 w-48" variant="text" />
        <SkeletonLoader className="h-32 w-full" />
        <SkeletonLoader className="h-32 w-full" />
        <SkeletonLoader className="h-32 w-full" />
      </div>
    );
  }

  if (variant === "dots") {
    return (
      <div className="flex items-center justify-center h-screen">
        <DotsLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <LoadingSpinner size="lg" variant="lantern" />
    </div>
  );
}
