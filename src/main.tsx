import React from "react";
import ReactDOM from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { FirebaseAppCheck } from "@capacitor-firebase/app-check"; // App Check 임포트
import "./index.css";
import { initFirebase, initFirebaseAppCheck } from "./firebase";

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
            if (systemBarHeight > 0 && (envBottomValue === 0 || systemBarHeight > envBottomValue)) {
                root.style.setProperty('--safe-area-inset-bottom', `${systemBarHeight}px`);
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

        // 초기 계산 (DOM이 준비된 후 약간의 지연을 두어 브라우저가 모든 값을 계산한 후 실행)
        const initUpdate = () => {
            setTimeout(updateSafeAreaInsets, 100);
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

    // ✅ Cold start 최적화: Firebase 가벼운 초기화만 먼저 (앱/서비스 인스턴스 생성)
    await initFirebase();

    // ✅ AppCheck와 Authentication 리스너는 "백그라운드"에서 초기화
    //    - 첫 화면 렌더링을 막지 않도록 await 사용하지 않음
    //    - 웹 환경에서는 initFirebaseAppCheck()에서 App Check를 설정
    //    - 네이티브 환경에서는 Capacitor App Check 플러그인도 함께 초기화
    void initFirebaseAppCheck().catch(() => {
        // App Check 초기화 실패는 무시 (백그라운드 작업)
    });

    if (Capacitor.isNativePlatform()) {
        try {
            void FirebaseAppCheck.initialize({
                provider: 'playIntegrity',
                isTokenAutoRefreshEnabled: true,
            });
        } catch {
            // App Check initialization failed (로그 제거)
        }
    }

    // FirebaseAuthentication 리스너 설정 (렌더링을 블로킹하지 않음)
    FirebaseAuthentication.removeAllListeners()
        .then(() => {
            return FirebaseAuthentication.addListener('authStateChange', () => {
                // Auth State 변경 (로그 제거)
            });
        })
        .catch(() => {
            // FirebaseAuthentication listener setup failed (로그 제거)
        });

    // ✅ App 컴포넌트 로드 및 렌더링 (AppCheck 초기화를 기다리지 않고 즉시 시작)
    const { default: App } = await import("./App");

    ReactDOM.createRoot(document.getElementById("root")!).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}

bootstrap();