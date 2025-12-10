import { useState, useEffect, useCallback, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { LoginScreen } from "./components/LoginScreen";
import { NicknameScreen } from "./components/NicknameScreen";
import { CommunityGuidelinesScreen } from "./components/CommunityGuidelinesScreen";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { MainScreenRefactored as MainScreen } from './components/MainScreen';
import { PrivacyPolicyScreen } from "./components/PrivacyPolicyScreen";
import { TermsOfServiceScreen } from "./components/TermsOfServiceScreen";
import { Toaster } from "./components/ui/sonner";
import { AlertDialogSimple } from "./components/ui/alert-dialog-simple";
import { OfflineIndicator } from "./components/ui/offline-indicator";
import { useOnlineStatus } from "./components/hooks/useOnlineStatus";
import "./styles/globals.css";
import { OpenSourceLicensesScreen } from "./components/OpenSourceLicensesScreen";
import { AttributionsScreen } from "./components/AttributionsScreen";
import { auth, db } from "./firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { uploadAndUpdateProfileImage } from "./profileImageService";
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

// Safe localStorage helper
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error("localStorage getItem error:", error);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error("localStorage setItem error:", error);
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("localStorage removeItem error:", error);
    }
  },
};

// 🔐 사용자별 localStorage 키 생성 헬퍼
const getUserStorageKey = (uid: string, key: string): string => {
  return `${key}_${uid}`;
};

// 🔐 현재 로그인된 사용자의 UID 가져오기
const getCurrentUserUID = (): string | null => {
  return auth.currentUser?.uid || null;
};

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>("login");
  const [legalBackTarget, setLegalBackTarget] = useState<AppScreen>("login");
  const [shouldOpenMyPageOnMain, setShouldOpenMyPageOnMain] = useState(false);
  const [shouldOpenSettingsOnMyPage, setShouldOpenSettingsOnMyPage] = useState(false);
  const [userNickname, setUserNickname] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userProfileImage, setUserProfileImage] = useState<string>("");
  const [_isCheckingUser, setIsCheckingUser] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  // 🔔 전역 에러/오프라인 상태
  const [_globalError, setGlobalError] = useState<string | null>(null);
  const [_isOffline, setIsOffline] = useState(false);


  // Ref to always get current screen value in event handlers
  const currentScreenRef = useRef<AppScreen>(currentScreen);

  // Keep ref in sync with state
  useEffect(() => {
    currentScreenRef.current = currentScreen;
  }, [currentScreen]);

  // Online status (used by OfflineIndicator component)
  useOnlineStatus();

  // Handle browser back button
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;

      if (state?.screen) {
        setCurrentScreen(state.screen);
      } else {
        // No state, user is at the beginning
        setShowExitConfirm(true);
        // Push state back to prevent immediate exit - use ref to get current value
        window.history.pushState(
          { screen: currentScreenRef.current },
          ""
        );
      }
    };

    // Only add listener once
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Update history when screen changes
  useEffect(() => {
    if (!isLoading) {
      window.history.replaceState({ screen: currentScreen }, "");
    }
  }, [currentScreen, isLoading]);

  // 🌐 온라인/오프라인 상태 감지
  useEffect(() => {
    const updateStatus = () => {
      const offline = !navigator.onLine;
      setIsOffline(offline);

      if (!offline) {
        // 온라인이 다시 되면, 이전 전역 에러 중 "네트워크" 관련 메시지는 지워도 됨
        setGlobalError((prev) => {
          if (!prev) return prev;
          if (prev.includes("네트워크") || prev.includes("인터넷")) {
            return null;
          }
          return prev;
        });
      }
    };

    updateStatus(); // 초기 한 번 호출

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  // Handle Android hardware back button (App-level screens only, NOT main screen)
  useEffect(() => {
    // main 화면에서는 리스너를 아예 등록하지 않음 (MainScreen이 처리)
    if (currentScreen === "main") {
      return;
    }

    let backButtonListener: PluginListenerHandle | null = null;

    const setupBackButtonListener = async () => {
      backButtonListener = await CapacitorApp.addListener(
        "backButton",
        () => {
          const screen = currentScreenRef.current;

          // 로그인 화면 → 종료 확인
          if (screen === "login") {
            setShowExitConfirm(true);
            return;
          }

          // 로그인 프로세스 중 화면 → 로그인 화면으로 (취소)
          if (screen === "privacy" || screen === "terms") {
            setCurrentScreen(legalBackTarget); // 🔁 로그인이 아니라 기억해둔 화면으로
            return;
          }

          // 🔥 nickname 화면 → 로그인 취소 (Firebase 로그아웃)
          if (screen === "nickname") {
            console.log("닉네임 설정 취소 → Firebase 로그아웃");

            // Firebase 로그아웃
            signOut(auth).catch((error) => {
              console.error("Firebase signOut error:", error);
            });

            // 상태 초기화
            setUserEmail("");
            setUserProfileImage("");
            safeLocalStorage.removeItem("currentUserUID");
            safeLocalStorage.removeItem("userEmail");
            safeLocalStorage.removeItem("userProfileImage");

            setCurrentScreen("login");
            return;
          }

          // ✅ 수정: guidelines 화면에서는 "앱 종료" 확인만 띄우기
          if (screen === "guidelines") {
            setShowExitConfirm(true);  // 로그인 화면이랑 동일하게 종료 다이얼로그
            return;
          }

          // welcome 화면 → guidelines로
          if (screen === "welcome") {
            setCurrentScreen("guidelines");
            return;
          }
        }
      );
    };

    setupBackButtonListener();

    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, [currentScreen, legalBackTarget]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prevDarkMode) => {
      const newDarkMode = !prevDarkMode;
      safeLocalStorage.setItem("darkMode", newDarkMode.toString());
      document.documentElement.classList.toggle("dark", newDarkMode);
      return newDarkMode;
    });
  }, []);

  // 공통: 로그인된 Firebase User를 기반으로 다음 화면/상태를 결정하는 함수
  const processAuthenticatedUser = useCallback(async (user: User) => {
    console.log("[App] processAuthenticatedUser 시작", user.uid);
    setIsCheckingUser(true);

    // 🔐 이 사용자의 닉네임 / 온보딩 키 (localStorage는 "보조 캐시"로만 사용)
    const userNicknameKey = getUserStorageKey(user.uid, "userNickname");
    const onboardingKey = getUserStorageKey(user.uid, "onboardingComplete");

    const localNickname = safeLocalStorage.getItem(userNicknameKey);
    const localOnboardingComplete =
      safeLocalStorage.getItem(onboardingKey) === "true";

    try {
      // 1) 항상 Firestore에서 "진짜 상태"를 먼저 확인
      console.log(`[${user.uid}] Firestore에서 사용자 상태 조회 시작`);
      const userDocRef = doc(db, "users", user.uid);
      const snap = await getDoc(userDocRef);

      if (snap.exists()) {
        const data = snap.data();
        const firestoreNickname = data?.nickname as string | undefined;
        const firestoreOnboardingComplete =
          data?.onboardingComplete === true ||
          data?.communityGuidelinesAgreed === true;

        // 1-1) Firestore 기준: 닉네임 + 온보딩 완료 → 기존 유저
        if (firestoreNickname && firestoreOnboardingComplete) {
          console.log(
            `[${user.uid}] Firestore 기준 기존 유저:`,
            firestoreNickname
          );

          setUserNickname(firestoreNickname);
          setUserEmail(user.email || "");
          if (user.photoURL) {
            setUserProfileImage(user.photoURL);
          }

          // 🔹 localStorage는 "캐시"로만 맞춰 줌 (없어도 동작해야 함)
          safeLocalStorage.setItem(userNicknameKey, firestoreNickname);
          safeLocalStorage.setItem(onboardingKey, "true");
          safeLocalStorage.setItem("isLoggedIn", "true");
          safeLocalStorage.setItem("currentUserUID", user.uid);
          if (user.email) {
            safeLocalStorage.setItem("userEmail", user.email);
          }
          if (user.photoURL) {
            safeLocalStorage.setItem("userProfileImage", user.photoURL);
          }

          setCurrentScreen("main");
          setIsCheckingUser(false);
          return;
        }

        // 1-2) Firestore에 닉네임만 있고 온보딩 미완료 → 가이드라인부터
        if (firestoreNickname && !firestoreOnboardingComplete) {
          console.log(
            `[${user.uid}] Firestore에 닉네임만 있고 온보딩 미완료 → 가이드라인 화면으로`
          );

          setUserNickname(firestoreNickname);
          setUserEmail(user.email || "");
          if (user.photoURL) {
            setUserProfileImage(user.photoURL);
          }

          // 닉네임 캐시만 맞춰둔다
          safeLocalStorage.setItem(userNicknameKey, firestoreNickname);
          safeLocalStorage.setItem("currentUserUID", user.uid);
          if (user.email) {
            safeLocalStorage.setItem("userEmail", user.email);
          }
          if (user.photoURL) {
            safeLocalStorage.setItem("userProfileImage", user.photoURL);
          }

          setCurrentScreen("guidelines");
          setIsCheckingUser(false);
          return;
        }

        // 1-3) Firestore 문서는 있는데 nickname이 없으면 → "프로필 미완성"으로 보고 닉네임부터
        console.log(
          `[${user.uid}] Firestore 문서는 있으나 nickname 없음 → 닉네임 설정 화면으로`
        );

        setUserEmail(user.email || "");
        if (user.photoURL) {
          setUserProfileImage(user.photoURL);
          safeLocalStorage.setItem("userProfileImage", user.photoURL);
        }
        safeLocalStorage.setItem("currentUserUID", user.uid);

        setCurrentScreen("nickname");
        setIsCheckingUser(false);
        return;
      }

      // 2) Firestore 문서가 아예 없는 경우 → "완전 신규" 또는 예전 localStorage만 있는 상태
      console.log(
        `[${user.uid}] Firestore 문서 없음 → localStorage 보조 정보 확인`
      );

      if (localNickname && localOnboardingComplete) {
        // 2-1) 예전에는 온보딩을 다 했는데 문서만 없는 경우 → 문서 생성 + 메인
        console.log(
          `[${user.uid}] localStorage 기준 기존 유저로 판단 → Firestore 문서 생성 후 메인`
        );

        setUserNickname(localNickname);
        setUserEmail(user.email || "");
        if (user.photoURL) {
          setUserProfileImage(user.photoURL);
        }

        // Firestore에 최소 정보 생성
        const initialPhotoUrl = user.photoURL ?? userProfileImage ?? "";

        await setDoc(
          userDocRef,
          {
            email: user.email ?? "",
            nickname: localNickname,

            photoURL: initialPhotoUrl,
            profileImage: initialPhotoUrl,   // 🔹 여기 추가

            onboardingComplete: true,
            communityGuidelinesAgreed: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // localStorage도 한 번 정리
        safeLocalStorage.setItem("isLoggedIn", "true");
        safeLocalStorage.setItem("currentUserUID", user.uid);
        safeLocalStorage.setItem(userNicknameKey, localNickname);
        safeLocalStorage.setItem(onboardingKey, "true");
        if (user.email) {
          safeLocalStorage.setItem("userEmail", user.email);
        }
        if (user.photoURL) {
          safeLocalStorage.setItem("userProfileImage", user.photoURL);
        }

        setCurrentScreen("main");
        setIsCheckingUser(false);
        return;
      }

      if (localNickname && !localOnboardingComplete) {
        // 2-2) 닉네임만 있는 상태 → 가이드라인부터 다시
        console.log(
          `[${user.uid}] localStorage에 닉네임만 있음 → 가이드라인 화면으로`
        );

        setUserNickname(localNickname);
        setUserEmail(user.email || "");
        if (user.photoURL) {
          setUserProfileImage(user.photoURL);
        }

        safeLocalStorage.setItem("currentUserUID", user.uid);
        if (user.email) {
          safeLocalStorage.setItem("userEmail", user.email);
        }
        if (user.photoURL) {
          safeLocalStorage.setItem("userProfileImage", user.photoURL);
        }

        setCurrentScreen("guidelines");
        setIsCheckingUser(false);
        return;
      }

      // 2-3) Firestore도 없고 localStorage에도 닉네임 없음 → 완전 신규 유저
      console.log(
        `[${user.uid}] Firestore/로컬 모두 닉네임 없음 → 닉네임 설정 화면으로`
      );

      setUserEmail(user.email || "");
      if (user.photoURL) {
        setUserProfileImage(user.photoURL);
        safeLocalStorage.setItem("userProfileImage", user.photoURL);
      }
      safeLocalStorage.setItem("currentUserUID", user.uid);

      setCurrentScreen("nickname");
      setIsCheckingUser(false);
      return;
    } catch (err) {
      console.error(
        `[${user.uid}] Firestore 조회 중 오류 → localStorage 기반으로만 진행`,
        err
      );

      // 🔔 전역 에러 메시지 설정 (사용자에게 상황 설명)
      setGlobalError(
        "지금 서버와 통신하는 데 문제가 생겼어요. 네트워크 상태를 확인한 뒤 다시 시도해 주세요."
      );

      // 3) Firestore 조회 자체가 실패한 경우(완전 오프라인 등) → localStorage에만 의존하는 최후의 fallback
      if (localNickname && localOnboardingComplete) {
        console.log(
          `[${user.uid}] Firestore 오류지만 localStorage 기준 기존 유저로 판단 → 메인`
        );

        setUserNickname(localNickname);
        setUserEmail(user.email || "");
        if (user.photoURL) {
          setUserProfileImage(user.photoURL);
        }

        safeLocalStorage.setItem("isLoggedIn", "true");
        safeLocalStorage.setItem("currentUserUID", user.uid);
        setCurrentScreen("main");
        setIsCheckingUser(false);
        return;
      }

      // 그 외에는 최소 정보만 채워서 닉네임/가이드라인 플로우로
      setUserEmail(user.email || "");
      if (user.photoURL) {
        setUserProfileImage(user.photoURL);
      }
      safeLocalStorage.setItem("currentUserUID", user.uid);

      setCurrentScreen(localNickname ? "guidelines" : "nickname");
      setIsCheckingUser(false);
    }
  }, []);

  // after
  useEffect(() => {
    // 1) 다크 모드 불러오기
    const savedDarkMode = safeLocalStorage.getItem("darkMode");
    const isDark =
      savedDarkMode !== null ? savedDarkMode === "true" : true;
    setIsDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);

    // 2) Firebase Auth 상태에 따라 초기 화면 결정
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setCurrentScreen("login");
        setIsLoading(false);
        return;
      }

      try {
        await processAuthenticatedUser(user);
      } catch (error) {
        console.error("[App] onAuthStateChanged 처리 중 오류:", error);
        setCurrentScreen("login");
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [processAuthenticatedUser]);

  // 🔥 LoginScreen에서만 호출되는 래퍼 함수
  const handleGoogleLogin = useCallback(async (user: User) => {
    console.log("[App] handleGoogleLogin 호출", user.uid);
    await processAuthenticatedUser(user);
  }, [processAuthenticatedUser]);

  const handleNicknameComplete = useCallback(async (nickname: string) => {
    console.log("[App] handleNicknameComplete 호출", nickname);

    const currentUID = getCurrentUserUID();
    if (!currentUID) {
      console.error("닉네임 저장 실패: 로그인된 사용자 없음");
      return;
    }

    // 1) 닉네임 상태에 저장
    setUserNickname(nickname);

    // 🔐 사용자별 닉네임 localStorage 캐시 (있으면 좋고, 없어도 앱은 Firestore 기준으로 동작)
    const userNicknameKey = getUserStorageKey(currentUID, "userNickname");
    safeLocalStorage.setItem(userNicknameKey, nickname);
    console.log(`[${currentUID}] 닉네임 로컬 저장 완료:`, nickname);

    // 2) Firestore에도 닉네임 먼저 저장 (온보딩 필드는 나중에)
    try {
      const userDocRef = doc(db, "users", currentUID);
      await setDoc(
        userDocRef,
        {
          nickname,
          // 이메일/프로필 이미지는 있으면 같이 넣어도 되고,
          // handleGuidelinesComplete에서 한 번 더 merge 되므로 생략해도 됨
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      console.log(`[${currentUID}] Firestore에 닉네임 저장 완료`);
    } catch (error) {
      console.error(
        `[${currentUID}] Firestore 닉네임 저장 실패 (그래도 플로우는 진행):`,
        error
      );
    }

    // 3) 다음 화면으로 이동 (커뮤니티 가이드라인)
    setCurrentScreen("guidelines");
    window.history.pushState({ screen: "guidelines" }, "");
  }, []);

  const handleGuidelinesComplete = useCallback(async () => {
    const currentUID = getCurrentUserUID();

    console.log(
      `🔵 [handleGuidelinesComplete] 시작 - UID: ${currentUID}, 닉네임: ${userNickname}`
    );

    if (!currentUID) {
      console.error("❌ Firestore 저장 실패: 로그인된 사용자 없음");
      // UID 자체를 모르면 온보딩 플래그도 못 남김 → 기존 로직 유지
      safeLocalStorage.setItem("isLoggedIn", "true");
      setCurrentScreen("welcome");
      window.history.pushState({ screen: "welcome" }, "");
      return;
    }

    // ✅ 이 사용자에 대한 온보딩 완료 플래그 키
    const onboardingKey = getUserStorageKey(
      currentUID,
      "onboardingComplete"
    );

    // 🔥 Firestore에 사용자 정보 저장 (닉네임 포함)
    const user = auth.currentUser;

    if (!user) {
      console.error("❌ Firebase Auth 사용자 없음");
      // 그래도 가이드라인은 동의했다고 보고 온보딩 완료 플래그는 남김
      safeLocalStorage.setItem(onboardingKey, "true");
      safeLocalStorage.setItem("isLoggedIn", "true");
      setCurrentScreen("welcome");
      window.history.pushState({ screen: "welcome" }, "");
      return;
    }

    if (!userNickname) {
      console.error("❌ 닉네임이 없음");
      // 이 경우도 마찬가지로 온보딩 완료 처리 (이상 상황)
      safeLocalStorage.setItem(onboardingKey, "true");
      safeLocalStorage.setItem("isLoggedIn", "true");
      setCurrentScreen("welcome");
      window.history.pushState({ screen: "welcome" }, "");
      return;
    }

    console.log(`📝 [${currentUID}] Firestore 저장 시작:`, {
      email: user.email ?? userEmail ?? "",
      nickname: userNickname,
      photoURL: user.photoURL ?? userProfileImage ?? "",
    });

    const userDocRef = doc(db, "users", currentUID);

    try {
      // ✅ 수정 후 - profileImage도 같이 저장
      const finalPhotoUrl = user.photoURL ?? userProfileImage ?? "";

      const dataToSave = {
        email: user.email ?? userEmail ?? "",
        nickname: userNickname,

        // 저장은 둘 다 해두고,
        photoURL: finalPhotoUrl,
        profileImage: finalPhotoUrl,      // 🔹 새 기준 필드

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        onboardingComplete: true,
        communityGuidelinesAgreed: true,
        communityGuidelinesAgreedAt: serverTimestamp(),
      };

      console.log(`📤 [${currentUID}] setDoc 호출 중...`, dataToSave);
      console.log(`[${currentUID}] navigator.onLine =`, navigator.onLine);

      // 10초 동안 setDoc이 안 끝나면 경고만 한 번 찍는다
      const timeoutId = setTimeout(() => {
        console.warn(
          `⏱️ [${currentUID}] setDoc이 10초째 끝나지 않음 (네트워크/인증 문제 가능성)`
        );
      }, 10000);

      await setDoc(userDocRef, dataToSave, { merge: true });

      clearTimeout(timeoutId);

      console.log(`✅ [${currentUID}] Firestore 저장 완료!`);

      // 저장 확인
      const savedDoc = await getDoc(userDocRef);
      if (savedDoc.exists()) {
        console.log(
          `🔍 [${currentUID}] 저장된 데이터 확인:`,
          savedDoc.data()
        );
      } else {
        console.warn(`⚠️ [${currentUID}] 문서가 저장되지 않았습니다!`);
      }
    } catch (err: any) {
      console.error(`❌ [${currentUID}] Firestore 저장 실패:`, {
        error: err,
        code: err?.code,
        message: err?.message,
        name: err?.name,
        stack: err?.stack,
      });
      // 실패해도 계속 진행 (온보딩은 완료로 처리)
    }

    // 📌 Firestore 성공 여부와 상관없이
    //     "이 사용자는 가이드라인에 동의했다" 플래그를 로컬에 남김
    safeLocalStorage.setItem(onboardingKey, "true");

    // 로그인 완료 표시 및 다음 화면으로
    console.log(`🎯 [${currentUID}] welcome 화면으로 이동`);
    safeLocalStorage.setItem("isLoggedIn", "true");
    setCurrentScreen("welcome");
    window.history.pushState({ screen: "welcome" }, "");
  }, [userNickname, userEmail, userProfileImage]);

  // 🔁 여기부터 교체
  const handleProfileImageChange = useCallback(
    (file: File) => {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.error("[App] 프로필 이미지를 변경하려면 로그인 상태여야 합니다.");
        return;
      }

      // 실패했을 때 되돌리기용
      const previousImage = userProfileImage;

      // 1) 먼저 로컬 미리보기(빠른 반응용)
      const reader = new FileReader();

      reader.onload = (e) => {
        const previewUrl = e.target?.result as string | null;

        if (previewUrl) {
          // 화면에는 바로 반영 (사용자 입장에서는 즉시 바뀐 것처럼 보임)
          setUserProfileImage(previewUrl);
          safeLocalStorage.setItem("userProfileImage", previewUrl);
        }

        // 2) 그 다음에 서버 동기화 (Storage + Auth + Firestore)
        (async () => {
          try {
            const finalUrl = await uploadAndUpdateProfileImage(file);

            // 서버에 성공적으로 반영되면, 서버 기준 URL로 한 번 더 덮어쓰기
            setUserProfileImage(finalUrl);
            safeLocalStorage.setItem("userProfileImage", finalUrl);

            console.log("[App] 프로필 이미지 서버 동기화 완료:", finalUrl);
          } catch (error) {
            console.error("[App] 프로필 이미지 업로드/저장 실패:", error);

            // 실패 시 이전 이미지로 롤백 (있을 때만)
            if (previousImage) {
              setUserProfileImage(previousImage);
              safeLocalStorage.setItem("userProfileImage", previousImage);
            }
          }
        })();
      };

      reader.onerror = () => {
        console.error("프로필 이미지를 읽는 중 오류가 발생했습니다.");
      };

      reader.readAsDataURL(file);
    },
    [userProfileImage]
  );
  // 🔁 여기까지 교체

  const handleShowGuidelinesFromMain = useCallback(() => {
    setCurrentScreen("guidelines");
  }, []);

  const handleMainScreenReady = useCallback(() => {
    setShouldOpenMyPageOnMain(false);
  }, []);

  // 🔹 MyPage 쪽에서 "설정 자동 오픈"을 한 번 처리하고 나면 호출
  const handleSettingsOpenedFromMain = useCallback(() => {
    setShouldOpenSettingsOnMyPage(false);
  }, []);

  const handleRestart = useCallback(() => {
    const currentUID = getCurrentUserUID();

    // 0) Firebase Auth 로그아웃
    signOut(auth).catch((error) => {
      console.error("Firebase signOut error:", error);
    });

    // 1) 화면 상태 리셋
    setCurrentScreen("login");
    setUserNickname("");
    setUserEmail("");
    setUserProfileImage("");

    // 2) 🔐 현재 사용자의 데이터만 삭제 (닉네임은 남겨둠 - 다음 로그인 시 사용)
    //    글로벌 로그인 상태만 false로 변경
    safeLocalStorage.setItem("isLoggedIn", "false");
    safeLocalStorage.removeItem("currentUserUID");
    safeLocalStorage.removeItem("userEmail");
    safeLocalStorage.removeItem("userProfileImage");

    console.log(`[${currentUID || 'unknown'}] 로그아웃 완료 (닉네임은 보존됨)`);

    // 3) 히스토리도 로그인 화면 기준으로 다시 쌓기
    window.history.pushState({ screen: "login" }, "");
  }, []);

  const handleBackToLogin = useCallback(() => {
    console.log("닉네임 화면에서 뒤로가기 → Firebase 로그아웃");

    // Firebase 로그아웃
    signOut(auth).catch((error) => {
      console.error("Firebase signOut error:", error);
    });

    // 상태 초기화
    setUserEmail("");
    setUserProfileImage("");
    safeLocalStorage.removeItem("currentUserUID");
    safeLocalStorage.removeItem("userEmail");
    safeLocalStorage.removeItem("userProfileImage");

    setCurrentScreen("login");
    window.history.pushState({ screen: "login" }, "");
  }, []);

  const handleBackFromGuidelines = useCallback(() => {
    setCurrentScreen("nickname");
    window.history.pushState({ screen: "nickname" }, "");
  }, []);

  const handleStartApp = useCallback(() => {
    setCurrentScreen("main");
    window.history.pushState({ screen: "main" }, "");
  }, []);

  const handleShowPrivacyPolicy = useCallback(() => {
    // 지금 화면을 기억해 둔다 (나중에 뒤로가기 할 때 돌아갈 곳)
    setLegalBackTarget(currentScreen);

    // 🔹 메인(MainScreen)에서 열렸다면,
    //    나중에 메인으로 돌아올 때 마이페이지 + 설정을 다시 열도록 표시
    const openedFromMain = currentScreen === "main";
    setShouldOpenMyPageOnMain(openedFromMain);
    setShouldOpenSettingsOnMyPage(openedFromMain);

    setCurrentScreen("privacy");
    window.history.pushState({ screen: "privacy" }, "");
  }, [currentScreen]);

  const handleShowTermsOfService = useCallback(() => {
    // 지금 화면을 기억해 둔다
    setLegalBackTarget(currentScreen);

    // 🔹 메인에서 열렸다면, 돌아올 때 마이페이지 + 설정 다시 열기
    const openedFromMain = currentScreen === "main";
    setShouldOpenMyPageOnMain(openedFromMain);
    setShouldOpenSettingsOnMyPage(openedFromMain);

    setCurrentScreen("terms");
    window.history.pushState({ screen: "terms" }, "");
  }, [currentScreen]);

  const handleShowOpenSourceLicenses = useCallback(() => {
    // 항상 메인(MainScreen)에서만 열리므로 마이페이지 + 설정으로 돌아오게 표시
    setShouldOpenMyPageOnMain(true);
    setShouldOpenSettingsOnMyPage(true);

    setCurrentScreen("openSourceLicenses");
    window.history.pushState(
      { screen: "openSourceLicenses" },
      ""
    );
  }, []);

  const handleShowAttributions = useCallback(() => {
    // 항상 메인에서만 열리므로 마이페이지 + 설정으로 돌아오게 표시
    setShouldOpenMyPageOnMain(true);
    setShouldOpenSettingsOnMyPage(true);

    setCurrentScreen("attributions");
    window.history.pushState(
      { screen: "attributions" },
      ""
    );
  }, []);

  const handleBackToMainFromInfoScreen = useCallback(() => {
    setCurrentScreen("main");
    window.history.pushState({ screen: "main" }, "");
  }, []);

  const handleBackFromLegalScreen = useCallback(() => {
    setCurrentScreen(legalBackTarget);
    window.history.pushState({ screen: legalBackTarget }, "");
  }, [legalBackTarget]);

  const handleRequestExit = useCallback(() => {
    setShowExitConfirm(true);
  }, []);

  const handleExitConfirm = useCallback(() => {
    setShowExitConfirm(false);
    // 네이티브 앱에서 실행 중이면 앱 종료
    CapacitorApp.exitApp();
  }, []);

  // Show loading screen while checking login state
  if (isLoading) {
    return (
      <div
        className={`w-full h-screen ${isDarkMode
          ? "dark bg-background text-foreground"
          : "bg-white text-gray-900"
          } flex items-center justify-center`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full h-screen ${isDarkMode
        ? "dark bg-background text-foreground"
        : "bg-white text-gray-900"
        }`}
    >
      {currentScreen === "login" && (
        <LoginScreen
          onGoogleLogin={handleGoogleLogin}
          onShowTerms={handleShowTermsOfService}
          onShowPrivacy={handleShowPrivacyPolicy}
        />
      )}

      {currentScreen === "privacy" && (
        <PrivacyPolicyScreen onBack={handleBackFromLegalScreen} />
      )}

      {currentScreen === "terms" && (
        <TermsOfServiceScreen onBack={handleBackFromLegalScreen} />
      )}

      {currentScreen === "openSourceLicenses" && (
        <OpenSourceLicensesScreen
          onBack={handleBackToMainFromInfoScreen}
        />
      )}

      {currentScreen === "attributions" && (
        <AttributionsScreen
          onBack={handleBackToMainFromInfoScreen}
        />
      )}

      {currentScreen === "nickname" && (
        <NicknameScreen
          onBack={handleBackToLogin}
          onComplete={handleNicknameComplete}
          userEmail={userEmail}
        />
      )}

      {currentScreen === "guidelines" && (
        <CommunityGuidelinesScreen
          onBack={handleBackFromGuidelines}
          onContinue={handleGuidelinesComplete}
          hideBackButton={true}  // ← 이걸 true로
        // disableBack={true}   // 이 줄은 아예 빼도 됨 (지금은 안 쓰니까)
        />
      )}

      {currentScreen === "welcome" && (
        <WelcomeScreen
          nickname={userNickname}
          onRestart={handleRestart}
          onStartApp={handleStartApp}
        />
      )}

      {currentScreen === "main" && (
        <MainScreen
          userNickname={userNickname}
          userProfileImage={userProfileImage}
          onProfileImageChange={handleProfileImageChange}
          onLogout={handleRestart}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          onRequestExit={handleRequestExit}
          onShowTerms={handleShowTermsOfService}
          onShowPrivacy={handleShowPrivacyPolicy}
          onShowGuidelines={handleShowGuidelinesFromMain}
          onShowOpenSourceLicenses={handleShowOpenSourceLicenses}
          onShowAttributions={handleShowAttributions}
          shouldOpenMyPageOnMain={shouldOpenMyPageOnMain}
          shouldOpenSettingsOnMyPage={shouldOpenSettingsOnMyPage}
          onMainScreenReady={handleMainScreenReady}
          onSettingsOpenedFromMain={handleSettingsOpenedFromMain}
        />
      )}

      {/* 오프라인 표시 - 메인 화면에서만 */}
      {currentScreen === "main" && (
        <OfflineIndicator
          position="top"
          variant="toast"
          showReconnectButton={true}
        />
      )}

      <Toaster isDarkMode={isDarkMode} />

      {/* 앱 종료 확인 다이얼로그 */}
      <AlertDialogSimple
        open={showExitConfirm}
        onOpenChange={setShowExitConfirm}
        title="앱을 종료하시겠습니까?"
        description="비유노트를 종료하고 나가시겠습니까?"
        onConfirm={handleExitConfirm}
      />
    </div>
  );
}