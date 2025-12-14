import { useState, useEffect } from "react";

export interface SearchSuggestion {
  id: string;
  text: string;
  type: "history" | "popular" | "suggestion" | "category";
  category?: string;
  count?: number;
}

interface UseSearchSuggestionsOptions {
  /** 최대 제안 개수 */
  maxSuggestions?: number;
  /** 최소 입력 길이 */
  minLength?: number;
  /** 디바운스 지연 (ms) */
  debounceDelay?: number;
  /** 검색 히스토리 */
  history?: Array<{ query: string; category?: string }>;
  /** 인기 검색어 */
  popularSearches?: Array<{ query: string; count: number }>;
  /** 카테고리 목록 */
  categories?: string[];
  /** 커스텀 제안 소스 */
  customSuggestions?: (query: string) => Promise<string[]> | string[];
}

/**
 * 검색 자동완성 및 제안 훅
 */
export function useSearchSuggestions(
  query: string,
  options: UseSearchSuggestionsOptions = {}
) {
  const {
    maxSuggestions = 10,
    minLength = 1,
    debounceDelay = 150,
    history = [],
    popularSearches = [],
    categories = [],
    customSuggestions,
  } = options;

  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // 디바운스된 쿼리
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceDelay);

    return () => clearTimeout(timer);
  }, [query, debounceDelay]);

  // 제안 생성
  useEffect(() => {
    const generateSuggestions = async () => {
      const trimmedQuery = debouncedQuery.trim().toLowerCase();

      // 빈 쿼리 또는 최소 길이 미만
      if (trimmedQuery.length < minLength) {
        // 빈 쿼리일 때는 최근 검색어와 인기 검색어 표시
        if (trimmedQuery.length === 0) {
          const recentSuggestions: SearchSuggestion[] = history
            .slice(0, 5)
            .map((item, index) => ({
              id: `history-${index}`,
              text: item.query,
              type: "history" as const,
              category: item.category,
            }));

          const popularSuggestions: SearchSuggestion[] = popularSearches
            .slice(0, 5)
            .map((item, index) => ({
              id: `popular-${index}`,
              text: item.query,
              type: "popular" as const,
              count: item.count,
            }));

          setSuggestions([...recentSuggestions, ...popularSuggestions]);
        } else {
          setSuggestions([]);
        }
        return;
      }

      setIsLoading(true);

      try {
        const allSuggestions: SearchSuggestion[] = [];

        // 1. 히스토리에서 매칭
        const historySuggestions = history
          .filter((item) =>
            item.query.toLowerCase().includes(trimmedQuery)
          )
          .slice(0, 3)
          .map((item, index) => ({
            id: `history-${index}`,
            text: item.query,
            type: "history" as const,
            category: item.category,
          }));
        allSuggestions.push(...historySuggestions);

        // 2. 인기 검색어에서 매칭
        const popularSuggestions = popularSearches
          .filter((item) =>
            item.query.toLowerCase().includes(trimmedQuery)
          )
          .slice(0, 3)
          .map((item, index) => ({
            id: `popular-${index}`,
            text: item.query,
            type: "popular" as const,
            count: item.count,
          }));
        allSuggestions.push(...popularSuggestions);

        // 3. 카테고리 매칭
        const categorySuggestions = categories
          .filter((cat) => cat.toLowerCase().includes(trimmedQuery))
          .slice(0, 2)
          .map((cat, index) => ({
            id: `category-${index}`,
            text: cat,
            type: "category" as const,
            category: cat,
          }));
        allSuggestions.push(...categorySuggestions);

        // 4. 커스텀 제안
        if (customSuggestions) {
          const custom = await customSuggestions(debouncedQuery);  // 139번 줄
          const customResults = custom                             // 140번 줄 - 이름 변경!
            .slice(0, 3)
            .map((text: string, index: number) => ({               // 142번 줄 - 타입 추가!
              id: `suggestion-${index}`,
              text,
              type: "suggestion" as const,
            }));
          allSuggestions.push(...customResults);                   // 147번 줄도 변경!
        }
        // 중복 제거 및 제한
        const uniqueSuggestions = Array.from(
          new Map(
            allSuggestions.map((item) => [
              item.text.toLowerCase(),
              item,
            ])
          ).values()
        ).slice(0, maxSuggestions);

        setSuggestions(uniqueSuggestions);
      } catch (error) {
        console.error("Failed to generate suggestions:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    generateSuggestions();
  }, [
    debouncedQuery,
    minLength,
    maxSuggestions,
    history,
    popularSearches,
    categories,
    customSuggestions,
  ]);

  return {
    suggestions,
    isLoading,
    hasSuggestions: suggestions.length > 0,
  };
}

/**
 * 검색어 하이라이트 유틸리티
 */
export function highlightQuery(text: string, query: string): string {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${query.trim()})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

/**
 * 검색어 매칭 점수 계산
 */
export function calculateMatchScore(text: string, query: string): number {
  const normalizedText = text.toLowerCase();
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) return 0;

  // 완전 일치
  if (normalizedText === normalizedQuery) return 100;

  // 시작 일치
  if (normalizedText.startsWith(normalizedQuery)) return 80;

  // 포함
  if (normalizedText.includes(normalizedQuery)) return 50;

  // 부분 매칭 (각 단어)
  const queryWords = normalizedQuery.split(/\s+/);
  const matchedWords = queryWords.filter((word) =>
    normalizedText.includes(word)
  );
  if (matchedWords.length > 0) {
    return (matchedWords.length / queryWords.length) * 30;
  }

  return 0;
}

/**
 * 검색 제안 정렬
 */
export function sortSuggestions(
  suggestions: SearchSuggestion[],
  query: string
): SearchSuggestion[] {
  return [...suggestions].sort((a, b) => {
    // 타입별 우선순위
    const typePriority = {
      history: 4,
      popular: 3,
      suggestion: 2,
      category: 1,
    };

    const aPriority = typePriority[a.type] || 0;
    const bPriority = typePriority[b.type] || 0;

    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }

    // 매칭 점수로 정렬
    const aScore = calculateMatchScore(a.text, query);
    const bScore = calculateMatchScore(b.text, query);

    if (aScore !== bScore) {
      return bScore - aScore;
    }

    // 인기도로 정렬 (있으면)
    if (a.count !== undefined && b.count !== undefined) {
      return b.count - a.count;
    }

    return 0;
  });
}

/**
 * Did you mean 제안
 */
export function getDidYouMean(
  query: string,
  suggestions: string[]
): string | null {
  // 간단한 레벤슈타인 거리 계산
  const levenshteinDistance = (a: string, b: string): number => {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  };

  const normalizedQuery = query.toLowerCase().trim();
  let bestMatch: { text: string; distance: number } | null = null;

  for (const suggestion of suggestions) {
    const normalizedSuggestion = suggestion.toLowerCase();
    const distance = levenshteinDistance(normalizedQuery, normalizedSuggestion);

    // 거리가 2 이하이고 (오타 1-2개), 길이가 비슷하면
    if (
      distance <= 2 &&
      distance > 0 &&
      Math.abs(normalizedQuery.length - normalizedSuggestion.length) <= 2
    ) {
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { text: suggestion, distance };
      }
    }
  }

  return bestMatch?.text || null;
}
