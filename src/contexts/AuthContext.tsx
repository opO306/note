import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
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
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children, navigateToLogin }: { children: React.ReactNode; navigateToLogin: () => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
    const isGuestMode = localStorage.getItem(GUEST_KEY) === "true";
    
    // 게스트 모드라면 Firebase 체크 건너뛰기 가능 (혹은 병행)
    if (isGuestMode) {
      setIsGuest(true);
      setIsLoading(false);
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // 로그인 됨
        setUser(firebaseUser);
        setIsGuest(false); // 로그인하면 게스트 아님
        localStorage.removeItem(GUEST_KEY); // 게스트 모드 해제
        await fetchUserData(firebaseUser.uid);
      } else {
        // 로그아웃 됨
        setUser(null);
        setUserData(null);
        // 여기서 isGuest 상태는 유지 (게스트 모드 로그아웃은 별도 처리)
        if (!localStorage.getItem(GUEST_KEY)) {
            setIsGuest(false);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserData]);

  // 게스트 로그인 액션
  const loginAsGuest = () => {
    localStorage.setItem(GUEST_KEY, "true");
    setIsGuest(true);
    // 화면 전환을 위해 isLoading을 잠시 true로 뒀다 풀 수도 있음
  };

  // 로그아웃 액션
  const logout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem(GUEST_KEY);
      setUser(null);
      setUserData(null);
      setIsGuest(false);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const refreshUserData = async () => {
    if (user) await fetchUserData(user.uid);
  };

  return (
    <AuthContext.Provider value={{ user, userData, isLoading, isGuest, loginAsGuest, logout, refreshUserData, navigateToLogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};


