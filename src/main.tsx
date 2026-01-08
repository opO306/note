import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { initFirebaseAppCheck } from "./firebase";
import { initPerformanceMonitoring } from "./utils/performanceMonitoring";
import * as Sentry from "@sentry/react";
import { initGoogleAuth } from "./lib/googleLogin";

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
    // 1. Firebase App (firebase.ts에서 자동 초기화됨)
    // await initFirebase();

    // 2. App Check (Auth보다 먼저)
    try {
        await initFirebaseAppCheck();
    } catch (e) {
        // 프로덕션에서는 실패하면 로그인 다 막힘 → 반드시 로깅
        console.error("App Check init failed", e);
    }

    // 3. GoogleAuth
    initGoogleAuth();

    // 4. App 로드
    const { default: App } = await import("./App");

    ReactDOM.createRoot(document.getElementById("root")!).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );

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
}
bootstrap();