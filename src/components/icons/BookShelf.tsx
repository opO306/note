// src/components/icons/BookShelf.tsx
// 책장 아이콘 컴포넌트 - 신뢰도에 따라 책장의 완성도가 달라짐

export type BookShelfLevel = "empty" | "partial" | "full" | "luxury";

interface BookShelfProps {
  level: BookShelfLevel;
  size?: number;
  className?: string;
}

/**
 * 빈 책장 (1단) - 0-30점
 */
const EmptyShelf = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className={className}
  >
    {/* 책장 틀 */}
    <rect x="4" y="18" width="16" height="2" rx="0.3" />
    {/* 빈 선반 */}
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

/**
 * 부분 채워진 책장 (2-3단) - 31-60점
 */
const PartialShelf = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className={className}
  >
    {/* 책장 틀 */}
    <rect x="4" y="18" width="16" height="2" rx="0.3" />
    {/* 선반 3단 */}
    <line x1="4" y1="18" x2="20" y2="18" />
    <line x1="4" y1="13" x2="20" y2="13" />
    <line x1="4" y1="8" x2="20" y2="8" />
    {/* 책들 (일부만) */}
    <rect x="5" y="8" width="2.5" height="5" rx="0.2" fill="currentColor" opacity="0.6" />
    <rect x="8.5" y="8" width="2.5" height="5" rx="0.2" fill="currentColor" opacity="0.6" />
    <rect x="12" y="8" width="2.5" height="5" rx="0.2" fill="currentColor" opacity="0.6" />
    <rect x="5" y="13" width="2.5" height="5" rx="0.2" fill="currentColor" opacity="0.6" />
    <rect x="8.5" y="13" width="2.5" height="5" rx="0.2" fill="currentColor" opacity="0.6" />
  </svg>
);

/**
 * 가득 찬 책장 (4-5단) - 61-85점
 */
const FullShelf = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className={className}
  >
    {/* 책장 틀 */}
    <rect x="4" y="18" width="16" height="2" rx="0.3" />
    {/* 선반 5단 */}
    <line x1="4" y1="18" x2="20" y2="18" />
    <line x1="4" y1="14" x2="20" y2="14" />
    <line x1="4" y1="10" x2="20" y2="10" />
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="2" x2="20" y2="2" />
    {/* 책들 (가득) */}
    <rect x="5" y="2" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="7.5" y="2" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="10" y="2" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="12.5" y="2" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="15" y="2" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="17" y="2" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="5" y="6" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="7.5" y="6" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="10" y="6" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="12.5" y="6" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="15" y="6" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="17" y="6" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="5" y="10" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="7.5" y="10" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="10" y="10" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="12.5" y="10" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="15" y="10" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="17" y="10" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="5" y="14" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="7.5" y="14" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="10" y="14" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="12.5" y="14" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="15" y="14" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
    <rect x="17" y="14" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
  </svg>
);

/**
 * 호화로운 책장 (5단 + 황금 장식) - 86-100점
 */
const LuxuryShelf = ({ size = 24, className = "" }: { size?: number; className?: string }) => {
  const gradientId = `bookShelfGold-${size}`;
  const shadowId = `bookShelfShadow-${size}`;
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <defs>
        {/* 황금색 그라데이션 */}
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
      
      {/* 책장 틀 (황금) */}
      <rect x="4" y="18" width="16" height="2" rx="0.3" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      {/* 선반 5단 */}
      <line x1="4" y1="18" x2="20" y2="18" stroke={`url(#${gradientId})`} strokeWidth="1.5" />
      <line x1="4" y1="14" x2="20" y2="14" stroke={`url(#${gradientId})`} strokeWidth="1.5" />
      <line x1="4" y1="10" x2="20" y2="10" stroke={`url(#${gradientId})`} strokeWidth="1.5" />
      <line x1="4" y1="6" x2="20" y2="6" stroke={`url(#${gradientId})`} strokeWidth="1.5" />
      <line x1="4" y1="2" x2="20" y2="2" stroke={`url(#${gradientId})`} strokeWidth="1.5" />
      {/* 책들 (가득) */}
      <rect x="5" y="2" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="7.5" y="2" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="10" y="2" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="12.5" y="2" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="15" y="2" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="17" y="2" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="5" y="6" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="7.5" y="6" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="10" y="6" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="12.5" y="6" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="15" y="6" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="17" y="6" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="5" y="10" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="7.5" y="10" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="10" y="10" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="12.5" y="10" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="15" y="10" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="17" y="10" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="5" y="14" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="7.5" y="14" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="10" y="14" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="12.5" y="14" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="15" y="14" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      <rect x="17" y="14" width="2" height="4" rx="0.2" fill="currentColor" opacity="0.7" />
      {/* 황금 장식 (상단 양옆) */}
      <circle cx="6" cy="3" r="1.5" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      <circle cx="18" cy="3" r="1.5" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      {/* 황금 장식 (중간 장식) */}
      <path d="M 11.5 1 L 12.5 1 L 12 0.5 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
    </svg>
  );
};

/**
 * 책장 아이콘
 * 신뢰도에 따라 단계가 결정됩니다:
 * - empty (0-30): 빈 책장 1단
 * - partial (31-60): 책이 일부 채워진 책장 2-3단
 * - full (61-85): 책이 가득 찬 책장 4-5단
 * - luxury (86-100): 황금 장식이 있는 호화로운 책장 5단 + 황금 장식
 */
export function BookShelf({ level, size = 24, className = "" }: BookShelfProps) {
  switch (level) {
    case "empty":
      return <EmptyShelf size={size} className={className} />;
    case "partial":
      return <PartialShelf size={size} className={className} />;
    case "full":
      return <FullShelf size={size} className={className} />;
    case "luxury":
      return <LuxuryShelf size={size} className={className} />;
    default:
      return <EmptyShelf size={size} className={className} />;
  }
}

/**
 * 신뢰도 점수에 따라 책장 레벨을 결정하는 헬퍼 함수
 */
export function getBookShelfLevelByTrustScore(trustScore: number | undefined): BookShelfLevel {
  if (trustScore === undefined || trustScore === null) {
    return "empty";
  }
  
  if (trustScore <= 30) {
    return "empty";
  } else if (trustScore <= 60) {
    return "partial";
  } else if (trustScore <= 85) {
    return "full";
  } else {
    return "luxury";
  }
}

