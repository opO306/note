import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth"; // signInAnonymously 제거
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// 유저 데이터 타입 정의
export interface UserData {
  nickname: string;
  email: string;
  profileImage: string;
  onboardingComplete?: boolean;
  communityGuidelinesAgreed?: boolean;
  nicknameNeedsReview?: boolean;
}

interface AuthContextType {
  user: User | null;         // Firebase User 객체
  userData: UserData | null; // Firestore에서 가져온 추가 정보
  isLoading: boolean;        // 인증 체크 중인지 여부
  logout: () => Promise<void>; // 로그아웃 함수
  refreshUserData: () => Promise<void>; // 프로필 변경 시 데이터 갱신
  navigateToLogin: () => void; // 로그인 화면으로 이동 함수
  debugMessage: string; // 개발용 디버그 메시지
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children, navigateToLogin }: { children: React.ReactNode; navigateToLogin: () => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [debugMessage, setDebugMessage] = useState('');

  useEffect(() => {
    setDebugMessage(user?.uid || 'No User');
  }, [user]);


  // 헬퍼: 자동 닉네임 생성
  const makeFallbackNickname = useCallback((u: User): string => {
    const dn = (u.displayName ?? "").trim();
    if (dn) return dn.slice(0, 20);

    const emailLocal = (u.email ?? "").split("@")[0]?.trim();
    if (emailLocal) return emailLocal.slice(0, 20);

    return `user_${u.uid.slice(0, 6)}`;
  }, []);

  // ensureUserDoc: 문서 없으면 생성, nickname 없으면 채움 (merge)
  const ensureUserDoc = useCallback(async (firebaseUser: User) => {
    const ref = doc(db, "users", firebaseUser.uid);
    const snap = await getDoc(ref); // 문서 존재 여부 확인

    const base = {
      uid: firebaseUser.uid,
      email: firebaseUser.email ?? "",
      profileImage: firebaseUser.photoURL ?? "",
      updatedAt: serverTimestamp(),
    };

    if (!snap.exists()) {
      // 신규/레거시 누락: 문서 생성 + 자동 닉네임 세팅
      await setDoc(
        ref,
        {
          ...base,
          createdAt: serverTimestamp(),
          nickname: makeFallbackNickname(firebaseUser),
          nicknameNeedsReview: true, // 나중에 설정에서 바꾸게 유도용(선택)
        },
        { merge: true }
      );
      return;
    }

    const data = snap.data() as any;
    const nickname = String(data?.nickname ?? "").trim();

    if (!nickname) {
      // 기존 문서인데 nickname만 비어있음: nickname만 채워넣기(기존 필드 보존)
      await setDoc(
        ref,
        {
          ...base,
          nickname: makeFallbackNickname(firebaseUser),
          nicknameNeedsReview: true,
        },
        { merge: true }
      );
    } else {
      // nickname은 있으니 email/photo만 최신으로 유지(선택)
      await setDoc(ref, base, { merge: true });
    }
  }, [makeFallbackNickname]);


  // 사용자 정보 가져오기 (Firestore)
  const fetchUserData = useCallback(async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData({
          nickname: String(data.nickname ?? ""),
          email: String(data.email ?? ""),
          profileImage: String(data.profileImage ?? ""),
          onboardingComplete: Boolean(data.onboardingComplete),
          communityGuidelinesAgreed: Boolean(data.communityGuidelinesAgreed),
          nicknameNeedsReview: Boolean(data.nicknameNeedsReview),
        });
      } else {
        setUserData({ nickname: "", email: "", profileImage: "" });
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    }
  }, []);

  // 인증 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);

      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          await ensureUserDoc(firebaseUser);
          await fetchUserData(firebaseUser.uid);
        } else {
          setUser(null);
          setUserData(null);
        }
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchUserData, ensureUserDoc]);



  // 로그아웃 액션
  const logout = useCallback(async () => {
    try {
      await Promise.all([
        signOut(auth),
        GoogleAuth.signOut(), // Google 세션도 함께 종료
      ]);
      setUser(null);
      setUserData(null);
    } catch (error) {
      console.error("Logout failed", error);
    }
  }, []);

  const refreshUserData = useCallback(async () => {
    if (user) await fetchUserData(user.uid);
  }, [user, fetchUserData]);

  return (
    <AuthContext.Provider value={{ user, userData, isLoading, logout, refreshUserData, navigateToLogin, debugMessage }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
