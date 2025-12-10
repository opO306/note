import { useEffect, useRef, useCallback } from "react";

interface UseInfiniteScrollOptions {
  /** 더 많은 데이터를 로드할 때 호출되는 함수 */
  onLoadMore: () => void | Promise<void>;
  /** 더 이상 로드할 데이터가 없는지 여부 */
  hasMore: boolean;
  /** 현재 로딩 중인지 여부 */
  isLoading: boolean;
  /** 활성화 여부 */
  enabled?: boolean;
  /** 트리거 거리 (px) */
  rootMargin?: string;
  /** 가시성 임계값 (0-1) */
  threshold?: number;
}

/**
 * 무한 스크롤을 위한 훅
 * Intersection Observer를 사용하여 자동으로 다음 페이지 로드
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>({
  onLoadMore,
  hasMore,
  isLoading,
  enabled = true,
  rootMargin = "100px",
  threshold = 0.1,
}: UseInfiniteScrollOptions) {
  const targetRef = useRef<T>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef(false);

  const handleIntersection = useCallback(
    async (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;

      // 이미 로딩 중이거나, 더 이상 데이터가 없거나, 활성화되지 않았으면 무시
      if (loadingRef.current || !hasMore || !enabled || isLoading) {
        return;
      }

      // 요소가 보이면 로드
      if (entry.isIntersecting) {
        loadingRef.current = true;
        try {
          await onLoadMore();
        } catch (error) {
          console.error("Failed to load more:", error);
        } finally {
          // 다음 로드를 위해 약간의 지연 추가
          setTimeout(() => {
            loadingRef.current = false;
          }, 500);
        }
      }
    },
    [onLoadMore, hasMore, enabled, isLoading]
  );

  useEffect(() => {
    if (!enabled || !hasMore) return;

    const target = targetRef.current;
    if (!target) return;

    // 기존 observer 정리
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // 새 observer 생성
    observerRef.current = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin,
      threshold,
    });

    observerRef.current.observe(target);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled, hasMore, handleIntersection, rootMargin, threshold]);

  return { targetRef };
}

/**
 * 무한 스크롤 상태 관리를 위한 훅
 */
export function useInfiniteScrollState<T>(
  initialData: T[] = [],
  options: {
    pageSize?: number;
    totalCount?: number;
  } = {}
) {
  const { pageSize = 10, totalCount } = options;

  const [data, setData] = React.useState<T[]>(initialData);
  const [page, setPage] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);

  // 데이터 추가
  const appendData = useCallback((newData: T[]) => {
    setData((prev) => [...prev, ...newData]);
    
    // 더 이상 데이터가 없는지 확인
    if (newData.length < pageSize) {
      setHasMore(false);
    }
    
    // totalCount가 있으면 정확한 hasMore 계산
    if (totalCount !== undefined) {
      setHasMore(data.length + newData.length < totalCount);
    }
  }, [pageSize, totalCount, data.length]);

  // 데이터 초기화
  const resetData = useCallback((newData: T[] = []) => {
    setData(newData);
    setPage(1);
    setHasMore(true);
  }, []);

  // 다음 페이지 로드
  const loadNextPage = useCallback(async (
    fetcher: (page: number) => Promise<T[]>
  ) => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      const nextPage = page + 1;
      const newData = await fetcher(nextPage);
      appendData(newData);
      setPage(nextPage);
    } catch (error) {
      console.error("Failed to load next page:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, page, appendData]);

  return {
    data,
    page,
    isLoading,
    hasMore,
    setIsLoading,
    setHasMore,
    appendData,
    resetData,
    loadNextPage,
  };
}

// React import for useInfiniteScrollState
import React from "react";
