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

    // 개발에서만 App Check 디버그 토큰 사용 (프로덕션에서는 절대 사용 금지)
    // ⚠️ 보안 주의: 디버그 토큰은 개발 환경에서만 사용하며, 프로덕션 빌드에는 포함되지 않아야 함
    // ⚠️ 디버그 토큰 콘솔 출력 방지: Firebase SDK가 자동으로 출력하는 메시지를 필터링
    if (import.meta.env.DEV) {
        const debugToken = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
        if (debugToken) {
            // 디버그 토큰 관련 콘솔 출력을 필터링하기 위해 콘솔 메서드 오버라이드
            const originalLog = console.log;
            const originalWarn = console.warn;
            const originalInfo = console.info;
            const originalError = console.error;

            const shouldFilter = (args: any[]): boolean => {
                const message = String(args[0] || '');
                return message.includes('App Check debug token') ||
                    message.includes('FIREBASE_APPCHECK_DEBUG_TOKEN') ||
                    message.includes('debug token') ||
                    message.includes('Debug token');
            };

            console.log = (...args: any[]) => {
                if (!shouldFilter(args)) originalLog.apply(console, args);
            };
            console.warn = (...args: any[]) => {
                if (!shouldFilter(args)) originalWarn.apply(console, args);
            };
            console.info = (...args: any[]) => {
                if (!shouldFilter(args)) originalInfo.apply(console, args);
            };
            console.error = (...args: any[]) => {
                if (!shouldFilter(args)) originalError.apply(console, args);
            };

            // true면 자동 생성, 문자열이면 그 토큰 사용
            (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken === "true" ? true : debugToken;

            // App Check 초기화 완료 후 콘솔 복원 (충분한 지연)
            setTimeout(() => {
                console.log = originalLog;
                console.warn = originalWarn;
                console.info = originalInfo;
                console.error = originalError;
            }, 3000);
        }
    }
    // 프로덕션 빌드에서는 디버그 토큰을 절대 사용하지 않음

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
                // App Check 초기화 완료
            } catch (error) {
                // App Check 초기화 실패 (로그 제거)
                // 네이티브에서는 App Check가 필수이므로 에러를 다시 throw하지 않고 경고만 표시
                // (실제로는 네이티브 App Check 플러그인을 사용해야 할 수도 있음)
            }
        } else {
            // App Check Site Key 없음 (로그 제거)
        }
    }
}

export const getAppCheck = () => appCheckInstance;
export { app, auth, db, functions, storage };