// src/firebase.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck } from "firebase/app-check";

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
    console.log("🚀 [System] 실제 Firebase 서버에 연결합니다.");

    // 에뮬레이터 연결 함수(connectAuthEmulator 등)가 없으므로
    // 무조건 실제 Firebase 프로젝트와 통신하게 됩니다.

    // (선택) 프로덕션 환경에서만 App Check 활성화
    if (!import.meta.env.DEV) {
        if (import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
            console.log("🛡️ [Security] App Check을 활성화합니다.");
            appCheckInstance = initializeAppCheck(app, {
                provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
                isTokenAutoRefreshEnabled: true,
            });
        }
    }
}

export const getAppCheck = () => appCheckInstance;
export { app, auth, db, functions, storage };