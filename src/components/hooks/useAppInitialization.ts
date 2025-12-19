import { useState, useEffect, useCallback, useRef } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
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
        console.log("✅ [1] AppInit: 인증 상태 리스너 등록");

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/b58ac113-7ceb-4460-8814-adf2be82318f', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useAppInitialization.ts:42', message: 'onAuthStateChanged 트리거', data: { hasUser: !!user, uid: user?.uid, email: user?.email, cooldownActive: authStateCooldown.current }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
            // #endregion
            console.log("✅ [2] User 감지:", user?.uid);

            if (authStateCooldown.current) {
                console.log("🔁 Auth 쿨다운으로 인해 리스너 실행을 건너뜁니다.");
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/b58ac113-7ceb-4460-8814-adf2be82318f', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useAppInitialization.ts:46', message: '쿨다운으로 스킵', data: { uid: user?.uid }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
                // #endregion
                return;
            }

            if (user && user.email) {
                // 쿨다운 시작
                authStateCooldown.current = true;
                setTimeout(() => { authStateCooldown.current = false; }, 2000);
                // #region agent log
                fetch('http://127.0.0.1:7243/ingest/b58ac113-7ceb-4460-8814-adf2be82318f', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useAppInitialization.ts:52', message: '쿨다운 시작', data: { uid: user.uid }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
                // #endregion

                setGlobalError(null);
                try {
                    // 1. App Check 및 재가입 제한 확인
                    let isNewUser = false;
                    try {
                        const appCheck = getAppCheck();
                        if (appCheck) {
                            console.log("⏳ [Web] App Check 토큰 유효성 재확인 중...");
                            await getToken(appCheck, false);
                            console.log("✅ [Web] App Check 토큰 유효함.");
                        }

                        // ✨ [개선 1] 서버 검증을 호출하고 'isNewUser' 결과를 변수에 저장합니다.
                        // #region agent log
                        fetch('http://127.0.0.1:7243/ingest/b58ac113-7ceb-4460-8814-adf2be82318f', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useAppInitialization.ts:67', message: 'verifyLogin 호출 시작', data: { email: user.email, uid: user.uid }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
                        // #endregion
                        const { data } = await callVerifyLogin({ email: user.email });
                        isNewUser = data.isNewUser;
                        // #region agent log
                        fetch('http://127.0.0.1:7243/ingest/b58ac113-7ceb-4460-8814-adf2be82318f', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useAppInitialization.ts:70', message: 'verifyLogin 완료', data: { isNewUser, email: user.email }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
                        // #endregion
                        console.log(`✅ 서버 검증 통과. 신규 유저 여부: ${isNewUser}`);

                    } catch (e: any) {
                        if (e.code === 'functions/failed-precondition') {
                            toast.error(e.message || "재가입 대기 기간이 남아있어 로그인할 수 없습니다.");
                            console.warn("🚫 재가입 쿨타임으로 강제 로그아웃 처리합니다.", e);
                        } else {
                            toast.error("로그인 검증 중 오류가 발생했습니다.");
                            console.error("🚫 로그인 검증(AppCheck/재가입) 실패:", e);
                            // #region agent log
                            fetch('http://127.0.0.1:7243/ingest/b58ac113-7ceb-4460-8814-adf2be82318f', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useAppInitialization.ts:78', message: 'verifyLogin 에러 처리', data: { errorCode: e?.code, errorMessage: e?.message, uid: user?.uid }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'J' }) }).catch(() => { });
                            // #endregion
                        }
                        await signOut(auth);
                        setInitialScreen("login");
                        setIsLoading(false);
                        // #region agent log
                        fetch('http://127.0.0.1:7243/ingest/b58ac113-7ceb-4460-8814-adf2be82318f', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useAppInitialization.ts:85', message: '에러로 인한 로그아웃 및 로그인 화면으로 복귀', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'J' }) }).catch(() => { });
                        // #endregion
                        return;
                    }

                    // ✨ [개선 2] 서버에서 받은 isNewUser 값에 따라 로직을 분기합니다.
                    if (isNewUser) {
                        // 2-A. 신규 유저인 경우 (DB 조회 불필요)
                        console.log("🆕 신규 유저입니다. 닉네임 화면으로 바로 이동합니다.");
                        setUserData({
                            nickname: "", // 닉네임이 없으므로 비워둠
                            email: user.email || "",
                            profileImage: user.photoURL || ""
                        });
                        // #region agent log
                        fetch('http://127.0.0.1:7243/ingest/b58ac113-7ceb-4460-8814-adf2be82318f', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useAppInitialization.ts:94', message: '신규 유저 - initialScreen 설정', data: { screen: 'nickname', uid: user.uid }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'I' }) }).catch(() => { });
                        // #endregion
                        setInitialScreen("nickname");
                        // #region agent log
                        fetch('http://127.0.0.1:7243/ingest/b58ac113-7ceb-4460-8814-adf2be82318f', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useAppInitialization.ts:97', message: 'setInitialScreen 호출 완료 (신규)', data: { screen: 'nickname' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'I' }) }).catch(() => { });
                        // #endregion

                    } else {
                        // 2-B. 기존 유저인 경우에만 Firestore 문서를 조회합니다.
                        console.log("🤝 기존 유저입니다. Firestore 데이터 조회 중...");
                        const userDocRef = doc(db, "users", user.uid);
                        const snap = await getDoc(userDocRef);

                        if (!snap.exists()) {
                            // 이 경우는 서버와 클라이언트의 상태가 일치하지 않는 엣지 케이스입니다.
                            // (예: verifyLogin 실행 직후 DB에서 문서가 삭제된 경우)
                            // 안전하게 신규 유저처럼 처리합니다.
                            console.warn("⚠️ 서버는 기존 유저라 했지만 Firestore 문서가 없습니다. 신규 유저로 처리합니다.");
                            setInitialScreen("nickname");
                        } else {
                            const data = snap.data();
                            let dbNickname = data.nickname || "";
                            let onboardingComplete = data.onboardingComplete || false;

                            // 탈퇴 후 복귀한 유저 'Self-healing' 로직
                            if (data.isDeleted || dbNickname === "탈퇴한 사용자") {
                                console.log("♻️ [Self-Heal] 탈퇴 후 복귀한 유저입니다. 계정을 초기화합니다.");
                                dbNickname = "";
                                onboardingComplete = false;
                                await setDoc(userDocRef, {
                                    isDeleted: false,
                                    rejoinedAt: serverTimestamp(),
                                    onboardingComplete: false
                                }, { merge: true });
                            }

                            setUserData({
                                nickname: dbNickname,
                                email: user.email || "",
                                profileImage: user.photoURL || ""
                            });

                            // 최종 화면 결정
                            let finalScreen = "main";
                            if (!dbNickname) {
                                finalScreen = "nickname";
                            } else if (!onboardingComplete) {
                                finalScreen = "guidelines";
                            }
                            console.log("✅ 최종 화면 결정:", finalScreen);
                            // #region agent log
                            fetch('http://127.0.0.1:7243/ingest/b58ac113-7ceb-4460-8814-adf2be82318f', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useAppInitialization.ts:139', message: 'initialScreen 설정 (기존 유저)', data: { finalScreen, uid: user.uid, hasNickname: !!dbNickname, onboardingComplete }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'I' }) }).catch(() => { });
                            // #endregion
                            setInitialScreen(finalScreen);
                            // #region agent log
                            fetch('http://127.0.0.1:7243/ingest/b58ac113-7ceb-4460-8814-adf2be82318f', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'useAppInitialization.ts:142', message: 'setInitialScreen 호출 완료', data: { finalScreen }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'I' }) }).catch(() => { });
                            // #endregion
                        }
                    }
                } catch (err: any) {
                    // Firestore 조회 실패 등 기타 에러 처리
                    console.error("🔴 초기화 과정 중 심각한 에러 발생:", err);
                    const msg = "서버와 통신 중 오류가 발생했습니다. 앱을 다시 시작해주세요.";
                    setGlobalError(msg);
                    toast.error(msg);
                    await signOut(auth);
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