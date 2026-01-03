import { useMemo } from 'react';

/**
 * 간단한 해시 함수 - 문자열을 숫자로 변환
 */
function hashString(str: string | number): number {
  const s = String(str);
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit 정수로 변환
  }
  return Math.abs(hash);
}

/**
 * 황금빛 서재 테마용 무작위 테두리 패턴 클래스를 반환하는 함수
 * ID를 기반으로 안정적인 패턴을 반환 (같은 ID는 항상 같은 패턴)
 */
export function getRandomNobleBorderPattern(id?: string | number): string {
  const patterns = [
    'theme-border-noble-v1',
    'theme-border-noble-v2',
    'theme-border-noble-v3',
    'theme-border-noble-v4',
    'theme-border-noble-v5',
    'theme-border-noble-v6',
    'theme-border-noble-v7',
    'theme-border-noble-v8',
    'theme-border-noble-v9',
    'theme-border-noble-v10',
    'theme-border-noble-v11',
    'theme-border-noble-v12',
    'theme-border-noble-v13',
    'theme-border-noble-v14',
    'theme-border-noble-v15',
    'theme-border-noble-v16',
  ];
  
  if (id !== undefined) {
    // ID가 주어지면 해시를 기반으로 안정적인 패턴 선택
    const hash = hashString(id);
    const index = hash % patterns.length;
    return patterns[index];
  }
  
  // ID가 없으면 완전 무작위 (레거시 지원)
  const randomIndex = Math.floor(Math.random() * patterns.length);
  return patterns[randomIndex];
}

/**
 * 황금빛 서재 테마용 무작위 프로필 테두리 패턴 클래스를 반환하는 함수
 * ID를 기반으로 안정적인 패턴을 반환 (같은 ID는 항상 같은 패턴)
 */
export function getRandomGreekKeyBorderPattern(id?: string | number): string {
  const patterns = [
    'theme-border-greek-key-v1',
    'theme-border-greek-key-v2',
    'theme-border-greek-key-v3',
    'theme-border-greek-key-v4',
    'theme-border-greek-key-v5',
    'theme-border-greek-key-v6',
    'theme-border-greek-key-v7',
    'theme-border-greek-key-v8',
  ];
  
  if (id !== undefined) {
    // ID가 주어지면 해시를 기반으로 안정적인 패턴 선택
    const hash = hashString(id);
    const index = hash % patterns.length;
    return patterns[index];
  }
  
  // ID가 없으면 완전 무작위 (레거시 지원)
  const randomIndex = Math.floor(Math.random() * patterns.length);
  return patterns[randomIndex];
}

/**
 * 황금빛 서재 테마용 무작위 테두리 패턴 클래스를 반환하는 훅
 * 각 컴포넌트 인스턴스마다 고정된 무작위 패턴을 반환 (useMemo로 안정성 보장)
 */
export function useRandomNobleBorderPattern(): string {
  return useMemo(() => getRandomNobleBorderPattern(), []);
}

/**
 * 황금빛 서재 테마용 무작위 프로필 테두리 패턴 클래스를 반환하는 훅
 * 각 컴포넌트 인스턴스마다 고정된 무작위 패턴을 반환 (useMemo로 안정성 보장)
 */
export function useRandomGreekKeyBorderPattern(): string {
  return useMemo(() => getRandomGreekKeyBorderPattern(), []);
}

