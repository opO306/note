import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { signOut } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "./firebase";
import { useAppInitialization } from "@/components/hooks/useAppInitialization"; // 🔹 로컬 스토리지 헬퍼 제거됨
import { completeOnboardingServer, setNicknameServer } from "@/core/userRepository";

// Screens - 동기 import (작은 스크린들)
import { LoginScreen } from "@/components/LoginScreen";
import { NicknameScreen } from "@/components/NicknameScreen";

// Screens - MainScreen은 항상 필요하므로 즉시 로딩
import { MainScreenRefactored as MainScreen } from '@/components/MainScreen/MainScreenRefactored';

// Screens - Lazy loading (큰 스크린들)
const CommunityGuidelinesScreen = lazy(() => import("./components/CommunityGuidelinesScreen").then(m => ({ default: m.CommunityGuidelinesScreen })));
const WelcomeScreen = lazy(() => import("./components/WelcomeScreen").then(m => ({ default: m.WelcomeScreen })));
const PrivacyPolicyScreen = lazy(() => import("./components/PrivacyPolicyScreen").then(m => ({ default: m.PrivacyPolicyScreen })));
const TermsOfServiceScreen = lazy(() => import("./components/TermsOfServiceScreen").then(m => ({ default: m.TermsOfServiceScreen })));
const OpenSourceLicensesScreen = lazy(() => import("./components/OpenSourceLicensesScreen").then(m => ({ default: m.OpenSourceLicensesScreen })));
const AttributionsScreen = lazy(() => import("./components/AttributionsScreen").then(m => ({ default: m.AttributionsScreen })));

// UI & Utils
import { Toaster } from "./components/ui/sonner";
const AlertDialogSimple = lazy(() => import("./components/ui/alert-dialog-simple").then(m => ({ default: m.AlertDialogSimple })));
const OfflineIndicator = lazy(() => import("./components/ui/offline-indicator").then(m => ({ default: m.OfflineIndicator })));

import { useOnlineStatus } from "./components/hooks/useOnlineStatus";
import "./styles/globals.css";
import { uploadAndUpdateProfileImage } from "./profileImageService";
import { toast } from "./toastHelper";
import type { User } from "firebase/auth";

type AppScreen =
  | "login"
  | "nickname"
  | "guidelines"
  | "welcome"
  | "main"
  | "privacy"
  | "terms"
  | "openSourceLicenses"
  | "attributions";

export default function App() {
  // 🔹 커스텀 훅 사용: 인증 및 초기화 로직 위임
  const {
    isLoading,
    initialScreen,
    userData,
    globalError,
    resetAuthState
  } = useAppInitialization();

  // 화면 상태
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("login");
  const [userNickname, setUserNickname] = useState("");
  const [userProfileImage, setUserProfileImage] = useState("");
  const previousScreenRef = useRef<AppScreen>("login");
  const screenHistoryRef = useRef<AppScreen[]>([]);
  const isNavigatingBackRef = useRef(false);

  // 훅에서 가져온 초기 데이터 반영
  useEffect(() => {
    if (!isLoading) {
      setCurrentScreen(initialScreen as AppScreen);
      setUserNickname(userData.nickname);
      setUserProfileImage(userData.profileImage);
    }
  }, [isLoading, initialScreen, userData]);

  // 전역 오류 표시
  useEffect(() => {
    if (globalError) {
      toast.error(globalError);
    }
  }, [globalError]);

  // 기타 UI 상태
  const [legalBackTarget, setLegalBackTarget] = useState<AppScreen>("login");
  const [shouldOpenMyPageOnMain, setShouldOpenMyPageOnMain] = useState(false);
  const [shouldOpenSettingsOnMyPage, setShouldOpenSettingsOnMyPage] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Ref for BackButton Handler
  const currentScreenRef = useRef<AppScreen>(currentScreen);
  useEffect(() => { currentScreenRef.current = currentScreen; }, [currentScreen]);

  // 화면 이동 이력 관리: 뒤로가기는 스택 역순으로 처리
  useEffect(() => {
    if (isNavigatingBackRef.current) {
      isNavigatingBackRef.current = false;
      previousScreenRef.current = currentScreen;
      return;
    }
    const prev = previousScreenRef.current;
    if (prev && prev !== currentScreen) {
      screenHistoryRef.current.push(prev);
    }
    previousScreenRef.current = currentScreen;
  }, [currentScreen]);

  // Online Status & Dark Mode
  useOnlineStatus();

  useEffect(() => {
    // 다크모드 초기화 (단순 설정값은 localStorage 사용해도 무방)
    const savedDarkMode = localStorage.getItem("darkMode");
    const isDark = savedDarkMode !== null ? savedDarkMode === "true" : true;
    setIsDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  // ==========================================
  // 📍 핸들러 함수들
  // ==========================================

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const newVal = !prev;
      localStorage.setItem("darkMode", newVal.toString());
      document.documentElement.classList.toggle("dark", newVal);
      return newVal;
    });
  }, []);

  // App.tsx
  const handleRestart = useCallback(() => {
    resetAuthState();
  }, [resetAuthState]);

  // App.tsx 내부

  const handleNicknameComplete = useCallback(async (nickname: string) => {
    try {
      if (!auth.currentUser) throw new Error("NOT_AUTHENTICATED");

      // 1. 서버(Firestore)에 저장
      // (NicknameScreen에서 이미 저장했으므로, 여기서는 중복 호출일 수 있지만 안전하게 둡니다)
      // 만약 NicknameScreen에서 다 했다면 이 줄은 주석 처리해도 됩니다.
      // await setNicknameServer(nickname); 

      // 2. 로컬 상태 즉시 반영
      setUserNickname(nickname);

      // 3. 바로 다음 화면으로 이동
      // "guidelines" (가이드라인) 또는 바로 "main" (메인)
      setCurrentScreen("main");

    } catch (error) {
      console.error("[App] 닉네임 완료 처리 실패:", error);
      toast.error("오류가 발생했습니다.");
    }
  }, []);

  const handleGuidelinesComplete = useCallback(async () => {
    try {
      await completeOnboardingServer();
      setCurrentScreen("welcome");
    } catch (error) {
      console.error("[App] 온보딩 완료 처리 실패:", error);
      toast.error("온보딩 완료 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  }, []);

  // 프로필 이미지 변경 (즉시 반영 + 서버 업로드)
  const handleProfileImageChange = useCallback((file: File) => {
    // 1. 즉시 미리보기 (로컬 상태에만 반영하고 localStorage에는 저장 X)
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewUrl = e.target?.result as string;
      if (previewUrl) {
        setUserProfileImage(previewUrl);
        // ⚠️ Base64는 너무 길어서 localStorage 용량을 초과할 수 있으므로 저장하지 않음
      }
    };
    reader.readAsDataURL(file);

    // 2. 백그라운드 업로드 후 최종 URL만 저장
    uploadAndUpdateProfileImage(file).then(finalUrl => {
      setUserProfileImage(finalUrl);
      try {
        localStorage.setItem("userProfileImage", finalUrl);
      } catch (storageError) {
        console.warn("프로필 이미지 URL을 localStorage에 저장하지 못했습니다:", storageError);
      }
    }).catch(error => {
      console.error("프로필 이미지 업로드 실패:", error);
      toast.error("이미지 업로드에 실패했습니다.");
      // 실패 시 원래 이미지로 되돌리거나, 재시도 안내가 필요할 수 있음
      // 여기선 현재 상태 유지 (미리보기 상태로 남을 수 있음 -> 새로고침하면 복구됨)
    });
  }, []);

  // ==========================================
  // 📍 뒤로가기 로직 (간소화됨)
  // ==========================================
  useEffect(() => {
    if (currentScreen === "main") return; // MainScreen 내부에서 처리

    let backListener: PluginListenerHandle;
    const setupListener = async () => {
      backListener = await CapacitorApp.addListener("backButton", () => {
        const screen = currentScreenRef.current;

        // 1순위: 스택 기반 역순 이동
        const history = screenHistoryRef.current;
        const prev = history.pop();
        if (prev) {
          isNavigatingBackRef.current = true;
          setCurrentScreen(prev);
          return;
        }

        if (screen === "login" || screen === "guidelines") {
          setShowExitConfirm(true);
        } else if (screen === "privacy" || screen === "terms") {
          setCurrentScreen(legalBackTarget);
        } else if (screen === "openSourceLicenses" || screen === "attributions") {
          // 오픈소스/저작권 안내는 하드웨어 뒤로가기를 눌러도 메인으로 복귀
          setCurrentScreen("main");
        } else if (screen === "nickname") {
          handleRestart(); // 로그아웃 처리
        } else if (screen === "welcome") {
          setCurrentScreen("guidelines");
        }
      });
    };
    setupListener();
    return () => { backListener?.remove(); };
  }, [currentScreen, legalBackTarget, handleRestart]);


  // ==========================================
  // 📍 렌더링
  // ==========================================
  if (isLoading) {
    return (
      <div className={`w-full h-screen flex items-center justify-center ${isDarkMode ? "dark bg-background" : "bg-white"}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 로딩 폴백 컴포넌트
  const ScreenFallback = () => (
    <div className="w-full h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className={`w-full h-screen ${isDarkMode ? "dark bg-background text-foreground" : "bg-white text-gray-900"}`}>

      {currentScreen === "login" && (
        <LoginScreen
          //onGoogleLogin={handleGoogleLogin}
          onShowTerms={() => { setLegalBackTarget("login"); setCurrentScreen("terms"); }}
          onShowPrivacy={() => { setLegalBackTarget("login"); setCurrentScreen("privacy"); }}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
        />
      )}

      {currentScreen === "nickname" && (
        <NicknameScreen
          onBack={handleRestart}
          onComplete={handleNicknameComplete}
          userEmail={userData.email} // 훅에서 가져온 이메일
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
        />
      )}

      {currentScreen === "guidelines" && (
        <Suspense fallback={<ScreenFallback />}>
          <CommunityGuidelinesScreen
            onBack={() => setCurrentScreen("nickname")}
            onContinue={handleGuidelinesComplete}
            hideBackButton={true}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
          />
        </Suspense>
      )}

      {currentScreen === "welcome" && (
        <Suspense fallback={<ScreenFallback />}>
          <WelcomeScreen
            nickname={userNickname}
            onRestart={handleRestart}
            onStartApp={() => setCurrentScreen("main")}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
          />
        </Suspense>
      )}

      {currentScreen === "main" && (
        <MainScreen
          userNickname={userNickname}
          userProfileImage={userProfileImage}
          onProfileImageChange={handleProfileImageChange}
          onLogout={handleRestart}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          onRequestExit={() => setShowExitConfirm(true)}

          // 약관/정책 화면 이동
          onShowTerms={() => {
            setLegalBackTarget("main");
            setShouldOpenMyPageOnMain(true);
            setShouldOpenSettingsOnMyPage(true);
            setCurrentScreen("terms");
          }}
          onShowPrivacy={() => {
            setLegalBackTarget("main");
            setShouldOpenMyPageOnMain(true);
            setShouldOpenSettingsOnMyPage(true);
            setCurrentScreen("privacy");
          }}
          onShowOpenSourceLicenses={() => {
            setShouldOpenMyPageOnMain(true);
            setShouldOpenSettingsOnMyPage(true);
            setCurrentScreen("openSourceLicenses");
          }}
          onShowAttributions={() => {
            setShouldOpenMyPageOnMain(true);
            setShouldOpenSettingsOnMyPage(true);
            setCurrentScreen("attributions");
          }}

          // 상태 전달
          shouldOpenMyPageOnMain={shouldOpenMyPageOnMain}
          shouldOpenSettingsOnMyPage={shouldOpenSettingsOnMyPage}
          onMainScreenReady={() => setShouldOpenMyPageOnMain(false)}
          onSettingsOpenedFromMain={() => setShouldOpenSettingsOnMyPage(false)}
        />
      )}

      {/* 약관 및 정보 화면들 */}
      {currentScreen === "privacy" && (
        <Suspense fallback={<ScreenFallback />}>
          <PrivacyPolicyScreen onBack={() => setCurrentScreen(legalBackTarget)} />
        </Suspense>
      )}
      {currentScreen === "terms" && (
        <Suspense fallback={<ScreenFallback />}>
          <TermsOfServiceScreen onBack={() => setCurrentScreen(legalBackTarget)} />
        </Suspense>
      )}
      {currentScreen === "openSourceLicenses" && (
        <Suspense fallback={<ScreenFallback />}>
          <OpenSourceLicensesScreen onBack={() => setCurrentScreen("main")} />
        </Suspense>
      )}
      {currentScreen === "attributions" && (
        <Suspense fallback={<ScreenFallback />}>
          <AttributionsScreen onBack={() => setCurrentScreen("main")} />
        </Suspense>
      )}

      {/* 오프라인 표시 */}
      {currentScreen === "main" && (
        <Suspense fallback={null}>
          <OfflineIndicator position="top" variant="toast" showReconnectButton={true} />
        </Suspense>
      )}

      <Toaster isDarkMode={isDarkMode} />

      <Suspense fallback={null}>
        <AlertDialogSimple
          open={showExitConfirm}
          onOpenChange={setShowExitConfirm}
          title="앱 종료"
          description="비유노트를 종료하시겠습니까?"
          onConfirm={() => CapacitorApp.exitApp()}
        />
      </Suspense>
    </div>
  );
}