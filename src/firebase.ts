// src/firebase.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
    getFirestore,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    CACHE_SIZE_UNLIMITED
} from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaEnterpriseProvider, AppCheck } from "firebase/app-check";
import { Capacitor } from "@capacitor/core";
import { User } from "firebase/auth"; // User 타입 임포트
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

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

// ✅ Firestore 오프라인 캐시 활성화 (로딩 속도 개선)
// - 이전에 조회한 데이터는 캐시에서 즉시 반환
// - 네트워크 요청과 병렬로 캐시 데이터 사용
let db: ReturnType<typeof getFirestore>;
try {
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
            cacheSizeBytes: CACHE_SIZE_UNLIMITED
        })
    });
} catch {
    // 이미 초기화된 경우 기존 인스턴스 사용
    db = getFirestore(app);
}

// Asia 리전 설정 확인 (functions 사용 시)
const functions = getFunctions(app, "asia-northeast3");
const storage = getStorage(app);

let appCheckInstance: AppCheck | null = null;
let appCheckInitPromise: Promise<void> | null = null;

// 2. 가벼운 초기화 함수 (앱/서비스 인스턴스 생성만, 렌더링을 블로킹하지 않음)
// ✅ Cold start 최적화: AppCheck 같은 무거운 초기화는 별도 함수로 분리
export async function initFirebase() {
    // 앱/서비스 인스턴스는 이미 위에서 생성됨 (동기 작업)
    // 이 함수는 호환성을 위해 유지하지만, 실제로는 즉시 완료됨
    return Promise.resolve();
}

// 3. AppCheck 초기화 (무거운 작업, 렌더링 이후 백그라운드에서 실행)
export async function initFirebaseAppCheck() {
    if (appCheckInitPromise) return appCheckInitPromise;

    appCheckInitPromise = (async () => {
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

        // App Check 초기화:
        // - 네이티브 앱에서는 개발 환경이어도 App Check가 필요함
        // - 웹 dev에서도 Firestore/AppCheck enforcement 상태일 수 있으므로, Site Key가 있으면 초기화 시도
        const key = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;
        const shouldInitAppCheck = isNative || !!key;

        if (shouldInitAppCheck && key) {
            try {
                appCheckInstance = initializeAppCheck(app, {
                    provider: new ReCaptchaEnterpriseProvider(key),
                    isTokenAutoRefreshEnabled: true,
                });
                // App Check 초기화 완료
            } catch {
                // App Check 초기화 실패는 무시 (환경/도메인 설정에 따라 실패할 수 있음)
            }
        }
    })();

    return appCheckInitPromise;
}

export const getAppCheck = () => appCheckInstance;

async function ensureUserDocument(user: User) {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        await setDoc(ref, {
            uid: user.uid,
            email: user.email,
            provider: user.providerData[0]?.providerId ?? "unknown",
            createdAt: serverTimestamp(),
            createdBy: "client", // 이 필드를 추가하여 클라이언트에서 생성되었음을 표시
        }, { merge: true });
    }
}

export { app, auth, db, functions, storage, ensureUserDocument };