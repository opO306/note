import { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase";
import { loginLog, loginError } from "@/utils/loginLogger";
interface UseAppInitializationReturn {
    isLoading: boolean;
    initialScreen: string | null; // null이면 아직 결정되지 않음
    userData: {
        nickname: string;
        email: string;
        profileImage: string;
    };
    globalError: string | null;
    resetAuthState: () => Promise<void>;
    isGuest: boolean; // 게스트 모드 여부 추가
}


const GUEST_USER_DATA = {
    nickname: "게스트 사용자",
    email: "", // 게스트는 이메일이 없음
    profileImage: "", // 게스트용 기본 프로필 이미지 URL (필요시 추후 업데이트)
};


export function useAppInitialization(options?: { enableGuestMode?: boolean }): UseAppInitializationReturn {
    const { enableGuestMode = false } = options || {};
    const [isLoading, setIsLoading] = useState(true);
    const [initialScreen, setInitialScreen] = useState<string | null>(null);
    const [userData, setUserData] = useState({ nickname: "", email: "", profileImage: "" });
    const [globalError] = useState<string | null>(null);
    const [isGuest, setIsGuest] = useState(false); // 게스트 모드 상태 추가

    useEffect(() => {
        loginLog("WAITING_AUTH");

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                loginLog("AUTH_USER_NULL");
                if (enableGuestMode) {
                    setUserData(GUEST_USER_DATA);
                    setIsGuest(true);
                    setInitialScreen("main");
                } else {
                    setUserData(GUEST_USER_DATA);
                    setInitialScreen("login");
                }
                setIsLoading(false);
                return;
            }

            loginLog("AUTH_OK", { uid: user.uid, email: user.email });

            try {
                loginLog("FIRESTORE_READ_START");
                const userDocRef = doc(db, "users", user.uid);
                const snap = await getDoc(userDocRef);

                // 신규 유저
                if (!snap.exists()) {
                    loginLog("NEW_USER");
                    setUserData({
                        nickname: "",
                        email: user.email ?? "",
                        profileImage: "",
                    });

                    setInitialScreen("nickname");
                    setIsLoading(false);
                    return;
                }

                // 기존 유저
                const data = snap.data();
                loginLog("USER_DOC_OK", {
                    nickname: data.nickname,
                    onboardingComplete: data.onboardingComplete,
                });
                const nickname = data.nickname ?? "";
                const onboardingComplete = data.onboardingComplete ?? false;

                let profileImage = "";
                if (typeof data.photoURL === "string") {
                    const isGooglePhoto =
                        data.photoURL.includes("googleusercontent.com") ||
                        data.photoURL.includes("googleapis.com");

                    if (!isGooglePhoto) {
                        profileImage = data.photoURL;
                    }
                }

                setUserData({
                    nickname,
                    email: user.email ?? "",
                    profileImage,
                });

                if (!nickname) {
                    setInitialScreen("nickname");
                } else if (!onboardingComplete) {
                    setInitialScreen("guidelines");
                } else {
                    setInitialScreen("main");
                }

                setIsLoading(false);
            } catch (err) {
                loginError(err, "POST_AUTH_ERROR");
                // ❗ 여기서 절대 signOut 하지 않는다
                // console.error("LOGIN POST-AUTH ERROR:", err); // 원본 에러 로깅은 loginError가 담당
                setInitialScreen("login");
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const resetAuthState = useCallback(async () => {
        setUserData({ nickname: "", email: "", profileImage: "" });
        setInitialScreen("login");
        setIsGuest(false); // ✅ 반드시
        setIsLoading(false);

        try {
            await signOut(auth);
        } catch (err) {
            console.error("Error signing out:", err);
        }
    }, []);

    return {
        isLoading,
        initialScreen,
        userData,
        globalError,
        resetAuthState,
        isGuest,
    };
}