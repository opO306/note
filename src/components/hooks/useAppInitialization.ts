import { useState, useEffect, useCallback, useRef } from "react";
import { onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getToken } from "firebase/app-check";
import { auth, db, functions, getAppCheck } from "@/firebase";
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

// 🚨 [수정 1] 함수 이름과 타입을 실제 Cloud Function('verifyLogin')과 일치시킵니다.
// 서버는 { success: boolean, isNewUser: boolean }를 반환합니다.
const callVerifyLogin = httpsCallable<
    { email: string },
    { success: boolean; isNewUser: boolean }
>(functions, "verifyLogin");


export function useAppInitialization(): UseAppInitializationReturn {
    const [isLoading, setIsLoading] = useState(true);
    const [initialScreen, setInitialScreen] = useState("login");
    const [userData, setUserData] = useState({ nickname: "", email: "", profileImage: "" });
    const [globalError, setGlobalError] = useState<string | null>(null);

    // 연속적인 인증 상태 변경을 방지하기 위한 쿨다운 Ref
    const authStateCooldown = useRef(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
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
                        setUserData({
                            nickname: "",
                            email: user.email!,
                            profileImage: "", // 항상 빈 문자열 (Dicebear 사용)
                        });
                        setInitialScreen("nickname");
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
                        setUserData({
                            nickname: "",
                            email: user.email!,
                            profileImage: "", // 항상 빈 문자열 (Dicebear 사용)
                        });
                        setInitialScreen("nickname");
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

                        setUserData({
                            nickname,
                            email: user.email!,
                            profileImage,
                        });

                        if (!nickname) {
                            setInitialScreen("nickname");
                        } else if (!onboardingComplete) {
                            setInitialScreen("guidelines");
                        } else {
                            setInitialScreen("main");
                        }
                    }
                } catch (e: any) {
                    toast.error("로그인 처리 중 오류가 발생했습니다.");
                    await signOut(auth);
                    setInitialScreen("login");
                } finally {
                    setIsLoading(false);
                }
            } else {
                // 로그아웃 상태
                setUserData({ nickname: "", email: "", profileImage: "" });
                setInitialScreen("login");
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const resetAuthState = useCallback(async () => {
        await signOut(auth);
    }, []);

    return { isLoading, initialScreen, userData, globalError, resetAuthState };
}