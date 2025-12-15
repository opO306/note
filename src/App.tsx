import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { signOut } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "./firebase";
import { useAppInitialization } from "@/components/hooks/useAppInitialization";
import { completeOnboardingServer, setNicknameServer } from "@/core/userRepository";

// Screens - 동기 import
import { LoginScreen } from "@/components/LoginScreen";
import { NicknameScreen } from "@/components/NicknameScreen";
import { MainScreenRefactored as MainScreen } from '@/components/MainScreen/MainScreenRefactored';

// Screens - Lazy loading
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
  const {
    isLoading,
    initialScreen,
    userData,
    globalError,
    resetAuthState
  } = useAppInitialization();

  const [currentScreen, setCurrentScreen] = useState<AppScreen>("login");
  const [userNickname, setUserNickname] = useState("");
  const [userProfileImage, setUserProfileImage] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false); // 🔹 추가: 로그인 직후 로딩 강제

  const previousScreenRef = useRef<AppScreen>("login");
  const screenHistoryRef = useRef<AppScreen[]>([]);
  const isNavigatingBackRef = useRef(false);
  const isOnboardingRef = useRef(false);

  // 초기화 및 화면 전환 로직
  useEffect(() => {
    if (!isLoading && !isOnboardingRef.current) {
      setCurrentScreen(initialScreen as AppScreen);
      setUserNickname(userData.nickname);
      setUserProfileImage(userData.profileImage);
      // 화면이 전환되면 트랜지션 로딩 해제
      setIsTransitioning(false);
    }
  }, [isLoading, initialScreen, userData]);

  // 전역 오류 표시
  useEffect(() => {
    if (globalError) {
      toast.error(globalError);
      setIsTransitioning(false); // 에러 시 로딩 해제
    }
  }, [globalError]);

  const [legalBackTarget, setLegalBackTarget] = useState<AppScreen>("login");
  const [shouldOpenMyPageOnMain, setShouldOpenMyPageOnMain] = useState(false);
  const [shouldOpenSettingsOnMyPage, setShouldOpenSettingsOnMyPage] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const currentScreenRef = useRef<AppScreen>(currentScreen);
  useEffect(() => { currentScreenRef.current = currentScreen; }, [currentScreen]);

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

  useOnlineStatus();

  useEffect(() => {
    const savedDarkMode = localStorage.getItem("darkMode");
    const isDark = savedDarkMode !== null ? savedDarkMode === "true" : true;
    setIsDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const newVal = !prev;
      localStorage.setItem("darkMode", newVal.toString());
      document.documentElement.classList.toggle("dark", newVal);
      return newVal;
    });
  }, []);

  const handleRestart = useCallback(() => {
    setIsTransitioning(false);
    resetAuthState();
  }, [resetAuthState]);

  const handleNicknameComplete = useCallback(async (nickname: string) => {
    try {
      if (!auth.currentUser) throw new Error("NOT_AUTHENTICATED");

      const trimmed = nickname.trim();

      // 1) 로컬 상태 반영
      setUserNickname(trimmed);

      // 2) 서버(클라우드 함수)로 닉네임 저장 (이게 핵심)
      isOnboardingRef.current = true;
      await setNicknameServer(trimmed);

      // 3) 다음 화면으로 이동
      // 현재 앱 구조상: nickname -> guidelines -> welcome 흐름이 이미 깔려있습니다.
      setCurrentScreen("guidelines");

      setTimeout(() => {
        isOnboardingRef.current = false;
      }, 300);
    } catch (error: any) {
      console.error("[App] 닉네임 완료 처리 실패:", error);
      toast.error(error?.message || "닉네임 저장에 실패했습니다.");
      isOnboardingRef.current = false;
    }
  }, []);

  const handleGuidelinesComplete = useCallback(async () => {
    try {
      isOnboardingRef.current = true;
      await completeOnboardingServer();
      setCurrentScreen("welcome");
      setTimeout(() => {
        isOnboardingRef.current = false;
      }, 1000);
    } catch (error) {
      console.error("[App] 온보딩 완료 처리 실패:", error);
      toast.error("온보딩 완료 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
      isOnboardingRef.current = false;
    }
  }, []);

  const handleProfileImageChange = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const previewUrl = e.target?.result as string;
      if (previewUrl) setUserProfileImage(previewUrl);
    };
    reader.readAsDataURL(file);
    uploadAndUpdateProfileImage(file).then(finalUrl => {
      setUserProfileImage(finalUrl);
    }).catch(error => {
      console.error("프로필 이미지 업로드 실패:", error);
      toast.error("이미지 업로드에 실패했습니다.");
    });
  }, []);

  useEffect(() => {
    if (currentScreen === "main") return;
    let backListener: PluginListenerHandle;
    const setupListener = async () => {
      backListener = await CapacitorApp.addListener("backButton", () => {
        const screen = currentScreenRef.current;
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
          setCurrentScreen("main");
        } else if (screen === "nickname") {
          handleRestart();
        } else if (screen === "welcome") {
          setCurrentScreen("guidelines");
        }
      });
    };
    setupListener();
    return () => { backListener?.remove(); };
  }, [currentScreen, legalBackTarget, handleRestart]);

  // 🔹 로딩 화면: 초기화 로딩 또는 로그인 직후 화면 전환 대기 중일 때 표시
  if (isLoading || isTransitioning) {
    return (
      <div className={`w-full h-screen flex items-center justify-center ${isDarkMode ? "dark bg-background" : "bg-white"}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">
            {isTransitioning ? "로그인 확인 중..." : "로딩 중..."}
          </p>
        </div>
      </div>
    );
  }

  const ScreenFallback = () => (
    <div className="w-full h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className={`w-full h-screen ${isDarkMode ? "dark bg-background text-foreground" : "bg-white text-gray-900"}`}>

      {currentScreen === "login" && (
        <LoginScreen
          onShowTerms={() => { setLegalBackTarget("login"); setCurrentScreen("terms"); }}
          onShowPrivacy={() => { setLegalBackTarget("login"); setCurrentScreen("privacy"); }}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          onLoginSuccess={() => {
            console.log("🚀 [App] 로그인 성공 신호 받음 -> 리셋 실행");
            // 1. 로딩 화면 띄우기
            setIsTransitioning(true);

            // 2. 중요: 상태 훅이 반응하지 않을 경우를 대비해 
            // 강제로 인증 상태를 리셋하여 useAppInitialization이 다시 돌게 함
            setTimeout(() => {
              handleRestart(); // resetAuthState() 호출 -> 초기화 로직 재실행
            }, 100);
          }}
        />
      )}

      {currentScreen === "nickname" && (
        <NicknameScreen
          onBack={handleRestart}
          onComplete={handleNicknameComplete}
          userEmail={userData.email}
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
          shouldOpenMyPageOnMain={shouldOpenMyPageOnMain}
          shouldOpenSettingsOnMyPage={shouldOpenSettingsOnMyPage}
          onMainScreenReady={() => setShouldOpenMyPageOnMain(false)}
          onSettingsOpenedFromMain={() => setShouldOpenSettingsOnMyPage(false)}
        />
      )}

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