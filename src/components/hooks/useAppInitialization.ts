import { useState, useEffect, useCallback, useRef } from "react";
import { onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "@/firebase";
import { toast } from "@/toastHelper";

interface UseAppInitializationReturn {
    isLoading: boolean;
    initialScreen: string | null; // null이면 아직 결정되지 않음
    userData: {
        nickname: string;
        email: string;
        profileImage: string;
    };
    globalError: string | null;
    isGuest: boolean;
    resetAuthState: () => Promise<void>;
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
const APP_INIT_CACHE_TTL_MS = 60 * 60 * 1000; // 1시간

interface AppInitCache {
    nickname: string;
    email: string;
    profileImage: string;
    onboardingComplete: boolean;
    lastVerifiedAt: number;
    uid: string; // ✅ 보안 강화: uid도 함께 저장하여 검증
}

// ✅ 동기적으로 캐시를 확인하는 함수 (useState 초기값에서 사용)
// 주의: auth.currentUser가 아직 초기화되지 않았을 수 있으므로, 
// localStorage에서 직접 uid를 찾아서 확인하는 방식으로 변경
function checkCacheSynchronously(): { screen: string | null; userData: { nickname: string; email: string; profileImage: string }; uid: string } | null {
    try {
        // ✅ localStorage에서 가장 최근 캐시를 찾아서 사용
        // (auth.currentUser가 아직 초기화되지 않았을 수 있으므로)
        if (typeof window === "undefined") return null;

        // localStorage의 모든 키를 확인하여 캐시 찾기
        const cacheKeys: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key && key.startsWith(APP_INIT_CACHE_PREFIX)) {
                cacheKeys.push(key);
            }
        }

        // 가장 최근 캐시 찾기
        let latestCache: AppInitCache | null = null;
        let latestKey: string | null = null;
        let latestTime = 0;

        for (const key of cacheKeys) {
            try {
                const raw = window.localStorage.getItem(key);
                if (raw) {
                    const cache = JSON.parse(raw) as AppInitCache;
                    if (cache.lastVerifiedAt > latestTime) {
                        latestTime = cache.lastVerifiedAt;
                        latestCache = cache;
                        latestKey = key;
                    }
                }
            } catch {
                // 개별 캐시 파싱 실패는 무시
            }
        }

        if (latestCache && latestKey) {
            const now = Date.now();
            // TTL 확인
            if (now - latestCache.lastVerifiedAt < APP_INIT_CACHE_TTL_MS) {
                // auth.currentUser가 있으면 검증, 없으면 캐시 그대로 사용
                const currentUser = auth.currentUser;
                if (currentUser) {
                    // currentUser가 있으면 검증
                    if (latestCache.email === currentUser.email &&
                        latestCache.uid === currentUser.uid) {
                        let screen: string | null = null;
                        if (!latestCache.nickname) {
                            screen = "nickname";
                        } else if (!latestCache.onboardingComplete) {
                            screen = "guidelines";
                        } else {
                            screen = "main";
                        }
                        return {
                            screen,
                            userData: {
                                nickname: latestCache.nickname,
                                email: latestCache.email,
                                profileImage: latestCache.profileImage,
                            },
                            uid: latestCache.uid,
                        };
                    }
                } else {
                    // currentUser가 없어도 캐시가 유효하면 사용 (임시)
                    // onAuthStateChanged에서 재검증됨
                    let screen: string | null = null;
                    if (!latestCache.nickname) {
                        screen = "nickname";
                    } else if (!latestCache.onboardingComplete) {
                        screen = "guidelines";
                    } else {
                        screen = "main";
                    }
                    return {
                        screen,
                        userData: {
                            nickname: latestCache.nickname,
                            email: latestCache.email,
                            profileImage: latestCache.profileImage,
                        },
                        uid: latestCache.uid,
                    };
                }
            }
        }
    } catch {
        // 캐시 확인 실패 시 무시
    }
    return null;
}

export function useAppInitialization(): UseAppInitializationReturn {
    // ✅ 동기적으로 캐시를 확인하여 초기값 설정 (useState 초기값을 함수로 설정하여 한 번만 실행)
    const cacheResult = checkCacheSynchronously();
    const [isLoading, setIsLoading] = useState(() => {
        // ✅ 캐시가 있으면 즉시 로딩 완료, 없으면 onAuthStateChanged를 기다림
        return !cacheResult; // 캐시가 있으면 false, 없으면 true
    });
    const [initialScreen, setInitialScreen] = useState<string | null>(() => {
        // 캐시가 있으면 즉시 설정
        return cacheResult?.screen ?? null;
    });
    const [userData, setUserData] = useState(() => {
        return cacheResult?.userData ?? { nickname: "", email: "", profileImage: "" };
    });
    const [globalError] = useState<string | null>(null);
    const authStateCheckedRef = useRef(false); // onAuthStateChanged 호출 여부 추적

    useEffect(() => {
        // ✅ 초기 렌더링 시 캐시가 사용되었는지 확인
        const initialCacheResult = checkCacheSynchronously();
        if (initialCacheResult && initialScreen === initialCacheResult.screen) {
            // 캐시를 사용했지만, 백그라운드로 네트워크 갱신 시도
            const currentUser = auth.currentUser;
            if (currentUser) {
                void (async () => {
                    try {
                        const cacheKey = `${APP_INIT_CACHE_PREFIX}${currentUser.uid}`;
                        const userDocRef = doc(db, "users", currentUser.uid);
                        const [verifyResult, snap] = await Promise.all([
                            callVerifyLogin({ email: currentUser.email! }),
                            getDoc(userDocRef)
                        ]);

                        const { data } = verifyResult;
                        const { isNewUser } = data;

                        if (!isNewUser && snap.exists()) {
                            const userData = snap.data();
                            const nickname = userData.nickname || "";
                            const onboardingComplete = userData.onboardingComplete || false;

                            let profileImage = "";
                            if (userData.photoURL && typeof userData.photoURL === "string") {
                                const photoUrl = userData.photoURL;
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
                                email: currentUser.email!,
                                profileImage,
                            };

                            // 캐시 갱신 (다음 실행에 사용)
                            try {
                                if (typeof window !== "undefined") {
                                    const cache: AppInitCache = {
                                        ...nextUserData,
                                        onboardingComplete,
                                        lastVerifiedAt: Date.now(),
                                        uid: currentUser.uid,
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
            }
            return; // 캐시를 사용했으므로 여기서 종료
        }

        // ✅ 캐시가 없을 때만 onAuthStateChanged 처리
        const checkCacheFirst = () => {
            try {
                const currentUser = auth.currentUser;
                if (currentUser) {
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

                            // ✅ 캐시가 있으면 즉시 로딩 완료 (onAuthStateChanged를 기다리지 않음)
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
            authStateCheckedRef.current = true; // onAuthStateChanged가 호출되었음을 표시

            // ✅ 캐시가 이미 사용되었고 사용자가 있으면, 백그라운드 갱신만 실행하고 즉시 로딩 완료
            if (cacheUsed && user) {
                setIsLoading(false); // 캐시를 사용했으므로 즉시 로딩 완료
                // 백그라운드 갱신 실행 (화면은 이미 표시되었으므로 업데이트하지 않음)
                void (async () => {
                    try {
                        const cacheKey = `${APP_INIT_CACHE_PREFIX}${user.uid}`;
                        const userDocRef = doc(db, "users", user.uid);
                        const [verifyResult, snap] = await Promise.all([
                            callVerifyLogin({ email: user.email! }),
                            getDoc(userDocRef)
                        ]);

                        const { data } = verifyResult;
                        const { isNewUser } = data;

                        if (!isNewUser && snap.exists()) {
                            const userData = snap.data();
                            const nickname = userData.nickname || "";
                            const onboardingComplete = userData.onboardingComplete || false;

                            let profileImage = "";
                            if (userData.photoURL && typeof userData.photoURL === "string") {
                                const photoUrl = userData.photoURL;
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

            // ✅ 사용자가 있지만 캐시를 사용하지 않은 경우
            if (user) {
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
                                const userDocRef = doc(db, "users", user.uid);
                                const [verifyResult, snap] = await Promise.all([
                                    callVerifyLogin({ email: user.email! }),
                                    getDoc(userDocRef)
                                ]);

                                const { data } = verifyResult;
                                const { isNewUser } = data;

                                if (!isNewUser && snap.exists()) {
                                    const userData = snap.data();
                                    const nickname = userData.nickname || "";
                                    const onboardingComplete = userData.onboardingComplete || false;

                                    let profileImage = "";
                                    if (userData.photoURL && typeof userData.photoURL === "string") {
                                        const photoUrl = userData.photoURL;
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

                    // 🔹 성능 최적화: verifyLogin과 getDoc을 병렬로 실행
                    const userDocRef = doc(db, "users", user.uid);
                    const [verifyResult, snap] = await Promise.all([
                        callVerifyLogin({ email: user.email! }),
                        getDoc(userDocRef)
                    ]);

                    const { data } = verifyResult;
                    const { isNewUser } = data;

                    // 신규 유저 - 구글 프로필 이미지는 무시하고 Dicebear만 사용
                    if (isNewUser) {
                        // 구글 로그인 시 Auth의 photoURL을 null로 설정 (non-blocking, 한 번만 실행)
                        // 이미 null이면 호출하지 않아 불필요한 Firebase Auth API 호출 방지
                        if (isGoogleLogin && user.photoURL) {
                            updateProfile(user, { photoURL: null }).catch(() => {
                                // Auth photoURL 초기화 실패 (로그 제거)
                            });
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
                                    uid: user.uid, // ✅ 보안 강화: uid 저장
                                };
                                window.localStorage.setItem(cacheKey, JSON.stringify(cache));
                            }
                        } catch {
                            // 캐시 저장 실패는 무시
                        }
                        setIsLoading(false);
                        return;
                    }

                    // 기존 유저

                    if (!snap.exists()) {
                        // 구글 로그인 시 Auth의 photoURL을 null로 설정 (non-blocking, 한 번만 실행)
                        // 이미 null이면 호출하지 않아 불필요한 Firebase Auth API 호출 방지
                        if (isGoogleLogin && user.photoURL) {
                            updateProfile(user, { photoURL: null }).catch(() => {
                                // Auth photoURL 초기화 실패 (로그 제거)
                            });
                        }
                        const nextUserData = {
                            nickname: "",
                            email: user.email!,
                            profileImage: "", // 항상 빈 문자열 (Dicebear 사용)
                        };
                        setUserData(nextUserData);
                        setInitialScreen("nickname");
                        try {
                            if (typeof window !== "undefined") {
                                const cache: AppInitCache = {
                                    ...nextUserData,
                                    onboardingComplete: false,
                                    lastVerifiedAt: Date.now(),
                                    uid: user.uid, // ✅ 보안 강화: uid 저장
                                };
                                window.localStorage.setItem(cacheKey, JSON.stringify(cache));
                            }
                        } catch {
                            // 캐시 저장 실패는 무시
                        }
                    } else {
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
                    }
                } catch {
                    toast.error("로그인 처리 중 오류가 발생했습니다.");
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
                // ✅ 로그아웃 상태 - 즉시 로그인 화면 표시
                setUserData({ nickname: "", email: "", profileImage: "" });
                setInitialScreen("login");
                setIsLoading(false);
            }

            // ✅ onAuthStateChanged가 호출되면 항상 로딩 완료 (안전장치)
            // 위의 조건문에서 이미 setIsLoading(false)를 호출했지만, 혹시 모를 경우를 대비
            if (isLoading) {
                setIsLoading(false);
            }
        });

        // ✅ 안전장치: onAuthStateChanged가 5초 내에 호출되지 않으면 강제로 로딩 완료
        const timeoutId = setTimeout(() => {
            // onAuthStateChanged가 아직 호출되지 않았으면 강제로 로딩 완료
            if (!authStateCheckedRef.current) {
                setInitialScreen((prevScreen) => {
                    if (prevScreen === null) {
                        // 캐시가 없고 사용자도 없으면 로그인 화면
                        if (auth.currentUser === null) {
                            return "login";
                        }
                    }
                    return prevScreen;
                });
                setIsLoading(false);
            }
        }, 5000);

        return () => {
            clearTimeout(timeoutId);
            unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // initialScreen과 isLoading은 함수형 업데이트로 처리하므로 의존성 제외

    const resetAuthState = useCallback(async () => {
        await signOut(auth);
    }, []);

    return { isLoading, initialScreen, userData, globalError, resetAuthState };
}