// src/utils/apiBatching.ts

/**
 * ✅ API 호출 배칭 유틸리티
 * 여러 개의 독립적인 API 호출을 배치로 묶어서 네트워크 요청 횟수를 줄입니다.
 * 
 * 사용 예시:
 * ```typescript
 * const batcher = createApiBatcher(100); // 100ms 지연
 * 
 * // 여러 호출을 배치로 묶음
 * const [result1, result2, result3] = await Promise.all([
 *   batcher.add(() => fetchUserData(userId1)),
 *   batcher.add(() => fetchUserData(userId2)),
 *   batcher.add(() => fetchUserData(userId3)),
 * ]);
 * ```
 */

interface BatchedCall<T> {
  id: string;
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

export class ApiBatcher {
  private queue: BatchedCall<any>[] = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private readonly delay: number;
  private readonly maxBatchSize: number;

  constructor(delay: number = 50, maxBatchSize: number = 10) {
    this.delay = delay;
    this.maxBatchSize = maxBatchSize;
  }

  /**
   * API 호출을 배치 큐에 추가
   */
  add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = `${Date.now()}-${Math.random()}`;
      this.queue.push({ id, fn, resolve, reject });

      // 최대 배치 크기에 도달하면 즉시 실행
      if (this.queue.length >= this.maxBatchSize) {
        this.flush();
      } else {
        // 지연 시간 후 실행
        this.scheduleFlush();
      }
    });
  }

  /**
   * 배치 실행 스케줄링
   */
  private scheduleFlush(): void {
    if (this.timeoutId) {
      return; // 이미 스케줄됨
    }

    this.timeoutId = setTimeout(() => {
      this.flush();
    }, this.delay);
  }

  /**
   * 배치 큐의 모든 호출 실행
   */
  private async flush(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.queue.length === 0) {
      return;
    }

    const calls = this.queue.splice(0, this.maxBatchSize);

    // 모든 호출을 병렬로 실행
    const promises = calls.map(async (call) => {
      try {
        const result = await call.fn();
        call.resolve(result);
      } catch (error) {
        call.reject(error instanceof Error ? error : new Error(String(error)));
      }
    });

    await Promise.all(promises);
  }

  /**
   * 남은 큐 강제 실행
   */
  async flushAll(): Promise<void> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    while (this.queue.length > 0) {
      await this.flush();
    }
  }
}

/**
 * 전역 API 배처 인스턴스 생성
 */
let globalBatcher: ApiBatcher | null = null;

/**
 * 전역 API 배처 가져오기 또는 생성
 */
export function getGlobalBatcher(delay?: number, maxBatchSize?: number): ApiBatcher {
  if (!globalBatcher) {
    globalBatcher = new ApiBatcher(delay, maxBatchSize);
  }
  return globalBatcher;
}

/**
 * ✅ Firestore 쿼리 배칭 헬퍼
 * 여러 Firestore 문서를 한 번에 가져오기
 */
export async function batchGetFirestoreDocs<T>(
  db: any,
  collectionPath: string,
  docIds: string[]
): Promise<Record<string, T | null>> {
  if (docIds.length === 0) {
    return {};
  }

  // Firestore의 getDocs with whereIn 사용 (최대 10개)
  const BATCH_SIZE = 10;
  const results: Record<string, T | null> = {};

  for (let i = 0; i < docIds.length; i += BATCH_SIZE) {
    const batch = docIds.slice(i, i + BATCH_SIZE);
    
    // 실제 구현은 Firestore SDK에 따라 다름
    // 여기서는 예시로 제공
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const q = query(
      collection(db, collectionPath),
      where('__name__', 'in', batch)
    );
    
    const snapshot = await getDocs(q);
    snapshot.forEach((doc) => {
      results[doc.id] = doc.data() as T;
    });
  }

  // 없는 문서는 null로 설정
  docIds.forEach((id) => {
    if (!(id in results)) {
      results[id] = null;
    }
  });

  return results;
}

/**
 * ✅ 여러 Firestore 쿼리를 병렬로 실행
 * 독립적인 여러 쿼리를 Promise.all로 묶어서 병렬 처리
 */
export async function parallelFirestoreQueries<T extends Record<string, any>>(
  queries: Array<() => Promise<any>>
): Promise<T> {
  const results = await Promise.all(queries.map((q) => q()));
  
  return results.reduce((acc, result, index) => {
    acc[`result${index}`] = result;
    return acc;
  }, {} as T);
}

