// MainScreen/MainScreenRefactored.tsx
// 리팩토링된 MainScreen - 분리된 훅과 컴포넌트를 조합한 버전
// 기존 3,472줄 → 약 600줄로 축소
/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */
import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { auth, db, functions, app } from "../../firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  onSnapshot,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
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
import { CreateActionSheet } from "../CreateActionSheet";
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

// 기존 컴포넌트들
import { BottomNavigation } from "../layout/BottomNavigation";

// 🔹 주요 화면들도 lazy 로딩으로 전환 (초기 진입 속도 개선)
const MyPageScreen = lazy(() =>
  import("../MyPageScreen").then((m) => ({ default: m.MyPageScreen })),
);
const CategoryScreen = lazy(() =>
  import("../CategoryScreen").then((m) => ({ default: m.CategoryScreen })),
);
const SearchScreen = lazy(() =>
  import("../SearchScreen").then((m) => ({ default: m.SearchScreen })),
);
const RankingScreen = lazy(() =>
  import("../RankingScreen").then((m) => ({ default: m.RankingScreen })),
);
const BookmarkScreen = lazy(() =>
  import("../BookmarkScreen").then((m) => ({ default: m.BookmarkScreen })),
);
const MyContentListScreen = lazy(() =>
  import("../MyContentListScreen").then((m) => ({ default: m.MyContentListScreen })),
);

// 🔹 탭 전환 시 불필요한 리렌더를 줄이기 위한 메모이제이션 래퍼
const MemoRankingScreen = React.memo(RankingScreen);
const MemoBookmarkScreen = React.memo(BookmarkScreen);
const MemoSearchScreen = React.memo(SearchScreen);

// 덜 자주 쓰이는 화면은 Lazy Loading 유지
const WriteScreen = lazy(() => import("../WriteScreen").then((m) => ({ default: m.WriteScreen })));
const NotesScreen = lazy(() => import("../NotesScreen"));
const NoteDetailScreen = lazy(() => import("../NoteDetailScreen"));
const QuestionComposeScreen = lazy(() =>
  import("./QuestionComposeScreen").then((m) => ({ default: m.QuestionComposeScreen }))
);
const TitleShop = lazy(() => import("../TitleShop").then((m) => ({ default: m.TitleShop })));
const TitlesCollection = lazy(() => import("../TitlesCollection").then((m) => ({ default: m.TitlesCollection })));
const AchievementsScreen = lazy(() =>
  import("../AchievementsScreen").then((m) => ({ default: m.AchievementsScreen }))
);
const ThemeScreen = lazy(() =>
  import("../ThemeScreen").then((m) => ({ default: m.ThemeScreen }))
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
const SCREEN_RESET_TIMEOUT_MS = 2 * 60 * 1000; // 2분 뒤 화면 자동 초기화

// ✅ 개선된 Skeleton Fallback
const ScreenFallback = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
      <div className="text-sm text-muted-foreground">불러오는 중...</div>
    </div>
  </div>
);

// ✅ TitleShop용 Skeleton
const TitleShopSkeleton = () => (
  <div className="w-full h-full bg-background flex flex-col">
    <div className="bg-card/95 backdrop-blur-xl border-b border-border flex-shrink-0 safe-top sticky top-0 z-10">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded bg-muted animate-pulse" />
            <div className="h-6 w-24 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-8 w-32 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
    </div>
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-5 w-32 rounded bg-muted animate-pulse" />
              <div className="h-4 w-48 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-9 w-20 rounded bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ✅ MyPageScreen용 Skeleton
const MyPageScreenSkeleton = () => (
  <div className="w-full h-full bg-background flex flex-col">
    <div className="bg-card/95 backdrop-blur-xl border-b border-border flex-shrink-0 safe-top sticky top-0 z-10">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="h-6 w-24 rounded bg-muted animate-pulse" />
          <div className="w-10 h-10 rounded bg-muted animate-pulse" />
        </div>
      </div>
    </div>
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-32 rounded bg-muted animate-pulse" />
            <div className="h-4 w-48 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <div className="h-16 w-full rounded bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  </div>
);

const AUTO_REPLY_WAIT_MS = 60 * 60 * 1000;

// 특정 화면이 비활성화된 뒤 일정 시간이 지나면 visitedScreens에서 제거하여 언마운트하는 훅
function useScreenAutoReset(
  screenKey: string,
  isActive: boolean,
  setVisitedScreens: React.Dispatch<React.SetStateAction<Set<string>>>,
  timersRef: React.MutableRefObject<Record<string, number>>,
) {
  useEffect(() => {
    const timers = timersRef.current;

    // 활성화되면 타이머 제거 및 방문 기록 유지/추가
    if (isActive) {
      if (timers[screenKey]) {
        clearTimeout(timers[screenKey]);
        delete timers[screenKey];
      }
      setVisitedScreens((prev) => {
        if (prev.has(screenKey)) return prev;
        const next = new Set(prev);
        next.add(screenKey);
        return next;
      });
      return;
    }

    // 비활성 상태가 되면 2분 뒤에 visitedScreens에서 제거
    if (timers[screenKey]) {
      clearTimeout(timers[screenKey]);
    }

    timers[screenKey] = window.setTimeout(() => {
      setVisitedScreens((prev) => {
        if (!prev.has(screenKey)) return prev;
        const next = new Set(prev);
        next.delete(screenKey);
        return next;
      });
      delete timers[screenKey];
    }, SCREEN_RESET_TIMEOUT_MS);

    return () => {
      if (timers[screenKey]) {
        clearTimeout(timers[screenKey]);
        delete timers[screenKey];
      }
    };
  }, [isActive, screenKey, setVisitedScreens, timersRef]);
}

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
  onThemeClick,
  shouldOpenMyPageOnMain,
  shouldOpenSettingsOnMyPage,
  onMainScreenReady,
  onSettingsOpenedFromMain,
}: MainScreenProps) {
  // 현재 테마 확인 (커스텀 테마일 때는 dark 클래스 적용하지 않음)
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("app-theme") || "default";
    }
    return "default";
  });

  // 테마 변경 감지
  useEffect(() => {
    const handleThemeChange = () => {
      const savedTheme = localStorage.getItem("app-theme") || "default";
      setCurrentTheme(savedTheme);
    };

    window.addEventListener("theme-changed", handleThemeChange);
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "app-theme") {
        setCurrentTheme(e.newValue || "default");
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("theme-changed", handleThemeChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);
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
    setWriteDraft,
  } = useNavigationStore();
  const [showWriteScreen, setShowWriteScreen] = useState(false);
  const [lastUserProfileNickname, setLastUserProfileNickname] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  // 🆕 글쓰기 선택 시트
  const [showCreateSheet, setShowCreateSheet] = useState(false);

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
  // ✅ postDetail을 노트에서 열었을 때, 다시 돌아갈 noteId 기억
  const postDetailReturnNoteIdRef = useRef<string | null>(null);

  // 화면 표시 상태
  const isWriteVisible = showWriteScreen;
  const isQuestionComposeVisible = route.name === "questionCompose";
  const isMyPageVisible = visibility.showMyPage;
  const isCategoryVisible = visibility.showCategoryScreen;
  const isTitleShopVisible = visibility.showTitleShop;
  const isTitlesCollectionVisible = visibility.showTitlesCollection;
  const isUserProfileVisible = visibility.showUserProfile;
  const isRankingVisible = visibility.showRanking;
  const isSearchVisible = visibility.showSearchScreen;
  const isAchievementsVisible = visibility.showAchievements;
  const isThemeVisible = visibility.showTheme;
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
  const showTheme = visibility.showTheme;
  const showUserProfile = visibility.showUserProfile;
  const isNotesVisible = route.name === "notes";
  const effectiveFollowList = showFollowList;
  const effectiveMyContentList = showMyContentList;

  // 🔹 route -> boolean 네비게이션 상태 동기화
  useEffect(() => {
    switch (route.name) {
      case "questionCompose":
        setCurrentScreen("home");
        break;
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
  const [categories, setCategories] = useState(initialCategories);
  const [userProfileSection, setUserProfileSection] = useState<
    "profile" | "followers" | "following" | "posts" | "replies"
  >("profile");

  // ========================================
  // 2. 기존 훅 연결
  // ========================================
  const { posts, setPosts, loading: postsLoading, refresh } = usePosts();
  const { balance: lumenBalance } = useLumens();

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

  // 🔹 카테고리 카운트 계산 및 업데이트
  useEffect(() => {
    if (visiblePosts.length === 0) {
      // 게시글이 없으면 카운트를 0으로 초기화
      setCategories(initialCategories);
      return;
    }

    setCategories((prevCategories) => {
      return prevCategories.map((category) => {
        // 전체 카테고리 카운트
        const totalCount = category.id === "전체" ? visiblePosts.length : 0;

        // 해당 카테고리의 게시글 수 계산
        const categoryPosts = visiblePosts.filter(
          (post) => post.category === category.id
        );
        const categoryCount = category.id === "전체" ? totalCount : categoryPosts.length;

        // 서브카테고리별 카운트 계산
        const updatedSubCategories = category.subCategories.map((subCategory) => {
          if (subCategory.id === "전체") {
            return { ...subCategory, count: categoryCount };
          }
          const subCategoryCount = categoryPosts.filter(
            (post) => post.subCategory === subCategory.id
          ).length;
          return { ...subCategory, count: subCategoryCount };
        });

        return {
          ...category,
          count: categoryCount,
          subCategories: updatedSubCategories,
        };
      });
    });
  }, [visiblePosts]);

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
      } catch {
        autoReplyTriggeredRef.current.delete(targetId);
        // aiAutoReply 실패 (로그 제거)
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

  const lumenActions = useLumens();

  // ✨ [해결] 이제 타입이 완벽하게 일치합니다.
  const {
    clampedTrust,
    updateTrust,
    addLumensWithTrust,
  } = useTrustScore({
    addLumens: lumenActions.addLumens // 직접 전달
  });

  const titleActions = useTitleActions({
    lumenBalance: lumenActions.balance,
    spendLumens: lumenActions.spendLumens // 직접 전달
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
      () => {
        // users.profileDescription 구독 에러 (로그 제거)
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
    // 알림 팝오버 닫기
    notificationActions.setShowNotifications(false);
    setRoute({ name: "notificationSettings" });
  }, [setRoute, notificationActions]);

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
      // 2. 가짜 setTimeout 대신 진짜 데이터 불러오기 함수 실행!
      if (refresh) {
        await refresh();
        toast.success("최신 목록을 불러왔어요");
      }
    } catch {
      toast.error("목록을 불러오지 못했습니다");
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);
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
  useEffect(() => syncLayer("questionCompose", route.name === "questionCompose"), [route.name, syncLayer]);
  useEffect(() => syncLayer("postDetail", !!selectedPost), [selectedPost, syncLayer]);
  useEffect(() => syncLayer("titlesCollection", showTitlesCollection), [showTitlesCollection, syncLayer]);
  useEffect(() => syncLayer("titleShop", showTitleShop), [showTitleShop, syncLayer]);
  useEffect(() => syncLayer("achievements", showAchievements), [showAchievements, syncLayer]);
  useEffect(() => syncLayer("theme", showTheme), [showTheme, syncLayer]);
  useEffect(() => syncLayer("userProfile", !!showUserProfile), [showUserProfile, syncLayer]);
  useEffect(() => syncLayer("myContentList", !!showMyContentList), [showMyContentList, syncLayer]);
  useEffect(() => syncLayer("followList", !!showFollowList), [showFollowList, syncLayer]);
  useEffect(() => syncLayer("myPage", showMyPage), [showMyPage, syncLayer]);
  useEffect(() => syncLayer("category", showCategoryScreen), [showCategoryScreen, syncLayer]);
  useEffect(() => syncLayer("notificationSettings", showNotificationSettings), [showNotificationSettings, syncLayer]);
  useEffect(() => syncLayer("ranking", visibility.showRanking), [visibility.showRanking, syncLayer]);
  useEffect(() => syncLayer("bookmarks", visibility.showBookmarks), [visibility.showBookmarks, syncLayer]);
  useEffect(() => syncLayer("search", showSearchScreen), [showSearchScreen, syncLayer]);
  useEffect(() => syncLayer("quiz", route.name === "quiz"), [route.name, syncLayer]);
  useEffect(() => syncLayer("notes", route.name === "notes"), [route.name, syncLayer]);
  useEffect(() => syncLayer("noteDetail", route.name === "noteDetail"), [route.name, syncLayer]);

  const closePostDetailFromState = useCallback((state?: any) => {
    const s = state ?? navigationStateRef.current;
    if (!s.selectedPost) return;

    if (s.postDetailSource === "notes") {
      const noteId = postDetailReturnNoteIdRef.current;

      setSelectedPost(null);

      if (noteId) {
        // ✅ 노트 상세로 복귀
        setRoute({ name: "noteDetail", noteId });
        setCurrentScreen("home");
      } else {
        // noteId를 못 찾는 예외 상황이면 notes 목록으로
        setRoute({ name: "notes" });
        setCurrentScreen("home");
      }

      // ✅ 다음 진입을 위해 초기화
      postDetailReturnNoteIdRef.current = null;
      setPostDetailSource("home");
      return;
    }

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
      // 레이어 스택이 비어있으면 route를 확인하여 처리
      if (route.name === "theme") {
        setRoute({ name: "myPage" });
        return true;
      }
      if (route.name === "myPage") {
        setRoute({ name: "home" });
        setCurrentScreen("home");
        return true;
      }
      return false;
    }

    switch (top) {
      case "write":
        setShowWriteScreen(false);
        setRoute({ name: "home" });
        setCurrentScreen("home");
        break;
      case "noteDetail":
        setRoute({ name: "notes" });
        setCurrentScreen("home");
        break;
      case "notes":
        setRoute({ name: "home" });
        setCurrentScreen("home");
        break;
      case "questionCompose":
        setRoute({ name: "home" });
        setCurrentScreen("home");
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
        setCurrentScreen("home");
        break;
      case "notificationSettings":
        setRoute({ name: "myPage" });
        setCurrentScreen("profile");
        break;
      case "ranking":
        goHome();
        break;
      case "bookmarks":
        setRoute({ name: "home" });
        setCurrentScreen("home");
        break;
      case "quiz":
        setRoute({ name: "home" });
        setCurrentScreen("home");
        break;
      case "search":
        setRoute({ name: "home" });
        setCurrentScreen("home");
        break;
      case "theme":
        setRoute({ name: "myPage" });
        setCurrentScreen("home");
        break;
      default:
        break;
    }

    return true;
  }, [
    closePostDetailFromState,
    goHome,
    popLayer,
    route.name,
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
      } catch {
        // backButton listener 등록 실패 (로그 제거)
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

  const handleSavePostToNotes = useCallback(
    async (post: any) => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        toast.error("로그인 후 사용할 수 있어요.");
        return;
      }

      try {
        const source = `post:${post?.id ?? ""}`;

        // ✅ 중복 저장 방지: 같은 post를 이미 노트로 저장했으면 중단
        const q = query(
          collection(db, "notes"),
          where("uid", "==", uid),
          where("source", "==", source),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          toast.info("이미 노트로 저장된 글이에요.");
          return;
        }

        await addDoc(collection(db, "notes"), {
          uid,
          title: (post?.title ?? "").toString().trim(),
          body: (post?.content ?? "").toString(),
          source,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        toast.success("노트에 저장했어요.");
      } catch {
        toast.error("노트 저장에 실패했어요.");
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // toast는 외부 스코프 값이므로 의존성에서 제외

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
  const screenResetTimersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    setVisitedScreens((prev) => {
      let screenKey = "";
      if (visibility.showMyPage) screenKey = "myPage";
      else if (visibility.showRanking) screenKey = "ranking";
      else if (visibility.showBookmarks) screenKey = "bookmarks";
      else if (visibility.showTitleShop) screenKey = "titleShop";
      else if (visibility.showTitlesCollection) screenKey = "titlesCollection";
      else if (visibility.showAchievements) screenKey = "achievements";
      else if (visibility.showTheme) screenKey = "theme";
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

  // 탭/화면 자동 초기화 (2분 비활성 시 visitedScreens에서 제거)
  useScreenAutoReset("myPage", isMyPageVisible, setVisitedScreens, screenResetTimersRef);
  useScreenAutoReset("ranking", isRankingVisible, setVisitedScreens, screenResetTimersRef);
  useScreenAutoReset("bookmarks", isBookmarksVisible, setVisitedScreens, screenResetTimersRef);
  useScreenAutoReset("search", isSearchVisible, setVisitedScreens, screenResetTimersRef);

  const isPostDetail =
    route.name === "postDetail" &&
    !!selectedPost &&
    String(route.postId) === String(selectedPost.id);

  if (isQuestionComposeVisible) {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <QuestionComposeScreen
          onBack={handleLayerBack}
          onGoWrite={(draft) => {
            // 1) 질문정리 route 종료
            setRoute({ name: "home" });
            setCurrentScreen("home");

            // 2) 글쓰기 초안 주입
            setWriteDraft({ ...draft, postType: "question" });

            // 3) 질문정리 레이어는 종료되고 write만 남도록
            //    (이미 syncLayer로 questionCompose는 route 기반으로 사라짐)
            setShowWriteScreen(true);
            pushLayer("write");
          }}
          onNavigateToNotes={() => {
            // 노트 화면으로 이동
            setRoute({ name: "notes" });
            setCurrentScreen("home");
          }}
        />
      </Suspense>
    );
  }

  if (isNotesVisible) {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <div className="w-full h-full flex flex-col">
          <NotesScreen
            onBack={handleLayerBack}
            onOpenNote={(noteId) => {
              setRoute({ name: "noteDetail", noteId });
              setCurrentScreen("home");
            }}
          />
          <BottomNavigation
            onHomeClick={navigateToHome}
            onRankingClick={navigateToRanking}
            onBookmarksClick={navigateToBookmarks}
            onMyPageClick={navigateToMyPage}
            onWriteClick={() => setShowCreateSheet(true)}
            activeTab={currentScreen}
          />
        </div>
      </Suspense>
    );
  }

  const isNoteDetailVisible = route.name === "noteDetail";

  if (isNoteDetailVisible) {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <div className="w-full h-full flex flex-col">
          <NoteDetailScreen
            noteId={route.noteId}
            onBack={() => {
              setRoute({ name: "notes" });
              setCurrentScreen("home");
            }}
            onGoWrite={(draft) => {
              // 1) 초안 주입 (노트에서 온 건 일반 글)
              setWriteDraft({ ...draft, postType: "guide" });
              // 2) noteDetail 화면 닫고 home으로 복귀
              setRoute({ name: "home" });
              setCurrentScreen("home");

              // 3) 글쓰기 열기
              setShowWriteScreen(true);
            }}
            onOpenSourcePost={(postId) => {
              // ✅ 지금 보고 있는 noteDetail의 noteId를 기억해 둠 (돌아갈 곳)
              postDetailReturnNoteIdRef.current = route.noteId;

              const post = posts.find((p) => String(p.id) === String(postId));
              if (!post) {
                toast.error("원문 게시글을 찾을 수 없어요.");
                return;
              }

              // ✅ source를 notes로 설정해서 close 시 노트로 복귀시키기
              openPostDetail(post, "notes" as any);
            }}
          />
          <BottomNavigation
            onHomeClick={navigateToHome}
            onRankingClick={navigateToRanking}
            onBookmarksClick={navigateToBookmarks}
            onMyPageClick={navigateToMyPage}
            onWriteClick={() => setShowCreateSheet(true)}
            activeTab={currentScreen}
          />
        </div>
      </Suspense>
    );
  }

  if (isWriteVisible) {
    return (
      <Suspense fallback={<ScreenFallback />}>
        <WriteScreen
          onBack={handleLayerBack}
          onSubmit={handlePostSubmit}
          categories={categories}
          lumenBalance={lumenBalance}
          spendLumens={lumenActions.spendLumens}
        />
      </Suspense>
    );
  }

  // 커스텀 테마인지 확인
  const isCustomTheme = currentTheme !== "default";

  // 기본 테마이면서 다크모드일 때만 'dark' 클래스 적용
  const shouldApplyDark = !isCustomTheme && isDarkMode;

  return (
    <div className={`w-full h-full relative ${shouldApplyDark ? "dark" : ""}`}>
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
              onSaveNote={() => handleSavePostToNotes(selectedPost)}
              hideSaveNote={postDetailSource === "notes"}
              onReportReply={(reply) => setReportingReply(reply)}
              renderContentWithMentions={renderContentWithMentions}
              canSubmitReply={replyActions.canSubmitReply}
              blockedUserIds={blockedUserIds} // 🆕 차단 목록 전달
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
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
                userTrustScore={clampedTrust}
                isBookmarked={bookmarkActions.isBookmarked}
                onPostClick={(post) => openPostDetail(post, "home")}
                onLanternToggle={lanternActions.handleLanternToggle}
                onBookmarkToggle={bookmarkActions.handleBookmarkToggle}
                onStartWriting={handleStartWriting}
                currentTitle={titleActions.currentTitle}
                blockedUserIds={blockedUserIds} // 🆕 차단 목록 전달
                onRefresh={handleRefresh}
                isRefreshing={isRefreshing}
                isLoading={postsLoading} // ✅ 초기 로딩 상태 전달
              />
            </>
          )}
        </div>
        <BottomNavigation
          onHomeClick={navigateToHome}
          onRankingClick={navigateToRanking}
          onBookmarksClick={navigateToBookmarks}
          onMyPageClick={navigateToMyPage}
          onWriteClick={() => setShowCreateSheet(true)}
          activeTab={currentScreen}
        />
      </div>

      {visitedScreens.has("myPage") && (
        <div className={`absolute inset-0 bg-background ${isMyPageVisible ? "z-20 block" : "z-0 hidden"}`}>
          <Suspense fallback={<MyPageScreenSkeleton />}>
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
                currentTheme={typeof window !== "undefined" ? localStorage.getItem("app-theme") || "default" : "default"}
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
                onThemeClick={onThemeClick}
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
                onWriteClick={() => setShowCreateSheet(true)}
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
              <MemoRankingScreen
                onBack={handleLayerBack}
                weeklyGuideRanking={userStats.weeklyGuideRanking}
                totalGuideRanking={userStats.totalGuideRanking}
                weeklyLanternRanking={userStats.weeklyLanternRanking}
                currentTheme={currentTheme}
              />
              <BottomNavigation
                onHomeClick={navigateToHome}
                onRankingClick={navigateToRanking}
                onBookmarksClick={navigateToBookmarks}
                onMyPageClick={navigateToMyPage}
                onWriteClick={() => setShowCreateSheet(true)}
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
              <MemoBookmarkScreen
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
                onWriteClick={() => setShowCreateSheet(true)}
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
              onWriteClick={() => setShowCreateSheet(true)}
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
            <MemoSearchScreen
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
          <Suspense fallback={<TitleShopSkeleton />}>
            <div className="w-full h-full flex flex-col">
              <div className="flex-1 min-h-0 overflow-hidden">
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
                onWriteClick={() => setShowCreateSheet(true)}
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
                    trustScore={
                      isMyself
                        ? clampedTrust
                        : (profileOwnerProfile?.trustScore as number | undefined) ?? undefined
                    }
                    reportCount={0}
                    achievementCount={0}
                    titleCount={0}
                    guideCount={0}
                    currentTitle={
                      isMyself
                        ? titleActions.currentTitle
                        : (profileOwnerProfile?.currentTitleId as string | undefined) ?? ""
                    }
                    currentTheme={(() => {
                      if (isMyself) {
                        return typeof window !== "undefined" ? localStorage.getItem("app-theme") || "default" : "default";
                      }
                      const otherUserTheme = profileOwnerProfile?.currentTheme;
                      return (otherUserTheme && otherUserTheme !== "default") ? otherUserTheme : null;
                    })()}
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
                    onHomeClick={navigateToHome}
                    onRankingClick={navigateToRanking}
                    onBookmarksClick={navigateToBookmarks}
                    onMyPageClick={navigateToMyPage}
                    onWriteClick={() => setShowCreateSheet(true)}
                    activeTab={currentScreen}
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
                onWriteClick={() => setShowCreateSheet(true)}
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
                currentTheme={currentTheme}
              />
              <BottomNavigation
                onHomeClick={navigateToHome}
                onRankingClick={navigateToRanking}
                onBookmarksClick={navigateToBookmarks}
                onMyPageClick={navigateToMyPage}
                onWriteClick={() => setShowCreateSheet(true)}
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
                userNickname={userNickname}
                userProfileImage={userProfileImage}
                currentTitle={titleActions.currentTitle}
                isPostLanterned={lanternActions.isPostLanterned}
                isBookmarked={bookmarkActions.isBookmarked}
                formatTimeAgo={formatTimeAgo}
                formatCreatedAt={formatCreatedAt}
                onLanternToggle={lanternActions.handleLanternToggle}
                onBookmarkToggle={bookmarkActions.handleBookmarkToggle}
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
                onWriteClick={() => setShowCreateSheet(true)}
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
                onWriteClick={() => setShowCreateSheet(true)}
                activeTab={currentScreen}
              />
            </div>
          </Suspense>
        </div>
      )}

      {isThemeVisible && (
        <div className="absolute inset-0 z-30 bg-background transition-all duration-200 ease-out opacity-100 translate-y-0">
          <Suspense fallback={<ScreenFallback />}>
            <div className="w-full h-full flex flex-col">
              <ThemeScreen
                onBack={handleLayerBack}
                isDarkMode={isDarkMode}
                onToggleDarkMode={onToggleDarkMode}
                lumenBalance={lumenBalance}
                onThemePurchase={async (themeId: string, cost: number) => {
                  const success = await lumenActions.spendLumens(cost, `테마 구매: ${themeId}`, themeId);
                  if (success) {
                    // Firestore에 구매 정보 저장은 ThemeScreen 내부에서 처리
                    const functions = getFunctions(app, "asia-northeast3");
                    const purchaseThemeFn = httpsCallable(functions, "purchaseTheme");
                    try {
                      await purchaseThemeFn({ themeId, cost });
                    } catch (error) {
                      console.error("테마 구매 정보 저장 실패:", error);
                      toast.error("테마 구매 정보 저장에 실패했습니다.");
                      return false;
                    }
                  }
                  return success;
                }}
              />
              <BottomNavigation
                onHomeClick={navigateToHome}
                onRankingClick={navigateToRanking}
                onBookmarksClick={navigateToBookmarks}
                onMyPageClick={navigateToMyPage}
                onWriteClick={() => setShowCreateSheet(true)}
                activeTab={currentScreen}
              />
            </div>
          </Suspense>
        </div>
      )}

      {/* 1. 관리자 신고 목록 화면 수정 */}
      {route.name === "adminReports" && isAdmin && (
        <div className="absolute inset-0 z-40 bg-background">
          <Suspense fallback={<ScreenFallback />}>
            <div className="w-full h-full flex flex-col">
              <AdminReportScreen
                onBack={() => {
                  setRoute({ name: "home" });
                  setCurrentScreen("home"); // 안전하게 탭 상태도 동기화
                }}
              />
              <BottomNavigation
                onHomeClick={navigateToHome}
                onRankingClick={navigateToRanking}
                onBookmarksClick={navigateToBookmarks}
                onMyPageClick={navigateToMyPage}
                onWriteClick={() => setShowCreateSheet(true)}
                activeTab={currentScreen}
              />
            </div>
          </Suspense>
        </div>
      )}

      {/* 2. 알림 설정 다이얼로그 수정 */}
      {showNotificationSettings && (
        <div className="fixed inset-0 z-50 bg-background">
          <Suspense fallback={null}>
            <NotificationSettingsDialog
              onBack={handleLayerBack}
              categories={categories}
            />
          </Suspense>
        </div>
      )}

      {/* 3. 신고 다이얼로그 (게시글) 수정 */}
      {reportingPost && (
        <Suspense fallback={null}>
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
              } catch {
                toast.error("신고 처리 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.");
              } finally {
                setReportingPost(null);
              }
            }}
          />
        </Suspense>
      )}

      {/* 4. 신고 다이얼로그 (답글) 수정 */}
      {reportingReply && (
        <Suspense fallback={null}>
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
              } catch {
                // 답글 신고 저장 실패 (로그 제거)
                toast.error("신고 처리 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.");
              } finally {
                setReportingReply(null);
              }
            }}
          />
        </Suspense>
      )}

      <BlockedUserListDialog
        open={showBlockedUsers}
        onOpenChange={setShowBlockedUsers}
        blockedUserIds={blockedUserIds}
        onUnblocked={() => {
          // 차단 해제 시 필요한 경우 데이터 갱신 로직 (보통 리스너로 자동 갱신됨)
        }}
      />

      {/* ✅ 여기다가 넣어 */}
      <CreateActionSheet
        open={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        onSelectStructured={() => {
          setShowCreateSheet(false);

          // TODO: 질문 정리 화면 route/layer는 다음 단계에서 추가
          // 지금은 일단 route만 이동하게 해도 됨
          setRoute({ name: "questionCompose" });
        }}
        onSelectWrite={() => {
          setShowCreateSheet(false);
          handleStartWriting(); // 기존 글쓰기 그대로
        }}
        onSelectNotes={() => {
          setShowCreateSheet(false);
          setRoute({ name: "notes" });
          setCurrentScreen("home");
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