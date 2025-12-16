import { useState, useEffect, useCallback, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { getToken } from "firebase/app-check";
// 🔹 [수정됨] 'appCheck' 대신 'getAppCheck' 함수를 import 합니다.
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

// 재가입 제한 확인 함수 (클라우드 함수 호출)
async function callCheckRejoinAllowed(email: string): Promise<{ allowed: boolean; remainingDays: number }> {
    // 🚨 [최종 수정] 호출하는 함수 이름을 'checkRejoinAllowed'에서 'verifyLogin'으로 변경합니다.
    const verifyLoginFn = httpsCallable<{ email: string }, { allowed: boolean; remainingDays: number }>(
        functions,
        "verifyLogin"
    );
    // 에러 발생 시 여기서 catch하지 않고 밖으로 던져서 처리
    const { data } = await verifyLoginFn({ email });
    return data;
}

export function useAppInitialization(): UseAppInitializationReturn {
    const [isLoading, setIsLoading] = useState(true);
    const [initialScreen, setInitialScreen] = useState("login");
    const [userData, setUserData] = useState({ nickname: "", email: "", profileImage: "" });
    const [globalError, setGlobalError] = useState<string | null>(null);

    const authStateCooldown = useRef(false);

    useEffect(() => {
        console.log("✅ [1] AppInit: 인증 상태 리스너 등록");

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            console.log("✅ [2] User 감지:", user?.uid);

            if (!user && authStateCooldown.current) {
                return;
            }

            if (user && user.email) {
                authStateCooldown.current = true;
                setTimeout(() => { authStateCooldown.current = false; }, 2000);

                setGlobalError(null);
                try {
                    try {
                        // 🔹 [수정됨] getAppCheck() 함수를 호출하여 appCheck 인스턴스를 가져옵니다.
                        const appCheck = getAppCheck();

                        // Capacitor 네이티브 플랫폼이 아닐 때 (즉, 웹일 때) App Check을 명시적으로 확인합니다.
                        if (appCheck) {
                            console.log("⏳ [Web] App Check 토큰 유효성 재확인 중...");
                            await getToken(appCheck, false);
                            console.log("✅ [Web] App Check 토큰 유효함.");
                        }

                        await callCheckRejoinAllowed(user.email);

                    } catch (e: any) {
                        if (e.code === 'functions/failed-precondition') {
                            console.warn("🚫 재가입 쿨타임 또는 App Check 실패로 강제 로그아웃 처리합니다.", e);
                            await signOut(auth);
                            setInitialScreen("login");
                            setIsLoading(false);
                            return;
                        }
                        console.error("재가입 확인 실패:", e);
                    }

                    console.log("✅ [5b] Firestore 데이터 조회 중...");
                    const userDocRef = doc(db, "users", user.uid);
                    const snap = await getDoc(userDocRef);

                    const authNickname = user.displayName || "";
                    const authPhoto = user.photoURL || "";

                    let dbNickname = "";
                    let onboardingComplete = false;

                    if (snap.exists()) {
                        const data = snap.data();

                        if (data.isDeleted) {
                            console.log("♻️ [Self-Heal] 탈퇴 후 복귀한 유저입니다. 계정을 초기화합니다.");
                            const firestoreNickname = data.nickname || "";
                            if (firestoreNickname === "탈퇴한 사용자" || firestoreNickname.trim() === "") {
                                dbNickname = "";
                            } else {
                                dbNickname = firestoreNickname;
                            }
                            onboardingComplete = false;

                            await setDoc(userDocRef, {
                                nickname: data.nickname || "",
                                nicknameLower: (data.nickname || "").toLowerCase(),
                                email: user.email,
                                photoURL: authPhoto,
                                isDeleted: false,
                                rejoinedAt: serverTimestamp(),
                                onboardingComplete: false
                            }, { merge: true });
                        } else {
                            const firestoreNickname = data.nickname || "";
                            if (firestoreNickname === "탈퇴한 사용자" || firestoreNickname.trim() === "") {
                                dbNickname = "";
                                onboardingComplete = false;
                            } else {
                                dbNickname = firestoreNickname;
                                onboardingComplete = data.onboardingComplete === true;
                            }
                        }

                        if (!dbNickname && authNickname) {
                            console.log("⚠️ Firestore에 닉네임이 없지만 Auth에 displayName이 있습니다. 닉네임 화면으로 이동합니다.");
                        }
                    } else {
                        console.log("🆕 신규 유저 - Firestore 문서 없음. 닉네임 화면으로 이동합니다.");
                        dbNickname = "";
                    }

                    setUserData({
                        nickname: dbNickname,
                        email: user.email || "",
                        profileImage: authPhoto
                    });

                    let finalScreen = "nickname";
                    if (dbNickname) {
                        if (onboardingComplete) {
                            finalScreen = "main";
                        } else {
                            finalScreen = "guidelines";
                        }
                    }

                    console.log("✅ [7] 최종 화면 결정:", finalScreen);
                    setInitialScreen(finalScreen);

                } catch (err: any) {
                    console.error("🔴 초기화 에러:", err);

                    const code = String(err?.code ?? "");
                    const message = String(err?.message ?? "");

                    const isPermissionDenied =
                        code === "permission-denied" ||
                        code === "firestore/permission-denied" ||
                        message.includes("Missing or insufficient permissions");

                    if (isPermissionDenied) {
                        const msg =
                            "서버 접근 권한이 막혀서 초기화에 실패했습니다. (App Check/Firestore 권한 문제)\n" +
                            "앱을 완전히 종료 후 다시 실행해주세요.";
                        setGlobalError(msg);
                        toast.error(msg);
                    } else {
                        setGlobalError("초기화 중 오류가 발생했습니다.");
                        toast.error("초기화 중 오류가 발생했습니다.");
                        await signOut(auth);
                    }
                } finally {
                    setIsLoading(false);
                }
            } else {
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