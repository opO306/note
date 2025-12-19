// src/firebase.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaEnterpriseProvider, AppCheck } from "firebase/app-check";
import { Capacitor } from "@capacitor/core";

// Firebase 설정 (기존 키 그대로 사용)
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 1. 앱 및 서비스 초기화
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// Asia 리전 설정 확인 (functions 사용 시)
const functions = getFunctions(app, "asia-northeast3");
const storage = getStorage(app);

let appCheckInstance: AppCheck | null = null;

// 2. 초기화 함수 (핵심: 에뮬레이터 연결 코드 제거됨)
export async function initFirebase() {
    const isNative = Capacitor.isNativePlatform();

    console.log("🔥 [Firebase] 초기화 시작", {
        platform: isNative ? "native" : "web",
        projectId: (app.options as any)?.projectId,
        appId: (app.options as any)?.appId,
    });

    // 개발에서 App Check 디버그 토큰 사용
    const debugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
    if (import.meta.env.DEV && debugToken) {
        // true면 자동 생성, 문자열이면 그 토큰 사용
        (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken === "true" ? true : debugToken;
    }

    // 에뮬레이터 연결 함수(connectAuthEmulator 등)가 없으므로
    // 무조건 실제 Firebase 프로젝트와 통신하게 됩니다.

    // App Check 초기화:
    // - 네이티브 앱에서는 개발 환경이어도 App Check가 필요함 (Firebase Auth 요구사항)
    // - 웹에서는 프로덕션 환경에서만 App Check 활성화
    const shouldInitAppCheck = isNative || !import.meta.env.DEV;

    if (shouldInitAppCheck) {
        const key = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;
        if (key) {
            try {
                appCheckInstance = initializeAppCheck(app, {
                    provider: new ReCaptchaEnterpriseProvider(key),
                    isTokenAutoRefreshEnabled: true,
                });
                console.log(`✅ App Check 초기화 완료 (${isNative ? '네이티브' : '웹'}, ${import.meta.env.DEV ? '개발' : '프로덕션'})`);
            } catch (error) {
                console.error("❌ App Check 초기화 실패:", error);
                // 네이티브에서는 App Check가 필수이므로 에러를 다시 throw하지 않고 경고만 표시
                // (실제로는 네이티브 App Check 플러그인을 사용해야 할 수도 있음)
            }
        } else {
            console.warn(`⚠️ App Check Site Key가 없습니다. (${isNative ? '네이티브' : '웹'})`);
            if (isNative) {
                console.warn("⚠️ 네이티브 앱에서는 App Check가 권장됩니다. VITE_RECAPTCHA_ENTERPRISE_SITE_KEY를 설정해주세요.");
            }
        }
    }
}

export const getAppCheck = () => appCheckInstance;
export { app, auth, db, functions, storage };