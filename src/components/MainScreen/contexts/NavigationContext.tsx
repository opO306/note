// MainScreen/contexts/NavigationContext.tsx
// 화면 전환 및 네비게이션 상태를 관리하는 Context

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { App as CapacitorApp } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import type {
  CurrentScreen,
  ScreenVisibility,
  NavigationStateRef,
  Post,
} from "../types";

interface NavigationContextValue extends ScreenVisibility {
  // 현재 화면
  currentScreen: CurrentScreen;
  selectedPost: Post | null;
  
  // 카테고리 필터
  activeCategory: string;
  activeSubCategory: string;
  sortBy: string;
  
  // 화면 열기/닫기 액션
  openScreen: (screen: keyof ScreenVisibility | "selectedPost", value?: any) => void;
  closeScreen: (screen: keyof ScreenVisibility | "selectedPost") => void;
  
  // 탭 네비게이션
  navigateToHome: () => void;
  navigateToRanking: () => void;
  navigateToBookmarks: () => void;
  navigateToMyPage: () => void;
  navigateToAchievements: () => void;
  
  // 게시물 선택
  selectPost: (post: Post | null) => void;
  
  // 카테고리 변경
  setActiveCategory: (category: string) => void;
  setActiveSubCategory: (subCategory: string) => void;
  setSortBy: (sort: string) => void;
  
  // 경고 다이얼로그
  dontShowWarningAgain: boolean;
  setDontShowWarningAgain: (value: boolean) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

interface NavigationProviderProps {
  children: React.ReactNode;
  onRequestExit?: () => void;
  shouldOpenMyPageOnMain?: boolean;
  onMainScreenReady?: () => void;
}

export function NavigationProvider({
  children,
  onRequestExit,
  shouldOpenMyPageOnMain,
  onMainScreenReady,
}: NavigationProviderProps) {
  // 현재 화면 상태
  const [currentScreen, setCurrentScreen] = useState<CurrentScreen>("home");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  
  // 카테고리 필터 상태
  const [activeCategory, setActiveCategory] = useState("전체");
  const [activeSubCategory, setActiveSubCategory] = useState("전체");
  const [sortBy, setSortBy] = useState("latest");
  
  // 각 화면 표시 상태
  const [showMyPage, setShowMyPage] = useState(false);
  const [showCategoryScreen, setShowCategoryScreen] = useState(false);
  const [showSearchScreen, setShowSearchScreen] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showWriteScreen, setShowWriteScreen] = useState(false);
  const [showPostWarning, setShowPostWarning] = useState(false);
  const [showTitleShop, setShowTitleShop] = useState(false);
  const [showTitlesCollection, setShowTitlesCollection] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showFollowList, setShowFollowList] = useState<"followers" | "following" | null>(null);
  const [showMyContentList, setShowMyContentList] = useState<"posts" | "replies" | null>(null);
  const [showUserProfile, setShowUserProfile] = useState<string | null>(null);
  
  // 경고 다이얼로그 설정
  const [dontShowWarningAgain, setDontShowWarningAgain] = useState(false);

  // 뒤로가기 처리를 위한 상태 참조
  const navigationStateRef = useRef<NavigationStateRef>({
    showWriteScreen: false,
    selectedPost: null,
    showTitlesCollection: false,
    showTitleShop: false,
    showAchievements: false,
    showMyPage: false,
    showCategoryScreen: false,
    showSearchScreen: false,
    showNotificationSettings: false,
    showBookmarks: false,
    showRanking: false,
    showGuidelines: false,
    showMyContentList: null,
    showFollowList: null,
    showUserProfile: null,
    currentScreen: "home",
  });

  // 상태 참조 동기화
  useEffect(() => {
    navigationStateRef.current = {
      showWriteScreen,
      selectedPost,
      showTitlesCollection,
      showTitleShop,
      showAchievements,
      showMyPage,
      showCategoryScreen,
      showSearchScreen,    
      showNotificationSettings,
      showBookmarks,
      showRanking,
      showGuidelines,
      showMyContentList,
      showFollowList,
      showUserProfile,
      currentScreen,
    };
  }, [
    showWriteScreen,
    selectedPost,
    showTitlesCollection,
    showTitleShop,
    showAchievements,
    showMyPage,
    showCategoryScreen,
    showSearchScreen,    
    showNotificationSettings,
    showBookmarks,
    showRanking,
    showGuidelines,
    showMyContentList,
    showFollowList,
    showUserProfile,
    currentScreen,
  ]);

  // 초기 마이페이지 열기 처리
  useEffect(() => {
    if (shouldOpenMyPageOnMain) {
      setShowMyPage(true);
      setCurrentScreen("profile");
      onMainScreenReady?.();
    }
  }, [shouldOpenMyPageOnMain, onMainScreenReady]);

  // 모든 오버레이 화면 닫기 헬퍼
  const closeAllOverlays = useCallback(() => {
    setShowMyPage(false);
    setShowCategoryScreen(false);
    setShowSearchScreen(false);
    setShowNotificationSettings(false);
    setShowBookmarks(false);
    setShowWriteScreen(false);
    setShowTitleShop(false);
    setShowTitlesCollection(false);
    setShowRanking(false);
    setShowAchievements(false);
    setShowGuidelines(false);
    setShowFollowList(null);
    setShowMyContentList(null);
    setShowUserProfile(null);
    setSelectedPost(null);
  }, []);

  // 탭 네비게이션 핸들러
  const navigateToHome = useCallback(() => {
    closeAllOverlays();
    setActiveCategory("전체");
    setActiveSubCategory("전체");
    setCurrentScreen("home");
  }, [closeAllOverlays]);

  const navigateToRanking = useCallback(() => {
    closeAllOverlays();
    setShowRanking(true);
    setCurrentScreen("ranking");
  }, [closeAllOverlays]);

  const navigateToBookmarks = useCallback(() => {
    closeAllOverlays();
    setShowBookmarks(true);
    setCurrentScreen("bookmarks");
  }, [closeAllOverlays]);

  const navigateToMyPage = useCallback(() => {
    closeAllOverlays();
    setShowMyPage(true);
    setCurrentScreen("profile");
  }, [closeAllOverlays]);

  const navigateToAchievements = useCallback(() => {
    closeAllOverlays();
    setShowAchievements(true);
    setCurrentScreen("achievements");
  }, [closeAllOverlays]);

  // 게시물 선택
  const selectPost = useCallback((post: Post | null) => {
    setSelectedPost(post);
  }, []);

  // 화면 열기
  const openScreen = useCallback((screen: keyof ScreenVisibility | "selectedPost", value?: any) => {
    switch (screen) {
      case "showMyPage":
        setShowMyPage(true);
        break;
      case "showCategoryScreen":
        setShowCategoryScreen(true);
        break;
      case "showSearchScreen":
        setShowSearchScreen(true);
        break;
      case "showNotificationSettings":
        setShowNotificationSettings(true);
        break;
      case "showBookmarks":
        setShowBookmarks(true);
        break;
      case "showWriteScreen":
        setShowWriteScreen(true);
        break;
      case "showPostWarning":
        setShowPostWarning(true);
        break;
      case "showTitleShop":
        setShowTitleShop(true);
        break;
      case "showTitlesCollection":
        setShowTitlesCollection(true);
        break;
      case "showRanking":
        setShowRanking(true);
        break;
      case "showAchievements":
        setShowAchievements(true);
        break;
      case "showGuidelines":
        setShowGuidelines(true);
        break;
      case "showNotifications":
        setShowNotifications(true);
        break;
      case "showFollowList":
        setShowFollowList(value as "followers" | "following");
        break;
      case "showMyContentList":
        setShowMyContentList(value as "posts" | "replies");
        break;
      case "showUserProfile":
        setShowUserProfile(value as string);
        break;
      case "selectedPost":
        setSelectedPost(value as Post);
        break;
    }
  }, []);

  // 화면 닫기
  const closeScreen = useCallback((screen: keyof ScreenVisibility | "selectedPost") => {
    switch (screen) {
      case "showMyPage":
        setShowMyPage(false);
        setCurrentScreen("home");
        break;
      case "showCategoryScreen":
        setShowCategoryScreen(false);
        break;
      case "showSearchScreen":
        setShowSearchScreen(false);
        break;
      case "showNotificationSettings":
        setShowNotificationSettings(false);
        break;
      case "showBookmarks":
        setShowBookmarks(false);
        setCurrentScreen("home");
        break;
      case "showWriteScreen":
        setShowWriteScreen(false);
        break;
      case "showPostWarning":
        setShowPostWarning(false);
        break;
      case "showTitleShop":
        setShowTitleShop(false);
        break;
      case "showTitlesCollection":
        setShowTitlesCollection(false);
        setShowMyPage(true);
        setCurrentScreen("profile");
        break;
      case "showRanking":
        setShowRanking(false);
        setCurrentScreen("home");
        break;
      case "showAchievements":
        setShowAchievements(false);
        setShowMyPage(true);
        setCurrentScreen("profile");
        break;
      case "showGuidelines":
        setShowGuidelines(false);
        break;
      case "showNotifications":
        setShowNotifications(false);
        break;
      case "showFollowList":
        setShowFollowList(null);
        setShowMyPage(true);
        setCurrentScreen("profile");
        break;
      case "showMyContentList":
        setShowMyContentList(null);
        setShowMyPage(true);
        setCurrentScreen("profile");
        break;
      case "showUserProfile":
        setShowUserProfile(null);
        break;
      case "selectedPost":
        setSelectedPost(null);
        break;
    }
  }, []);

  // 브라우저 뒤로가기 처리
  useEffect(() => {
    const handlePopState = () => {
      const state = navigationStateRef.current;

      if (state.showWriteScreen) {
        setShowWriteScreen(false);
        return;
      }
      if (state.selectedPost) {
        setSelectedPost(null);
        return;
      }
      if (state.showSearchScreen) {
        setShowSearchScreen(false);
        return;
      }
      if (state.showCategoryScreen) {
        setShowCategoryScreen(false);
        return;
      }
      if (state.showUserProfile) {
        setShowUserProfile(null);
        return;
      }
      if (state.showGuidelines) {
        setShowGuidelines(false);
        return;
      }
      if (state.showMyContentList) {
        setShowMyContentList(null);
        setShowMyPage(true);
        setCurrentScreen("profile");
        return;
      }
      if (state.showFollowList) {
        setShowFollowList(null);
        setShowMyPage(true);
        setCurrentScreen("profile");
        return;
      }
      if (state.showBookmarks || state.showMyPage || state.showRanking) {
        navigateToHome();
        return;
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [navigateToHome]);

  // 안드로이드 하드웨어 백버튼 처리
  useEffect(() => {
    let backButtonListener: PluginListenerHandle | null = null;

    const setupBackButtonListener = async () => {
      backButtonListener = await CapacitorApp.addListener("backButton", () => {
        const state = navigationStateRef.current;

        if (state.showWriteScreen) {
          setShowWriteScreen(false);
          return;
        }
        if (state.selectedPost) {
          setSelectedPost(null);
          return;
        }
        if (state.showTitlesCollection) {
          setShowTitlesCollection(false);
          return;
        }
        if (state.showTitleShop) {
          setShowTitleShop(false);
          return;
        }
        if (state.showAchievements) {
          setShowAchievements(false);
          return;
        }
        if (state.showUserProfile) {
          setShowUserProfile(null);
          return;
        }
        if (state.showMyContentList) {
          setShowMyContentList(null);
          setShowMyPage(true);
          setCurrentScreen("profile");
          return;
        }
        if (state.showFollowList) {
          setShowFollowList(null);
          setShowMyPage(true);
          setCurrentScreen("profile");
          return;
        }
        if (state.showMyPage) {
          setShowMyPage(false);
          setCurrentScreen("home");
          return;
        }
        if (state.showGuidelines) {
          setShowGuidelines(false);
          return;
        }
        if (state.showCategoryScreen) {
          setShowCategoryScreen(false);
          return;
        }
        if (state.showNotificationSettings) {
          setShowNotificationSettings(false);
          return;
        }
        if (state.showBookmarks) {
          setShowBookmarks(false);
          setCurrentScreen("home");
          return;
        }
        if (state.showRanking) {
          setShowRanking(false);
          setCurrentScreen("home");
          return;
        }

        // 홈 화면에서 뒤로가기 → 앱 종료 요청
        if (state.currentScreen === "home" && !state.selectedPost) {
          onRequestExit?.();
        }
      });
    };

    setupBackButtonListener();

    return () => {
      backButtonListener?.remove();
    };
  }, [onRequestExit]);

  // 히스토리 푸시 (화면 열릴 때)
  const prevScreenStateRef = useRef<string>("");

  useEffect(() => {
    const currentScreenState =
      `${showWriteScreen}-${!!selectedPost}-${showSearchScreen}-` +
      `${showCategoryScreen}-${showBookmarks}-${showMyPage}-` +
      `${showRanking}-${!!showUserProfile}-${!!showFollowList}-${showGuidelines}`;

    const isAnyOpen =
      showWriteScreen ||
      selectedPost ||
      showSearchScreen ||
      showCategoryScreen ||
      showBookmarks ||
      showMyPage ||
      showRanking ||
      showUserProfile ||
      showFollowList ||
      showGuidelines;

    const wasAnyOpen = prevScreenStateRef.current
      .split("-")
      .some((v) => v === "true");

    if (isAnyOpen && !wasAnyOpen) {
      window.history.pushState(null, "");
    }

    prevScreenStateRef.current = currentScreenState;
  }, [
    showWriteScreen,
    selectedPost,
    showSearchScreen,
    showCategoryScreen,
    showBookmarks,
    showMyPage,
    showRanking,
    showUserProfile,
    showFollowList,
    showGuidelines,
  ]);

  const value = useMemo<NavigationContextValue>(
    () => ({
      // 현재 화면
      currentScreen,
      selectedPost,
      
      // 카테고리 필터
      activeCategory,
      activeSubCategory,
      sortBy,
      
      // 화면 표시 상태
      showMyPage,
      showCategoryScreen,
      showSearchScreen,
      showNotificationSettings,
      showBookmarks,
      showWriteScreen,
      showPostWarning,
      showTitleShop,
      showTitlesCollection,
      showRanking,
      showAchievements,
      showGuidelines,
      showNotifications,
      showFollowList,
      showMyContentList,
      showUserProfile,
      
      // 액션
      openScreen,
      closeScreen,
      navigateToHome,
      navigateToRanking,
      navigateToBookmarks,
      navigateToMyPage,
      navigateToAchievements,
      selectPost,
      setActiveCategory,
      setActiveSubCategory,
      setSortBy,
      
      // 경고 다이얼로그
      dontShowWarningAgain,
      setDontShowWarningAgain,
    }),
    [
      currentScreen,
      selectedPost,
      activeCategory,
      activeSubCategory,
      sortBy,
      showMyPage,
      showCategoryScreen,
      showSearchScreen,
      showNotificationSettings,
      showBookmarks,
      showWriteScreen,
      showPostWarning,
      showTitleShop,
      showTitlesCollection,
      showRanking,
      showAchievements,
      showGuidelines,
      showNotifications,
      showFollowList,
      showMyContentList,
      showUserProfile,
      openScreen,
      closeScreen,
      navigateToHome,
      navigateToRanking,
      navigateToBookmarks,
      navigateToMyPage,
      navigateToAchievements,
      selectPost,
      dontShowWarningAgain,
    ]
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return context;
}
