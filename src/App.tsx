import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { auth, functions } from "./firebase";
import { httpsCallable } from "firebase/functions";
import { useAppInitialization } from "@/components/hooks/useAppInitialization";

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
  // 🔹 useAppInitialization: 여기서 로딩 상태와 첫 화면을 결정합니다.
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

  // 🚨 [수정] isTransitioning (강제 로딩) 상태 삭제함!

  const previousScreenRef = useRef<AppScreen>("login");
  const screenHistoryRef = useRef<AppScreen[]>([]);
  const isNavigatingBackRef = useRef(false);
  const isOnboardingRef = useRef(false);

  // 1. 초기화 및 화면 전환 로직 (데이터가 로드되면 즉시 화면 바꿈)
  useEffect(() => {
    // 온보딩 진행 중일 때는 화면 강제 전환 막음
    if (!isLoading && !isOnboardingRef.current) {
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

  const [legalBackTarget, setLegalBackTarget] = useState<AppScreen>("login");
  const [shouldOpenMyPageOnMain, setShouldOpenMyPageOnMain] = useState(false);
  const [shouldOpenSettingsOnMyPage, setShouldOpenSettingsOnMyPage] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const currentScreenRef = useRef<AppScreen>(currentScreen);
  useEffect(() => { currentScreenRef.current = currentScreen; }, [currentScreen]);

  // 뒤로가기 히스토리 관리
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
    resetAuthState();
  }, [resetAuthState]);

  // 🔹 닉네임 설정 완료 핸들러
  const handleNicknameComplete = useCallback((nickname: string) => {
    // 1. 이미 서버 저장이 끝났으므로 로컬 상태만 업데이트
    setUserNickname(nickname);

    // 2. 깜빡임 방지용 플래그
    isOnboardingRef.current = true;

    // 3. 즉시 다음 화면으로 강제 이동
    setCurrentScreen("welcome");

    // 4. 안전장치 해제 타이머
    setTimeout(() => {
      isOnboardingRef.current = false;
    }, 2000);
  }, []);

  // 🔹 가이드라인 동의 완료 핸들러
  const handleGuidelinesComplete = useCallback(async () => {
    try {
      isOnboardingRef.current = true;

      // 서버 함수 호출 (가입 완료 처리)
      const finalizeFn = httpsCallable(functions, "finalizeOnboarding");
      await finalizeFn({ nickname: userNickname }); // 닉네임 재전송 (확실하게)

      setCurrentScreen("welcome");

      setTimeout(() => {
        isOnboardingRef.current = false;
      }, 1000);
    } catch (error) {
      console.error("[App] 가이드라인 완료 실패:", error);
      // 에러가 나도 일단 넘김
      setCurrentScreen("welcome");
    }
  }, [userNickname]);

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

  // 하드웨어 뒤로가기 버튼 처리
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

  // 🔹 로딩 화면 (초기 데이터 로딩 중일 때만 표시)
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
            console.log("✅ 로그인 성공! 상태 리셋으로 화면 갱신 유도");
            // 🚨 여기서 강제로 로딩을 띄우지 않습니다.
            // 대신 resetAuthState()를 호출하여 useAppInitialization 훅이
            // "어? 유저가 있네?" 하고 다시 데이터를 긁어오게 만듭니다.
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