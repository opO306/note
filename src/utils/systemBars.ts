// systemBars.ts - 시스템 바(상태바, 네비게이션 바) 테마 설정 유틸리티

import { Capacitor } from "@capacitor/core";

/**
 * 테마별 시스템 바 색상 설정
 */
export async function setSystemBarsForTheme(theme: string) {
  // 웹 환경에서는 시스템 바 제어 불가
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // StatusBar 플러그인 동적 import (플러그인이 없을 수 있음)
    const { StatusBar, Style } = await import("@capacitor/status-bar");

    switch (theme) {
      case "golden-library":
        // 황금빛 서재: 어두운 배경 + 밝은 아이콘
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: "#1a1a1a" });
        break;

      case "midnight":
        // 심야 도서관: 어두운 배경 + 밝은 아이콘
        await StatusBar.setStyle({ style: Style.Light });
        await StatusBar.setBackgroundColor({ color: "#1a1f2e" });
        break;

      case "e-ink":
        // 전자 종이: 밝은 배경 + 어두운 아이콘
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: "#f4f1e8" });
        break;

      default:
        // 기본 테마: 다크 모드에 따라 설정
        const isDark = localStorage.getItem("darkMode") === "true";
        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
        await StatusBar.setBackgroundColor({ 
          color: isDark ? "#000000" : "#ffffff" 
        });
        break;
    }
  } catch (error) {
    // 플러그인이 설치되지 않았거나 사용할 수 없는 경우 무시
    console.warn("StatusBar 플러그인을 사용할 수 없습니다:", error);
  }

  // Android 네비게이션 바 색상 설정 (Capacitor 7+)
  if (Capacitor.getPlatform() === "android") {
    try {
      // Android 네비게이션 바는 window.navigationBar 또는 네이티브 코드로 제어
      // Capacitor에서는 직접 지원하지 않으므로, CSS 변수나 메타 태그로 처리
      const navigationBarColor = getNavigationBarColorForTheme(theme);
      
      // 메타 태그를 통해 네비게이션 바 색상 설정
      setAndroidNavigationBarColor(navigationBarColor);
    } catch (error) {
      console.warn("네비게이션 바 색상 설정 실패:", error);
    }
  }
}

/**
 * 테마별 네비게이션 바 색상 반환
 */
function getNavigationBarColorForTheme(theme: string): string {
  switch (theme) {
    case "golden-library":
      return "#1a1a1a"; // 황금빛 서재 배경색
    case "midnight":
      return "#1a1f2e"; // 심야 도서관 배경색
    case "e-ink":
      return "#f4f1e8"; // 전자 종이 배경색
    default:
      const isDark = localStorage.getItem("darkMode") === "true";
      return isDark ? "#000000" : "#ffffff";
  }
}

/**
 * Android 네비게이션 바 색상 설정 (메타 태그 방식)
 */
function setAndroidNavigationBarColor(color: string) {
  if (typeof window === "undefined") return;

  // 기존 메타 태그 제거
  const existingMeta = document.querySelector('meta[name="theme-color"]');
  if (existingMeta) {
    existingMeta.setAttribute("content", color);
  } else {
    // 새 메타 태그 생성
    const meta = document.createElement("meta");
    meta.name = "theme-color";
    meta.content = color;
    document.head.appendChild(meta);
  }

  // Android Chrome의 네비게이션 바 색상 설정
  // (실제로는 AndroidManifest.xml이나 네이티브 코드에서 설정해야 함)
  if ((window as any).navigationBar) {
    try {
      (window as any).navigationBar.setBackgroundColor(color);
    } catch (_e) {
      // 네이티브 API가 없는 경우 무시
    }
  }
}

