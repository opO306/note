import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import {
    initializeFirestore,
    connectFirestoreEmulator,
    persistentLocalCache,
    persistentMultipleTabManager,
    type Firestore,
} from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator, type Functions } from "firebase/functions";
import { Capacitor } from "@capacitor/core";
import { FirebaseAppCheck } from "@capacitor-firebase/app-check";
import {
    initializeAppCheck,
    ReCaptchaEnterpriseProvider,
    getToken,
    type AppCheck,
} from "firebase/app-check";

// --- 1. 기본 설정 (기존과 동일) ---
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// --- 2. Firebase 앱 및 서비스 초기화 (기존과 동일) ---
const app: FirebaseApp = initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions: Functions = getFunctions(app, "asia-northeast3");
export const db: Firestore = initializeFirestore(app, {
    experimentalForceLongPolling: true,
    experimentalLongPollingOptions: { timeoutSeconds: 25 },
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
        cacheSizeBytes: 40 * 1024 * 1024,
    }),
});

// --- 3. [추가됨] 개발 환경일 경우 에뮬레이터에 연결 ---
// Vite의 `import.meta.env.DEV`를 사용하여 개발 서버에서 실행 중인지 확인합니다.
if (import.meta.env.DEV) {
    console.log("🛠️ 개발 모드: Firebase 에뮬레이터에 연결합니다.");

    // localhost 대신 127.0.0.1을 사용하면 일부 네트워크 문제를 피할 수 있습니다.
    const host = "127.0.0.1";

    // Auth 에뮬레이터 (기본 포트: 9099)
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });

    // Firestore 에뮬레이터 (기본 포트: 8080)
    connectFirestoreEmulator(db, host, 8080);

    // Functions 에뮬레이터 (기본 포트: 5001)
    connectFunctionsEmulator(functions, host, 5001);

    // 참고: Storage 에뮬레이터도 필요하다면 아래 주석을 해제하세요.
    // import { connectStorageEmulator } from "firebase/storage";
    // connectStorageEmulator(storage, host, 9199);
}


// --- 4. App Check 비동기 초기화 로직 (기존과 동일) ---
let appCheckInstance: AppCheck | null = null;
export const getAppCheck = (): AppCheck | null => appCheckInstance;

let initPromise: Promise<void> | null = null;

async function initAppCheckWeb(): Promise<void> {
    // 🔹 개발 모드(에뮬레이터 사용)에서는 App Check을 초기화하지 않습니다.
    if (import.meta.env.DEV) {
        console.log("🛠️ 개발 모드: App Check 초기화를 건너뜁니다.");
        return;
    }

    const siteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY as string | undefined;
    if (!siteKey) {
        console.warn("⚠️ App Check: Site Key missing.");
        return;
    }

    // 디버그 토큰은 실제 배포 환경에서 테스트할 때만 사용되도록 합니다.
    if (import.meta.env.VITE_APPCHECK_DEBUG_TOKEN) {
        (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
    }

    appCheckInstance = initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(siteKey),
        isTokenAutoRefreshEnabled: true,
    });

    try {
        await getToken(appCheckInstance, false);
    } catch (e) {
        console.warn("App Check token fetch failed during initialization:", e);
    }
}

async function initAppCheckNative(): Promise<void> {
    await FirebaseAppCheck.initialize({
        isTokenAutoRefreshEnabled: true,
        debug: Boolean(import.meta.env.DEV),
    });
}

export function initFirebase(): Promise<void> {
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            if (Capacitor.isNativePlatform()) {
                await initAppCheckNative();
            } else {
                await initAppCheckWeb();
            }
            console.log("✅ Firebase & App Check 초기화 로직 완료.");
        } catch (e) {
            console.error("❌ Firebase & App Check 초기화 실패:", e);
        }
    })();

    return initPromise;
}

export default app;