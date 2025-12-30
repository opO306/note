import { lazy, Suspense } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { useState, useEffect, useCallback, useRef } from "react";

// Firebase
import { auth, db } from "./firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

// App init hook
import { useAppInitialization } from "./components/hooks/useAppInitialization";
import { usePushToken } from "./components/hooks/usePushToken";

// Screens - Lazy loading으로 전환하여 초기 번들 크기 감소
const LoginScreen = lazy(() => import("@/components/LoginScreen").then(m => ({ default: m.LoginScreen })));
const NicknameScreen = lazy(() => import("@/components/NicknameScreen").then(m => ({ default: m.NicknameScreen })));
const MainScreen = lazy(() => import('@/components/MainScreen/MainScreenRefactored').then(m => ({ default: m.MainScreenRefactored })));

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
import { DelayedLoadingOverlay } from "./components/ui/delayed-loading-overlay";
import { LoadingOverlay } from "./components/ui/loading-animations";
import "./styles/globals.css";
import { uploadAndUpdateProfileImage } from "./profileImageService";
import { toast } from "./toastHelper";
import { setSystemBarsForTheme } from "./utils/systemBars";

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

interface UserData {
  nickname: string;
  email: string;
  profileImage: string;
}

export default function App() {
  const {
    isLoading,
    initialScreen,
    userData: initUserData,
    globalError,
    resetAuthState
  } = useAppInitialization();

  // 푸시 알림 초기화 및 토큰 관리
  usePushToken();

  // 화면 전환 - 로딩이 완료되기 전까지는 화면을 설정하지 않음
  const [currentScreen, setCurrentScreen] = useState<AppScreen | null>(null);

  // App 내부 로컬 상태
  const [userNickname, setUserNickname] = useState(initUserData.nickname);
  const [userProfileImage, setUserProfileImage] = useState(initUserData.profileImage);
  const [, setLocalUserData] = useState<UserData>({
    nickname: initUserData.nickname,
    email: initUserData.email,
    profileImage: initUserData.profileImage,
  });

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("app-theme") || "default";
    }
    return "default";
  });
  const isInitialized = useRef(false);

  // initialScreen 따라 화면 이동 - 로딩이 완료되고 initialScreen이 결정된 후에만 화면 전환
  useEffect(() => {
    // 로딩이 완료되고 initialScreen이 결정되었을 때만 화면 설정
    if (!isLoading && initialScreen !== null) {
      setCurrentScreen(initialScreen as AppScreen);
    }
  }, [initialScreen, isLoading]);

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

      // 사용자가 변경되었을 때 Firestore에서 테마 불러오기
      const loadUserTheme = async () => {
        const uid = auth.currentUser?.uid;
        if (uid) {
          try {
            const userRef = doc(db, "users", uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const data = userSnap.data();
              const userTheme = data.currentTheme || "default";
              setCurrentTheme(userTheme);
              localStorage.setItem("app-theme", userTheme);

              const htmlElement = document.documentElement;
              htmlElement.setAttribute("data-theme", userTheme);

              if (userTheme !== "default") {
                htmlElement.classList.remove("dark");
              } else {
                const savedDark = localStorage.getItem("darkMode");
                const isDark = savedDark !== null ? savedDark === "true" : true;
                htmlElement.classList.toggle("dark", isDark);
              }

              // 시스템 바 색상 업데이트
              await setSystemBarsForTheme(userTheme);

              // 테마 변경 이벤트 발생
              window.dispatchEvent(new CustomEvent("theme-changed"));
            }
          } catch (error) {
            console.error("테마 불러오기 실패:", error);
          }
        }
      };

      loadUserTheme();
    } else if (!isLoading && !initUserData.nickname) {
      // 로그아웃된 경우 기본 테마로 초기화
      const resetToDefaultTheme = async () => {
        setCurrentTheme("default");
        localStorage.setItem("app-theme", "default");
        const htmlElement = document.documentElement;
        htmlElement.setAttribute("data-theme", "default");
        const savedDark = localStorage.getItem("darkMode");
        const isDark = savedDark !== null ? savedDark === "true" : true;
        htmlElement.classList.toggle("dark", isDark);
        // 시스템 바 색상 업데이트
        await setSystemBarsForTheme("default");
        window.dispatchEvent(new CustomEvent("theme-changed"));
      };
      resetToDefaultTheme();
    }
  }, [initUserData, isLoading]);

  // 오류 토스트
  useEffect(() => {
    if (globalError) toast.error(globalError);
  }, [globalError]);

  // 다크모드 및 테마 초기화 (Firestore에서 사용자별 테마 불러오기)
  useEffect(() => {
    const initializeTheme = async () => {
      const saved = localStorage.getItem("darkMode");
      const isDark = saved !== null ? saved === "true" : true;
      setIsDarkMode(isDark);

      // 현재 로그인한 사용자가 있으면 Firestore에서 테마 불러오기
      const uid = auth.currentUser?.uid;
      let savedTheme = "default";

      if (uid) {
        try {
          const userRef = doc(db, "users", uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            savedTheme = data.currentTheme || "default";
            // Firestore에서 불러온 테마를 localStorage에도 저장 (캐싱)
            localStorage.setItem("app-theme", savedTheme);
          } else {
            // Firestore에 데이터가 없으면 기본 테마 사용
            savedTheme = localStorage.getItem("app-theme") || "default";
          }
        } catch (error) {
          console.error("테마 불러오기 실패:", error);
          // 실패 시 localStorage에서 불러오기
          savedTheme = localStorage.getItem("app-theme") || "default";
        }
      } else {
        // 로그인하지 않은 경우 localStorage에서 불러오기
        savedTheme = localStorage.getItem("app-theme") || "default";
      }

      setCurrentTheme(savedTheme);

      const htmlElement = document.documentElement;
      htmlElement.setAttribute("data-theme", savedTheme);

      // 테마가 "default"가 아닐 때는 다크 모드 클래스 제거 (테마가 자체 색상을 가지고 있으므로)
      if (savedTheme !== "default") {
        htmlElement.classList.remove("dark");
      } else {
        // 기본 테마는 다크 모드 설정 유지
        htmlElement.classList.toggle("dark", isDark);
      }

      // 시스템 바 색상 업데이트
      await setSystemBarsForTheme(savedTheme);
    };

    initializeTheme();
  }, []);

  // 테마 변경 감지 (localStorage 변경 또는 커스텀 이벤트)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "app-theme") {
        const newTheme = e.newValue || "default";
        setCurrentTheme(newTheme);
        const htmlElement = document.documentElement;
        htmlElement.setAttribute("data-theme", newTheme);
        if (newTheme !== "default") {
          htmlElement.classList.remove("dark");
        } else {
          const savedDark = localStorage.getItem("darkMode");
          const isDark = savedDark !== null ? savedDark === "true" : true;
          htmlElement.classList.toggle("dark", isDark);
        }
      }
    };

    const handleThemeChange = () => {
      const savedTheme = localStorage.getItem("app-theme") || "default";
      setCurrentTheme(savedTheme);
      const htmlElement = document.documentElement;
      htmlElement.setAttribute("data-theme", savedTheme);
      if (savedTheme !== "default") {
        htmlElement.classList.remove("dark");
      } else {
        const savedDark = localStorage.getItem("darkMode");
        const isDark = savedDark !== null ? savedDark === "true" : true;
        htmlElement.classList.toggle("dark", isDark);
      }
      // 시스템 바 색상 업데이트 (비동기 처리)
      setSystemBarsForTheme(savedTheme).catch((error) => {
        console.warn("시스템 바 색상 업데이트 실패:", error);
      });
    };

    // localStorage 변경 감지 (다른 탭에서 변경된 경우)
    window.addEventListener("storage", handleStorageChange);

    // 커스텀 이벤트 감지 (같은 탭에서 변경된 경우)
    window.addEventListener("theme-changed", handleThemeChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("theme-changed", handleThemeChange);
    };
  }, []);

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
    await resetAuthState();
  }, [resetAuthState]);

  // 닉네임 저장 + 다음 화면 이동
  // finalizeOnboarding Cloud Function이 이미 닉네임을 저장하므로
  // 여기서는 로컬 상태만 업데이트하고 화면 전환만 합니다.
  const handleNicknameComplete = useCallback(async (nickname: string) => {
    setUserNickname(nickname);
    setLocalUserData(prev => ({ ...prev, nickname }));
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
    } catch {
      // 가이드라인 동의 저장 실패 (로그 제거)
    }
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

  useOnlineStatus();

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

  // ✅ 초기 로딩: 즉시 표시 (지연 없음) - 다른 앱들처럼
  // ✅ 화면 전환 로딩: 200ms 지연 (깜빡임 방지)
  const InitialLoadingFallback = () => (
    <LoadingOverlay isLoading={true} variant="blur" message="불러오는 중..." />
  );

  const ScreenLoadingFallback = () => (
    <DelayedLoadingOverlay delay={200} variant="blur" />
  );

  // 커스텀 테마인지 확인
  const isCustomTheme = currentTheme !== "default";

  // 기본 테마이면서 다크모드일 때만 'dark' 클래스 적용
  const shouldApplyDark = !isCustomTheme && isDarkMode;

  return (
    <div className={`w-full h-screen ${shouldApplyDark ? "dark" : ""} bg-background text-foreground`}>
      {/* ✅ 초기 로딩: initialScreen이 결정되기 전까지는 항상 로딩 화면 표시 */}
      {(isLoading || initialScreen === null) && <InitialLoadingFallback />}

      {/* 로딩이 완료되고 initialScreen이 결정되고 currentScreen이 설정된 후에만 화면 표시 */}
      {!isLoading && initialScreen !== null && currentScreen !== null && (
        <>
          {/* 로그인 화면 */}
          {currentScreen === "login" && (
            <Suspense fallback={<ScreenLoadingFallback />}>
              <LoginScreen
                onShowTerms={() => { setLegalBackTarget("login"); setCurrentScreen("terms"); }}
                onShowPrivacy={() => { setLegalBackTarget("login"); setCurrentScreen("privacy"); }}
                isDarkMode={isDarkMode}
                onToggleDarkMode={toggleDarkMode}
              />
            </Suspense>
          )}

          {/* 다른 화면들 */}
          {currentScreen !== "login" && (
            <>

              {currentScreen === "nickname" && (
                <Suspense fallback={<ScreenLoadingFallback />}>
                  <NicknameScreen
                    onBack={handleRestart}
                    onComplete={handleNicknameComplete}
                    userEmail={initUserData.email}
                    isDarkMode={isDarkMode}
                    onToggleDarkMode={toggleDarkMode}
                  />
                </Suspense>
              )}

              {currentScreen === "guidelines" && (
                <Suspense fallback={<ScreenLoadingFallback />}>
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
                <Suspense fallback={<ScreenLoadingFallback />}>
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
                      } catch {
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
                <Suspense fallback={<ScreenLoadingFallback />}>
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

              {currentScreen === "main" && (
                <Suspense fallback={null}>
                  <OfflineIndicator position="top" variant="toast" showReconnectButton />
                </Suspense>
              )}
            </>
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
    </div>
  );
}
