import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { auth, db, functions } from "@/firebase";
import { toast } from "@/toastHelper";

interface UseAppInitializationReturn {
    isLoading: boolean;
    initialScreen: string;
    userData: {
        nickname: string;
        email: string;
        profileImage: string;
    };
    globalError: string | null;
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

export function useAppInitialization(): UseAppInitializationReturn {
    const [isLoading, setIsLoading] = useState(true);
    const [initialScreen, setInitialScreen] = useState("login");
    const [userData, setUserData] = useState({ nickname: "", email: "", profileImage: "" });
    const [globalError] = useState<string | null>(null);

    useEffect(() => {
        // ✅ Cold start 최적화: 로컬 캐시를 먼저 확인하여 즉시 화면 표시
        //    onAuthStateChanged가 호출되기 전에 캐시가 있으면 바로 화면을 보여줌
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
            if (user) {
                // ✅ 캐시를 이미 사용한 경우, 백그라운드 갱신만 실행하고 화면 업데이트는 스킵
                if (cacheUsed) {
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
                } catch (e: any) {
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
        });

        // ✅ Firebase Auth가 이미 초기화되어 있으면 onAuthStateChanged가 즉시 호출됨
        //    하지만 초기화가 완료되지 않았을 수도 있으므로, currentUser를 먼저 확인
        if (!cacheUsed && auth.currentUser === null) {
            // 캐시도 없고 현재 사용자도 없으면 즉시 로그인 화면 표시
            setIsLoading(false);
        }

        return () => unsubscribe();
    }, []);

    const resetAuthState = useCallback(async () => {
        await signOut(auth);
    }, []);

    return { isLoading, initialScreen, userData, globalError, resetAuthState };
}