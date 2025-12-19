import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { useAppInitialization } from "@/components/hooks/useAppInitialization";

// Screens
import { LoginScreen } from "@/components/LoginScreen";
import { NicknameScreen } from "@/components/NicknameScreen";
import { MainScreenRefactored as MainScreen } from '@/components/MainScreen/MainScreenRefactored';

// ... (Lazy loading import 등 나머지 부분은 동일하게 유지)
const CommunityGuidelinesScreen = lazy(() => import("./components/CommunityGuidelinesScreen").then(m => ({ default: m.CommunityGuidelinesScreen })));
const WelcomeScreen = lazy(() => import("./components/WelcomeScreen").then(m => ({ default: m.WelcomeScreen })));
const PrivacyPolicyScreen = lazy(() => import("./components/PrivacyPolicyScreen").then(m => ({ default: m.PrivacyPolicyScreen })));
const TermsOfServiceScreen = lazy(() => import("./components/TermsOfServiceScreen").then(m => ({ default: m.TermsOfServiceScreen })));
const OpenSourceLicensesScreen = lazy(() => import("./components/OpenSourceLicensesScreen").then(m => ({ default: m.OpenSourceLicensesScreen })));
const AttributionsScreen = lazy(() => import("./components/AttributionsScreen").then(m => ({ default: m.AttributionsScreen })));
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
  const [isDarkMode, setIsDarkMode] = useState(true);

  //  [해결책 1] 초기화가 완료되었는지 추적하는 Ref를 추가합니다.
  const isInitialized = useRef(false);

  //  [해결책 2] 초기 화면을 설정하는 useEffect 로직을 수정합니다.
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/b58ac113-7ceb-4460-8814-adf2be82318f', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:56', message: '화면 전환 useEffect 실행', data: { isLoading, isInitialized: isInitialized.current, currentScreen, initialScreen, shouldUpdate: !isLoading && (!isInitialized.current || currentScreen === "login" || initialScreen !== currentScreen) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'H' }) }).catch(() => { });
    // #endregion

    // 로딩 중이면 아무것도 하지 않음
    if (isLoading) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/b58ac113-7ceb-4460-8814-adf2be82318f', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:61', message: '로딩 중이므로 스킵', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'H' }) }).catch(() => { });
      // #endregion
      return;
    }

    // 화면 전환 조건:
    // 1. 초기화되지 않았거나
    // 2. 현재 로그인 화면이거나
    // 3. initialScreen이 현재 화면과 다를 때 (중요: 로그인 후 화면 전환을 위해)
    const shouldUpdate = !isInitialized.current ||
      currentScreen === "login" ||
      (initialScreen !== currentScreen && initialScreen !== "login");

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/b58ac113-7ceb-4460-8814-adf2be82318f', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:70', message: '화면 전환 조건 평가', data: { shouldUpdate, isInitialized: isInitialized.current, currentScreen, initialScreen }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'H' }) }).catch(() => { });
    // #endregion

    if (shouldUpdate) {
      console.log(`[App] 화면 동기화: '${currentScreen}' → '${initialScreen}'`);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/b58ac113-7ceb-4460-8814-adf2be82318f', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:75', message: '화면 전환 실행', data: { from: currentScreen, to: initialScreen }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'H' }) }).catch(() => { });
      // #endregion
      setCurrentScreen(initialScreen as AppScreen);
      setUserNickname(userData.nickname);
      setUserProfileImage(userData.profileImage);

      if (!isInitialized.current) {
        isInitialized.current = true;
      }
    } else {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/b58ac113-7ceb-4460-8814-adf2be82318f', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx:85', message: '화면 전환 스킵', data: { reason: '조건 불만족', currentScreen, initialScreen }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'H' }) }).catch(() => { });
      // #endregion
    }
  }, [
    isLoading,
    initialScreen,
    currentScreen,
    userData.nickname,
    userData.profileImage,
  ]);



  useEffect(() => {
    if (globalError) {
      toast.error(globalError);
    }
  }, [globalError]);

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

  const handleRestart = useCallback(async () => {
    isInitialized.current = false; // 재시작 시 초기화 플래그도 리셋
    await resetAuthState();
  }, [resetAuthState]);

  // ✨ [해결책 3] 이제 이 핸들러는 상태 덮어쓰기 걱정 없이 안전하게 동작합니다.
  const handleNicknameComplete = useCallback((nickname: string) => {
    console.log("[App] 닉네임 설정 완료. 가이드라인 화면으로 이동합니다.");
    setUserNickname(nickname);
    setCurrentScreen("guidelines");
  }, []);

  // 가이드라인 동의 완료 핸들러 (서버 호출 불필요)
  const handleGuidelinesComplete = useCallback(() => {
    console.log("[App] 가이드라인 동의 완료. 웰컴 화면으로 이동합니다.");
    setCurrentScreen("welcome");
  }, []);

  const handleProfileImageChange = useCallback((file: File) => {
    // ... (기존 코드와 동일)
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

  // ... (뒤로가기, 약관 화면 이동 등 나머지 로직은 동일하게 유지)
  const [legalBackTarget, setLegalBackTarget] = useState<AppScreen>("login");
  const [shouldOpenMyPageOnMain, setShouldOpenMyPageOnMain] = useState(false);
  const [shouldOpenSettingsOnMyPage, setShouldOpenSettingsOnMyPage] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const currentScreenRef = useRef<AppScreen>(currentScreen);
  useEffect(() => { currentScreenRef.current = currentScreen; }, [currentScreen]);
  const screenHistoryRef = useRef<AppScreen[]>([]);
  const isNavigatingBackRef = useRef(false);
  const previousScreenRef = useRef<AppScreen>("login");
  useEffect(() => { if (isNavigatingBackRef.current) { isNavigatingBackRef.current = false; previousScreenRef.current = currentScreen; return; } const prev = previousScreenRef.current; if (prev && prev !== currentScreen) { screenHistoryRef.current.push(prev); } previousScreenRef.current = currentScreen; }, [currentScreen]);
  useOnlineStatus();
  useEffect(() => { if (currentScreen === "main") return; let backListener: PluginListenerHandle; const setupListener = async () => { backListener = await CapacitorApp.addListener("backButton", () => { const screen = currentScreenRef.current; const history = screenHistoryRef.current; const prev = history.pop(); if (prev) { isNavigatingBackRef.current = true; setCurrentScreen(prev); return; } if (screen === "login" || screen === "welcome") { setShowExitConfirm(true); } else if (screen === "privacy" || screen === "terms") { setCurrentScreen(legalBackTarget); } else if (screen === "openSourceLicenses" || screen === "attributions") { setCurrentScreen("main"); } else if (screen === "nickname") { handleRestart(); } else if (screen === "guidelines") { setCurrentScreen("nickname"); } }); }; setupListener(); return () => { backListener?.remove(); }; }, [currentScreen, legalBackTarget, handleRestart]);
  // ... (여기까지 유지)

  // 초기 로딩 화면
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

  const ScreenFallback = () => (<div className="w-full h-screen flex items-center justify-center"> <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div> </div>);

  return (
    <div className={`w-full h-screen ${isDarkMode ? "dark bg-background text-foreground" : "bg-white text-gray-900"}`}>

      {currentScreen === "login" && (
        <LoginScreen
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

      {currentScreen === "main" && (<MainScreen userNickname={userNickname} userProfileImage={userProfileImage} onProfileImageChange={handleProfileImageChange} onLogout={handleRestart} isDarkMode={isDarkMode} onToggleDarkMode={toggleDarkMode} onRequestExit={() => setShowExitConfirm(true)} onShowTerms={() => { setLegalBackTarget("main"); setShouldOpenMyPageOnMain(true); setShouldOpenSettingsOnMyPage(true); setCurrentScreen("terms"); }} onShowPrivacy={() => { setLegalBackTarget("main"); setShouldOpenMyPageOnMain(true); setShouldOpenSettingsOnMyPage(true); setCurrentScreen("privacy"); }} onShowOpenSourceLicenses={() => { setShouldOpenMyPageOnMain(true); setShouldOpenSettingsOnMyPage(true); setCurrentScreen("openSourceLicenses"); }} onShowAttributions={() => { setShouldOpenMyPageOnMain(true); setShouldOpenSettingsOnMyPage(true); setCurrentScreen("attributions"); }} shouldOpenMyPageOnMain={shouldOpenMyPageOnMain} shouldOpenSettingsOnMyPage={shouldOpenSettingsOnMyPage} onMainScreenReady={() => setShouldOpenMyPageOnMain(false)} onSettingsOpenedFromMain={() => setShouldOpenSettingsOnMyPage(false)} />)}

      {/* ... (나머지 약관 화면 및 UI 컴포넌트는 기존과 동일) ... */}
      {currentScreen === "privacy" && (<Suspense fallback={<ScreenFallback />}><PrivacyPolicyScreen onBack={() => setCurrentScreen(legalBackTarget)} /></Suspense>)}
      {currentScreen === "terms" && (<Suspense fallback={<ScreenFallback />}><TermsOfServiceScreen onBack={() => setCurrentScreen(legalBackTarget)} /></Suspense>)}
      {currentScreen === "openSourceLicenses" && (<Suspense fallback={<ScreenFallback />}><OpenSourceLicensesScreen onBack={() => setCurrentScreen("main")} /></Suspense>)}
      {currentScreen === "attributions" && (<Suspense fallback={<ScreenFallback />}><AttributionsScreen onBack={() => setCurrentScreen("main")} /></Suspense>)}
      {currentScreen === "main" && (<Suspense fallback={null}><OfflineIndicator position="top" variant="toast" showReconnectButton={true} /></Suspense>)}
      <Toaster isDarkMode={isDarkMode} />
      <Suspense fallback={null}><AlertDialogSimple open={showExitConfirm} onOpenChange={setShowExitConfirm} title="앱 종료" description="비유노트를 종료하시겠습니까?" onConfirm={() => CapacitorApp.exitApp()} /></Suspense>
    </div>
  );
}
