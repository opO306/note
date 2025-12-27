// src/utils/foregroundHandler.ts
// 앱이 Foreground로 복귀할 때 필요한 데이터만 갱신하는 핸들러

import { App } from "@capacitor/app";
import { auth } from "@/firebase";
import { firebaseCache } from "@/utils/firebaseCache";

/**
 * Foreground 이벤트 리스너 초기화
 * 앱이 백그라운드에서 포그라운드로 복귀할 때 필요한 데이터만 갱신합니다.
 */
export function initForegroundHandler() {
  if (typeof window === "undefined") return;

  // Capacitor App이 사용 가능한 경우에만 리스너 등록
  App.addListener("appStateChange", async (state) => {
    if (state.isActive) {
      // 앱이 Foreground로 복귀했을 때
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      // ✅ 필요한 데이터만 선택적으로 갱신
      // - 사용자 데이터 캐시는 만료되었을 때만 갱신 (자동 처리됨)
      // - 여기서는 특별한 갱신이 필요하지 않으면 무시
      
      // 필요시 특정 캐시만 무효화하여 다음 접근 시 갱신되도록 할 수 있음
      // invalidateUserDataCache(uid);
    }
  });

  // 페이지 visibility 변경 이벤트 (웹 환경)
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        // 페이지가 다시 보일 때 (웹 환경)
        const uid = auth.currentUser?.uid;
        if (uid) {
          // 만료된 캐시만 정리 (실제 갱신은 다음 접근 시 자동으로)
          firebaseCache.cleanup();
        }
      }
    });
  }
}

