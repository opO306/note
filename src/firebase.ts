// src/firebase.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
    initializeFirestore,
    persistentLocalCache,
} from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

// ✅ AppCheck 설정 (브라우저에서만 동작하도록 방어)
if (typeof window !== "undefined") {
    const siteKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY;

    if (siteKey) {
        initializeAppCheck(app, {
            provider: new ReCaptchaEnterpriseProvider(siteKey),
            isTokenAutoRefreshEnabled: true, // 토큰 자동 갱신
        });
    } else {
        console.warn(
            "[firebase] VITE_RECAPTCHA_ENTERPRISE_SITE_KEY 가 설정되지 않았습니다. AppCheck가 비활성화됩니다."
        );
    }
}

// ✅ 새 방식: 초기화할 때 로컬 캐시 설정
export const db = initializeFirestore(
    app,
    {
        localCache: persistentLocalCache(),
    }
);

let analytics: ReturnType<typeof getAnalytics> | null = null;
isSupported().then((supported) => {
    if (supported) {
        analytics = getAnalytics(app);
    }
});

// ✅ Auth 그대로
export const auth = getAuth(app);

export const storage = getStorage(app);

export default app;
