// src/utils/userDataLoader.ts
// 사용자 데이터를 한 번에 가져오는 통합 로더
// useTrustScore와 useTitleActions의 중복 요청을 제거

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { withCache, getUserCacheKey, firebaseCache } from "@/utils/firebaseCache";
import { tracedFirestoreCall } from "@/utils/performanceMonitoring";

export interface UserDataFromFirestore {
  trustScore: number;
  ownedTitles: string[];
  currentTitle: string | null; // 🔹 null이면 Firestore에 값이 없음을 의미
}

/**
 * 사용자의 신뢰도 점수와 칭호 정보를 한 번에 가져옵니다.
 * useTrustScore와 useTitleActions의 중복 요청을 제거합니다.
 * 
 * @param uid 사용자 UID
 * @returns 사용자 데이터 (trustScore, ownedTitles, currentTitle)
 */
export async function getUserDataFromFirestore(
  uid: string
): Promise<UserDataFromFirestore> {
  // ✅ 캐시를 사용하여 중복 요청 방지 (5분 TTL) + Performance Monitoring
  return withCache(
    getUserCacheKey("userData", uid),
    async () => {
      return tracedFirestoreCall("getUserData", async () => {
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);
        
        if (!snap.exists()) {
          return {
            trustScore: 30,
            ownedTitles: [],
            currentTitle: null, // 🔹 문서가 없으면 null 반환
          };
        }

        const data = snap.data();
        
        // ✅ 필요한 필드만 추출 (Firestore 쿼리 최적화)
        return {
          trustScore: typeof data.trustScore === "number" ? data.trustScore : 30,
          ownedTitles: Array.isArray(data.ownedTitles)
            ? data.ownedTitles.filter((id: unknown): id is string => typeof id === "string")
            : [],
          // 🔹 currentTitle: string이면 그대로, null/undefined면 null 반환 (빈 문자열과 구분)
          currentTitle: typeof data.currentTitle === "string" && data.currentTitle.trim() !== ""
            ? data.currentTitle
            : null,
        };
      });
    },
    5 * 60 * 1000 // 5분 캐시
  );
}

/**
 * 사용자 데이터 캐시 무효화
 * 데이터가 업데이트되었을 때 호출하여 캐시를 갱신합니다.
 */
export function invalidateUserDataCache(uid: string): void {
  firebaseCache.invalidate(getUserCacheKey("userData", uid));
  // 개별 캐시도 무효화 (하위 호환성)
  firebaseCache.invalidate(getUserCacheKey("trustScore", uid));
  firebaseCache.invalidate(getUserCacheKey("userTitles", uid));
}

