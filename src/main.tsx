import React from "react";
import ReactDOM from "react-dom/client";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { FirebaseAppCheck } from "@capacitor-firebase/app-check"; // ✅ [추가 1] App Check 임포트
import "./index.css";
import { initFirebase } from "./firebase";

async function bootstrap() {
    await initFirebase();

    // ✅ [추가 2] App Check 초기화 (이게 없으면 401 에러 남)
    // 네이티브(Play Integrity)의 인증 토큰을 JS 쪽으로 연결해주는 다리 역할입니다.
    try {
        await FirebaseAppCheck.initialize({
            provider: 'playIntegrity',
            isTokenAutoRefreshEnabled: true,
        });
        console.log("✅ App Check initialized with Play Integrity");
    } catch (e) {
        // 개발 중이거나 웹 환경이면 에러가 날 수 있으니 로그만 찍고 넘어갑니다.
        console.warn("⚠️ App Check initialization failed (Ignore if in Web/Debug):", e);
    }

    // 기존 리스너 코드 (그대로 유지)
    await FirebaseAuthentication.removeAllListeners();
    await FirebaseAuthentication.addListener('authStateChange', (change) => {
        const state = change.user ? "로그인 됨" : "로그아웃 상태";
        console.log(`[Global Listener] Auth State: ${state}`);
    });

    const { default: App } = await import("./App");

    ReactDOM.createRoot(document.getElementById("root")!).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}

bootstrap();