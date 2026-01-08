import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut, User, signInAnonymously } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

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
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children, navigateToLogin }: { children: React.ReactNode; navigateToLogin: () => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [debugMessage] = useState('');

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // 로그인 됨 (익명 또는 일반)
        setUser(firebaseUser);
        // 실제 Firebase User 객체의 isAnonymous 속성 사용
        const isAnon = firebaseUser.isAnonymous;
        setIsGuest(isAnon);
        if (!isAnon) {
          // 익명 사용자가 아니라면 게스트 모드 해제
          localStorage.removeItem(GUEST_KEY);
        } else {
          // 익명 사용자라면 게스트 모드 유지 (또는 설정)
          localStorage.setItem(GUEST_KEY, "true");
        }
        await fetchUserData(firebaseUser.uid);
      } else {
        // 로그아웃 됨
        setUser(null);
        setUserData(null);
        // 게스트 플래그가 로컬 스토리지에 없으면 게스트 모드도 해제
        if (!localStorage.getItem(GUEST_KEY)) {
          setIsGuest(false);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserData]);

  // 게스트 로그인 액션
  const loginAsGuest = useCallback(async () => {
    setIsLoading(true);
    try {
      // Firebase 익명 인증으로 로그인
      const userCredential = await signInAnonymously(auth);
      // 익명 사용자는 isGuest를 true로 설정
      setIsGuest(true);
      // 로컬 스토리지에 게스트 모드 플래그 설정
      localStorage.setItem(GUEST_KEY, "true");
      setUser(userCredential.user); // Firebase User 객체 설정
      setUserData(null); // 게스트는 초기 사용자 데이터 없음
      // setIsLoading(false)는 onAuthStateChanged에서 처리
    } catch (error) {
      console.error("Guest login failed", error);
      setIsLoading(false);
      setIsGuest(false);
    }
  }, []);

  // 로그아웃 액션
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      localStorage.removeItem(GUEST_KEY);
      setUser(null);
      setUserData(null);
      setIsGuest(false);
    } catch (error) {
      console.error("Logout failed", error);
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    if (user) await fetchUserData(user.uid);
  }, [user, fetchUserData]);

  return (
    <AuthContext.Provider value={{ user, userData, isLoading, isGuest, loginAsGuest, logout, refreshUserData, navigateToLogin, debugMessage }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};


