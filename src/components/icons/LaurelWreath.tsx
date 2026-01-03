// src/components/icons/LaurelWreath.tsx
// 월계관 아이콘 컴포넌트 - 실제 월계관 형태 (열린 타원형, 하단에서 교차)

interface LaurelWreathProps {
  size?: number;
  className?: string;
  isPremium?: boolean;
}

/**
 * 월계관 아이콘 - 닉네임 위에 표시되는 작은 왕관
 * 실제 월계관 형태: 열린 타원형, 양쪽 끝이 하단에서 교차, 잎들이 곡선을 따라 밀집 배치
 */
export function LaurelWreath({ size = 16, className = "", isPremium: _isPremium = false }: LaurelWreathProps) {
  // 고유 ID 생성 (여러 개 사용 시 충돌 방지)
  const gradientId = `laurelGold-${size}`;
  const shadowId = `laurelShadow-${size}`;
  
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
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
      
      {/* 원형 월계관 - 동그란 형태 */}
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        filter={`url(#${shadowId})`}
      />
      
      {/* 위쪽 잎들 */}
      <path d="M 6 6 L 5.2 4.5 L 6.8 4.5 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      <path d="M 8 5 L 7.2 3.5 L 8.8 3.5 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      <path d="M 10 4.5 L 9.2 3 L 10.8 3 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      <path d="M 12 4 L 11.2 2.5 L 12.8 2.5 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      <path d="M 14 4.5 L 13.2 3 L 14.8 3 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      <path d="M 16 5 L 15.2 3.5 L 16.8 3.5 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      <path d="M 18 6 L 17.2 4.5 L 18.8 4.5 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      
      {/* 오른쪽 잎들 */}
      <path d="M 19 8 L 20.5 7.2 L 20.5 8.8 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      <path d="M 19.5 10 L 21 9.2 L 21 10.8 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      <path d="M 20 12 L 21.5 11.2 L 21.5 12.8 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      <path d="M 19.5 14 L 21 13.2 L 21 14.8 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      <path d="M 19 16 L 20.5 15.2 L 20.5 16.8 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      
      {/* 아래쪽 잎들 */}
      <path d="M 18 18 L 17.2 19.5 L 18.8 19.5 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      <path d="M 16 19 L 15.2 20.5 L 16.8 20.5 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      <path d="M 14 19.5 L 13.2 21 L 14.8 21 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      <path d="M 12 20 L 11.2 21.5 L 12.8 21.5 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      <path d="M 10 19.5 L 9.2 21 L 10.8 21 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      <path d="M 8 19 L 7.2 20.5 L 8.8 20.5 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      <path d="M 6 18 L 5.2 19.5 L 6.8 19.5 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      
      {/* 왼쪽 잎들 */}
      <path d="M 5 16 L 3.5 15.2 L 3.5 16.8 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      <path d="M 4.5 14 L 3 13.2 L 3 14.8 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      <path d="M 4 12 L 2.5 11.2 L 2.5 12.8 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      <path d="M 4.5 10 L 3 9.2 L 3 10.8 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
      <path d="M 5 8 L 3.5 7.2 L 3.5 8.8 Z" fill={`url(#${gradientId})`} filter={`url(#${shadowId})`} />
    </svg>
  );
}

