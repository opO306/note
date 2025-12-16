// src/firebase.ts

import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
// ✨ [수정 1] getStorage와 connectStorageEmulator를 import 합니다.
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck } from "firebase/app-check";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebase 앱 및 서비스들을 먼저 초기화하고 export 합니다.
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, "asia-northeast3");
// ✨ [수정 2] Storage 서비스를 초기화합니다.
const storage = getStorage(app);

// App Check 인스턴스를 저장할 변수
let appCheckInstance: AppCheck | null = null;

/**
 * main.tsx에서 호출할 비동기 초기화 함수
 */
export async function initFirebase() {
    if (import.meta.env.DEV) {
        console.log("🛠️ 개발 모드: Firebase 에뮬레이터에 연결합니다.");
        const host = window.location.hostname;

        connectAuthEmulator(auth, `http://${host}:9099`);
        connectFirestoreEmulator(db, host, 8080);
        connectFunctionsEmulator(functions, host, 5001);
        // ✨ [수정 3] Storage 에뮬레이터에 연결합니다.
        connectStorageEmulator(storage, host, 9199);

    } else {
        console.log("🚀 프로덕션 모드: App Check을 초기화합니다.");
        appCheckInstance = initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
            isTokenAutoRefreshEnabled: true,
        });
    }
    console.log("✅ Firebase 초기 설정 완료.");
}

/**
 * 초기화된 App Check 인스턴스를 반환하는 함수.
 */
export const getAppCheck = () => appCheckInstance;

// ✨ [수정 4] 초기화된 storage 인스턴스를 export 목록에 추가합니다.
export { app, auth, db, functions, storage };