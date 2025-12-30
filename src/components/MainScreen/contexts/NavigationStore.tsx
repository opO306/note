import React, { createContext, useContext, useMemo, useRef, useState, useCallback } from "react";
import type { MainRoute } from "../routes";
import type { CurrentScreen, ScreenVisibility } from "../types";

export type WriteDraft = {
  title: string;
  body: string;
  postType?: "question" | "guide"; // ✅ WriteScreen과 동일하게
};

// 레이어 타입: 뒤로가기 스택에서 관리되는 화면 단위
export type Layer =
  | "write"
  | "questionCompose"
  | "notes"
  | "postDetail"
  | "titlesCollection"
  | "titleShop"
  | "achievements"
  | "userProfile"
  | "myContentList"
  | "followList"
  | "myPage"
  | "noteDetail"
  | "guidelines"
  | "category"
  | "notificationSettings"
  | "ranking"
  | "bookmarks"
  | "search"
  | "quiz"
  | "theme";

interface NavigationStoreValue {
  route: MainRoute;
  setRoute: (route: MainRoute) => void;
  currentScreen: CurrentScreen;
  setCurrentScreen: (screen: CurrentScreen) => void;
  visibility: ScreenVisibility;

  // 표준 네비게이션 액션
  goHome: () => void;
  goRanking: () => void;
  goBookmarks: () => void;
  goMyPage: () => void;
  goCategory: () => void;
  goSearch: () => void;
  goTitleShop: () => void;
  goTitlesCollection: () => void;
  goAchievements: () => void;
  goQuiz: () => void;
  goFollowList: (mode: "followers" | "following") => void;
  goMyContentList: (mode: "posts" | "replies") => void;
  goUserProfile: (nickname: string) => void;
  goPostDetail: (postId: string, source: MainRoute["name"] extends "postDetail" ? never : any) => void;
  goAdminReports: () => void;
  goNotificationSettings: () => void;
  // 글쓰기 초안 주입 (노트 → 글쓰기 이어서)
  writeDraft: WriteDraft | null;
  setWriteDraft: React.Dispatch<React.SetStateAction<WriteDraft | null>>;
  // layer stack
  layerStackRef: React.MutableRefObject<Layer[]>;
  pushLayer: (layer: Layer) => void;
  removeLayer: (layer: Layer) => void;
  clearLayers: () => void;
  popLayer: () => Layer | null;
}

const NavigationStoreContext = createContext<NavigationStoreValue | null>(null);

export function NavigationStoreProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<MainRoute>({ name: "home" });
  const [currentScreen, setCurrentScreen] = useState<CurrentScreen>("home");
  const [writeDraft, setWriteDraft] = useState<WriteDraft | null>(null);

  const layerStackRef = useRef<Layer[]>([]);

  const pushLayer = useCallback((layer: Layer) => {
    // 중복 제거 후 맨 뒤에 추가 (스택 구조)
    const next = layerStackRef.current.filter((l) => l !== layer);
    next.push(layer);
    layerStackRef.current = next;
  }, []);

  const removeLayer = useCallback((layer: Layer) => {
    // 스택에서 해당 레이어 제거
    layerStackRef.current = layerStackRef.current.filter((l) => l !== layer);
  }, []);

  const popLayer = useCallback((): Layer | null => {
    // 스택의 마지막 레이어를 제거하고 반환 (역순 처리)
    const stack = layerStackRef.current;
    if (stack.length === 0) return null;
    const top = stack[stack.length - 1];
    layerStackRef.current = stack.slice(0, -1);
    return top;
  }, []);

  const clearLayers = useCallback(() => {
    layerStackRef.current = [];
  }, []);

  const mapRouteToScreen = useCallback((r: MainRoute): CurrentScreen => {
    switch (r.name) {
      case "home":
        return "home";
      case "ranking":
        return "ranking";
      case "bookmarks":
        return "bookmarks";
      case "myPage":
        return "profile";
      case "titlesCollection":
        return "titlesCollection";
      case "achievements":
        return "achievements";
      case "quiz":
        return "home";
      case "postDetail":
        return "home";
      case "userProfile":
        return "home";
      case "category":
      case "search":
      case "titleShop":
        return "home";
      case "followList":
      case "myContentList":
        return "profile";
      case "adminReports":
        return "home";
      case "notificationSettings":
        return "profile";
      default:
        return "home";
    }
  }, []);

  const deriveVisibility = useCallback(
    (r: MainRoute): ScreenVisibility => {
      const base: ScreenVisibility = {
        showMyPage: false,
        showCategoryScreen: false,
        showSearchScreen: false,
        showNotificationSettings: false,
        showBookmarks: false,
        showWriteScreen: false,
        showPostWarning: false,
        showTitleShop: false,
        showTitlesCollection: false,
        showRanking: false,
        showAchievements: false,
        showTheme: false,
        showGuidelines: false,
        showNotifications: false,
        showFollowList: null,
        showMyContentList: null,
        showUserProfile: null,
      };

      switch (r.name) {
        case "home":
          return base;
        case "ranking":
          return { ...base, showRanking: true };
        case "bookmarks":
          return { ...base, showBookmarks: true };
        case "myPage":
          return { ...base, showMyPage: true };
        case "category":
          return { ...base, showCategoryScreen: true };
        case "search":
          return { ...base, showSearchScreen: true };
        case "titleShop":
          return { ...base, showTitleShop: true };
        case "titlesCollection":
          return { ...base, showTitlesCollection: true };
        case "achievements":
          return { ...base, showAchievements: true };
        case "theme":
          return { ...base, showTheme: true };
        case "quiz":
          return base;
        case "followList":
          return { ...base, showFollowList: r.mode };
        case "myContentList":
          return { ...base, showMyContentList: r.mode };
        case "userProfile":
          return { ...base, showUserProfile: r.nickname };
        case "postDetail":
          return base;
        case "adminReports":
          return base;
        case "notificationSettings":
          return { ...base, showMyPage: true, showNotificationSettings: true };
        default:
          return base;
      }
    },
    []
  );

  const setRouteAndScreen = useCallback(
    (r: MainRoute) => {
      setRoute(r);
      setCurrentScreen(mapRouteToScreen(r));
    },
    [mapRouteToScreen]
  );

  // 표준 네비게이션 액션
  const goHome = useCallback(() => setRouteAndScreen({ name: "home" }), [setRouteAndScreen]);
  const goRanking = useCallback(() => setRouteAndScreen({ name: "ranking" }), [setRouteAndScreen]);
  const goBookmarks = useCallback(() => setRouteAndScreen({ name: "bookmarks" }), [setRouteAndScreen]);
  const goMyPage = useCallback(() => setRouteAndScreen({ name: "myPage" }), [setRouteAndScreen]);
  const goCategory = useCallback(() => setRouteAndScreen({ name: "category" }), [setRouteAndScreen]);
  const goSearch = useCallback(() => setRouteAndScreen({ name: "search" }), [setRouteAndScreen]);
  const goTitleShop = useCallback(() => setRouteAndScreen({ name: "titleShop" }), [setRouteAndScreen]);
  const goTitlesCollection = useCallback(() => setRouteAndScreen({ name: "titlesCollection" }), [setRouteAndScreen]);
  const goAchievements = useCallback(() => setRouteAndScreen({ name: "achievements" }), [setRouteAndScreen]);
  const goQuiz = useCallback(() => setRouteAndScreen({ name: "quiz" }), [setRouteAndScreen]);
  const goFollowList = useCallback(
    (mode: "followers" | "following") => setRouteAndScreen({ name: "followList", mode }),
    [setRouteAndScreen]
  );
  const goMyContentList = useCallback(
    (mode: "posts" | "replies") => setRouteAndScreen({ name: "myContentList", mode }),
    [setRouteAndScreen]
  );
  const goUserProfile = useCallback(
    (nickname: string) => setRouteAndScreen({ name: "userProfile", nickname }),
    [setRouteAndScreen]
  );
  const goPostDetail = useCallback(
    (postId: string, source: any) => setRouteAndScreen({ name: "postDetail", postId, source }),
    [setRouteAndScreen]
  );
  const goAdminReports = useCallback(() => setRouteAndScreen({ name: "adminReports" }), [setRouteAndScreen]);
  const goNotificationSettings = useCallback(() => setRouteAndScreen({ name: "notificationSettings" }), [setRouteAndScreen]);

  const value = useMemo<NavigationStoreValue>(
    () => ({
      route,
      setRoute,
      currentScreen,
      setCurrentScreen,
      visibility: deriveVisibility(route),
      goHome,
      goRanking,
      goBookmarks,
      goMyPage,
      goCategory,
      goSearch,
      goTitleShop,
      goTitlesCollection,
      goAchievements,
      goQuiz,
      goFollowList,
      goMyContentList,
      goUserProfile,
      goPostDetail,
      goAdminReports,
      goNotificationSettings,
      layerStackRef,
      pushLayer,
      removeLayer,
      clearLayers,
      popLayer,
      writeDraft,
      setWriteDraft,
    }),
    [
      route,
      currentScreen,
      deriveVisibility,
      goHome,
      goRanking,
      goBookmarks,
      goMyPage,
      goCategory,
      goSearch,
      goTitleShop,
      goTitlesCollection,
      goAchievements,
      goQuiz,
      goFollowList,
      goMyContentList,
      goUserProfile,
      goPostDetail,
      goAdminReports,
      goNotificationSettings,
      pushLayer,
      removeLayer,
      clearLayers,
      popLayer,
      writeDraft,
      setWriteDraft,
      layerStackRef,
      setCurrentScreen,
    ]
  );

  return (
    <NavigationStoreContext.Provider value={value}>{children}</NavigationStoreContext.Provider>
  );
}

export function useNavigationStore() {
  const ctx = useContext(NavigationStoreContext);
  if (!ctx) {
    throw new Error("useNavigationStore must be used within NavigationStoreProvider");
  }
  return ctx;
}

