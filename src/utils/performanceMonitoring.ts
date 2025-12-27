// src/utils/performanceMonitoring.ts
// Firebase Performance Monitoring을 사용한 성능 추적 유틸리티

import { getPerformance, trace, PerformanceTrace } from "firebase/performance";
import { app } from "@/firebase";

let perf: ReturnType<typeof getPerformance> | null = null;

/**
 * Performance Monitoring 초기화
 * 앱 시작 시 한 번만 호출
 */
export function initPerformanceMonitoring() {
  try {
    perf = getPerformance(app);
  } catch (error) {
    // Performance Monitoring이 사용 불가능한 환경 (개발 환경 등)
    console.warn("Performance Monitoring 초기화 실패:", error);
  }
}

/**
 * Firestore 호출 추적
 * 
 * @param traceName 추적 이름 (예: "getUserProfile")
 * @param operation 실제 Firestore 작업을 수행하는 함수
 * @returns 작업 결과
 * 
 * @example
 * ```typescript
 * const userData = await tracedFirestoreCall("getUserProfile", async () => {
 *   const snap = await getDoc(doc(db, "users", uid));
 *   return snap.data();
 * });
 * ```
 */
export async function tracedFirestoreCall<T>(
  traceName: string,
  operation: () => Promise<T>
): Promise<T> {
  if (!perf) {
    // Performance Monitoring이 없으면 그냥 실행
    return operation();
  }

  const t = trace(perf, traceName);
  t.start();
  
  try {
    const result = await operation();
    t.stop();
    return result;
  } catch (error) {
    // 에러 발생 시에도 추적 중지
    t.stop();
    throw error;
  }
}

/**
 * Cloud Function 호출 추적
 * 
 * @param functionName 함수 이름 (예: "getTrustScore")
 * @param operation 실제 Cloud Function 호출을 수행하는 함수
 * @returns 함수 결과
 * 
 * @example
 * ```typescript
 * const result = await tracedFunctionCall("getTrustScore", async () => {
 *   const getTrustScore = httpsCallable(functions, "getTrustScore");
 *   return await getTrustScore({ uid });
 * });
 * ```
 */
export async function tracedFunctionCall<T>(
  functionName: string,
  operation: () => Promise<T>
): Promise<T> {
  return tracedFirestoreCall(`function:${functionName}`, operation);
}

/**
 * 커스텀 성능 추적
 * 
 * @param traceName 추적 이름
 * @param operation 추적할 작업
 * @returns 작업 결과
 * 
 * @example
 * ```typescript
 * const data = await tracedCustom("processUserData", async () => {
 *   // 복잡한 데이터 처리 로직
 *   return processedData;
 * });
 * ```
 */
export async function tracedCustom<T>(
  traceName: string,
  operation: () => Promise<T>
): Promise<T> {
  return tracedFirestoreCall(`custom:${traceName}`, operation);
}

/**
 * 동기 작업 추적 (Promise가 아닌 작업)
 * 
 * @param traceName 추적 이름
 * @param operation 추적할 작업
 * @returns 작업 결과
 * 
 * @example
 * ```typescript
 * const result = tracedSync("processData", () => {
 *   return heavyComputation();
 * });
 * ```
 */
export function tracedSync<T>(
  traceName: string,
  operation: () => T
): T {
  if (!perf) {
    return operation();
  }

  const t = trace(perf, traceName);
  t.start();
  
  try {
    const result = operation();
    t.stop();
    return result;
  } catch (error) {
    t.stop();
    throw error;
  }
}

/**
 * 수동으로 추적 시작/종료
 * 
 * @param traceName 추적 이름
 * @returns 추적 객체 (start/stop 메서드 포함)
 * 
 * @example
 * ```typescript
 * const t = startTrace("complexOperation");
 * t.start();
 * // ... 작업 수행 ...
 * t.stop();
 * ```
 */
export function startTrace(traceName: string): PerformanceTrace {
  if (!perf) {
    // Performance Monitoring이 없으면 더미 객체 반환
    return {
      start: () => {},
      stop: () => {},
    } as PerformanceTrace;
  }

  return trace(perf, traceName);
}

