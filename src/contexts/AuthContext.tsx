import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { signInGuestSafe } from "../auth/signInGuestSafe";
import { doc, getDoc } from "firebase/firestore";
import { AuthError } from "../authErrors";
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import * as Sentry from "@sentry/react";

// 유저 데이터 타입 정의
export interface UserData {
  nickname: string;
  email: string;
  profileImage: string;
  onboardingComplete?: boolean;
  communityGuidelinesAgreed?: boolean;
}

interface AuthContextType {
  user: User | null;         // Firebase User 객체
  userData: UserData | null; // Firestore에서 가져온 추가 정보
  isLoading: boolean;        // 인증 체크 중인지 여부
  isGuest: boolean;          // 게스트 모드 여부
  loginAsGuest: () => void;  // 게스트 로그인 함수
  logout: () => Promise<void>; // 로그아웃 함수
  refreshUserData: () => Promise<void>; // 프로필 변경 시 데이터 갱신
  navigateToLogin: () => void; // 로그인 화면으로 이동 함수
  debugMessage: string; // 개발용 디버그 메시지
  authError: AuthError | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children, navigateToLogin }: { children: React.ReactNode; navigateToLogin: () => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [debugMessage] = useState('');
  const [authError, setAuthError] = useState<AuthError | null>(null);

  // 로컬 스토리지 키
  const GUEST_KEY = "biyunote-guest-mode";

  // 사용자 정보 가져오기 (Firestore)
  const fetchUserData = useCallback(async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData({
          nickname: data.nickname || "",
          email: data.email || "",
          profileImage: data.profileImage || "",
          onboardingComplete: data.onboardingComplete,
          communityGuidelinesAgreed: data.communityGuidelinesAgreed,
        });
      } else {
        // 문서가 없으면 기본값 (신규 유저 등)
        setUserData({ nickname: "", email: "", profileImage: "" });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, []);

  // 인증 상태 감지
  useEffect(() => {
    console.log("🔄 AuthContext: 인증 상태 감지 useEffect 시작");

    // ✅ 1. Firebase Authentication 플러그인의 authStateChange 이벤트 리스너 추가
    const authStateChangeListener = FirebaseAuthentication.addListener('authStateChange', async (state) => {
      console.log("🔥 AuthContext: FirebaseAuthentication authStateChange:", state.user?.email || "로그아웃");

      if (state.user) {
        console.log("✅ AuthContext: 네이티브 인증 상태 변경 감지 - 로그인");
        // 네이티브에서 인증 상태가 변경되면 Firebase JS SDK에도 반영
        // Firebase JS SDK의 onAuthStateChanged가 이를 처리할 예정
      } else {
        console.log("✅ AuthContext: 네이티브 인증 상태 변경 감지 - 로그아웃");
      }
    });

    // ✅ 2. 이미 로그인된 상태 fallback
    const current = auth.currentUser;
    if (current) {
      console.log("🔄 AuthContext: 기존 로그인 사용자 발견:", current.email);
      setUser(current);
      setIsGuest(current.isAnonymous);
      fetchUserData(current.uid).finally(() => {
        console.log("✅ AuthContext: 기존 사용자 데이터 로드 완료");
        setIsLoading(false);
      });
    } else {
      console.log("🔄 AuthContext: 로그인된 사용자 없음, 로딩 상태 유지");
      // current가 없으면 일단 로딩 상태 유지
      setIsLoading(true);
    }

    // ✅ 3. Firebase JS SDK 상태 변화 구독
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("🔥 AuthContext: onAuthStateChanged 호출됨:", firebaseUser?.email || "로그아웃");

      if (firebaseUser) {
        console.log("✅ AuthContext: 사용자 로그인 감지, 상태 설정 시작");
        setUser(firebaseUser);
        const isAnon = firebaseUser.isAnonymous;
        setIsGuest(isAnon);

        if (!isAnon) {
          localStorage.removeItem(GUEST_KEY);
        } else {
          localStorage.setItem(GUEST_KEY, "true");
        }

        console.log("🔄 AuthContext: fetchUserData 호출");
        await fetchUserData(firebaseUser.uid);
        console.log("✅ AuthContext: 사용자 데이터 로드 완료");
      } else {
        console.log("🔄 AuthContext: 사용자 로그아웃 감지");
        setUser(null);
        setUserData(null);
        if (!localStorage.getItem(GUEST_KEY)) {
          setIsGuest(false);
        }
      }
      setIsLoading(false);
      console.log("✅ AuthContext: isLoading = false 설정됨");
    });

    return () => {
      unsubscribe();
      authStateChangeListener.remove();
    };
  }, [fetchUserData]);

  // 게스트 로그인 액션
  const loginAsGuest = useCallback(async () => {
    setIsLoading(true);
    setAuthError(null); // 새로운 시도 전에 에러 초기화
    try {
      await signInGuestSafe();
      // 상태 변경은 onAuthStateChanged가 처리
    } catch (error) {
      console.error("Guest login failed", error);
      if (error instanceof AuthError) {
        setAuthError(error);
        Sentry.captureException(error, {
          tags: {
            auth_reason: error.reason,
          },
        });
      } else {
        setAuthError(new AuthError("UNKNOWN", (error as Error).message));
      }
      setIsLoading(false);
      setIsGuest(false);
    }
  }, [setAuthError]);

  // 로그아웃 액션
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      localStorage.removeItem(GUEST_KEY);
      setUser(null);
      setUserData(null);
      setIsGuest(false);
      setAuthError(null); // 로그아웃 시 에러 상태 초기화
    } catch (error) {
      console.error("Logout failed", error);
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    if (user) await fetchUserData(user.uid);
  }, [user, fetchUserData]);

  return (
    <AuthContext.Provider value={{ user, userData, isLoading, isGuest, loginAsGuest, logout, refreshUserData, navigateToLogin, debugMessage, authError }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};


