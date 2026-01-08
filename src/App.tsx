import React, { lazy, Suspense, useState, useEffect, useRef, useCallback } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import { PluginListenerHandle } from "@capacitor/core";
import { onAuthStateChanged } from "firebase/auth";
import { Loader2 } from "lucide-react";

const DEBUG_LOGIN = import.meta.env.VITE_DEBUG_LOGIN === "true";

import { initGoogleAuth } from "./lib/googleLogin";
import { auth } from "./firebase";

// Context
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// UI & Components
import { Toaster } from "./components/ui/sonner";
import { DelayedLoadingOverlay } from "./components/ui/delayed-loading-overlay";
import { OfflineIndicator } from "./components/ui/offline-indicator";
import "./styles/globals.css";

// Screens (Lazy)
const LoginScreen = lazy(() => import("@/components/LoginScreen").then(m => ({ default: m.LoginScreen })));
const NicknameScreen = lazy(() => import("@/components/NicknameScreen").then(m => ({ default: m.NicknameScreen })));
const MainScreen = lazy(() => import('@/components/MainScreen/MainScreenRefactored').then(m => ({ default: m.MainScreenRefactored })));
const CommunityGuidelinesScreen = lazy(() => import("./components/CommunityGuidelinesScreen").then(module => ({ default: module.CommunityGuidelinesScreen })));
const WelcomeScreen = lazy(() => import("./components/WelcomeScreen").then(m => ({ default: m.WelcomeScreen })));
const PrivacyPolicyScreen = lazy(() => import("./components/PrivacyPolicyScreen").then(m => ({ default: m.PrivacyPolicyScreen })));
const TermsOfServiceScreen = lazy(() => import("./components/TermsOfServiceScreen").then(m => ({ default: m.TermsOfServiceScreen })));
const OpenSourceLicensesScreen = lazy(() => import("./components/OpenSourceLicensesScreen").then(m => ({ default: m.OpenSourceLicensesScreen })));
const AttributionsScreen = lazy(() => import("./components/AttributionsScreen").then(m => ({ default: m.AttributionsScreen })));
const ThemeScreen = lazy(() => import("./components/ThemeScreen").then(m => ({ default: m.ThemeScreen })));

const AlertDialogSimple = lazy(() => import("./components/ui/alert-dialog-simple").then(m => ({ default: m.AlertDialogSimple })));


// 타입 정의 유지
type AppScreen = "login" | "nickname" | "guidelines" | "welcome" | "main" | "privacy" | "terms" | "openSourceLicenses" | "attributions" | "theme";

// ✅ 초기 로딩 UI
const InitialAppShellFallback = () => (
  <div className="w-full h-screen flex flex-col items-center justify-center bg-background text-foreground">
    <p className="text-xl font-bold text-primary animate-pulse">비유노트</p>
    <p className="mt-2 text-sm text-muted-foreground">앱을 불러오는 중...</p>
  </div>
);

// ✅ 메인 App 컴포넌트 내부 로직을 분리 (Context 사용을 위해)
function AppContent({ currentScreen, setCurrentScreen }: { currentScreen: AppScreen | null; setCurrentScreen: React.Dispatch<React.SetStateAction<AppScreen | null>> }) {
  const { user, userData, isGuest, isLoading, loginAsGuest, logout, debugMessage, refreshUserData } = useAuth();


  // 테마/UI 상태
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [lumenBalance, _setLumenBalance] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [legalBackTarget, setLegalBackTarget] = useState<AppScreen>("login");
  const [shouldOpenMyPageOnMain, setShouldOpenMyPageOnMain] = useState(false);
  const [shouldOpenSettingsOnMyPage, setShouldOpenSettingsOnMyPage] = useState(false);

  // 🔹 인증 상태 변화에 따른 자동 화면 라우팅
  useEffect(() => {
    console.log("🔄 App: 라우팅 useEffect 실행");
    console.log("   user:", user?.email || "null");
    console.log("   userData:", userData ? `nickname: ${userData.nickname}, agreed: ${userData.communityGuidelinesAgreed}, complete: ${userData.onboardingComplete}` : "null");
    console.log("   isGuest:", isGuest);
    console.log("   isLoading:", isLoading);
    console.log("   currentScreen:", currentScreen);

    if (isLoading) {
      console.log("⏳ App: isLoading=true이므로 라우팅 대기");
      return; // 로딩 중엔 대기
    }

    let nextScreen: AppScreen;

    if (isGuest && !user) {
      nextScreen = "main";
      console.log("🎯 App: 게스트 모드 → main 화면");
    } else if (!user) {
      nextScreen = "login";
      console.log("🎯 App: 로그인 필요 → login 화면");
    } else if (!userData?.nickname) {
      nextScreen = "nickname";
      console.log("🎯 App: 닉네임 설정 필요 → nickname 화면");
    } else if (!userData.communityGuidelinesAgreed) {
      nextScreen = "guidelines";
      console.log("🎯 App: 가이드라인 동의 필요 → guidelines 화면");
    } else if (!userData.onboardingComplete) {
      nextScreen = "welcome";
      console.log("🎯 App: 온보딩 필요 → welcome 화면");
    } else {
      nextScreen = "main";
      console.log("🎯 App: 모든 조건 충족 → main 화면");
    }

    console.log(`🔄 App: 화면 전환: ${currentScreen} → ${nextScreen}`);
    setCurrentScreen(nextScreen);
    if (nextScreen !== "login") {
      console.log("🔄 App: SplashScreen.hide() 호출");
      SplashScreen.hide();
    }
  }, [user, userData, isGuest, isLoading]);

  // 🔹 테마 초기화 로직 (기존 코드 유지 및 간소화)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTheme = localStorage.getItem("app-theme") || "default";
    const savedDark = localStorage.getItem("darkMode");
    const isDark = savedDark !== null ? savedDark === "true" : true;
    setIsDarkMode(isDark);

    document.documentElement.setAttribute("data-theme", savedTheme);
    if (savedTheme === "default") {
      document.documentElement.classList.toggle("dark", isDark);
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const n = !prev;
      localStorage.setItem("darkMode", n.toString());
      const theme = localStorage.getItem("app-theme") || "default";
      if (theme === "default") {
        document.documentElement.classList.toggle("dark", n);
      }
      return n;
    });
  }, []);

  // 🔹 핸들러 수정 (Reload 대신 Context 함수 사용)
  const handleGuestLogin = () => {
    loginAsGuest();
    // useEffect가 isGuest 변경을 감지하고 setCurrentScreen("main") 실행함
  };

  const handleLogout = async () => {
    await logout();
    // useEffect가 !user를 감지하고 setCurrentScreen("login") 실행함
  };

  // ... (뒤로가기 로직 등 기존 useEffect는 currentScreen 의존성 유지하며 그대로 사용) ...
  // (코드 길이상 생략: 기존 App.tsx의 backButton 리스너 로직 복사해서 여기에 넣으세요)
  const currentScreenRef = useRef<AppScreen | null>(currentScreen);
  useEffect(() => {
    if (currentScreen !== null) {
      currentScreenRef.current = currentScreen;
    }
  }, [currentScreen]);
  const screenHistoryRef = useRef<AppScreen[]>([]);
  const isNavigatingBackRef = useRef(false);
  const previousScreenRef = useRef<AppScreen>("login");

  useEffect(() => {
    if (currentScreen === null) return; // currentScreen이 null이면 처리하지 않음

    if (isNavigatingBackRef.current) {
      isNavigatingBackRef.current = false;
      previousScreenRef.current = currentScreen;
      return;
    }
    const prev = previousScreenRef.current;
    if (prev !== currentScreen) screenHistoryRef.current.push(prev);
    previousScreenRef.current = currentScreen;
  }, [currentScreen]);

  useEffect(() => {
    if (currentScreen === null || currentScreen === "main") return;

    let backListener: PluginListenerHandle;

    // async function 내부에 로직 두고
    async function setupListener() {
      backListener = await CapacitorApp.addListener("backButton", () => {
        const screen = currentScreenRef.current;
        if (screen === null) return; // screen이 null이면 처리하지 않음
        const history = screenHistoryRef.current;
        const prev = history.pop();
        if (prev) {
          isNavigatingBackRef.current = true;
          setCurrentScreen(prev);
          return;
        }

        if (screen === "login" || screen === "welcome") {
          setShowExitConfirm(true);
        } else if (screen === "privacy" || screen === "terms") {
          setCurrentScreen(legalBackTarget);
        } else if (screen === "openSourceLicenses" || screen === "attributions" || screen === "theme") {
          setCurrentScreen("main");
        } else if (screen === "nickname") {
          // handleRestart 대신 logout 호출
          logout();
        } else if (screen === "guidelines") {
          // 가이드라인 화면에서는 뒤로가기 차단
          return;
        }
      });
    }

    setupListener(); // Promise<void>이긴 하지만 useEffect 콜백 자체는 async 아님

    return () => {
      backListener?.remove();
    };
  }, [currentScreen, legalBackTarget, logout]);

  const ScreenLoadingFallback = () => <DelayedLoadingOverlay delay={200} variant="blur" />;

  // 렌더링
  if (isLoading || currentScreen === null) {
    return <InitialAppShellFallback />;
  }

  // 테마 클래스 처리
  const savedTheme = typeof window !== "undefined" ? localStorage.getItem("app-theme") || "default" : "default";
  const shouldApplyDark = savedTheme === "default" && isDarkMode;

  return (
    <div className={`w-full h-screen ${shouldApplyDark ? "dark" : ""} bg-background text-foreground`}>
      {DEBUG_LOGIN && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "rgba(0,0,0,0.7)",
            color: "#0f0",
            fontSize: 12,
            padding: 8,
            zIndex: 9999
          }}
        >
          LOGIN DEBUG: {debugMessage}
        </div>
      )}
      {/* 화면 렌더링 (기존 스위치 문과 유사) */}

      {currentScreen === "login" && (
        <Suspense fallback={<ScreenLoadingFallback />}>
          <LoginScreen
            onShowTerms={() => { setLegalBackTarget("login"); setCurrentScreen("terms"); }}
            onShowPrivacy={() => { setLegalBackTarget("login"); setCurrentScreen("privacy"); }}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
            onGuestLogin={handleGuestLogin} // ✅ 수정된 핸들러 전달
          />
        </Suspense>
      )}

      {currentScreen === "main" && (
        <>
          <Suspense fallback={<ScreenLoadingFallback />}>
            <MainScreen
              userNickname={userData?.nickname || "Guest"} // Context 데이터 사용
              userProfileImage={userData?.profileImage || ""}
              onProfileImageChange={() => { /* Context refreshUserData 호출 등으로 처리 */ }}
              onLogout={handleLogout} // ✅ 수정된 핸들러 전달
              isDarkMode={isDarkMode}
              onToggleDarkMode={toggleDarkMode}
              // ... 나머지 prop 그대로 전달
              onRequestExit={() => setShowExitConfirm(true)}
              onShowTerms={() => { setLegalBackTarget("main"); setShouldOpenMyPageOnMain(true); setShouldOpenSettingsOnMyPage(true); setCurrentScreen("terms"); }}
              onShowPrivacy={() => { setLegalBackTarget("main"); setShouldOpenMyPageOnMain(true); setShouldOpenSettingsOnMyPage(true); setCurrentScreen("privacy"); }}
              onShowOpenSourceLicenses={() => { setShouldOpenMyPageOnMain(true); setShouldOpenSettingsOnMyPage(true); setCurrentScreen("openSourceLicenses"); }}
              onShowAttributions={() => { setShouldOpenMyPageOnMain(true); setShouldOpenSettingsOnMyPage(true); setCurrentScreen("attributions"); }}
              onThemeClick={() => { setLegalBackTarget("main"); setCurrentScreen("theme"); }}
              shouldOpenMyPageOnMain={shouldOpenMyPageOnMain}
              shouldOpenSettingsOnMyPage={shouldOpenSettingsOnMyPage}
              onMainScreenReady={() => setShouldOpenMyPageOnMain(false)}
              onSettingsOpenedFromMain={() => setShouldOpenSettingsOnMyPage(false)}
              isGuest={isGuest}
            />
          </Suspense>
          <OfflineIndicator position="top" variant="toast" showReconnectButton />
        </>
      )}

      {/* ... 나머지 화면들 (Terms, Privacy, Welcome 등)은 기존과 동일하게 작성 ... */}
      {/* handleRestart 대신 handleLogout 사용 주의 */}
      {/* UserData 업데이트가 필요한 화면(Nickname 등)은 완료 후 refreshUserData() 호출 권장 */}
      {currentScreen === "nickname" && (
        <Suspense fallback={<ScreenLoadingFallback />}>
          <NicknameScreen
            onBack={handleLogout}
            onComplete={async (_nickname: string) => {
              console.log("🔄 닉네임 저장 완료, userData 갱신 시작");
              await refreshUserData(); // 닉네임 저장 후 사용자 데이터 갱신

              // ✅ userData가 실제로 갱신될 때까지 대기 (최대 2초)
              console.log("⏳ userData 갱신 대기 중...");
              let tries = 0;
              while ((!userData?.nickname || userData.nickname !== _nickname) && tries < 20) {
                await new Promise(res => setTimeout(res, 100));
                tries++;
                console.log(`🔄 userData 확인 시도 ${tries}/20:`, userData?.nickname);
              }

              if (userData?.nickname === _nickname) {
                console.log("✅ userData 갱신 확인됨, guidelines 화면으로 이동");
                setCurrentScreen("guidelines");
              } else {
                console.error("❌ userData 갱신 실패 또는 타임아웃");
                // 실패 시 다시 시도하거나 에러 처리
              }
            }}
            userEmail={userData?.email || ""}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
          />
        </Suspense>
      )}

      {currentScreen === "guidelines" && (
        <Suspense fallback={<ScreenLoadingFallback />}>
          <CommunityGuidelinesScreen
            onBack={() => setCurrentScreen("nickname")}
            onContinue={async () => {
              // TODO: 가이드라인 동의를 Firestore에 저장하는 로직이 필요할 경우 AuthContext의 refreshUserData를 활용하거나 별도 함수 구현
              setCurrentScreen("welcome");
            }}
            hideBackButton={true}
            disableBack={true}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
          />
        </Suspense>
      )}

      {currentScreen === "welcome" && (
        <Suspense fallback={<ScreenLoadingFallback />}>
          <WelcomeScreen
            nickname={userData?.nickname || ""}
            onRestart={handleLogout}
            onStartApp={async () => {
              // TODO: 온보딩 완료 플래그를 Firestore에 저장하는 로직이 필요할 경우 AuthContext의 refreshUserData를 활용하거나 별도 함수 구현
              setCurrentScreen("main");
            }}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
          />
        </Suspense>
      )}

      {currentScreen === "privacy" && (
        <Suspense fallback={<ScreenLoadingFallback />}>
          <PrivacyPolicyScreen onBack={() => setCurrentScreen(legalBackTarget)} />
        </Suspense>
      )}

      {currentScreen === "terms" && (
        <Suspense fallback={<ScreenLoadingFallback />}>
          <TermsOfServiceScreen onBack={() => setCurrentScreen(legalBackTarget)} />
        </Suspense>
      )}

      {currentScreen === "openSourceLicenses" && (
        <Suspense fallback={<ScreenLoadingFallback />}>
          <OpenSourceLicensesScreen onBack={() => setCurrentScreen("main")} />
        </Suspense>
      )}

      {currentScreen === "attributions" && (
        <Suspense fallback={<ScreenLoadingFallback />}>
          <AttributionsScreen onBack={() => setCurrentScreen("main")} />
        </Suspense>
      )}

      {currentScreen === "theme" && (
        <Suspense fallback={<ScreenLoadingFallback />}>
          <ThemeScreen
            onBack={() => setCurrentScreen(legalBackTarget)}
            isDarkMode={isDarkMode}
            onToggleDarkMode={toggleDarkMode}
            lumenBalance={lumenBalance}
          />
        </Suspense>
      )}

      <Toaster isDarkMode={isDarkMode} />

      <Suspense fallback={<div className="flex items-center justify-center p-4"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
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

// ✅ 메인 App: Provider로 감싸기
export default function App(): JSX.Element {
  const [currentScreen, setCurrentScreen] = useState<AppScreen | null>(null);
  const navigateToLogin = useCallback(() => {
    setCurrentScreen("login");
  }, [setCurrentScreen]);

  // ✅ App 시작 시 GoogleAuth 초기화
  useEffect(() => {
    initGoogleAuth();
  }, []);

  // ✅ Firebase 인증 상태 변화 감지
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      console.log('🔥 auth 상태 변경됨:', user);
      if (user) {
        // 로그인된 상태 → 메인으로
        // 이 부분은 AuthContext의 로직과 중복될 수 있으므로, AuthContext에서 처리하는 것이 좋습니다.
      } else {
        // 로그아웃 상태 → 로그인 화면
        // 이 부분도 AuthContext의 로직과 중복될 수 있으므로, AuthContext에서 처리하는 것이 좋습니다.
      }
    });

    return () => unsub();
  }, []);

  return (
    <AuthProvider navigateToLogin={navigateToLogin}>
      <AppContent currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
    </AuthProvider>
  );
}
