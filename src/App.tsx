import { lazy, Suspense } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { useState, useEffect, useCallback, useRef } from "react";

// Analytics
import {
  initAnalytics,
  trackAppOpen,
  trackScreenView,
  trackOnboardingStep,
  trackLogout,
  setAnalyticsUserId,
} from "@/utils/analytics";

// Firebase
import { auth, db } from "./firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

// App init hook
import { useAppInitialization } from "./components/hooks/useAppInitialization";

// Screens
import { LoginScreen } from "@/components/LoginScreen";
import { EmailLoginScreen } from "@/components/EmailLoginScreen";
import { EmailSignupScreen } from "@/components/EmailSignupScreen";
import { NicknameScreen } from "@/components/NicknameScreen";
import { VerifyEmailScreen } from "@/components/VerifyEmailScreen";
import { MainScreenRefactored as MainScreen } from '@/components/MainScreen/MainScreenRefactored';

const CommunityGuidelinesScreen = lazy(() => import("./components/CommunityGuidelinesScreen").then(module => ({ default: module.CommunityGuidelinesScreen })));
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
  | "emailLogin"
  | "emailSignup"
  | "verifyEmail"
  | "nickname"
  | "guidelines"
  | "welcome"
  | "main"
  | "privacy"
  | "terms"
  | "openSourceLicenses"
  | "attributions";

interface UserData {
  nickname: string;
  email: string;
  profileImage: string;
}

export default function App() {
  const {
    isLoading,
    initialScreen,
    authStateVersion,
    userData: initUserData,
    globalError,
    resetAuthState,
    refreshAfterEmailVerified
  } = useAppInitialization();

  // 화면 전환
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("login");

  // App 내부 로컬 상태
  const [userNickname, setUserNickname] = useState(initUserData.nickname);
  const [userProfileImage, setUserProfileImage] = useState(initUserData.profileImage);
  const [, setLocalUserData] = useState<UserData>({
    nickname: initUserData.nickname,
    email: initUserData.email,
    profileImage: initUserData.profileImage,
  });

  // ✅ 11번: 시스템 다크모드 설정을 따르도록 변경 (사용자 선호 존중)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved !== null) return saved === "true";
    // 시스템 설정 따르기
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
  });
  const isInitialized = useRef(false);

  // ✅ 로그인 진행 상태 (Optimistic UI용)
  const [isLoginInProgress, setIsLoginInProgress] = useState(false);

  // ✅ Analytics 초기화 (앱 시작 시 한 번)
  useEffect(() => {
    initAnalytics();
    trackAppOpen();
  }, []);

  // initialScreen 따라 화면 이동
  // ✅ authStateVersion을 의존성에 추가하여 로그인 후 같은 화면이라도 강제 업데이트
  useEffect(() => {
    if (isLoading) return;
    setCurrentScreen(initialScreen as AppScreen);
    // ✅ 화면 전환 시 로그인 진행 상태 리셋
    setIsLoginInProgress(false);
  }, [initialScreen, isLoading, authStateVersion]);

  // ✅ Gate: 이메일 미인증이면 메인 진입 차단
  useEffect(() => {
    if (currentScreen !== "main") return;
    const user = auth.currentUser;
    if (user && !user.emailVerified) {
      setCurrentScreen("verifyEmail");
    }
  }, [currentScreen]);

  // ✅ 화면 전환 시 Analytics 이벤트 전송
  useEffect(() => {
    if (isLoading) return;
    trackScreenView(currentScreen);

    // 사용자 ID 설정 (로그인된 경우)
    const user = auth.currentUser;
    if (user) {
      setAnalyticsUserId(user.uid);
    }
  }, [currentScreen, isLoading]);

  // initUserData가 변경될 때마다 로컬 상태 업데이트 (새로고침 시 사용자 데이터 동기화)
  useEffect(() => {
    if (!isLoading && initUserData.nickname) {
      setUserNickname(initUserData.nickname);
      setUserProfileImage(initUserData.profileImage);
      setLocalUserData({
        nickname: initUserData.nickname,
        email: initUserData.email,
        profileImage: initUserData.profileImage,
      });
    }
  }, [initUserData, isLoading]);

  // 오류 토스트
  useEffect(() => {
    if (globalError) toast.error(globalError);
  }, [globalError]);

  // 다크모드 유지 (초기 상태는 useState에서 설정됨)
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prev => {
      const n = !prev;
      localStorage.setItem("darkMode", n.toString());
      document.documentElement.classList.toggle("dark", n);
      return n;
    });
  }, []);

  const handleRestart = useCallback(async () => {
    isInitialized.current = false;
    trackLogout();
    setAnalyticsUserId(null);
    await resetAuthState();
  }, [resetAuthState]);

  // 닉네임 저장 + 다음 화면 이동
  // NicknameScreen에서 Firestore에 닉네임을 저장하므로
  // 여기서는 로컬 상태만 업데이트하고 화면 전환만 합니다.
  const handleNicknameComplete = useCallback(async (nickname: string) => {
    setUserNickname(nickname);
    setLocalUserData(prev => ({ ...prev, nickname }));
    trackOnboardingStep("nickname");
    setCurrentScreen("guidelines");
  }, []);

  // 가이드라인 완료 → 웰컴
  const handleGuidelinesComplete = useCallback(async () => {
    // 가이드라인 동의를 Firestore에 저장
    try {
      const user = auth.currentUser;
      if (user) {
        await setDoc(
          doc(db, "users", user.uid),
          {
            communityGuidelinesAgreed: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
    } catch (err) {
      // 가이드라인 동의 저장 실패 (로그 제거)
    }
    trackOnboardingStep("guidelines");
    setCurrentScreen("welcome");
  }, []);

  // 프로필 이미지 변경
  const handleProfileImageChange = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const url = e.target?.result as string;
      if (url) setUserProfileImage(url);
    };
    reader.readAsDataURL(file);

    uploadAndUpdateProfileImage(file)
      .then(finalUrl => setUserProfileImage(finalUrl))
      .catch(() => {
        toast.error("이미지 업로드에 실패했습니다.");
      });
  }, []);

  // 뒤로가기, history 처리
  const [legalBackTarget, setLegalBackTarget] = useState<AppScreen>("login");
  const [shouldOpenMyPageOnMain, setShouldOpenMyPageOnMain] = useState(false);
  const [shouldOpenSettingsOnMyPage, setShouldOpenSettingsOnMyPage] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showLoginConfirm, setShowLoginConfirm] = useState(false);
  const currentScreenRef = useRef<AppScreen>(currentScreen);
  useEffect(() => { currentScreenRef.current = currentScreen; }, [currentScreen]);
  const screenHistoryRef = useRef<AppScreen[]>([]);
  const isNavigatingBackRef = useRef(false);
  const previousScreenRef = useRef<AppScreen>("login");

  useEffect(() => {
    if (isNavigatingBackRef.current) {
      isNavigatingBackRef.current = false;
      previousScreenRef.current = currentScreen;
      return;
    }
    const prev = previousScreenRef.current;
    if (prev !== currentScreen) screenHistoryRef.current.push(prev);
    previousScreenRef.current = currentScreen;
  }, [currentScreen]);

  useOnlineStatus();

  useEffect(() => {
    if (currentScreen === "main") return;

    let backListener: PluginListenerHandle;

    // async function 내부에 로직 두고
    async function setupListener() {
      backListener = await CapacitorApp.addListener("backButton", () => {
        const screen = currentScreenRef.current;
        const history = screenHistoryRef.current;
        const prev = history.pop();
        if (prev) {
          isNavigatingBackRef.current = true;
          setCurrentScreen(prev);
          return;
        }

        if (screen === "login" || screen === "welcome") {
          setShowExitConfirm(true);
        } else if (screen === "verifyEmail") {
          // 이메일 인증 완료 전에는 뒤로가기 차단 (우회 진입 방지)
          return;
        } else if (screen === "privacy" || screen === "terms") {
          setCurrentScreen(legalBackTarget);
        } else if (screen === "openSourceLicenses" || screen === "attributions") {
          setCurrentScreen("main");
        } else if (screen === "nickname") {
          handleRestart();
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
  }, [currentScreen, legalBackTarget, handleRestart]);

  // ✅ Cold start 최적화: isLoading이어도 기본 셸 UI를 먼저 표시
  //    다른 앱들처럼 즉시 화면을 보여주고, 인증 상태 확인은 백그라운드로 진행
  //    이렇게 하면 사용자가 "앱이 켜졌다"는 것을 즉시 느낄 수 있음

  const ScreenFallback = () => (
    <div className="w-full h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className={`w-full h-screen ${isDarkMode ? "dark bg-background text-foreground" : "bg-white text-gray-900"}`}>
      {/* ✅ 로딩 중이거나 초기 화면이 login일 때는 즉시 로그인 화면 표시 */}
      {(isLoading || currentScreen === "login") && (
        <LoginScreen
          onShowTerms={() => { setLegalBackTarget("login"); setCurrentScreen("terms"); }}
          onShowPrivacy={() => { setLegalBackTarget("login"); setCurrentScreen("privacy"); }}
          onShowEmailLogin={() => setCurrentScreen("emailLogin")}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          onLoginStart={() => setIsLoginInProgress(true)}
          onLoginEnd={() => setIsLoginInProgress(false)}
        />
      )}

      {/* ✅ 로그인 진행 중 로딩 오버레이 (빠른 피드백) */}
      {isLoginInProgress && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <p className="text-sm text-muted-foreground">로그인 중...</p>
          </div>
        </div>
      )}

      {/* 로딩이 완료되고 login이 아닐 때만 다른 화면 표시 */}
      {!isLoading && currentScreen !== "login" && (
        <>

          {currentScreen === "emailLogin" && (
            <EmailLoginScreen
              onBack={() => setCurrentScreen("login")}
              onShowSignup={() => setCurrentScreen("emailSignup")}
            />
          )}

          {currentScreen === "emailSignup" && (
            <EmailSignupScreen onBack={() => setCurrentScreen("emailLogin")} />
          )}

          {currentScreen === "verifyEmail" && (
            <VerifyEmailScreen
              onLogout={handleRestart}
              onVerified={() => void refreshAfterEmailVerified()}
            />
          )}

          {currentScreen === "nickname" && (
            <NicknameScreen
              onBack={handleRestart}
              onComplete={handleNicknameComplete}
              userEmail={initUserData.email}
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
                disableBack={true}
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
                onStartApp={async () => {
                  // 온보딩 완료 플래그를 true로 설정하여 새로고침 시 main 화면으로 이동하도록 함
                  try {
                    const user = auth.currentUser;
                    if (user) {
                      await setDoc(
                        doc(db, "users", user.uid),
                        {
                          onboardingComplete: true,
                          updatedAt: serverTimestamp(),
                        },
                        { merge: true }
                      );
                    }
                  } catch (err) {
                    // 온보딩 완료 플래그 저장 실패 (로그 제거)
                  }
                  setCurrentScreen("main");
                }}
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
              onShowTerms={() => { setLegalBackTarget("main"); setShouldOpenMyPageOnMain(true); setShouldOpenSettingsOnMyPage(true); setCurrentScreen("terms"); }}
              onShowPrivacy={() => { setLegalBackTarget("main"); setShouldOpenMyPageOnMain(true); setShouldOpenSettingsOnMyPage(true); setCurrentScreen("privacy"); }}
              onShowOpenSourceLicenses={() => { setShouldOpenMyPageOnMain(true); setShouldOpenSettingsOnMyPage(true); setCurrentScreen("openSourceLicenses"); }}
              onShowAttributions={() => { setShouldOpenMyPageOnMain(true); setShouldOpenSettingsOnMyPage(true); setCurrentScreen("attributions"); }}
              shouldOpenMyPageOnMain={shouldOpenMyPageOnMain}
              shouldOpenSettingsOnMyPage={shouldOpenSettingsOnMyPage}
              onMainScreenReady={() => setShouldOpenMyPageOnMain(false)}
              onSettingsOpenedFromMain={() => setShouldOpenSettingsOnMyPage(false)}
              onRequestLogin={() => setShowLoginConfirm(true)}
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
              <OfflineIndicator position="top" variant="toast" showReconnectButton />
            </Suspense>
          )}
        </>
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

      <Suspense fallback={null}>
        <AlertDialogSimple
          open={showLoginConfirm}
          onOpenChange={setShowLoginConfirm}
          title="로그인 필요"
          description="이 기능을 사용하려면 로그인이 필요해요. 로그인 화면으로 이동할까요?"
          confirmText="로그인하기"
          cancelText="다음에"
          onConfirm={() => setCurrentScreen("login")}
        />
      </Suspense>
    </div>
  );
}
