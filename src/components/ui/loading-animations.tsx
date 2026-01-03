import React from "react";
import { motion } from "motion/react";
import { cn } from "./utils";
import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  variant?: "default" | "dots" | "bars" | "pulse" | "ring" | "lantern" | "compass" | "pen" | "temple" | "library";
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

  if (variant === "compass") {
    return <CompassLoader size={size} className={className} />;
  }

  if (variant === "pen") {
    return <PenLoader size={size} className={className} />;
  }

  if (variant === "temple") {
    return <TempleColumnLoader size={size} className={className} />;
  }

  if (variant === "library") {
    return <LibraryBooksLoader size={size} className={className} />;
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
  const barWidth = {
    sm: "w-0.5",
    md: "w-1",
    lg: "w-1.5",
    xl: "w-2",
  };

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
 * 컴퍼스 로더 (다빈치 노트 테마용)
 */
function CompassLoader({
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

  const compassSize = sizes[size];
  const strokeWidth = size === "sm" ? 1.5 : size === "md" ? 2 : 2.5;

  return (
    <div className={cn("relative", compassSize, className)}>
      <motion.svg
        width="100%"
        height="100%"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-primary"
      >
        {/* 컴퍼스 다리 */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
          style={{ transformOrigin: "12px 12px" }}
        >
          <line x1="12" y1="12" x2="12" y2="4" />
          <line x1="12" y1="12" x2="12" y2="20" />
        </motion.g>
        {/* 원 그리기 */}
        <motion.circle
          cx="12"
          cy="12"
          r="8"
          fill="none"
          animate={{
            strokeDasharray: ["0 50", "50 0", "0 50"],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {/* 중심점 */}
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </motion.svg>
    </div>
  );
}

/**
 * 펜촉 로더 (다빈치 노트 테마용)
 */
function PenLoader({
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

  const penSize = sizes[size];
  const strokeWidth = size === "sm" ? 1.5 : size === "md" ? 2 : 2.5;

  return (
    <div className={cn("relative", penSize, className)}>
      <motion.svg
        width="100%"
        height="100%"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      >
        {/* 펜촉 */}
        <motion.path
          d="M12 2 L18 8 L16 10 L14 8 L12 10 L10 8 L8 10 L6 8 L12 2 Z"
          fill="currentColor"
          animate={{
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {/* 글씨 쓰는 선 */}
        <motion.path
          d="M6 12 Q8 14 10 12 T14 12 T18 12"
          fill="none"
          animate={{
            strokeDasharray: ["0 20", "20 0", "0 20"],
            pathLength: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.svg>
    </div>
  );
}

/**
 * 대리석 기둥 로더 (그리스 신전 테마용)
 */
function TempleColumnLoader({
  size,
  className,
}: {
  size: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const strokeWidth = size === "sm" ? 1.5 : size === "md" ? 2 : size === "lg" ? 2.5 : 3;
  
  // 고유 ID 생성 (여러 로더가 동시에 렌더링되어도 충돌 방지)
  const gradientId = React.useMemo(() => `temple-gradient-${Math.random().toString(36).substr(2, 9)}`, []);
  const marbleGradientId = `${gradientId}-marble`;
  const goldGradientId = `${gradientId}-gold`;

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <motion.svg
        width={size === "sm" ? 48 : size === "md" ? 64 : size === "lg" ? 80 : 96}
        height={size === "sm" ? 64 : size === "md" ? 96 : size === "lg" ? 128 : 160}
        viewBox="0 0 24 32"
        fill="none"
        className="text-primary"
      >
        {/* 대리석 기둥 본체 - 도리스식 기둥 */}
        <defs>
          {/* 대리석 질감 그라데이션 */}
          <linearGradient id={marbleGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#faf8f3" stopOpacity="0.9" />
            <stop offset="30%" stopColor="#ede6d9" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#e8e0d4" stopOpacity="0.85" />
            <stop offset="70%" stopColor="#ede6d9" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f5f1e8" stopOpacity="0.9" />
          </linearGradient>
          {/* 황금 장식 그라데이션 */}
          <linearGradient id={goldGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d4af5a" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#c9a855" stopOpacity="1" />
            <stop offset="100%" stopColor="#b8963a" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* 기둥 본체 - 서서히 나타남 */}
        <motion.rect
          x="8"
          y="4"
          width="8"
          height="24"
          rx="1"
          fill={`url(#${marbleGradientId})`}
          stroke={`url(#${goldGradientId})`}
          strokeWidth={strokeWidth}
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{
            opacity: [0, 0.3, 0.7, 1, 0.9, 1],
            scaleY: [0, 0.3, 0.7, 1, 1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 0.5,
            ease: "easeOut",
          }}
        />

        {/* 기둥 세로 홈 (fluting) - 대리석 질감 */}
        {[0, 1, 2, 3].map((index) => (
          <motion.line
            key={index}
            x1={10 + index * 1.5}
            y1="4"
            x2={10 + index * 1.5}
            y2="28"
            stroke="rgba(201, 168, 85, 0.15)"
            strokeWidth="0.3"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0, 0.15, 0.2, 0.15],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              repeatDelay: 0.5,
              delay: index * 0.1,
              ease: "easeOut",
            }}
          />
        ))}

        {/* 기둥 상단 장식 (capital) - 황금색 */}
        <motion.rect
          x="7"
          y="2"
          width="10"
          height="3"
          rx="0.5"
          fill={`url(#${goldGradientId})`}
          initial={{ opacity: 0, y: -2 }}
          animate={{
            opacity: [0, 0, 0.5, 1, 0.9, 1],
            y: [-2, -1, 0, 0, 0, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 0.5,
            delay: 0.3,
            ease: "easeOut",
          }}
        />

        {/* 기둥 하단 기단 (base) - 황금색 */}
        <motion.rect
          x="6"
          y="28"
          width="12"
          height="2"
          rx="0.5"
          fill={`url(#${goldGradientId})`}
          initial={{ opacity: 0, y: 2 }}
          animate={{
            opacity: [0, 0, 0.5, 1, 0.9, 1],
            y: [2, 1, 0, 0, 0, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 0.5,
            delay: 0.5,
            ease: "easeOut",
          }}
        />

        {/* 황금 빛 효과 */}
        <motion.rect
          x="8"
          y="4"
          width="8"
          height="24"
          rx="1"
          fill="none"
          stroke={`url(#${goldGradientId})`}
          strokeWidth={strokeWidth * 0.5}
          opacity={0.6}
          animate={{
            opacity: [0.3, 0.6, 0.8, 0.6, 0.3],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.svg>
    </div>
  );
}

/**
 * 책장 로더 (황금빛 서재 테마용)
 */
function LibraryBooksLoader({
  size,
  className,
}: {
  size: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "w-32 h-20",
    md: "w-40 h-24",
    lg: "w-48 h-28",
    xl: "w-56 h-32",
  };

  const containerSize = sizes[size];
  const bookCount = size === "sm" ? 4 : size === "md" ? 5 : size === "lg" ? 6 : 7;
  
  // 고유 ID 생성
  const gradientId = React.useMemo(() => `library-gradient-${Math.random().toString(36).substr(2, 9)}`, []);
  const goldGradientId = `${gradientId}-gold`;
  const woodGradientId = `${gradientId}-wood`;

  // 책 색상 배열 (황금빛 서재 느낌)
  const bookColors = [
    "#d4af37", // 황금색
    "#c9a855", // 연한 황금색
    "#b8963a", // 진한 황금색
    "#a68b5b", // 갈색 황금
    "#8b7355", // 가죽색
    "#7a6b5a", // 어두운 갈색
    "#6b5a4a", // 진한 갈색
  ];

  return (
    <div className={cn("relative flex items-center justify-center", containerSize, className)}>
      <motion.svg
        width="100%"
        height="100%"
        viewBox="0 0 120 60"
        fill="none"
        className="text-primary"
      >
        <defs>
          {/* 황금 그라데이션 */}
          <linearGradient id={goldGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#d4af37" stopOpacity="1" />
            <stop offset="50%" stopColor="#c9a855" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#b8963a" stopOpacity="0.8" />
          </linearGradient>
          {/* 나무 질감 그라데이션 */}
          <linearGradient id={woodGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3d3528" stopOpacity="1" />
            <stop offset="50%" stopColor="#2a2418" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* 책장 선반 */}
        <motion.rect
          x="5"
          y="45"
          width="110"
          height="4"
          rx="1"
          fill={`url(#${woodGradientId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />

        {/* 책들 - 하나씩 나타남 */}
        {Array.from({ length: bookCount }).map((_, index) => {
          const bookWidth = 12 + (index % 3) * 2; // 책 두께 다양화
          const bookHeight = 35 + (index % 2) * 3; // 책 높이 다양화
          const xPosition = 10 + index * 15; // 책 위치
          const yPosition = 45 - bookHeight; // 책장 위
          const bookColor = bookColors[index % bookColors.length];

          return (
            <motion.g key={index}>
              {/* 책 본체 */}
              <motion.rect
                x={xPosition}
                y={yPosition}
                width={bookWidth}
                height={bookHeight}
                rx="1"
                fill={bookColor}
                initial={{ 
                  opacity: 0, 
                  x: xPosition - 20,
                  scaleX: 0 
                }}
                animate={{ 
                  opacity: [0, 0, 1, 1],
                  x: [xPosition - 20, xPosition - 10, xPosition, xPosition],
                  scaleX: [0, 0.5, 1, 1]
                }}
                transition={{
                  duration: 1.2,
                  delay: index * 0.15,
                  repeat: Infinity,
                  repeatDelay: 0.3,
                  ease: "easeOut",
                }}
              />
              
              {/* 책 등 (spine) - 황금 장식 */}
              <motion.rect
                x={xPosition}
                y={yPosition}
                width={bookWidth}
                height={bookHeight}
                rx="1"
                fill="none"
                stroke={`url(#${goldGradientId})`}
                strokeWidth="0.5"
                opacity={0.6}
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0, 0, 0.6, 0.6]
                }}
                transition={{
                  duration: 1.2,
                  delay: index * 0.15 + 0.3,
                  repeat: Infinity,
                  repeatDelay: 0.3,
                  ease: "easeOut",
                }}
              />

              {/* 책 제목선 (선택적) */}
              {index % 2 === 0 && (
                <motion.line
                  x1={xPosition + 2}
                  y1={yPosition + bookHeight / 2}
                  x2={xPosition + bookWidth - 2}
                  y2={yPosition + bookHeight / 2}
                  stroke={`url(#${goldGradientId})`}
                  strokeWidth="0.3"
                  opacity={0.4}
                  initial={{ opacity: 0, pathLength: 0 }}
                  animate={{ 
                    opacity: [0, 0, 0.4, 0.4],
                    pathLength: [0, 0, 1, 1]
                  }}
                  transition={{
                    duration: 1.2,
                    delay: index * 0.15 + 0.5,
                    repeat: Infinity,
                    repeatDelay: 0.3,
                    ease: "easeOut",
                  }}
                />
              )}
            </motion.g>
          );
        })}

        {/* 황금 빛 효과 (책장 전체) */}
        <motion.rect
          x="5"
          y="10"
          width="110"
          height="35"
          rx="2"
          fill="none"
          stroke={`url(#${goldGradientId})`}
          strokeWidth="1"
          opacity={0.3}
          animate={{
            opacity: [0.2, 0.4, 0.3, 0.2],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.svg>
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

  // 현재 테마에 따라 로딩 애니메이션 자동 선택
  const getLoadingVariant = () => {
    if (typeof window === "undefined") return "lantern";
    const theme = document.documentElement.getAttribute("data-theme");
    if (theme === "sketchbook") return "compass";
    if (theme === "greek-temple") return "temple";
    if (theme === "golden-library") return "library";
    return "lantern";
  };

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
      <LoadingSpinner size="lg" variant={getLoadingVariant()} />
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
  // 현재 테마에 따라 로딩 애니메이션 자동 선택
  const getLoadingVariant = () => {
    if (typeof window === "undefined") return "lantern";
    const theme = document.documentElement.getAttribute("data-theme");
    if (theme === "sketchbook") return "compass";
    if (theme === "greek-temple") return "temple";
    if (theme === "golden-library") return "library";
    return "lantern";
  };

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
      <LoadingSpinner size="lg" variant={getLoadingVariant()} />
    </div>
  );
}
