// src/components/icons/GreekColumn.tsx
// 그리스 신전 기둥 아이콘 컴포넌트

export type ColumnStyle = "doric" | "ionic" | "corinthian";

interface GreekColumnProps {
  style: ColumnStyle;
  size?: number;
  className?: string;
}

/**
 * 도리아식 기둥 - 가장 단순하고 견고한 형태
 */
const DoricColumn = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className={className}
  >
    {/* 기둥 몸통 */}
    <rect x="10" y="4" width="4" height="16" rx="0.5" />
    {/* 기둥 상단 (엔타블레처) */}
    <rect x="9" y="2" width="6" height="2" rx="0.3" />
    {/* 기둥 하단 (기단) */}
    <rect x="9.5" y="20" width="5" height="2" rx="0.3" />
  </svg>
);

/**
 * 이오니아식 기둥 - 나선형 장식이 있는 형태
 */
const IonicColumn = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className={className}
  >
    {/* 기둥 몸통 */}
    <rect x="10" y="4" width="4" height="16" rx="0.5" />
    {/* 기둥 상단 (엔타블레처) */}
    <rect x="9" y="2" width="6" height="2" rx="0.3" />
    {/* 기둥 하단 (기단) */}
    <rect x="9.5" y="20" width="5" height="2" rx="0.3" />
    {/* 이오니아식 나선형 장식 (볼루트) */}
    <path d="M 8 4 Q 10 3 12 4 Q 14 3 16 4" strokeWidth="1.2" />
    <path d="M 8 5 Q 10 4 12 5 Q 14 4 16 5" strokeWidth="1" opacity="0.7" />
  </svg>
);

/**
 * 코린트식 기둥 - 가장 화려한 장식이 있는 형태
 */
const CorinthianColumn = ({ size = 24, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    className={className}
  >
    {/* 기둥 몸통 */}
    <rect x="10" y="4" width="4" height="16" rx="0.5" />
    {/* 기둥 상단 (엔타블레처) - 더 화려하게 */}
    <rect x="9" y="2" width="6" height="2" rx="0.3" />
    {/* 기둥 하단 (기단) */}
    <rect x="9.5" y="20" width="5" height="2" rx="0.3" />
    {/* 코린트식 아칸서스 잎 장식 */}
    <path d="M 8 4 Q 10 2.5 12 4 Q 14 2.5 16 4" strokeWidth="1.2" />
    <path d="M 9 3.5 Q 10.5 2.8 12 3.5 Q 13.5 2.8 15 3.5" strokeWidth="1" opacity="0.8" />
    <path d="M 9.5 4.5 Q 11 3.8 12 4.5 Q 13 3.8 14.5 4.5" strokeWidth="0.8" opacity="0.6" />
    {/* 추가 장식 라인 */}
    <path d="M 10 5 L 14 5" strokeWidth="0.5" opacity="0.5" />
  </svg>
);

/**
 * 그리스 신전 기둥 아이콘
 * 신뢰도에 따라 스타일이 결정됩니다:
 * - 도리아식 (0-30): 기본, 견고함
 * - 이오니아식 (31-60): 중간, 우아함
 * - 코린트식 (61-100): 최고, 화려함
 */
export function GreekColumn({ style, size = 24, className = "" }: GreekColumnProps) {
  switch (style) {
    case "doric":
      return <DoricColumn size={size} className={className} />;
    case "ionic":
      return <IonicColumn size={size} className={className} />;
    case "corinthian":
      return <CorinthianColumn size={size} className={className} />;
    default:
      return <DoricColumn size={size} className={className} />;
  }
}

/**
 * 신뢰도 점수에 따라 기둥 스타일을 결정하는 헬퍼 함수
 */
export function getColumnStyleByTrustScore(trustScore: number | undefined): ColumnStyle {
  if (trustScore === undefined || trustScore === null) {
    return "doric";
  }
  
  if (trustScore <= 30) {
    return "doric";
  } else if (trustScore <= 60) {
    return "ionic";
  } else {
    return "corinthian";
  }
}

