// src/components/icons/BookmarkIcon.tsx
// 황금 책갈피 아이콘 컴포넌트 - 신뢰도 70 이상일 때 표시

interface BookmarkIconProps {
  size?: number;
  className?: string;
  isPremium?: boolean;
}

/**
 * 황금 책갈피 아이콘 - 닉네임 옆에 표시되는 작은 책갈피
 * 프리미엄 유저일 경우 반짝임 애니메이션 효과
 */
export function BookmarkIcon({ size = 16, className = "", isPremium = false }: BookmarkIconProps) {
  // 고유 ID 생성 (여러 개 사용 시 충돌 방지)
  const gradientId = `bookmarkGold-${size}`;
  const shadowId = `bookmarkShadow-${size}`;
  const sparkleId = `bookmarkSparkle-${size}`;
  
  return (
    <>
      <style>
        {isPremium && `
          @keyframes sparkle-${sparkleId} {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(0.9); }
          }
          .bookmark-sparkle-${sparkleId} {
            animation: sparkle-${sparkleId} 2s ease-in-out infinite;
          }
        `}
      </style>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={`${className} ${isPremium ? `bookmark-sparkle-${sparkleId}` : ""}`}
      >
        <defs>
          {/* 황금색 그라데이션 - 금속성 광택 효과 */}
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd700" stopOpacity="1" />
            <stop offset="30%" stopColor="#f4d03f" stopOpacity="1" />
            <stop offset="60%" stopColor="#c9a855" stopOpacity="1" />
            <stop offset="100%" stopColor="#b8860b" stopOpacity="1" />
          </linearGradient>
          {/* 그림자 효과 */}
          <filter id={shadowId}>
            <feDropShadow dx="0.3" dy="0.3" stdDeviation="0.4" floodColor="#8b6914" floodOpacity="0.4" />
          </filter>
        </defs>
        
        {/* 책갈피 본체 - 위쪽이 뾰족하고 아래쪽에 끈/리본 */}
        <path
          d="M 12 2 L 14 8 L 20 8 L 14.5 12 L 16.5 18 L 12 14 L 7.5 18 L 9.5 12 L 4 8 L 10 8 Z"
          fill={`url(#${gradientId})`}
          filter={`url(#${shadowId})`}
          stroke={`url(#${gradientId})`}
          strokeWidth="0.5"
        />
        
        {/* 리본/끈 부분 (아래쪽) */}
        <rect x="11" y="14" width="2" height="6" rx="0.5" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
        <circle cx="10" cy="18" r="1" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
        <circle cx="14" cy="18" r="1" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
        
        {/* 반짝임 효과 (프리미엄) */}
        {isPremium && (
          <>
            <circle cx="10" cy="6" r="0.8" fill="#ffffff" opacity="0.8">
              <animate attributeName="opacity" values="0.3;1;0.3" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="16" cy="10" r="0.6" fill="#ffffff" opacity="0.6">
              <animate attributeName="opacity" values="0.2;0.9;0.2" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="8" cy="12" r="0.7" fill="#ffffff" opacity="0.7">
              <animate attributeName="opacity" values="0.4;1;0.4" dur="1.8s" repeatCount="indefinite" />
            </circle>
          </>
        )}
      </svg>
    </>
  );
}

