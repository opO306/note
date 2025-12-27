// src/utils/firebaseCache.ts
// Firebase 호출 결과를 메모리 캐시에 저장하여 중복 요청 방지

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live (ms)
}

class FirebaseCache {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * 캐시에서 데이터 조회
   * @param key 캐시 키
   * @returns 캐시된 데이터 또는 null (캐시 미스 또는 만료)
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // 캐시 만료
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * 캐시에 데이터 저장
   * @param key 캐시 키
   * @param data 저장할 데이터
   * @param ttl Time to live (밀리초, 기본값: 5분)
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * 캐시 무효화 (특정 키 삭제)
   * @param key 캐시 키
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 패턴으로 캐시 무효화 (예: "trustScore:*"로 모든 신뢰도 점수 캐시 삭제)
   * @param pattern 정규식 패턴
   */
  invalidatePattern(pattern: RegExp): void {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 모든 캐시 클리어
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 만료된 캐시 항목 정리 (메모리 최적화)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 캐시 통계 (디버깅용)
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export const firebaseCache = new FirebaseCache();

// 주기적으로 만료된 캐시 정리 (5분마다)
if (typeof window !== "undefined") {
  setInterval(() => {
    firebaseCache.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * 캐시를 사용하는 Firebase 함수 래퍼
 * 
 * @param key 캐시 키 (예: "trustScore:userId123")
 * @param fetcher 실제 데이터를 가져오는 함수
 * @param ttl Time to live (밀리초, 기본값: 5분)
 * @returns 캐시된 데이터 또는 fetcher 결과
 * 
 * @example
 * ```typescript
 * const trustScore = await withCache(
 *   `trustScore:${uid}`,
 *   async () => {
 *     const snap = await getDoc(doc(db, "users", uid));
 *     return snap.data()?.trustScore ?? 30;
 *   },
 *   5 * 60 * 1000 // 5분 캐시
 * );
 * ```
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000
): Promise<T> {
  // 캐시 확인
  const cached = firebaseCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // 캐시 미스 시 데이터 가져오기
  const data = await fetcher();
  firebaseCache.set(key, data, ttl);
  return data;
}

/**
 * 사용자별 캐시 키 생성 헬퍼
 * @param prefix 키 접두사 (예: "trustScore")
 * @param userId 사용자 ID
 * @returns 캐시 키
 */
export function getUserCacheKey(prefix: string, userId: string): string {
  return `${prefix}:${userId}`;
}

