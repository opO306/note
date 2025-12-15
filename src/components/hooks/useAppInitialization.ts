// src/components/hooks/useAppInitialization.ts

import { useState, useEffect, useCallback, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
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

// 재가입 제한 확인 함수 (클라우드 함수 호출)
async function callCheckRejoinAllowed(email: string): Promise<{ allowed: boolean; remainingDays: number }> {
    const checkRejoin = httpsCallable<{ email: string }, { allowed: boolean; remainingDays: number }>(
        functions,
        "checkRejoinAllowed"
    );
    // 에러 발생 시 여기서 catch하지 않고 밖으로 던져서 처리
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
                    // 🚨 [핵심 수정 1] 주석 해제 & 재가입 제한 확인 로직 적용
                    // LoginScreen뿐만 아니라 앱 진입점에서도 반드시 체크해야 뚫리지 않습니다.
                    try {
                        await callCheckRejoinAllowed(user.email);
                    } catch (e: any) {
                        // 쿨타임 중이면 강제 로그아웃
                        if (e.code === 'functions/failed-precondition') {
                            console.warn("🚫 재가입 쿨타임 중인 계정입니다. 로그아웃 처리합니다.");
                            await signOut(auth);
                            setInitialScreen("login");
                            // 에러 메시지는 LoginScreen에서 Toast로 보여줄 것이므로 여기선 조용히 리턴
                            setIsLoading(false);
                            return;
                        }
                        // 그 외 에러는 일단 진행 (서버 오류 등)
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

                        // 🚨 [핵심 수정 2] 탈퇴한 유저(isDeleted)인지 확인
                        // 쿨타임이 지나서 들어온 경우라면, 기존 '탈퇴한 사용자' 데이터를 덮어써야 합니다.
                        if (data.isDeleted) {
                            console.log("♻️ [Self-Heal] 탈퇴 후 복귀한 유저입니다. 계정을 초기화합니다.");
                            // 탈퇴 후 복귀 시: "탈퇴한 사용자"는 유효한 닉네임이 아니므로 닉네임 화면으로 보내기
                            const firestoreNickname = data.nickname || "";
                            if (firestoreNickname === "탈퇴한 사용자" || firestoreNickname.trim() === "") {
                                dbNickname = ""; // 닉네임 화면으로 보내기
                            } else {
                                dbNickname = firestoreNickname;
                            }
                            onboardingComplete = false; // 다시 온보딩 받도록 설정

                            // 유저 문서를 새 정보로 덮어쓰기 (isDeleted 플래그 제거)
                            await setDoc(userDocRef, {
                                nickname: data.nickname || "", // 기존 닉네임 유지, 없으면 빈 문자열
                                nicknameLower: (data.nickname || "").toLowerCase(),
                                email: user.email,
                                photoURL: authPhoto,
                                isDeleted: false, // 👈 중요: 탈퇴 상태 해제
                                rejoinedAt: serverTimestamp(),
                                onboardingComplete: false
                            }, { merge: true });
                        } else {
                            // 정상 유저 - Firestore의 닉네임만 사용 (Auth displayName 무시)
                            // "탈퇴한 사용자"는 유효한 닉네임이 아니므로 빈 문자열로 처리
                            const firestoreNickname = data.nickname || "";
                            if (firestoreNickname === "탈퇴한 사용자" || firestoreNickname.trim() === "") {
                                dbNickname = ""; // 닉네임 화면으로 보내기
                                onboardingComplete = false;
                            } else {
                                dbNickname = firestoreNickname;
                                onboardingComplete = data.onboardingComplete === true;
                            }
                        }

                        // 닉네임 누락 자동 복구 (Auth displayName이 있고 Firestore에 없을 때만)
                        if (!dbNickname && authNickname) {
                            // Auth에만 있고 Firestore에 없으면 닉네임 화면으로 보내기 위해 빈 문자열 유지
                            // 자동 복구는 하지 않음 (사용자가 직접 설정하도록)
                            console.log("⚠️ Firestore에 닉네임이 없지만 Auth에 displayName이 있습니다. 닉네임 화면으로 이동합니다.");
                        }
                    } else {
                        // 문서 없음 (신규) - Auth displayName이 있어도 무시하고 닉네임 화면으로 보내기
                        console.log("🆕 신규 유저 - Firestore 문서 없음. 닉네임 화면으로 이동합니다.");
                        dbNickname = ""; // 빈 문자열로 설정하여 닉네임 화면으로 이동
                    }

                    // 상태 업데이트
                    setUserData({
                        nickname: dbNickname,
                        email: user.email || "",
                        profileImage: authPhoto
                    });

                    // 화면 결정
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