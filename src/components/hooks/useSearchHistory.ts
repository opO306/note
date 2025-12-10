import { useState, useEffect, useCallback } from "react";

interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
  category?: string;
}

interface UseSearchHistoryOptions {
  /** 최대 저장 개수 */
  maxItems?: number;
  /** 로컬 스토리지 키 */
  storageKey?: string;
  /** 자동 저장 여부 */
  autoSave?: boolean;
}

/**
 * 검색 히스토리 관리 훅
 */
export function useSearchHistory(options: UseSearchHistoryOptions = {}) {
  const {
    maxItems = 20,
    storageKey = "searchHistory",
    autoSave = true,
  } = options;

  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  // 로컬 스토리지에서 히스토리 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setHistory(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error("Failed to load search history:", error);
      setHistory([]);
    }
  }, [storageKey]);

  // 히스토리 저장
  const saveHistory = useCallback(
    (newHistory: SearchHistoryItem[]) => {
      if (autoSave) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(newHistory));
        } catch (error) {
          console.error("Failed to save search history:", error);
        }
      }
    },
    [autoSave, storageKey]
  );

  // 검색어 추가
  const addSearch = useCallback(
    (query: string, category?: string) => {
      if (!query.trim()) return;

      setHistory((prev) => {
        // 중복 제거 (대소문자 구분 없음)
        const filtered = prev.filter(
          (item) => item.query.toLowerCase() !== query.toLowerCase()
        );

        // 새 항목 추가
        const newItem: SearchHistoryItem = {
          id: Date.now().toString(),
          query: query.trim(),
          timestamp: Date.now(),
          category,
        };

        // 최대 개수 제한
        const newHistory = [newItem, ...filtered].slice(0, maxItems);

        saveHistory(newHistory);
        return newHistory;
      });
    },
    [maxItems, saveHistory]
  );

  // 검색어 삭제
  const removeSearch = useCallback(
    (id: string) => {
      setHistory((prev) => {
        const newHistory = prev.filter((item) => item.id !== id);
        saveHistory(newHistory);
        return newHistory;
      });
    },
    [saveHistory]
  );

  // 특정 쿼리 삭제
  const removeSearchByQuery = useCallback(
    (query: string) => {
      setHistory((prev) => {
        const newHistory = prev.filter(
          (item) => item.query.toLowerCase() !== query.toLowerCase()
        );
        saveHistory(newHistory);
        return newHistory;
      });
    },
    [saveHistory]
  );

  // 전체 삭제
  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, [saveHistory]);

  // 카테고리별 히스토리
  const getHistoryByCategory = useCallback(
    (category?: string) => {
      if (!category) return history;
      return history.filter((item) => item.category === category);
    },
    [history]
  );

  // 최근 검색어 (제한된 개수)
  const getRecentSearches = useCallback(
    (limit: number = 5) => {
      return history.slice(0, limit);
    },
    [history]
  );

  // 검색어 존재 여부
  const hasSearch = useCallback(
    (query: string) => {
      return history.some(
        (item) => item.query.toLowerCase() === query.toLowerCase()
      );
    },
    [history]
  );

  return {
    history,
    addSearch,
    removeSearch,
    removeSearchByQuery,
    clearHistory,
    getHistoryByCategory,
    getRecentSearches,
    hasSearch,
  };
}

/**
 * 인기 검색어 관리 훅 (간단한 로컬 버전)
 */
export function usePopularSearches(storageKey = "popularSearches") {
  const [searches, setSearches] = useState<Map<string, number>>(new Map());

  // 로컬 스토리지에서 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSearches(new Map(Object.entries(parsed)));
      }
    } catch (error) {
      console.error("Failed to load popular searches:", error);
    }
  }, [storageKey]);

  // 검색어 카운트 증가
  const incrementSearch = useCallback(
    (query: string) => {
      if (!query.trim()) return;

      setSearches((prev) => {
        const newMap = new Map(prev);
        const normalized = query.toLowerCase().trim();
        const count = newMap.get(normalized) || 0;
        newMap.set(normalized, count + 1);

        // 저장
        try {
          const obj = Object.fromEntries(newMap);
          localStorage.setItem(storageKey, JSON.stringify(obj));
        } catch (error) {
          console.error("Failed to save popular searches:", error);
        }

        return newMap;
      });
    },
    [storageKey]
  );

  // 인기 검색어 목록 (정렬)
  const getPopularSearches = useCallback(
    (limit: number = 10) => {
      return Array.from(searches.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([query, count]) => ({ query, count }));
    },
    [searches]
  );

  // 초기화
  const clearPopularSearches = useCallback(() => {
    setSearches(new Map());
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error("Failed to clear popular searches:", error);
    }
  }, [storageKey]);

  return {
    incrementSearch,
    getPopularSearches,
    clearPopularSearches,
  };
}
