import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { initPerformanceMonitoring } from "./utils/performanceMonitoring";
import * as Sentry from "@sentry/react";

Sentry.init({
    dsn: "https://2a980add45c1a46d6284b4aff8acc727@o4510675590381568.ingest.us.sentry.io/4510675597000704",

    integrations: [
        Sentry.browserTracingIntegration(),
    ],

    // ✅ v8에서는 여기!
    tracePropagationTargets: [
        "localhost",
        /^https:\/\/yourserver\.io\/api/,
    ],

    // 로그인 디버깅 중
    tracesSampleRate: 1.0,

    environment: import.meta.env.MODE,
});



if (import.meta.env.DEV) {
    import("./utils/react-version-check");
    import("./utils/sw-unregister");
}


async function bootstrap() {
    // 시스템 네비게이션 바 높이 자동 계산 및 CSS 변수 업데이트
    // env(safe-area-inset-bottom)이 자동으로 작동하지 않는 경우를 대비한 보완 로직
    if (typeof window !== 'undefined') {
        const updateSafeAreaInsets = () => {
            const root = document.documentElement;

            // env()로 이미 설정된 값 확인
            const computedStyle = getComputedStyle(root);

            // 하단 safe area 계산
            const envBottomStr = computedStyle.getPropertyValue('--safe-area-inset-bottom').trim();
            const envBottomValue = parseFloat(envBottomStr) || 0;

            // 시스템 네비게이션 바 높이 계산 (outerHeight - innerHeight 차이)
            // Android WebView에서는 outerHeight와 innerHeight 차이가 시스템 바 높이를 나타냄
            const outerHeight = window.outerHeight || window.innerHeight;
            const innerHeight = window.innerHeight;
            const systemBarHeight = Math.max(0, outerHeight - innerHeight);

            // 계산된 값이 유효하고 env 값이 작거나 0이면 계산된 값 사용
            // (env 값이 이미 있으면 그것을 우선 사용)
            // ✅ Safe Area API가 작동하지 않는 경우를 위한 fallback
            if (systemBarHeight > 0 && (envBottomValue === 0 || systemBarHeight > envBottomValue)) {
                root.style.setProperty('--safe-area-inset-bottom', `${systemBarHeight}px`);
            } else if (envBottomValue === 0 && systemBarHeight === 0) {
                // ✅ Android 기기에서 시스템 바가 있을 수 있으므로 최소값 보장
                // 일반적으로 Android 시스템 네비게이션 바는 48-56px 정도
                root.style.setProperty('--safe-area-inset-bottom', '48px');
            }

            // 상단 safe area 계산 (상태 바 높이)
            const envTopStr = computedStyle.getPropertyValue('--safe-area-inset-top').trim();
            const envTopValue = parseFloat(envTopStr) || 0;

            let calculatedTopBarHeight = 0;

            // Visual Viewport API를 사용하여 상태 바 높이 계산 (가장 정확함)
            if (window.visualViewport && window.visualViewport.offsetTop !== undefined) {
                // visualViewport.offsetTop은 상태 바가 있으면 그 높이를 나타냄
                calculatedTopBarHeight = Math.max(0, window.visualViewport.offsetTop);
            } else if (window.screen && window.screen.height) {
                // Fallback: screen.height와 window.innerHeight의 차이로 추정
                const screenHeight = window.screen.height;
                const windowHeight = window.innerHeight;
                const totalSystemBarHeight = screenHeight - windowHeight;

                // Android 상태 바는 일반적으로 24-48px 정도
                // 전체 시스템 바 높이에서 하단 높이를 빼면 상단 높이를 추정할 수 있음
                const estimatedTopBarHeight = Math.max(0, totalSystemBarHeight - systemBarHeight);

                // 상태 바는 최소 24px, 최대 48px 정도로 제한 (비정상적인 값 방지)
                calculatedTopBarHeight = Math.min(Math.max(estimatedTopBarHeight, 24), 48);
            }

            // 계산된 값이 유효하고 env 값이 작거나 0이면 계산된 값 사용
            // (env 값이 이미 있으면 그것을 우선 사용)
            if (calculatedTopBarHeight > 0 && (envTopValue === 0 || calculatedTopBarHeight > envTopValue)) {
                root.style.setProperty('--safe-area-inset-top', `${calculatedTopBarHeight}px`);
            } else if (envTopValue === 0) {
                // env 값도 없고 계산도 안 되면 최소값 보장 (Android 상태 바 최소 높이)
                root.style.setProperty('--safe-area-inset-top', '24px');
            }
        };

        // ✅ 최적화: requestAnimationFrame 사용하여 다음 프레임에 실행 (블로킹 최소화)
        const initUpdate = () => {
            // requestAnimationFrame을 두 번 사용하여 브라우저가 레이아웃 계산을 완료한 후 실행
            requestAnimationFrame(() => {
                requestAnimationFrame(updateSafeAreaInsets);
            });
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initUpdate);
        } else {
            initUpdate();
        }

        // 화면 회전, 리사이즈 시 재계산
        window.addEventListener('resize', updateSafeAreaInsets);
        window.addEventListener('orientationchange', () => {
            setTimeout(updateSafeAreaInsets, 200);
        });
    }

    // ✅ Cold start 최적화: Firebase 초기화와 App 컴포넌트 로드를 병렬로 실행
    // 1. Firebase App (firebase.ts에서 자동 초기화됨)
    // await initFirebase();
    // 2. App Check (Auth보다 먼저)
    const AppModule = await import("./App");

    // ✅ Performance Monitoring 초기화 (백그라운드에서 실행)
    try {
        initPerformanceMonitoring();
    } catch {
        // Performance Monitoring 초기화 실패는 무시 (개발 환경 등)
    }

    // ✅ Foreground 이벤트 핸들러 초기화
    try {
        const { initForegroundHandler } = await import("./utils/foregroundHandler");
        initForegroundHandler();
    } catch {
        // Foreground 핸들러 초기화 실패는 무시
    }

    // ✅ App 컴포넌트 로드 및 렌더링 (이미 위에서 로드됨)
    const { default: App } = AppModule;

    ReactDOM.createRoot(document.getElementById("root")!).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}

bootstrap();