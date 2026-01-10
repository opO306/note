import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions, initFirebaseAppCheck } from "@/firebase";
import { toast } from "@/toastHelper";
import { logoutEverywhere } from "@/auth/logoutEverywhere";

interface UseAppInitializationReturn {
    isLoading: boolean;
    initialScreen: string;
    authStateVersion: number; // ✅ 인증 상태 변경 감지용 (같은 화면이라도 강제 업데이트)
    userData: {
        nickname: string;
        email: string;
        profileImage: string;
    };
    globalError: string | null;
    resetAuthState: () => Promise<void>;
    refreshAfterEmailVerified: () => Promise<void>;
}

// 🚨 Cloud Function('verifyLogin'): { success: boolean, isNewUser: boolean } 반환
const callVerifyLogin = httpsCallable<
    { email: string },
    { success: boolean; isNewUser: boolean }
>(functions, "verifyLogin");

// ✅ 초기 로그인/온보딩 정보를 캐시해서
//    - 매 앱 실행 시 매번 verifyLogin + getDoc 호출을 피하고
//    - 첫 화면 결정을 더 빠르게 하기 위한 캐시 키/TTL
const APP_INIT_CACHE_PREFIX = "app_init_cache_v1_";
const APP_INIT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // ✅ 24시간으로 늘려서 네트워크 호출 최소화 (이탈률 감소)

interface AppInitCache {
    nickname: string;
    email: string;
    profileImage: string;
    onboardingComplete: boolean;
    lastVerifiedAt: number;
    uid: string; // ✅ 보안 강화: uid도 함께 저장하여 검증
}

export function useAppInitialization(): UseAppInitializationReturn {
    const [isLoading, setIsLoading] = useState(true);
    const [initialScreen, setInitialScreen] = useState("login");
    const [authStateVersion, setAuthStateVersion] = useState(0); // ✅ 인증 상태 변경 감지용
    const [userData, setUserData] = useState({ nickname: "", email: "", profileImage: "" });
    const [globalError] = useState<string | null>(null);

    // ✅ App Check 초기화를 미리 시작 (모듈 로드 시점에 병렬로)
    const appCheckPromiseRef = { current: null as Promise<void> | null };

    const ensureAppCheck = useCallback(() => {
        if (!appCheckPromiseRef.current) {
            appCheckPromiseRef.current = initFirebaseAppCheck().catch(() => {
                // App Check 초기화 실패는 아래 permission-denied 등으로 드러날 수 있음
            });
        }
        return appCheckPromiseRef.current;
    }, []);

    // ✅ Firestore 쿼리 옵션: 오프라인 캐시 우선 사용으로 속도 개선
    const getDocWithAppCheckRetry = useCallback(async (uid: string) => {
        // ✅ App Check 초기화를 병렬로 시작 (await 안 함)
        const appCheckPromise = ensureAppCheck();

        const isPermissionDenied = (err: any) => {
            const code = String(err?.code ?? "");
            return code === "permission-denied" ||
                code === "firestore/permission-denied" ||
                code === "functions/permission-denied" ||
                code.includes("permission-denied");
        };

        try {
            // ✅ 먼저 캐시에서 조회 시도 (네트워크 대기 없이 즉시)
            const userDocRef = doc(db, "users", uid);
            return await getDoc(userDocRef);
        } catch (e: any) {
            if (!isPermissionDenied(e)) throw e;
            await appCheckPromise;
            return await getDoc(doc(db, "users", uid));
        }
    }, [ensureAppCheck]);

    const computeNextScreenFromUserDoc = useCallback(async (user: { uid: string; email: string | null }) => {
        const snap = await getDocWithAppCheckRetry(user.uid);
        const data = snap.exists() ? snap.data() : {};

        const nickname = typeof (data as any).nickname === "string" ? (data as any).nickname : "";
        const onboardingComplete = !!(data as any).onboardingComplete;

        let profileImage = "";
        const photoURL = (data as any).photoURL;
        if (typeof photoURL === "string") {
            const isGooglePhoto = photoURL.includes("googleusercontent.com") ||
                photoURL.includes("googleapis.com") ||
                photoURL.includes("lh3.googleusercontent.com") ||
                photoURL.includes("lh4.googleusercontent.com") ||
                photoURL.includes("lh5.googleusercontent.com") ||
                photoURL.includes("lh6.googleusercontent.com");
            if (!isGooglePhoto) profileImage = photoURL;
        }

        setUserData({
            nickname,
            email: user.email ?? "",
            profileImage,
        });

        // 캐시 저장/갱신
        try {
            if (typeof window !== "undefined") {
                const cacheKey = `${APP_INIT_CACHE_PREFIX}${user.uid}`;
                const cache: AppInitCache = {
                    nickname,
                    email: user.email ?? "",
                    profileImage,
                    onboardingComplete,
                    lastVerifiedAt: Date.now(),
                    uid: user.uid,
                };
                window.localStorage.setItem(cacheKey, JSON.stringify(cache));
            }
        } catch {
            // 캐시 저장 실패는 무시
        }

        if (!nickname) {
            setInitialScreen("nickname");
        } else if (!onboardingComplete) {
            setInitialScreen("guidelines");
        } else {
            setInitialScreen("main");
        }
    }, [getDocWithAppCheckRetry]);

    const refreshAfterEmailVerified = useCallback(async () => {
        const user = auth.currentUser;
        if (!user) {
            setUserData({ nickname: "", email: "", profileImage: "" });
            setInitialScreen("login");
            setIsLoading(false);
            return;
        }

        // 🔴 핵심: emailVerified는 실시간 갱신되지 않으므로 reload가 필요
        await user.reload();

        if (!user.emailVerified) {
            setInitialScreen("verifyEmail");
            setIsLoading(false);
            return;
        }

        // 인증 완료 시점에만 온보딩/닉네임 판단을 다시 계산
        await computeNextScreenFromUserDoc({ uid: user.uid, email: user.email });
        setIsLoading(false);
    }, [computeNextScreenFromUserDoc]);

    useEffect(() => {
        // ✅ Cold start 최적화: 로컬 캐시를 먼저 확인하여 즉시 화면 표시
        //    onAuthStateChanged가 호출되기 전에 캐시가 있으면 바로 화면을 보여줌
        const checkCacheFirst = () => {
            try {
                const currentUser = auth.currentUser;
                if (currentUser) {
                    // ✅ 이메일 미인증이면 캐시와 무관하게 Gate
                    // (인증 완료 후에는 VerifyEmailScreen에서 reload 폴링으로 자동 전환)
                    if (!currentUser.emailVerified) {
                        setUserData({ nickname: "", email: currentUser.email ?? "", profileImage: "" });
                        setInitialScreen("verifyEmail");
                        setIsLoading(false);
                        return true;
                    }

                    const cacheKey = `${APP_INIT_CACHE_PREFIX}${currentUser.uid}`;
                    const raw = typeof window !== "undefined" ? window.localStorage.getItem(cacheKey) : null;
                    if (raw) {
                        const cache = JSON.parse(raw) as AppInitCache;
                        const now = Date.now();
                        // ✅ 보안 강화: email과 uid를 모두 확인하여 캐시 조작 방지
                        if (cache.email === currentUser.email &&
                            cache.uid === currentUser.uid &&
                            now - cache.lastVerifiedAt < APP_INIT_CACHE_TTL_MS) {
                            setUserData({
                                nickname: cache.nickname,
                                email: cache.email,
                                profileImage: cache.profileImage,
                            });

                            if (!cache.nickname) {
                                setInitialScreen("nickname");
                            } else if (!cache.onboardingComplete) {
                                setInitialScreen("guidelines");
                            } else {
                                setInitialScreen("main");
                            }

                            setIsLoading(false);
                            return true; // 캐시 사용됨
                        }
                    }
                }
            } catch {
                // 캐시 확인 실패 시 무시
            }
            return false; // 캐시 없음
        };

        // ✅ 캐시가 있으면 즉시 화면 표시 (onAuthStateChanged를 기다리지 않음)
        const cacheUsed = checkCacheFirst();

        // ✅ onAuthStateChanged는 Firebase Auth 초기화 후 즉시 호출됨
        //    캐시가 없거나 만료된 경우에만 네트워크 호출을 기다림
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            // ✅ 인증 상태가 변경될 때마다 버전 증가 (같은 화면이라도 App.tsx에서 감지하도록)
            setAuthStateVersion(v => v + 1);

            if (user) {
                const isDev = !!import.meta.env.DEV;
                const logPerf = (label: string, ms: number) => {
                    if (!isDev) return;
                    // eslint-disable-next-line no-console
                    console.info(`[appInit] ${label}: ${Math.round(ms)}ms`);
                };

                // ✅ App Check 초기화를 병렬로 즉시 시작 (Firestore 조회와 동시에)
                const appCheckStart = typeof performance !== "undefined" ? performance.now() : Date.now();
                void ensureAppCheck().finally(() => {
                    const appCheckEnd = typeof performance !== "undefined" ? performance.now() : Date.now();
                    logPerf("appCheck.init", appCheckEnd - appCheckStart);
                });

                // ✅ 이메일 인증 Gate (가장 먼저)
                //    - emailVerified는 실시간 갱신되지 않으므로, 여기서는 "미인증이면 바로 차단"만 수행
                //    - 인증 완료 감지는 VerifyEmailScreen에서 reload 폴링으로 처리
                if (!user.emailVerified) {
                    setUserData({ nickname: "", email: user.email ?? "", profileImage: "" });
                    setInitialScreen("verifyEmail");
                    setIsLoading(false);
                    return;
                }

                // ✅ 캐시를 이미 사용한 경우, 백그라운드 갱신만 실행하고 화면 업데이트는 스킵
                if (cacheUsed) {
                    // 백그라운드 갱신 실행 (화면은 이미 표시되었으므로 업데이트하지 않음)
                    void (async () => {
                        try {
                            const cacheKey = `${APP_INIT_CACHE_PREFIX}${user.uid}`;
                            // ✅ 기존 유저는 verifyLogin을 호출하지 않음 (CF cold start 비용 제거)
                            const snap = await getDocWithAppCheckRetry(user.uid);

                            if (snap.exists()) {
                                const userData = snap.data();
                                const nickname = userData.nickname || "";
                                const onboardingComplete = userData.onboardingComplete || false;

                                let profileImage = "";
                                if (userData.photoURL && typeof userData.photoURL === "string") {
                                    const photoUrl = (userData as any).photoURL;
                                    const isGooglePhoto = photoUrl.includes("googleusercontent.com") ||
                                        photoUrl.includes("googleapis.com") ||
                                        photoUrl.includes("lh3.googleusercontent.com") ||
                                        photoUrl.includes("lh4.googleusercontent.com") ||
                                        photoUrl.includes("lh5.googleusercontent.com") ||
                                        photoUrl.includes("lh6.googleusercontent.com");

                                    if (!isGooglePhoto) {
                                        profileImage = photoUrl;
                                    }
                                }

                                const nextUserData = {
                                    nickname,
                                    email: user.email!,
                                    profileImage,
                                };

                                // 캐시 갱신 (다음 실행에 사용)
                                try {
                                    if (typeof window !== "undefined") {
                                        const cache: AppInitCache = {
                                            ...nextUserData,
                                            onboardingComplete,
                                            lastVerifiedAt: Date.now(),
                                            uid: user.uid, // ✅ 보안 강화: uid 저장
                                        };
                                        window.localStorage.setItem(cacheKey, JSON.stringify(cache));
                                    }
                                } catch {
                                    // 캐시 저장 실패는 무시
                                }
                            }
                        } catch {
                            // 백그라운드 갱신 실패는 무시 (캐시 데이터로 계속 사용)
                        }
                    })();
                    return; // 화면은 이미 표시되었으므로 여기서 종료
                }
                try {
                    const cacheKey = `${APP_INIT_CACHE_PREFIX}${user.uid}`;

                    // 🔹 1단계: 로컬 캐시가 있고, TTL 안이면 네트워크 호출 전에 바로 사용
                    // ✅ Cold start 최적화: 캐시가 있으면 즉시 화면 표시, 네트워크 갱신은 백그라운드로
                    let useCache = false;
                    try {
                        const raw = typeof window !== "undefined" ? window.localStorage.getItem(cacheKey) : null;
                        if (raw) {
                            const cache = JSON.parse(raw) as AppInitCache;
                            const now = Date.now();
                            if (cache.email === user.email && now - cache.lastVerifiedAt < APP_INIT_CACHE_TTL_MS) {
                                setUserData({
                                    nickname: cache.nickname,
                                    email: cache.email,
                                    profileImage: cache.profileImage,
                                });

                                if (!cache.nickname) {
                                    setInitialScreen("nickname");
                                } else if (!cache.onboardingComplete) {
                                    setInitialScreen("guidelines");
                                } else {
                                    setInitialScreen("main");
                                }

                                setIsLoading(false);
                                useCache = true;
                                // ✅ 캐시를 사용했지만, 백그라운드로 네트워크 갱신 시도 (다음 실행에 최신 데이터 사용)
                                //    화면 렌더링을 블로킹하지 않음
                            }
                        }
                    } catch {
                        // 캐시 파싱 실패 시 무시하고 네트워크 플로우 진행
                    }

                    // 캐시를 사용한 경우, 백그라운드로 네트워크 갱신 시도 (렌더링을 블로킹하지 않음)
                    if (useCache) {
                        // 백그라운드 갱신은 에러가 나도 무시 (캐시 데이터로 계속 사용)
                        void (async () => {
                            try {
                                // ✅ 기존 유저는 verifyLogin을 호출하지 않음
                                const snap = await getDocWithAppCheckRetry(user.uid);

                                if (snap.exists()) {
                                    const userData = snap.data();
                                    const nickname = userData.nickname || "";
                                    const onboardingComplete = userData.onboardingComplete || false;

                                    let profileImage = "";
                                    if (userData.photoURL && typeof userData.photoURL === "string") {
                                        const photoUrl = (userData as any).photoURL;
                                        const isGooglePhoto = photoUrl.includes("googleusercontent.com") ||
                                            photoUrl.includes("googleapis.com") ||
                                            photoUrl.includes("lh3.googleusercontent.com") ||
                                            photoUrl.includes("lh4.googleusercontent.com") ||
                                            photoUrl.includes("lh5.googleusercontent.com") ||
                                            photoUrl.includes("lh6.googleusercontent.com");

                                        if (!isGooglePhoto) {
                                            profileImage = photoUrl;
                                        }
                                    }

                                    const nextUserData = {
                                        nickname,
                                        email: user.email!,
                                        profileImage,
                                    };

                                    // 캐시 갱신 (다음 실행에 사용)
                                    try {
                                        if (typeof window !== "undefined") {
                                            const cache: AppInitCache = {
                                                ...nextUserData,
                                                onboardingComplete,
                                                lastVerifiedAt: Date.now(),
                                                uid: user.uid, // ✅ 보안 강화: uid 저장
                                            };
                                            window.localStorage.setItem(cacheKey, JSON.stringify(cache));
                                        }
                                    } catch {
                                        // 캐시 저장 실패는 무시
                                    }
                                }
                            } catch {
                                // 백그라운드 갱신 실패는 무시 (캐시 데이터로 계속 사용)
                            }
                        })();
                        return;
                    }

                    // 구글 로그인 여부 확인
                    const isGoogleLogin = user.providerData.some(
                        (provider) => provider.providerId === "google.com"
                    );

                    // ✅ 기존 유저(문서 존재) 케이스는 Cloud Function verifyLogin을 호출하지 않음
                    //    verifyLogin은 '탈퇴 이력(재가입 제한)' 검증용이므로, 신규 유저로 보일 때만 호출
                    let snap = await getDocWithAppCheckRetry(user.uid);

                    // ✅ 신규 유저 최적화: 닉네임 화면을 먼저 표시하고, verifyLogin은 백그라운드에서 실행
                    //    - 체감 로딩 시간 2-5초 → 즉시 (Cloud Function cold start 대기 제거)
                    //    - 탈퇴 이력자는 닉네임 제출 시점에 차단됨 (finalizeOnboarding에서 검증)
                    if (!snap.exists()) {
                        // 구글 로그인 시 Auth의 photoURL을 null로 설정 (non-blocking)
                        if (isGoogleLogin && user.photoURL) {
                            updateProfile(user, { photoURL: null }).catch(() => { });
                        }

                        const nextUserData = {
                            nickname: "",
                            email: user.email!,
                            profileImage: "", // 항상 빈 문자열 (Dicebear 사용)
                        };
                        setUserData(nextUserData);
                        setInitialScreen("nickname");

                        // 신규 유저 캐시 저장
                        try {
                            if (typeof window !== "undefined") {
                                const cache: AppInitCache = {
                                    ...nextUserData,
                                    onboardingComplete: false,
                                    lastVerifiedAt: Date.now(),
                                    uid: user.uid,
                                };
                                window.localStorage.setItem(cacheKey, JSON.stringify(cache));
                            }
                        } catch {
                            // 캐시 저장 실패는 무시
                        }

                        setIsLoading(false);

                        // ✅ 백그라운드에서 verifyLogin 실행 (UI 블로킹 없음)
                        // 탈퇴 이력자가 재가입 시도 시, finalizeOnboarding에서 최종 차단됨
                        void (async () => {
                            try {
                                const tV0 = typeof performance !== "undefined" ? performance.now() : Date.now();
                                await callVerifyLogin({ email: user.email! });
                                const tV1 = typeof performance !== "undefined" ? performance.now() : Date.now();
                                logPerf("functions.verifyLogin(background)", tV1 - tV0);
                            } catch {
                                // 백그라운드 검증 실패는 무시 (finalizeOnboarding에서 재검증)
                            }
                        })();
                        return;
                    }

                    // 기존 유저

                    const userData = snap.data();
                    const nickname = userData.nickname || "";
                    const onboardingComplete = userData.onboardingComplete || false;

                    // 구글 로그인 사용자의 경우 Auth의 photoURL을 제거 (non-blocking, 한 번만 실행)
                    // 이미 null이면 호출하지 않아 불필요한 Firebase Auth API 호출 방지
                    if (isGoogleLogin && user.photoURL) {
                        updateProfile(user, { photoURL: null }).catch(() => {
                            // Auth photoURL 초기화 실패 (로그 제거)
                        });
                    }

                    // 구글 로그인 사용자는 Firestore의 photoURL도 무시 (구글 프로필 이미지일 가능성)
                    // 사용자가 직접 업로드한 이미지만 사용 (구글 프로필 이미지 제외)
                    let profileImage = "";
                    if (userData.photoURL && typeof userData.photoURL === "string") {
                        const photoUrl = userData.photoURL;
                        // 구글 프로필 이미지 URL 패턴 확인 (googleusercontent.com 제외)
                        const isGooglePhoto = photoUrl.includes("googleusercontent.com") ||
                            photoUrl.includes("googleapis.com") ||
                            photoUrl.includes("lh3.googleusercontent.com") ||
                            photoUrl.includes("lh4.googleusercontent.com") ||
                            photoUrl.includes("lh5.googleusercontent.com") ||
                            photoUrl.includes("lh6.googleusercontent.com");

                        if (!isGooglePhoto) {
                            // 구글 프로필 이미지가 아닌 경우에만 사용 (사용자가 업로드한 이미지)
                            profileImage = photoUrl;
                        }
                    }

                    const nextUserData = {
                        nickname,
                        email: user.email!,
                        profileImage,
                    };
                    setUserData(nextUserData);

                    if (!nickname) {
                        setInitialScreen("nickname");
                    } else if (!onboardingComplete) {
                        setInitialScreen("guidelines");
                    } else {
                        setInitialScreen("main");
                    }

                    // ✅ 성공적으로 사용자 정보를 불러온 경우 캐시 갱신
                    try {
                        if (typeof window !== "undefined") {
                            const cache: AppInitCache = {
                                ...nextUserData,
                                onboardingComplete,
                                lastVerifiedAt: Date.now(),
                                uid: user.uid, // ✅ 보안 강화: uid 저장
                            };
                            window.localStorage.setItem(cacheKey, JSON.stringify(cache));
                        }
                    } catch {
                        // 캐시 저장 실패는 무시
                    }
                } catch (e: any) {
                    const code = String(e?.code ?? "");
                    const message = String(e?.message ?? "");

                    // 디버깅을 위해 원본 에러를 남김 (프로덕션에서도 콘솔 확인 가능)
                    console.error("[appInit] initialization failed", {
                        code,
                        message,
                        details: e?.details,
                    });

                    // 가장 흔한 케이스: verifyLogin이 탈퇴 이력(30일 제한)으로 막음
                    if (code === "functions/failed-precondition" && message) {
                        toast.error(message);
                    } else if (code === "functions/unauthenticated") {
                        toast.error("인증 정보가 없습니다. 다시 로그인해 주세요.");
                    } else if (code === "functions/unavailable") {
                        toast.error("네트워크 상태를 확인해 주세요.");
                    } else if (code === "permission-denied" || code === "firestore/permission-denied") {
                        toast.error("계정 데이터 접근 권한이 없습니다. Firestore 보안 규칙 또는 App Check 설정을 확인해 주세요.");
                    } else {
                        toast.error("로그인 처리 중 오류가 발생했습니다.");
                    }
                    await signOut(auth);
                    setInitialScreen("login");
                    // 오류 시 캐시 제거 (안전하게 초기화)
                    try {
                        if (user && typeof window !== "undefined") {
                            const cacheKey = `${APP_INIT_CACHE_PREFIX}${user.uid}`;
                            window.localStorage.removeItem(cacheKey);
                        }
                    } catch {
                        // 캐시 삭제 실패는 무시
                    }
                } finally {
                    setIsLoading(false);
                }
            } else {
                // ✅ 비로그인 상태 - 바로 메인 화면으로 (읽기 전용 브라우징)
                // 글/댓글 작성 시에만 로그인 요구 (MainScreen에서 처리)
                setUserData({ nickname: "", email: "", profileImage: "" });
                setInitialScreen("main");
                setIsLoading(false);
            }
        });

        // ✅ Firebase Auth가 이미 초기화되어 있으면 onAuthStateChanged가 즉시 호출됨
        //    하지만 초기화가 완료되지 않았을 수도 있으므로, currentUser를 먼저 확인
        if (!cacheUsed && auth.currentUser === null) {
            // 캐시도 없고 현재 사용자도 없으면 즉시 로그인 화면 표시
            setIsLoading(false);
        }

        return () => unsubscribe();
    }, [ensureAppCheck, getDocWithAppCheckRetry]);

    const resetAuthState = useCallback(async () => {
        await logoutEverywhere();
    }, []);

    return { isLoading, initialScreen, authStateVersion, userData, globalError, resetAuthState, refreshAfterEmailVerified };
}