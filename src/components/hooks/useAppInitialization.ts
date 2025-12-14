import { useState, useEffect, useCallback, useRef } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore"; // setDoc, serverTimestamp 추가
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

// ... callCheckRejoinAllowed 함수는 그대로 유지 ...
async function callCheckRejoinAllowed(email: string): Promise<{ allowed: boolean; remainingDays: number }> {
    const checkRejoin = httpsCallable<{ email: string }, { allowed: boolean; remainingDays: number }>(
        functions,
        "checkRejoinAllowed"
    );
    const { data } = await checkRejoin({ email });
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
                    // 재가입 확인 로직 (기존 유지)
                    // ... (생략 가능하지만 안전을 위해 포함) ...
                    // const rejoinData = await callCheckRejoinAllowed(user.email);
                    // if (!rejoinData.allowed) { ... signOut ... return; }

                    console.log("✅ [5b] Firestore 데이터 조회 중...");
                    const userDocRef = doc(db, "users", user.uid);
                    const snap = await getDoc(userDocRef);

                    const authNickname = user.displayName;
                    const authPhoto = user.photoURL || "";

                    let dbNickname = "";
                    let onboardingComplete = false;

                    // [수정 핵심] Firestore 데이터 확인 및 자동 복구 로직
                    if (snap.exists()) {
                        const data = snap.data();
                        dbNickname = data.nickname || "";
                        onboardingComplete = data.onboardingComplete === true;

                        console.log("✅ [6] DB 데이터 확인:", { dbNickname, onboardingComplete });

                        // ⚠️ 예외 처리: 문서는 있는데 닉네임 필드만 없는 경우 -> Auth 정보로 채워넣음
                        if (!dbNickname && authNickname) {
                            console.log("🛠️ [Self-Heal] DB 닉네임 누락. Auth 프로필로 자동 복구합니다.");
                            dbNickname = authNickname;
                            // 비동기로 DB 업데이트 (화면 전환을 막지 않음)
                            setDoc(userDocRef, {
                                nickname: authNickname,
                                nicknameLower: authNickname.toLowerCase(),
                                updatedAt: serverTimestamp()
                            }, { merge: true });
                        }
                    } else if (authNickname) {
                        // ⚠️ 예외 처리: 문서는 없는데 구글 로그인으로 이름은 있는 경우 -> 신규 문서 생성
                        console.log("🛠️ [Self-Heal] 문서 없음. 구글 정보로 신규 생성합니다.");
                        dbNickname = authNickname;
                        await setDoc(userDocRef, {
                            nickname: authNickname,
                            nicknameLower: authNickname.toLowerCase(),
                            email: user.email,
                            photoURL: authPhoto,
                            createdAt: serverTimestamp(),
                            onboardingComplete: false // 약관 동의 등을 위해 false로 시작
                        }, { merge: true });
                    }

                    // 상태 업데이트
                    setUserData({
                        nickname: dbNickname,
                        email: user.email,
                        profileImage: authPhoto
                    });

                    // 화면 결정 로직
                    let finalScreen = "nickname"; // 기본값

                    if (dbNickname) {
                        if (onboardingComplete) {
                            finalScreen = "main";
                        } else {
                            // 닉네임은 있지만 온보딩(가이드라인/약관)을 안 봤다면
                            finalScreen = "guidelines";
                        }
                    }

                    console.log("✅ [7] 최종 화면 결정:", finalScreen);
                    setInitialScreen(finalScreen);

                } catch (err) {
                    console.error("🔴 초기화 에러:", err);
                    setGlobalError("초기화 중 오류가 발생했습니다.");
                    await signOut(auth);
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