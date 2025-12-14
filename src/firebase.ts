import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    connectFirestoreEmulator
} from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// 네이티브/웹 구분을 위한 라이브러리
import { Capacitor } from "@capacitor/core";
import { FirebaseAppCheck } from "@capacitor-firebase/app-check";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";


console.log("Current API Key:", import.meta.env.VITE_FIREBASE_API_KEY); // 이 줄 추가

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// 1. 앱 초기화
const app = initializeApp(firebaseConfig);

// 2. App Check 설정
const initAppCheck = async () => {
    if (Capacitor.isNativePlatform()) {
        try {
            // 🚨 수정 포인트: 배포용 빌드에서는 'debug' 옵션을 빼야 합니다!
            // process.env.NODE_ENV === 'production' 체크를 하거나,
            // 그냥 provider 옵션을 아예 지우면 자동으로 Play Integrity를 씁니다.

            await FirebaseAppCheck.initialize({
                // provider: 'debug',  <-- ❌ 이 줄을 지우거나 주석 처리하세요!
                isTokenAutoRefreshEnabled: true,
            });
            console.log("✅ App Check initialized (Production/Play Integrity)");
        } catch (e) {
            console.error("⚠️ App Check init failed:", e);
        }
    } else if (typeof window !== "undefined") {
        if (import.meta.env.DEV) {
            (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = "A03EAF33-30D2-4C92-9CC5-AB53B21869FD";
        }
        const siteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;
        if (siteKey) {
            initializeAppCheck(app, {
                provider: new ReCaptchaEnterpriseProvider(siteKey),
                isTokenAutoRefreshEnabled: true,
            });
        }
    }
};

initAppCheck();

// ✅ [핵심 수정] 3. Firestore 초기화 (Long Polling 강제 적용)
export const db = initializeFirestore(app, {
    // 👇👇👇 이 옵션이 모바일 통신 에러(QUIC)를 해결해줍니다! 👇👇👇
    experimentalForceLongPolling: true,
    experimentalLongPollingOptions: { timeoutSeconds: 25 },
    useFetchStreams: false,
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
        cacheSizeBytes: 40 * 1024 * 1024,
    }),
} as any);

// 4. 나머지 서비스 가져오기
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "asia-northeast3");

// 5. 에뮬레이터 연결 (필요시 true로 변경)
if (false && import.meta.env.DEV) {
    connectAuthEmulator(auth, "http://localhost:9099");
    connectFirestoreEmulator(db, "localhost", 8080);
    connectFunctionsEmulator(functions, "localhost", 5001);
    connectStorageEmulator(storage, "localhost", 9199);
}

// 6. Analytics
if (typeof window !== "undefined") {
    setTimeout(() => {
        isSupported().then((supported) => {
            if (supported) getAnalytics(app);
        });
    }, 500);
}

export default app;