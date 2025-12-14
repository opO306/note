// MainScreen/MainScreenRefactored.tsx
// 리팩토링된 MainScreen - 분리된 훅과 컴포넌트를 조합한 버전
// 기존 3,472줄 → 약 600줄로 축소
/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */
import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { auth, db, functions } from "../../firebase";
import { addDoc, collection, serverTimestamp, doc, onSnapshot } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { toast } from "@/toastHelper";
import { useUserProfiles, useCurrentUserProfileLite } from "./hooks/useUserProfiles";
import { formatRelativeOrDate } from "@/components/utils/timeUtils";
import { BlockedUserListDialog } from "@/components/BlockedUserListDialog";
// 🔹 route 타입 (중앙 네비게이션 상태)
import type { PostDetailSource } from "./routes";
import { DELETED_USER_NAME } from "@/components/utils/deletedUserHelpers";
// 기존 훅들
import { useLumens } from "../useLumens";
import { useAchievements } from "../useAchievements";
import { usePosts } from "../hooks/usePosts";

// 분리된 훅들
import {
  useLanternActions,
  useBookmarkActions,
  useGuideActions,
  useFollowActions,
  useTitleActions,
  useReplyActions,
  useNotificationActions,
  usePostManagement,
  useTrustScore,
  useUserStats,
} from "./hooks";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { useOtherUserFollowStats } from "./hooks/useOtherUserFollowStats";

// 분리된 컴포넌트들
import { HomeHeader, PostListView, PostDetailView } from "./components";
import { QuizScreen } from "./components/QuizScreen";

// 기존 컴포넌트들 (주요 화면은 Eager Loading으로 전환하여 탭 전환 속도 개선)
import { BottomNavigation } from "../layout/BottomNavigation";
import { MyPageScreen } from "../MyPageScreen";
import { CategoryScreen } from "../CategoryScreen";
import { SearchScreen } from "../SearchScreen";
import { RankingScreen } from "../RankingScreen";
import { BookmarkScreen } from "../BookmarkScreen";
import { MyContentListScreen } from "../MyContentListScreen";

// 덜 자주 쓰이는 화면은 Lazy Loading 유지
const WriteScreen = lazy(() => import("../WriteScreen").then((m) => ({ default: m.WriteScreen })));
const TitleShop = lazy(() => import("../TitleShop").then((m) => ({ default: m.TitleShop })));
const TitlesCollection = lazy(() => import("../TitlesCollection").then((m) => ({ default: m.TitlesCollection })));
const AchievementsScreen = lazy(() =>
  import("../AchievementsScreen").then((m) => ({ default: m.AchievementsScreen }))
);
const FollowListScreen = lazy(() =>
  import("../FollowListScreen").then((m) => ({ default: m.FollowListScreen }))
);
const UserProfileDialog = lazy(() =>
  import("../UserProfileDialog").then((m) => ({ default: m.UserProfileDialog }))
);
const NotificationSettingsDialog = lazy(() =>
  import("../NotificationSettingsDialog").then((m) => ({ default: m.NotificationSettingsDialog }))
);
const ReportDialog = lazy(() => import("../ReportDialog").then((m) => ({ default: m.ReportDialog })));
const AdminReportScreen = lazy(() =>
  import("../AdminReportScreen").then((m) => ({ default: m.AdminReportScreen }))
);

import { AlertDialogSimple } from "../ui/alert-dialog-simple";
import {
  NavigationStoreProvider,
  useNavigationStore,
  type Layer,
} from "./contexts/NavigationStore";

// 데이터
import { initialCategories } from "@/data/categoryData";

// 타입
import type { MainScreenProps, Post, Reply, SortOption } from "./types";

// 상수
const EMPTY_STRING_ARRAY: readonly string[] = Object.freeze([]);
const ScreenFallback = () => (
  <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
    불러오는 중...
  </div>
);

const AUTO_REPLY_WAIT_MS = 60 * 60 * 1000;

function toDateSafe(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === "function") {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

export function MainScreenRefactored(props: MainScreenProps) {
  return (
    <NavigationStoreProvider>
      <MainScreenInner {...props} />
    </NavigationStoreProvider>
  );
}

function MainScreenInner({
  userNickname,
  userProfileImage,
  onProfileImageChange,
  onLogout,
  isDarkMode,
  onToggleDarkMode,
  onRequestExit,
  onShowTerms,
  onShowPrivacy,
  onShowOpenSourceLicenses,
  onShowAttributions,
  shouldOpenMyPageOnMain,
  shouldOpenSettingsOnMyPage,
  onMainScreenReady,
  onSettingsOpenedFromMain,
}: MainScreenProps) {
  // ========================================
  // 1. 화면 상태 (Navigation)
  // ========================================
  const {
    route,
    setRoute,
    currentScreen,
    setCurrentScreen,
    visibility,
    pushLayer,
    removeLayer,
    popLayer,
    goHome,
    goRanking,
    goBookmarks,
    goMyPage,
    goPostDetail,
    goAchievements,
  } = useNavigationStore();

  const [showWriteScreen, setShowWriteScreen] = useState(false);
  const [lastUserProfileNickname, setLastUserProfileNickname] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // 🔹 글 상세로 들어올 때, 어디에서 왔는지 기억하는 상태
  const [postDetailSource, setPostDetailSource] = useState<PostDetailSource>("home");

  // 🔹 유저 프로필로 들어올 때, 어디에서 왔는지 기억하는 상태
  const [userProfileSource, setUserProfileSource] = useState<{
    source: "home" | "followList" | "myPage" | "myContentList" | "userProfile";
    mode?: "followers" | "following" | "posts" | "replies";
  } | null>(null);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [activeCategory, setActiveCategory] = useState("전체");
  const [activeSubCategory, setActiveSubCategory] = useState("전체");
  const [sortBy, setSortBy] = useState<SortOption["value"]>("latest");
  const autoReplyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoReplyTriggeredRef = useRef<Set<string>>(new Set());

  // 화면 표시 상태
  const isWriteVisible = showWriteScreen;
  const isMyPageVisible = visibility.showMyPage;
  const isCategoryVisible = visibility.showCategoryScreen;
  const isTitleShopVisible = visibility.showTitleShop;
  const isTitlesCollectionVisible = visibility.showTitlesCollection;
  const isUserProfileVisible = visibility.showUserProfile;
  const isRankingVisible = visibility.showRanking;
  const isSearchVisible = visibility.showSearchScreen;
  const isAchievementsVisible = visibility.showAchievements;
  const isBookmarksVisible = visibility.showBookmarks || currentScreen === "bookmarks";
  const showNotificationSettings = visibility.showNotificationSettings;
  const isQuizVisible = route.name === "quiz";

  const showFollowList = visibility.showFollowList;
  const showMyContentList = visibility.showMyContentList;
  const showMyPage = visibility.showMyPage;
  const showCategoryScreen = visibility.showCategoryScreen;
  const showSearchScreen = visibility.showSearchScreen;
  const showTitleShop = visibility.showTitleShop;
  const showTitlesCollection = visibility.showTitlesCollection;
  const showAchievements = visibility.showAchievements;
  const showUserProfile = visibility.showUserProfile;

  const effectiveFollowList = showFollowList;
  const effectiveMyContentList = showMyContentList;

  // 🔹 route -> boolean 네비게이션 상태 동기화
  useEffect(() => {
    switch (route.name) {
      case "home":
        setCurrentScreen("home");
        break;
      case "myPage":
        setCurrentScreen("profile");
        break;
      case "ranking":
        setCurrentScreen("ranking");
        break;
      case "bookmarks":
        setCurrentScreen("bookmarks");
        break;
      case "category":
        setCurrentScreen("home");
        break;
      case "search":
        setCurrentScreen("home");
        break;
      case "titleShop":
        setCurrentScreen("home");
        break;
      case "titlesCollection":
        setCurrentScreen("profile");
        break;
      case "achievements":
        setCurrentScreen("achievements");
        break;
      case "followList":
        setCurrentScreen("profile");
        break;
      case "myContentList":
        setCurrentScreen("profile");
        break;
      case "userProfile":
        setCurrentScreen("home");
        break;
      case "adminReports":
        setCurrentScreen("home");
        break;
      case "notificationSettings":
        setCurrentScreen("profile");
        break;
      case "postDetail":
        setCurrentScreen("home");
        break;
      default:
        break;
    }
  }, [route, setCurrentScreen]);

  // 신고 다이얼로그 상태
  const [reportingPost, setReportingPost] = useState<Post | null>(null);
  const [reportingReply, setReportingReply] = useState<Reply | null>(null);

  // 카테고리 데이터
  const [categories] = useState(initialCategories);
  const [userProfileSection, setUserProfileSection] = useState<
    "profile" | "followers" | "following" | "posts" | "replies"
  >("profile");

  // ========================================
  // 2. 기존 훅 연결
  // ========================================
  const { posts, setPosts } = usePosts();
  const { balance: lumenBalance, addLumens, spendLumens } = useLumens();

  // 🔹 차단된 유저 목록 가져오기
  const currentUserProfileLite = useCurrentUserProfileLite();
  const blockedUserIds = useMemo(() => {
    return (currentUserProfileLite as any)?.blockedUserIds || [];
  }, [currentUserProfileLite]);

  // 숨김 처리된 게시글 제외한 목록 + 차단 유저 제외
  const visiblePosts = useMemo(() => {
    // 차단 목록이 로딩 안 됐으면(undefined) 빈 배열로 취급
    const safeBlockedIds = Array.isArray(blockedUserIds) ? blockedUserIds : [];

    return posts.filter((p) => {
      // 1. 숨김 글 제외
      if ((p as any).hidden === true) return false;

      // 2. 작성자 ID 확인 (없으면 통과)
      const authorId = p.authorUid || (p as any).userId;
      if (!authorId) return true;

      // 3. 차단된 유저인지 확인
      return !safeBlockedIds.includes(authorId);
    });
  }, [posts, blockedUserIds]);

  // Firestore에서 posts가 바뀌면, 현재 열려있는 글(selectedPost)도 자동으로 최신 상태로 맞춰주기
  useEffect(() => {
    if (!selectedPost) return;

    const updated = posts.find((p) => p.id === selectedPost.id);
    if (updated && updated !== selectedPost) {
      setSelectedPost(updated);
    }
  }, [posts, selectedPost]);

  const clearAutoReplyTimer = useCallback(() => {
    if (autoReplyTimeoutRef.current) {
      clearTimeout(autoReplyTimeoutRef.current);
      autoReplyTimeoutRef.current = null;
    }
  }, []);

  const triggerAiAutoReply = useCallback(
    async (postId: string) => {
      const targetId = String(postId);
      if (autoReplyTriggeredRef.current.has(targetId)) return;

      const latestPost = posts.find((p) => p.id === targetId);
      if (!latestPost) return;

      const hasAiReply =
        latestPost.replies?.some(
          (r: any) => r?.isAi === true || typeof (r as any)?.aiLabel === "string",
        ) === true;
      const hasHumanReply =
        latestPost.replies?.some((r: any) => r?.isAi !== true && (r as any)?.hidden !== true) === true;

      if (hasAiReply || hasHumanReply) return;

      const createdAtDate = toDateSafe(latestPost.createdAt);
      if (!createdAtDate) return;

      const now = Date.now();
      if (now - createdAtDate.getTime() < AUTO_REPLY_WAIT_MS) return;

      autoReplyTriggeredRef.current.add(targetId);
      try {
        const callable = httpsCallable(functions, "aiAutoReply");
        const promptText = `${latestPost.title ?? ""} \n\n ${latestPost.content ?? ""}`;

        await callable({
          prompt: promptText,
          postId: targetId,
          postTitle: latestPost.title ?? "",
          postContent: latestPost.content ?? "",
          postCategory: latestPost.category ?? "",
          postCreatedAt: createdAtDate.toISOString(),
          replyCount: latestPost.replies?.length ?? 0,
        });
      } catch (error: any) {
        autoReplyTriggeredRef.current.delete(targetId);
        console.warn("[MainScreen] aiAutoReply 실패", { code: error?.code, message: error?.message });
      }
    },
    [posts],
  );

  useEffect(() => {
    clearAutoReplyTimer();

    if (!selectedPost || route.name !== "postDetail") {
      return undefined;
    }

    const targetId = selectedPost.id;
    const latestPost = posts.find((p) => p.id === targetId) ?? selectedPost;

    const hasAiReply =
      latestPost.replies?.some(
        (r: any) => r?.isAi === true || typeof (r as any)?.aiLabel === "string",
      ) === true;

    const hasHumanReply =
      latestPost.replies?.some((r: any) => r?.isAi !== true && (r as any)?.hidden !== true) === true;

    if (hasAiReply || hasHumanReply) {
      return undefined;
    }

    const createdAtDate = toDateSafe(latestPost.createdAt);
    if (!createdAtDate) return undefined;

    const now = Date.now();
    const targetTime = createdAtDate.getTime() + AUTO_REPLY_WAIT_MS;

    if (targetTime <= now) {
      void triggerAiAutoReply(String(targetId));
      return undefined;
    }

    const delay = Math.max(0, Math.min(targetTime - now, AUTO_REPLY_WAIT_MS));

    autoReplyTimeoutRef.current = setTimeout(() => {
      void triggerAiAutoReply(String(targetId));
    }, delay);

    return () => clearAutoReplyTimer();
  }, [clearAutoReplyTimer, posts, route.name, selectedPost, triggerAiAutoReply]);

  useEffect(
    () => () => {
      clearAutoReplyTimer();
    },
    [clearAutoReplyTimer],
  );

  // ========================================
  // 3. 분리된 훅들 연결
  // ========================================

  const {
    clampedTrust,
    updateTrust,
    addLumensWithTrust,
  } = useTrustScore({ addLumens });

  const titleActions = useTitleActions({
    lumenBalance,
    spendLumens,
  });

  const { userActivity, updateActivity } = useAchievements(
    addLumensWithTrust,
    (titleId, titleName) => {
      titleActions.addSpecialTitle(titleId, titleName);
    }
  );

  const isAdmin = currentUserProfileLite?.role === "admin";
  const userStats = useUserStats({ posts, userNickname }) as any;

  const [profileDescription, setProfileDescription] = useState("");

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setProfileDescription("");
      return;
    }

    const userRef = doc(db, "users", uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) {
          setProfileDescription("");
          return;
        }
        const data = snap.data() as any;
        const desc =
          typeof data.profileDescription === "string"
            ? data.profileDescription
            : "";
        setProfileDescription(desc);
      },
      (error) => {
        console.error("[MainScreen] users.profileDescription 구독 에러:", error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const lanternActions = useLanternActions({
    posts,
    setPosts,
    selectedPost,
    setSelectedPost,
    userNickname,
    userActivity,
    updateActivity,
    userPostLanterns: userStats.userPostLanterns,
    setUserPostLanterns: userStats.setUserPostLanterns ?? (() => { }),
    userReplyLanterns: userStats.userReplyLanterns,
    setUserReplyLanterns: userStats.setUserReplyLanterns ?? (() => { }),
    addLumensWithTrust,
    updateTrust,
  });

  const bookmarkActions = useBookmarkActions({ userNickname });
  const followActions = useFollowActions({ userNickname });

  const activeUserProfileNickname = useMemo(() => {
    const nicknameFromRoute =
      route.name === "userProfile" ? route.nickname : null;
    const resolvedNickname = nicknameFromRoute ?? visibility.showUserProfile;
    return resolvedNickname;
  }, [route, visibility.showUserProfile]);

  const profileOwnerUid = useMemo(() => {
    if (!activeUserProfileNickname) return null;

    const fromPost = posts.find(
      (p) =>
        p.author === activeUserProfileNickname &&
        (typeof (p as any).authorUid === "string" ||
          typeof (p as any).uid === "string")
    );

    if (!fromPost) return null;

    return (fromPost as any).authorUid ?? (fromPost as any).uid ?? null;
  }, [activeUserProfileNickname, posts]);

  const profileOwnerUidList = useMemo(
    () => (profileOwnerUid ? [profileOwnerUid] : []),
    [profileOwnerUid]
  );

  const profileOwnerProfiles = useUserProfiles(profileOwnerUidList);

  const profileOwnerProfile =
    profileOwnerUid ? profileOwnerProfiles[profileOwnerUid] ?? null : null;

  const otherFollowStats = useOtherUserFollowStats({
    viewedNickname: activeUserProfileNickname,
    currentUserNickname: userNickname,
  });

  const guideActions = useGuideActions({
    posts,
    setPosts,
    selectedPost,
    setSelectedPost,
    userNickname,
    userGuideCount: userStats.userGuideCount,
    setUserGuideCount: userStats.setUserGuideCount ?? (() => { }),
    addLumensWithTrust,
    updateActivity,
    updateTrust,
  });

  const replyActions = useReplyActions({
    posts,
    setPosts,
    selectedPost,
    setSelectedPost,
    userNickname,
    clampedTrust,
    updateActivity,
    userProfileImage,
  });

  const handlePostSelect = useCallback((post: Post) => {
    setSelectedPost(post);
  }, []);

  const formatTimeAgo = useCallback((date?: Date): string => {
    if (!date) return "";
    return formatRelativeOrDate(date);
  }, []);

  const formatCreatedAt = useCallback((date?: Date): string => {
    if (!date) return "";
    return date.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const notificationActions = useNotificationActions({
    posts,
    onPostSelect: handlePostSelect,
  });

  const postManagement = usePostManagement({
    posts,
    setPosts,
    userNickname,
    userProfileImage,
    clampedTrust,
    updateActivity,
  });

  const openPostDetail = useCallback(
    (post: Post, source: PostDetailSource) => {
      goPostDetail(post.id, source);
      setPostDetailSource(source);
      setSelectedPost(post);
      postManagement.incrementViews(post.id);
    },
    [postManagement, goPostDetail]
  );

  // ========================================
  // 4. 네비게이션 핸들러
  // ========================================
  const navigateToHome = useCallback(() => {
    setSelectedPost(null);
    goHome();
  }, [goHome]);

  const navigateToRanking = useCallback(() => {
    setSelectedPost(null);
    goRanking();
  }, [goRanking]);

  const navigateToBookmarks = useCallback(() => {
    setSelectedPost(null);
    goBookmarks();
  }, [goBookmarks]);

  const navigateToMyPage = useCallback(() => {
    setSelectedPost(null);
    goMyPage();
  }, [goMyPage]);

  const navigateToAchievements = useCallback(() => {
    setSelectedPost(null);
    goAchievements();
  }, [goAchievements]);

  const { isOnline, wasOffline } = useOnlineStatus();

  const handleNotificationToggle = useCallback(
    (open: boolean) => notificationActions.setShowNotifications(open),
    [notificationActions]
  );

  const handleNotificationSettingsClick = useCallback(() => {
    setRoute({ name: "notificationSettings" });
  }, [setRoute]);

  const handleCategoryClick = useCallback(() => {
    setRoute({ name: "category" });
  }, [setRoute]);

  const handleQuizClick = useCallback(() => {
    setRoute({ name: "quiz" });
  }, [setRoute]);

  const handleTitleShopClick = useCallback(() => {
    setRoute({ name: "titleShop" });
  }, [setRoute]);

  const handleOpenAdminReports = useCallback(() => {
    if (!isAdmin) return;
    setRoute({ name: "adminReports" });
  }, [isAdmin, setRoute]);


  // ========================================
  // 🆕 [추가] 새로고침 로직
  // ========================================
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // 1. 만약 get() 방식을 쓴다면 여기서 데이터를 다시 fetch 합니다.
      // await posts.refetch(); 

      // 2. onSnapshot(실시간)을 쓰고 있다면, 단순히 시각적 피드백(UX)을 위해 딜레이만 줍니다.
      // (사용자는 새로고침이 되었다고 느끼게 됩니다)
      await new Promise((resolve) => setTimeout(resolve, 800));

      toast.success("최신 목록을 불러왔어요");
    } catch (error) {
      console.error("새로고침 실패", error);
    } finally {
      setIsRefreshing(false);
    }
  }, []); // posts가 바뀔 때마다 갱신할 필요 없으므로 의존성 비움
  // ========================================
  // 5. 초기화 및 뒤로가기 처리
  // ========================================

  useEffect(() => {
    if (shouldOpenMyPageOnMain) {
      setRoute({ name: "myPage" });
      onMainScreenReady?.();
    }
  }, [shouldOpenMyPageOnMain, onMainScreenReady, setRoute]);

  const navigationStateRef = useRef({
    route,
    showWriteScreen,
    selectedPost,
    showTitlesCollection,
    showTitleShop,
    showAchievements,
    showMyPage,
    showSearchScreen,
    showCategoryScreen,
    showNotificationSettings,
    showMyContentList,
    showFollowList,
    showUserProfile,
    userProfileSection,
    lastUserProfileNickname,
    currentScreen,
    postDetailSource,
  });

  const syncLayer = useCallback(
    (layer: Layer, active: boolean) => {
      if (active) {
        pushLayer(layer);
      } else {
        removeLayer(layer);
      }
    },
    [pushLayer, removeLayer]
  );

  useEffect(() => {
    navigationStateRef.current = {
      route,
      showWriteScreen,
      selectedPost,
      showTitlesCollection,
      showTitleShop,
      showAchievements,
      showMyPage,
      showSearchScreen,
      showCategoryScreen,
      showNotificationSettings,
      showMyContentList,
      showFollowList,
      showUserProfile,
      userProfileSection,
      lastUserProfileNickname,
      currentScreen,
      postDetailSource,
    };
  });

  useEffect(() => syncLayer("write", showWriteScreen), [showWriteScreen, syncLayer]);
  useEffect(() => syncLayer("postDetail", !!selectedPost), [selectedPost, syncLayer]);
  useEffect(() => syncLayer("titlesCollection", showTitlesCollection), [showTitlesCollection, syncLayer]);
  useEffect(() => syncLayer("titleShop", showTitleShop), [showTitleShop, syncLayer]);
  useEffect(() => syncLayer("achievements", showAchievements), [showAchievements, syncLayer]);
  useEffect(() => syncLayer("userProfile", !!showUserProfile), [showUserProfile, syncLayer]);
  useEffect(() => syncLayer("myContentList", !!showMyContentList), [showMyContentList, syncLayer]);
  useEffect(() => syncLayer("followList", !!showFollowList), [showFollowList, syncLayer]);
  useEffect(() => syncLayer("myPage", showMyPage), [showMyPage, syncLayer]);
  useEffect(() => syncLayer("category", showCategoryScreen), [showCategoryScreen, syncLayer]);
  useEffect(() => syncLayer("notificationSettings", showNotificationSettings), [showNotificationSettings, syncLayer]);
  useEffect(() => syncLayer("ranking", visibility.showRanking), [visibility.showRanking, syncLayer]);
  useEffect(() => syncLayer("search", showSearchScreen), [showSearchScreen, syncLayer]);
  useEffect(() => syncLayer("quiz", route.name === "quiz"), [route.name, syncLayer]);

  const closePostDetailFromState = useCallback((state?: any) => {
    const s = state ?? navigationStateRef.current;
    if (!s.selectedPost) return;

    if (s.postDetailSource === "myPostsList") {
      setSelectedPost(null);
      setRoute({ name: "myContentList", mode: "posts" });
      setCurrentScreen("profile");
    } else if (s.postDetailSource === "myRepliesList") {
      setSelectedPost(null);
      setRoute({ name: "myContentList", mode: "replies" });
      setCurrentScreen("profile");
    } else if (s.postDetailSource === "followList") {
      setSelectedPost(null);
      const currentMode = s.showFollowList || "followers";
      setRoute({
        name: "followList",
        mode: currentMode,
      });
      setCurrentScreen("profile");
    } else if (s.postDetailSource === "myPage") {
      setSelectedPost(null);
      setRoute({ name: "myPage" });
      setCurrentScreen("profile");
    } else if (s.postDetailSource === "userProfilePosts") {
      setSelectedPost(null);
      const nickname = s.lastUserProfileNickname ?? s.showUserProfile;
      if (nickname) {
        setUserProfileSection("posts");
        setRoute({ name: "userProfile", nickname });
      } else {
        setUserProfileSection("profile");
        setRoute({ name: "home" });
      }
      setCurrentScreen("home");
    } else if (s.postDetailSource === "userProfileReplies") {
      setSelectedPost(null);
      const nickname = s.lastUserProfileNickname ?? s.showUserProfile;
      if (nickname) {
        setUserProfileSection("replies");
        setRoute({ name: "userProfile", nickname });
      } else {
        setUserProfileSection("profile");
        setRoute({ name: "home" });
      }
      setCurrentScreen("home");
    } else if (s.postDetailSource === "category") {
      setSelectedPost(null);
      setRoute({ name: "category" });
      setCurrentScreen("home");
    } else if (s.postDetailSource === "search") {
      setSelectedPost(null);
      setRoute({ name: "search" });
      setCurrentScreen("home");
    } else {
      setSelectedPost(null);
      setRoute({ name: "home" });
    }

    setPostDetailSource("home");
  }, [setCurrentScreen, setPostDetailSource, setRoute, setSelectedPost, setUserProfileSection]);

  const handleLayerBackInternal = useCallback((): boolean => {
    const top = popLayer();
    if (!top) {
      return false;
    }

    switch (top) {
      case "write":
        setShowWriteScreen(false);
        setRoute({ name: "home" });
        break;
      case "postDetail":
        closePostDetailFromState();
        break;
      case "titlesCollection":
        setRoute({ name: "myPage" });
        break;
      case "titleShop":
        setRoute({ name: "home" });
        break;
      case "achievements":
        setRoute({ name: "myPage" });
        break;
      case "userProfile":
        if (userProfileSource?.source === "followList") {
          const mode = (userProfileSource.mode === "followers" || userProfileSource.mode === "following")
            ? userProfileSource.mode
            : "followers";

          setRoute({ name: "followList", mode });
          setCurrentScreen("profile");
        } else if (userProfileSource?.source === "myPage") {
          setRoute({ name: "myPage" });
          setCurrentScreen("profile");
        } else if (userProfileSource?.source === "myContentList") {
          const mode = (userProfileSource.mode === "posts" || userProfileSource.mode === "replies")
            ? userProfileSource.mode
            : "posts";

          setRoute({ name: "myContentList", mode });
          setCurrentScreen("profile");
        } else if (userProfileSource?.source === "userProfile") {
          setRoute({ name: "home" });
          setCurrentScreen("home");
        } else {
          setRoute({ name: "home" });
          setCurrentScreen("home");
        }
        setUserProfileSource(null);
        break;
      case "myContentList":
        setRoute({ name: "myPage" });
        setCurrentScreen("profile");
        break;
      case "followList":
        setRoute({ name: "myPage" });
        setCurrentScreen("profile");
        break;
      case "myPage":
        setRoute({ name: "home" });
        setCurrentScreen("home");
        break;
      case "category":
        setRoute({ name: "home" });
        break;
      case "notificationSettings":
        setRoute({ name: "myPage" });
        break;
      case "ranking":
        goHome();
        break;
      case "quiz":
        setRoute({ name: "home" });
        setCurrentScreen("home");
        break;
      case "search":
        setRoute({ name: "home" });
        break;
      default:
        break;
    }

    return true;
  }, [
    closePostDetailFromState,
    goHome,
    popLayer,
    setCurrentScreen,
    setRoute,
    setShowWriteScreen,
    setUserProfileSource,
    userProfileSource
  ]);

  const handleLayerBack = useCallback(() => {
    handleLayerBackInternal();
  }, [handleLayerBackInternal]);

  useEffect(() => {
    if (showFollowList === "followers") {
      followActions.fetchFollowerUsers();
    }
  }, [showFollowList, followActions]);

  useEffect(() => {
    let backButtonListener: PluginListenerHandle | null = null;

    const setupBackButtonListener = async () => {
      if (!CapacitorApp?.addListener) {
        return;
      }
      try {
        backButtonListener = await CapacitorApp.addListener("backButton", () => {
          const state = navigationStateRef.current;

          if (handleLayerBackInternal()) {
            return;
          }

          if (state.route.name === "adminReports") {
            setRoute({ name: "home" });
            setCurrentScreen("home");
            return;
          }

          if (state.currentScreen === "home" && !state.selectedPost) {
            onRequestExit?.();
            return;
          }

          setRoute({ name: "home" });
          setCurrentScreen("home");
        });
      } catch (error) {
        console.error("[MainScreen] backButton listener 등록 실패:", error);
      }
    };

    setupBackButtonListener();
    return () => {
      backButtonListener?.remove();
    };
  }, [handleLayerBackInternal, onRequestExit, setCurrentScreen, setRoute]);

  const handleStartWriting = useCallback(() => {
    postManagement.handleStartWriting(() => {
      setShowWriteScreen(true);
      setRoute({ name: "home" });
    });
  }, [postManagement, setRoute, setShowWriteScreen]);

  const handlePostSubmit = useCallback(
    async (postData: any) => {
      const createdPost = await postManagement.createPost(postData);
      if (createdPost) {
        setShowWriteScreen(false);
        setSelectedPost(createdPost);
        setRoute({ name: "postDetail", postId: createdPost.id, source: "home" });
      }
    },
    [postManagement, setRoute, setSelectedPost, setShowWriteScreen]
  );

  const handleMentionClick = useCallback((nickname: string) => {
    if (!nickname || nickname === DELETED_USER_NAME) {
      return;
    }

    setUserProfileSection("profile");
    setLastUserProfileNickname(nickname);
    setUserProfileSource({ source: "home" });
    setRoute({ name: "userProfile", nickname });
  }, [setLastUserProfileNickname, setRoute, setUserProfileSection]);

  const renderContentWithMentions = useCallback(
    (content?: string | null): React.ReactNode => {
      return replyActions.renderContentWithMentions(content ?? "", handleMentionClick);
    },
    [replyActions, handleMentionClick]
  );

  const myPageData = useMemo(() => {
    const userPostsForMyPage = posts.filter((p) => p.author === userNickname);

    const userRepliesForMyPage = posts.flatMap((post) =>
      (post.replies ?? [])
        .filter((r: Reply) => r.author === userNickname)
        .map((r: Reply) => ({
          ...r,
          postTitle: post.title,
          postAuthor: post.author,
          postId: post.id,
        }))
    );

    const userBookmarkedPosts = posts
      .filter((p) => bookmarkActions.isBookmarked(p.id))
      .filter((p) => !((p as any).hidden === true));

    return { userPostsForMyPage, userRepliesForMyPage, userBookmarkedPosts };
  }, [posts, userNickname, bookmarkActions]);

  const profileViewData = useMemo(() => {
    if (!isUserProfileVisible) {
      return {
        profileTarget: null as string | null,
        profilePosts: [] as Post[],
        profileFirstAvatar: "",
        followerCountForProfile: 0,
        followingCountForProfile: 0,
        followerUsersForProfile: EMPTY_STRING_ARRAY as string[],
        followingUsersForProfile: EMPTY_STRING_ARRAY as string[]
      };
    }

    const profileTarget = isUserProfileVisible;
    const profilePosts = posts.filter((p) => p.author === profileTarget);
    const profileFirstAvatar = profilePosts[0]?.authorAvatar ?? "";

    const isMyself = profileTarget === userNickname;

    const followerCountForProfile = isMyself
      ? followActions.followerCount
      : otherFollowStats?.followerCount ?? 0;

    const followingCountForProfile = isMyself
      ? followActions.followingCount
      : otherFollowStats?.followingCount ?? 0;

    const followerUsersForProfile = isMyself
      ? followActions.followerUsers
      : otherFollowStats?.followerUsers ?? (EMPTY_STRING_ARRAY as string[]);

    const followingUsersForProfile = isMyself
      ? followActions.followingUsers
      : otherFollowStats?.followingUsers ?? (EMPTY_STRING_ARRAY as string[]);

    return {
      profileTarget,
      profilePosts,
      profileFirstAvatar,
      followerCountForProfile,
      followingCountForProfile,
      followerUsersForProfile,
      followingUsersForProfile
    };
  }, [isUserProfileVisible, posts, userNickname, followActions, otherFollowStats]);

  const myContentData = useMemo(() => {
    const myPosts = visiblePosts.filter((p) => p.author === userNickname);
    const myReplies = visiblePosts.flatMap((post) =>
      (post.replies ?? [])
        .filter((r: Reply) => r.author === userNickname)
        .map((r: Reply) => ({
          ...r,
          authorAvatar: r.authorAvatar ?? undefined,
          postTitle: post.title,
          postAuthor: post.author,
          postId: post.id,
          postAuthorUid:
            typeof (post as any).authorUid === "string"
              ? (post as any).authorUid
              : typeof (post as any).uid === "string"
                ? (post as any).uid
                : null,
        }))
    );

    return { myPosts, myReplies };
  }, [visiblePosts, userNickname]);

  const [visitedScreens, setVisitedScreens] = useState<Set<string>>(new Set(["home"]));

  useEffect(() => {
    setVisitedScreens((prev) => {
      let screenKey = "";
      if (visibility.showMyPage) screenKey = "myPage";
      else if (visibility.showRanking) screenKey = "ranking";
      else if (visibility.showBookmarks) screenKey = "bookmarks";
      else if (visibility.showTitleShop) screenKey = "titleShop";
      else if (visibility.showTitlesCollection) screenKey = "titlesCollection";
      else if (visibility.showAchievements) screenKey = "achievements";
      else if (route.name === "quiz") screenKey = "quiz";
      else if (visibility.showFollowList) screenKey = "followList";
      else if (visibility.showMyContentList) screenKey = "myContentList";
      else if (visibility.showCategoryScreen) screenKey = "category";
      else if (visibility.showSearchScreen) screenKey = "search";
      else if (visibility.showUserProfile) screenKey = "userProfile";
      else if (visibility.showNotificationSettings) screenKey = "notificationSettings";
      else if (route.name === "adminReports") screenKey = "adminReports";
      else screenKey = "home";

      if (prev.has(screenKey)) return prev;
      const next = new Set(prev);
      next.add(screenKey);
      return next;
    });
  }, [visibility, route.name]);

  const isPostDetail =
    route.name === "postDetail" &&
    !!selectedPost &&
    String(route.postId) === String(selectedPost.id);

  if (isWriteVisible) {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <WriteScreen
          onBack={handleLayerBack}
          onSubmit={handlePostSubmit}
          categories={categories}
        />
      </Suspense>
    );
  }

  return (
    <div className={`w-full h-full relative ${isDarkMode ? "dark" : ""}`}>
      <div
        className={`w-full h-full bg-background text-foreground flex flex-col absolute inset-0 ${currentScreen === "home" && !isCategoryVisible && !isSearchVisible && !isTitleShopVisible && !isUserProfileVisible && !route.name.includes('admin')
          ? "z-10 opacity-100"
          : "z-0 opacity-0 pointer-events-none hidden"
          }`}
      >
        <div className="flex-1 overflow-hidden flex flex-col">
          {(!isOnline || wasOffline) && (
            <div
              className={`px-3 py-2 text-xs ${!isOnline
                ? "bg-red-500/80 text-white"
                : "bg-emerald-500/80 text-white"
                }`}
            >
              {!isOnline
                ? "오프라인 상태입니다. 작성/갱신이 제한될 수 있습니다."
                : "다시 연결되었습니다."}
            </div>
          )}
          {isPostDetail && selectedPost ? (
            <PostDetailView
              post={selectedPost}
              userNickname={userNickname}
              userProfileImage={userProfileImage}
              currentTitle={titleActions.currentTitle}
              isDarkMode={isDarkMode}
              isPostLanterned={lanternActions.isPostLanterned(selectedPost.id)}
              isReplyLanterned={lanternActions.isReplyLanterned}
              onLanternToggle={() =>
                lanternActions.handleLanternToggle(selectedPost.id)
              }
              onReplyLanternToggle={lanternActions.handleReplyLanternToggle}
              isBookmarked={bookmarkActions.isBookmarked(selectedPost.id)}
              onBookmarkToggle={() =>
                bookmarkActions.handleBookmarkToggle(selectedPost.id)
              }
              isGuideReply={guideActions.isGuideReply}
              hasGuide={guideActions.hasGuide(selectedPost.id)}
              onGuideSelect={guideActions.handleGuideSelect}
              newReplyContent={replyActions.newReplyContent}
              onReplyContentChange={replyActions.handleReplyContentChange}
              onReplySubmit={replyActions.handleReplySubmit}
              replyInputRef={replyActions.replyInputRef}
              onClose={() => closePostDetailFromState()}
              onAuthorClick={() => {
                setUserProfileSection("profile");
                setLastUserProfileNickname(selectedPost.author);
                if (postDetailSource === "followList") {
                  setUserProfileSource({ source: "followList" });
                } else if (postDetailSource === "myPage" || postDetailSource === "myPostsList" || postDetailSource === "myRepliesList") {
                  setUserProfileSource({ source: "myPage" });
                } else if (postDetailSource === "userProfilePosts" || postDetailSource === "userProfileReplies") {
                  setUserProfileSource({ source: "userProfile" });
                } else {
                  setUserProfileSource({ source: "home" });
                }
                setRoute({ name: "userProfile", nickname: selectedPost.author });
              }}
              onMentionAuthor={() =>
                replyActions.handleInsertMention(selectedPost.author)
              }
              onMentionReplyAuthor={replyActions.handleInsertMention}
              onReplyAuthorClick={(author) => {
                setUserProfileSection("profile");
                setLastUserProfileNickname(author);
                if (postDetailSource === "followList") {
                  setUserProfileSource({ source: "followList" });
                } else if (postDetailSource === "myPage" || postDetailSource === "myPostsList" || postDetailSource === "myRepliesList") {
                  setUserProfileSource({ source: "myPage" });
                } else if (postDetailSource === "userProfilePosts" || postDetailSource === "userProfileReplies") {
                  setUserProfileSource({ source: "userProfile" });
                } else {
                  setUserProfileSource({ source: "home" });
                }
                setRoute({ name: "userProfile", nickname: author });
              }}
              onReport={() => setReportingPost(selectedPost)}
              onDelete={() => {
                postManagement.deletePost(selectedPost.id);
                closePostDetailFromState();
              }}
              onReportReply={(reply) => setReportingReply(reply)}
              renderContentWithMentions={renderContentWithMentions}
              canSubmitReply={replyActions.canSubmitReply}
              blockedUserIds={blockedUserIds} // 🆕 차단 목록 전달
            />
          ) : (
            <>
              <HomeHeader
                isDarkMode={isDarkMode}
                onToggleDarkMode={onToggleDarkMode}
                hasNotifications={notificationActions.notifications.some((n) => !n.isRead)}
                showNotifications={notificationActions.showNotifications}
                onNotificationsToggle={handleNotificationToggle}
                notifications={notificationActions.notifications}
                onNotificationClick={notificationActions.handleNotificationClick}
                onMarkAllNotificationsRead={
                  notificationActions.handleMarkAllNotificationsRead
                }
                onNotificationSettingsClick={handleNotificationSettingsClick}
                onNotificationDelete={notificationActions.removeNotification}
                activeCategory={activeCategory}
                activeSubCategory={activeSubCategory}
                onCategoryClick={handleCategoryClick}
                onQuizClick={handleQuizClick}
                onTitleShopClick={handleTitleShopClick}
                isAdmin={isAdmin}
                onOpenAdminReports={handleOpenAdminReports}
              />
              <PostListView
                posts={visiblePosts}
                userNickname={userNickname}
                userProfileImage={userProfileImage}
                activeCategory={activeCategory}
                activeSubCategory={activeSubCategory}
                sortBy={sortBy}
                categories={categories}
                onSubCategoryChange={setActiveSubCategory}
                onSortChange={setSortBy}
                isPostLanterned={lanternActions.isPostLanterned}
                isBookmarked={bookmarkActions.isBookmarked}
                onPostClick={(post) => openPostDetail(post, "home")}
                onLanternToggle={lanternActions.handleLanternToggle}
                onBookmarkToggle={bookmarkActions.handleBookmarkToggle}
                onStartWriting={handleStartWriting}
                currentTitle={titleActions.currentTitle}
                blockedUserIds={blockedUserIds} // 🆕 차단 목록 전달
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
              />
            </>
          )}
        </div>
        <BottomNavigation
          onHomeClick={navigateToHome}
          onRankingClick={navigateToRanking}
          onBookmarksClick={navigateToBookmarks}
          onMyPageClick={navigateToMyPage}
          onWriteClick={handleStartWriting}
          activeTab={currentScreen}
        />
      </div>

      {visitedScreens.has("myPage") && (
        <div className={`absolute inset-0 bg-background ${isMyPageVisible ? "z-20 block" : "z-0 hidden"}`}>
          <Suspense fallback={<ScreenFallback />}>
            <div className="w-full h-full flex flex-col">
              <MyPageScreen
                userNickname={userNickname}
                userProfileImage={userProfileImage}
                onProfileImageChange={onProfileImageChange}
                onBack={handleLayerBack}
                onLogout={onLogout}
                isDarkMode={isDarkMode}
                onToggleDarkMode={onToggleDarkMode}
                onShowTerms={onShowTerms}
                onShowPrivacy={onShowPrivacy}
                onShowOpenSourceLicenses={onShowOpenSourceLicenses}
                onShowAttributions={onShowAttributions}
                userPosts={myPageData.userPostsForMyPage}
                userReplies={myPageData.userRepliesForMyPage}
                bookmarkedPosts={myPageData.userBookmarkedPosts}
                currentTitle={titleActions.currentTitle}
                onManageBlockedUsers={() => setShowBlockedUsers(true)}
                userGuideCount={userStats.userGuideCount}
                trustScore={clampedTrust}
                profileDescription={profileDescription}
                onProfileDescriptionChange={setProfileDescription}
                onHomeClick={navigateToHome}
                onRankingClick={navigateToRanking}
                onBookmarksClick={navigateToBookmarks}
                onWriteClick={handleStartWriting}
                onTitleShopClick={() => {
                  setRoute({ name: "titleShop" });
                }}
                onAchievementsClick={navigateToAchievements}
                onTitlesCollectionClick={() => {
                  setRoute({ name: "titlesCollection" });
                }}
                followerCount={followActions.followerCount}
                followingCount={followActions.followingCount}
                onFollowerCardClick={() => {
                  setRoute({ name: "followList", mode: "followers" });
                }}
                onFollowingCardClick={() => {
                  setRoute({ name: "followList", mode: "following" });
                }}
                onMyPostsCardClick={() => {
                  setRoute({ name: "myContentList", mode: "posts" });
                }}
                onMyRepliesCardClick={() => {
                  setRoute({ name: "myContentList", mode: "replies" });
                }}
                onPostClick={(postId) => {
                  const post = posts.find((p) => p.id === postId);
                  if (post) {
                    openPostDetail(post, "myPage");
                  }
                }}
                onReplyClick={(postId) => {
                  const post = posts.find((p) => p.id === postId);
                  if (post) {
                    setPostDetailSource("myRepliesList");
                    setSelectedPost(post);
                    setRoute({ name: "postDetail", postId: post.id, source: "myRepliesList" });
                  }
                }}
                autoOpenSettings={shouldOpenSettingsOnMyPage}
                onAutoSettingsOpened={onSettingsOpenedFromMain}
              />
              <BottomNavigation
                onHomeClick={navigateToHome}
                onRankingClick={navigateToRanking}
                onBookmarksClick={navigateToBookmarks}
                onMyPageClick={navigateToMyPage}
                onWriteClick={handleStartWriting}
                activeTab={currentScreen}
              />
            </div>
          </Suspense>
        </div>
      )}

      {visitedScreens.has("ranking") && (
        <div
          className={`absolute inset-0 bg-background transition-all duration-200 ease-out ${isRankingVisible
            ? "z-20 opacity-100 translate-y-0"
            : "z-0 opacity-0 translate-y-2 pointer-events-none"
            }`}
        >
          <Suspense fallback={<ScreenFallback />}>
            <div className="w-full h-full flex flex-col">
              <RankingScreen
                onBack={handleLayerBack}
                weeklyGuideRanking={userStats.weeklyGuideRanking}
                totalGuideRanking={userStats.totalGuideRanking}
                weeklyLanternRanking={userStats.weeklyLanternRanking}
              />
              <BottomNavigation
                onHomeClick={navigateToHome}
                onRankingClick={navigateToRanking}
                onBookmarksClick={navigateToBookmarks}
                onMyPageClick={navigateToMyPage}
                onWriteClick={handleStartWriting}
                activeTab={currentScreen}
              />
            </div>
          </Suspense>
        </div>
      )}

      {visitedScreens.has("bookmarks") && (
        <div
          className={`absolute inset-0 bg-background transition-all duration-200 ease-out ${isBookmarksVisible
            ? "z-20 opacity-100 translate-y-0"
            : "z-0 opacity-0 translate-y-2 pointer-events-none"
            }`}
        >
          <Suspense fallback={<ScreenFallback />}>
            <div className="w-full h-full flex flex-col">
              <BookmarkScreen
                onBack={handleLayerBack}
                bookmarkedPosts={bookmarkActions.bookmarkedPosts}
                posts={visiblePosts as any}
                onPostSelect={(post) => {
                  const pickedId = String((post as any)?.id ?? "");
                  const target = visiblePosts.find((p) => String(p.id) === pickedId);
                  if (!target) return;
                  setPostDetailSource("category");
                  setSelectedPost(target);
                  setRoute({ name: "postDetail", postId: String(target.id), source: "category" });
                }}
                userNickname={userNickname}
                currentTitle={titleActions.currentTitle}
              />
              <BottomNavigation
                onHomeClick={navigateToHome}
                onRankingClick={navigateToRanking}
                onBookmarksClick={navigateToBookmarks}
                onMyPageClick={navigateToMyPage}
                onWriteClick={handleStartWriting}
                activeTab={currentScreen}
              />
            </div>
          </Suspense>
        </div>
      )}

      {visitedScreens.has("quiz") && (
        <div
          className={`absolute inset-0 bg-background transition-all duration-200 ease-out ${isQuizVisible
            ? "z-20 opacity-100 translate-y-0"
            : "z-0 opacity-0 translate-y-2 pointer-events-none"
            }`}
        >
          <div className="w-full h-full flex flex-col">
            <QuizScreen onBack={handleLayerBack} />
            <BottomNavigation
              onHomeClick={navigateToHome}
              onRankingClick={navigateToRanking}
              onBookmarksClick={navigateToBookmarks}
              onMyPageClick={navigateToMyPage}
              onWriteClick={handleStartWriting}
              activeTab={currentScreen}
            />
          </div>
        </div>
      )}

      {visitedScreens.has("category") && (
        <div
          className={`absolute inset-0 bg-background transition-all duration-200 ease-out ${isCategoryVisible
            ? "z-30 opacity-100 translate-y-0"
            : "z-0 opacity-0 translate-y-2 pointer-events-none"
            }`}
        >
          <Suspense fallback={<ScreenFallback />}>
            <CategoryScreen
              onBack={handleLayerBack}
              categories={categories}
              activeCategory={activeCategory}
              activeSubCategory={activeSubCategory}
              onCategorySelect={(catId, subCatId) => {
                setActiveCategory(catId);
                setActiveSubCategory(subCatId || "전체");
              }}
              posts={visiblePosts as any}
              onPostSelect={(post) => {
                openPostDetail(post as any, "home");
                setRoute({ name: "postDetail", postId: (post as any).id, source: "home" });
              }}
              userNickname={userNickname}
              userProfileImage={userProfileImage}
              currentTitle={titleActions.currentTitle}
              isPostLanterned={lanternActions.isPostLanterned}
              isBookmarked={bookmarkActions.isBookmarked}
              onLanternToggle={lanternActions.handleLanternToggle}
              onBookmarkToggle={bookmarkActions.handleBookmarkToggle}
              formatTimeAgo={formatTimeAgo}
              formatCreatedAt={formatCreatedAt}
            />
          </Suspense>
        </div>
      )}

      {visitedScreens.has("search") && (
        <div
          className={`absolute inset-0 bg-background transition-all duration-200 ease-out ${isSearchVisible
            ? "z-30 opacity-100 translate-y-0"
            : "z-0 opacity-0 translate-y-2 pointer-events-none"
            }`}
        >
          <Suspense fallback={<ScreenFallback />}>
            <SearchScreen
              onBack={handleLayerBack}
              posts={visiblePosts}
              onPostSelect={(post) => {
                openPostDetail(post as any, "search");
              }}
              userNickname={userNickname}
              userProfileImage={userProfileImage}
              currentTitle={titleActions.currentTitle}
              isPostLanterned={lanternActions.isPostLanterned}
              isBookmarked={bookmarkActions.isBookmarked}
              onLanternToggle={lanternActions.handleLanternToggle}
              onBookmarkToggle={bookmarkActions.handleBookmarkToggle}
              formatTimeAgo={formatTimeAgo}
              formatCreatedAt={formatCreatedAt}
            />
          </Suspense>
        </div>
      )}

      {isTitleShopVisible && (
        <div className="absolute inset-0 z-30 bg-background">
          <Suspense fallback={<ScreenFallback />}>
            <div className="w-full h-full flex flex-col">
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                <TitleShop
                  onBack={handleLayerBack}
                  userLumens={lumenBalance}
                  userPostLanterns={userStats.userPostLanterns}
                  userReplyLanterns={userStats.userReplyLanterns}
                  userGuideCount={userStats.userGuideCount}
                  ownedTitles={titleActions.ownedTitles}
                  currentTitle={titleActions.currentTitle}
                  onTitlePurchase={titleActions.handleTitlePurchase}
                  onTitleEquip={titleActions.handleTitleEquip}
                />
              </div>
              <BottomNavigation
                onHomeClick={navigateToHome}
                onRankingClick={navigateToRanking}
                onBookmarksClick={navigateToBookmarks}
                onMyPageClick={navigateToMyPage}
                onWriteClick={handleStartWriting}
                activeTab={currentScreen}
              />
            </div>
          </Suspense>
        </div>
      )}

      {isUserProfileVisible && (
        <div className="absolute inset-0 z-30 bg-background">
          {(() => {
            const {
              profileTarget,
              profilePosts,
              profileFirstAvatar,
              followerCountForProfile,
              followingCountForProfile,
              followerUsersForProfile,
              followingUsersForProfile
            } = profileViewData;

            const isMyself = profileTarget === userNickname;
            const profileNicknameFromDoc =
              (profileOwnerProfile as any)?.nickname as string | undefined;

            const isDeletedProfile =
              (profileOwnerProfile as any)?.isDeleted === true ||
              profileNicknameFromDoc === "탈퇴한 사용자";

            const effectiveProfileName = isDeletedProfile
              ? "탈퇴한 사용자"
              : profileNicknameFromDoc ?? profileTarget ?? "";

            return (
              <Suspense fallback={<ScreenFallback />}>
                <div className="w-full h-full flex flex-col">
                  <UserProfileDialog
                    onBack={handleLayerBack}
                    username={effectiveProfileName}
                    userAvatar={
                      isMyself
                        ? userProfileImage
                        : profileOwnerProfile?.profileImage ??
                        profileFirstAvatar ??
                        ""
                    }
                    userBio={
                      isMyself
                        ? profileDescription
                        : profileOwnerProfile?.profileDescription ?? ""
                    }
                    posts={profilePosts}
                    trustScore={isMyself ? clampedTrust : undefined}
                    reportCount={0}
                    achievementCount={0}
                    titleCount={0}
                    guideCount={0}
                    followerCount={followerCountForProfile}
                    followingCount={followingCountForProfile}
                    followerUsers={followerUsersForProfile}
                    followingUsers={followingUsersForProfile}
                    onPostClick={(postId) => {
                      const post = posts.find((p) => p.id === postId);
                      if (post) {
                        setPostDetailSource("userProfilePosts");
                        setLastUserProfileNickname(profileTarget);
                        setSelectedPost(post);
                        setRoute({
                          name: "postDetail",
                          postId: post.id,
                          source: "userProfilePosts",
                        });
                      }
                    }}
                    onReplyClick={(postId) => {
                      const post = posts.find((p) => p.id === postId);
                      if (post) {
                        setPostDetailSource("userProfileReplies");
                        setLastUserProfileNickname(profileTarget);
                        setSelectedPost(post);
                        setRoute({
                          name: "postDetail",
                          postId: post.id,
                          source: "userProfileReplies",
                        });
                      }
                    }}
                    isMyself={isMyself}
                    isFollowing={followActions.isFollowing(profileTarget ?? "")}
                    onToggleFollowUser={followActions.handleToggleFollowUser}
                    onFollowUserClick={(nickname) => {
                      setUserProfileSection("profile");
                      setLastUserProfileNickname(nickname);
                      setUserProfileSource({ source: "userProfile" });
                      setRoute({ name: "userProfile", nickname });
                    }}
                    activeSection={userProfileSection}
                    onChangeSection={setUserProfileSection}
                  />
                  <BottomNavigation
                    activeTab={currentScreen}
                    onHomeClick={navigateToHome}
                    onRankingClick={navigateToRanking}
                    onBookmarksClick={navigateToBookmarks}
                    onMyPageClick={navigateToMyPage}
                    onWriteClick={handleStartWriting}
                  />
                </div>
              </Suspense>
            );
          })()}
        </div>
      )}

      {isTitlesCollectionVisible && (
        <div className="absolute inset-0 z-30 bg-background">
          <Suspense fallback={<ScreenFallback />}>
            <div className="w-full h-full flex flex-col">
              <div className="flex-1 overflow-y-auto">
                <TitlesCollection
                  onBack={handleLayerBack}
                  userTitles={titleActions.ownedTitles}
                  equippedTitle={titleActions.currentTitle}
                  onTitleEquip={titleActions.handleTitleEquip}
                  onTitleUnequip={titleActions.handleTitleUnequip}
                />
              </div>
              <BottomNavigation
                onHomeClick={navigateToHome}
                onRankingClick={navigateToRanking}
                onBookmarksClick={navigateToBookmarks}
                onMyPageClick={navigateToMyPage}
                onWriteClick={handleStartWriting}
                activeTab={currentScreen}
              />
            </div>
          </Suspense>
        </div>
      )}

      {effectiveFollowList && (
        <div className="absolute inset-0 z-30 bg-background">
          <Suspense fallback={<ScreenFallback />}>
            <div className="w-full h-full flex flex-col">
              <FollowListScreen
                mode={effectiveFollowList}
                users={effectiveFollowList === "followers" ? followActions.followerUsersDetailed : followActions.followingUsersDetailed}
                onBack={handleLayerBack}
                onUserClick={(nickname) => {
                  if (!nickname || nickname === DELETED_USER_NAME) return;
                  setUserProfileSection("profile");
                  setLastUserProfileNickname(nickname);
                  const mode = effectiveFollowList as "followers" | "following";
                  setUserProfileSource({ source: "followList", mode });
                  setRoute({ name: "userProfile", nickname });
                }}
              />
              <BottomNavigation
                onHomeClick={navigateToHome}
                onRankingClick={navigateToRanking}
                onBookmarksClick={navigateToBookmarks}
                onMyPageClick={navigateToMyPage}
                onWriteClick={handleStartWriting}
                activeTab={currentScreen}
              />
            </div>
          </Suspense>
        </div>
      )}

      {effectiveMyContentList && (
        <div className="absolute inset-0 z-30 bg-background">
          <Suspense fallback={<ScreenFallback />}>
            <div className="w-full h-full flex flex-col">
              <MyContentListScreen
                mode={effectiveMyContentList}
                onBack={handleLayerBack}
                posts={myContentData.myPosts}
                replies={myContentData.myReplies}
                onPostClick={(postId) => {
                  const post = visiblePosts.find((p) => p.id === postId);
                  if (post) {
                    const source = effectiveMyContentList === "posts" ? "myPostsList" : "myRepliesList";
                    setPostDetailSource(source);
                    setSelectedPost(post);
                    setRoute({ name: "postDetail", postId: post.id, source });
                  }
                }}
                onReplyClick={(postId, _replyId) => {
                  const post = visiblePosts.find((p) => p.id === postId);
                  if (post) {
                    setPostDetailSource("myRepliesList");
                    setSelectedPost(post);
                    setRoute({
                      name: "postDetail",
                      postId: post.id,
                      source: "myRepliesList",
                    });
                  }
                }}
              />
              <BottomNavigation
                onHomeClick={navigateToHome}
                onRankingClick={navigateToRanking}
                onBookmarksClick={navigateToBookmarks}
                onMyPageClick={navigateToMyPage}
                onWriteClick={handleStartWriting}
                activeTab={currentScreen}
              />
            </div>
          </Suspense>
        </div>
      )}

      {isAchievementsVisible && (
        <div className="absolute inset-0 z-30 bg-background transition-all duration-200 ease-out opacity-100 translate-y-0">
          <Suspense fallback={<ScreenFallback />}>
            <div className="w-full h-full flex flex-col">
              <AchievementsScreen
                onBack={handleLayerBack}
                userNickname={userNickname}
                isDarkMode={isDarkMode}
              />
              <BottomNavigation
                onHomeClick={navigateToHome}
                onRankingClick={navigateToRanking}
                onBookmarksClick={navigateToBookmarks}
                onMyPageClick={navigateToMyPage}
                onWriteClick={handleStartWriting}
                activeTab={currentScreen}
              />
            </div>
          </Suspense>
        </div>
      )}

      {route.name === "adminReports" && isAdmin && (
        <div className="absolute inset-0 z-40 bg-background">
          <div className="w-full h-full flex flex-col">
            <AdminReportScreen
              onBack={handleLayerBack}
            />
            <BottomNavigation
              onHomeClick={navigateToHome}
              onRankingClick={navigateToRanking}
              onBookmarksClick={navigateToBookmarks}
              onMyPageClick={navigateToMyPage}
              onWriteClick={handleStartWriting}
              activeTab={currentScreen}
            />
          </div>
        </div>
      )}

      {showNotificationSettings && (
        <div className="fixed inset-0 z-50 bg-background">
          <NotificationSettingsDialog
            onBack={handleLayerBack}
            categories={categories}
          />
        </div>
      )}

      {reportingPost && (
        <ReportDialog
          open={!!reportingPost}
          onOpenChange={(open) => !open && setReportingPost(null)}
          targetType="게시글"
          onSubmit={async (reasons, details) => {
            if (!reportingPost) return;
            try {
              const reporterUid = auth.currentUser?.uid ?? null;
              await addDoc(collection(db, "reports"), {
                targetType: "post",
                targetId: reportingPost.id,
                targetAuthorUid: (reportingPost as any).authorUid ?? (reportingPost as any).uid ?? null,
                reporterUid,
                reasons,
                details,
                createdAt: serverTimestamp(),
                status: "pending",
                autoHidden: false,
                priority: "normal",
              });
              toast.success("신고가 접수되었어요. 검토 후 조치하겠습니다.");
            } catch (error) {
              console.error("[report] 게시글 신고 저장 실패", error);
              toast.error("신고 처리 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.");
            } finally {
              setReportingPost(null);
            }
          }}
        />
      )}

      {reportingReply && (
        <ReportDialog
          open={!!reportingReply}
          onOpenChange={(open) => !open && setReportingReply(null)}
          targetType="답글"
          onSubmit={async (reasons, details) => {
            if (!reportingReply) return;
            try {
              const reporterUid = auth.currentUser?.uid ?? null;
              await addDoc(collection(db, "reports"), {
                targetType: "reply",
                targetId: String(reportingReply.id),
                targetAuthorUid: reportingReply.authorUid ?? null,
                reporterUid,
                reasons,
                details,
                createdAt: serverTimestamp(),
                status: "pending",
                autoHidden: false,
                priority: "normal",
                postId: selectedPost?.id ?? null,
              });
              toast.success("신고가 접수되었어요. 검토 후 조치하겠습니다.");
            } catch (error) {
              console.error("[report] 답글 신고 저장 실패", error);
              toast.error("신고 처리 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.");
            } finally {
              setReportingReply(null);
            }
          }}
        />
      )}

      {/* 👇👇👇 [여기]에 붙여넣으세요 👇👇👇 */}

      <BlockedUserListDialog
        open={showBlockedUsers}
        onOpenChange={setShowBlockedUsers}
        blockedUserIds={blockedUserIds}
        onUnblocked={() => {
          // 차단 해제 시 필요한 경우 데이터 갱신 로직 (보통 리스너로 자동 갱신됨)
        }}
      />

      <AlertDialogSimple
        open={postManagement.showPostWarning}
        onOpenChange={postManagement.setShowPostWarning}
        title="작성 전 확인"
        description="게시글 작성 30분 후 부터는 삭제 불가"
        confirmText="확인"
        onConfirm={() => {
          postManagement.handleWarningConfirm(() => {
            setShowWriteScreen(true);
          });
        }}
        checkbox={postManagement.checkboxConfig}
      />
    </div>
  );
}