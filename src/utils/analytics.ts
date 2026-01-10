// src/utils/analytics.ts
// Firebase Analytics 이벤트 추적 유틸리티

import { getAnalytics, logEvent, Analytics, setUserId, setUserProperties } from "firebase/analytics";
import { app } from "@/firebase";
import { Capacitor } from "@capacitor/core";

let analytics: Analytics | null = null;
let isInitialized = false;

/**
 * Analytics 초기화 (앱 시작 시 한 번 호출)
 * - 네이티브 앱에서는 Firebase Analytics가 자동으로 작동
 * - 웹에서는 getAnalytics()로 초기화
 */
export function initAnalytics(): Analytics | null {
    if (isInitialized) return analytics;
    isInitialized = true;

    try {
        // 네이티브 앱에서도 웹 SDK Analytics 사용 가능
        analytics = getAnalytics(app);
        return analytics;
    } catch (error) {
        // Analytics 초기화 실패 (개발 환경 등에서 발생 가능)
        console.warn("[Analytics] 초기화 실패:", error);
        return null;
    }
}

/**
 * 사용자 ID 설정 (로그인 후 호출)
 */
export function setAnalyticsUserId(userId: string | null): void {
    if (!analytics) return;
    try {
        setUserId(analytics, userId);
    } catch {
        // 무시
    }
}

/**
 * 사용자 속성 설정
 */
export function setAnalyticsUserProperties(properties: Record<string, string>): void {
    if (!analytics) return;
    try {
        setUserProperties(analytics, properties);
    } catch {
        // 무시
    }
}

// ============================================
// 📊 이벤트 로깅 함수들
// ============================================

/**
 * 화면 조회 이벤트
 */
export function trackScreenView(screenName: string, screenClass?: string): void {
    if (!analytics) return;
    try {
        logEvent(analytics, "screen_view", {
            firebase_screen: screenName,
            firebase_screen_class: screenClass ?? screenName,
            platform: Capacitor.getPlatform(),
        });
    } catch {
        // 무시
    }
}

/**
 * 로그인 화면 조회
 */
export function trackLoginScreenView(): void {
    trackScreenView("login_screen", "LoginScreen");
}

/**
 * 로그인 시작 (버튼 클릭)
 */
export function trackLoginStarted(method: "google" | "email"): void {
    if (!analytics) return;
    try {
        logEvent(analytics, "login_started", {
            method,
            timestamp: Date.now(),
            platform: Capacitor.getPlatform(),
        });
    } catch {
        // 무시
    }
}

/**
 * 로그인 성공
 */
export function trackLoginSuccess(method: "google" | "email", durationMs: number): void {
    if (!analytics) return;
    try {
        // Firebase 표준 login 이벤트
        logEvent(analytics, "login", {
            method,
        });

        // 커스텀 상세 이벤트
        logEvent(analytics, "login_success", {
            method,
            duration_ms: durationMs,
            platform: Capacitor.getPlatform(),
        });
    } catch {
        // 무시
    }
}

/**
 * 로그인 실패
 */
export function trackLoginFailure(method: "google" | "email", error: string, durationMs: number): void {
    if (!analytics) return;
    try {
        logEvent(analytics, "login_failure", {
            method,
            error_type: error.substring(0, 100), // 최대 100자
            duration_ms: durationMs,
            platform: Capacitor.getPlatform(),
        });
    } catch {
        // 무시
    }
}

/**
 * 로그인 취소 (사용자가 중간에 취소)
 */
export function trackLoginCancelled(method: "google" | "email"): void {
    if (!analytics) return;
    try {
        logEvent(analytics, "login_cancelled", {
            method,
            platform: Capacitor.getPlatform(),
        });
    } catch {
        // 무시
    }
}

/**
 * 온보딩 단계 추적
 */
export function trackOnboardingStep(step: "nickname" | "guidelines" | "welcome"): void {
    if (!analytics) return;
    try {
        logEvent(analytics, "onboarding_step", {
            step,
            platform: Capacitor.getPlatform(),
        });
    } catch {
        // 무시
    }
}

/**
 * 온보딩 완료
 */
export function trackOnboardingComplete(): void {
    if (!analytics) return;
    try {
        logEvent(analytics, "tutorial_complete", {
            platform: Capacitor.getPlatform(),
        });
    } catch {
        // 무시
    }
}

/**
 * 메인 화면 진입
 */
export function trackMainScreenView(): void {
    trackScreenView("main_screen", "MainScreen");
}

/**
 * 로그아웃
 */
export function trackLogout(): void {
    if (!analytics) return;
    try {
        logEvent(analytics, "logout", {
            platform: Capacitor.getPlatform(),
        });
    } catch {
        // 무시
    }
}

/**
 * 앱 세션 시작 (앱 열기)
 */
export function trackAppOpen(): void {
    if (!analytics) return;
    try {
        logEvent(analytics, "app_open", {
            platform: Capacitor.getPlatform(),
            timestamp: Date.now(),
        });
    } catch {
        // 무시
    }
}

/**
 * 약관 동의
 */
export function trackTermsAgreed(): void {
    if (!analytics) return;
    try {
        logEvent(analytics, "terms_agreed", {
            platform: Capacitor.getPlatform(),
        });
    } catch {
        // 무시
    }
}

/**
 * 커스텀 이벤트 (범용)
 */
export function trackCustomEvent(eventName: string, params?: Record<string, any>): void {
    if (!analytics) return;
    try {
        logEvent(analytics, eventName, {
            ...params,
            platform: Capacitor.getPlatform(),
        });
    } catch {
        // 무시
    }
}

/**
 * 성능 측정 이벤트
 */
export function trackPerformance(name: string, durationMs: number, metadata?: Record<string, any>): void {
    if (!analytics) return;
    try {
        logEvent(analytics, "performance_metric", {
            metric_name: name,
            duration_ms: durationMs,
            ...metadata,
            platform: Capacitor.getPlatform(),
        });
    } catch {
        // 무시
    }
}
