// MainScreen/MainScreenRefactored.tsx
// 리팩토링된 MainScreen - 분리된 훅과 컴포넌트를 조합한 버전
// 기존 3,472줄 → 약 600줄로 축소
/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { auth, db } from "../../firebase";
import { AdminReportScreen } from "../AdminReportScreen";
import { addDoc, collection, serverTimestamp, doc, onSnapshot } from "firebase/firestore";
import { toast } from "@/toastHelper";
import {
  useUserProfiles,
  useUserProfileByNickname,
  useCurrentUserProfileLite,
} from "./hooks/useUserProfiles";

// 🔹 route 타입 (중앙 네비게이션 상태)
import type { MainRoute, PostDetailSource } from "./routes";
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
import { useOtherUserFollowStats } from "./hooks/useOtherUserFollowStats";

// 분리된 컴포넌트들
import { HomeHeader, PostListView, PostDetailView } from "./components";

// 기존 컴포넌트들
import { BottomNavigation } from "../BottomNavigation";
import { MyPageScreen } from "../MyPageScreen";
import { CategoryScreen } from "../CategoryScreen";
import { SearchScreen } from "../SearchScreen";
import { WriteScreen } from "../WriteScreen";
import { TitleShop } from "../TitleShop";
import { TitlesCollection } from "../TitlesCollection";
import { RankingScreen } from "../RankingScreen";
import { AchievementsScreen } from "../AchievementsScreen";
import { BookmarkScreen } from "../BookmarkScreen";
import { FollowListScreen } from "../FollowListScreen";
import { UserProfileDialog } from "../UserProfileDialog";
import { NotificationSettingsDialog } from "../NotificationSettingsDialog";
import { ReportDialog } from "../ReportDialog";
import { CommunityGuidelinesScreen } from "../CommunityGuidelinesScreen";
import { MyContentListScreen } from "../MyContentListScreen";
import { AlertDialogSimple } from "../ui/alert-dialog-simple";

// 데이터
import { initialCategories } from "@/data/categoryData";

// 타입
import type { MainScreenProps, Post, CurrentScreen, Reply } from "./types";

// 상수
const EMPTY_STRING_ARRAY: readonly string[] = Object.freeze([]);

export function MainScreenRefactored({
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
  const [route, setRoute] = useState<MainRoute>({ name: "home" });

  // 기존 것들은 당장은 그대로 두되,
  // route 를 single source of truth 로 쓰도록 동기화
  const [currentScreen, setCurrentScreen] = useState<CurrentScreen>("home");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // 🔹 글 상세로 들어올 때, 어디에서 왔는지 기억하는 상태
  const [postDetailSource, setPostDetailSource] = useState<PostDetailSource>("home");

  const [activeCategory, setActiveCategory] = useState("전체");
  const [activeSubCategory, setActiveSubCategory] = useState("전체");
  const [sortBy, setSortBy] = useState("latest");

  // 화면 표시 상태 (기존 플래그들 - route 기반으로 자동 동기화)
  const [showMyPage, setShowMyPage] = useState(false);
  const [showCategoryScreen, setShowCategoryScreen] = useState(false);
  const [showSearchScreen, setShowSearchScreen] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [showWriteScreen, setShowWriteScreen] = useState(false);
  const [showTitleShop, setShowTitleShop] = useState(false);
  const [showTitlesCollection, setShowTitlesCollection] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showFollowList, setShowFollowList] = useState<"followers" | "following" | null>(null);
  const [showMyContentList, setShowMyContentList] = useState<"posts" | "replies" | null>(null);
  const [showUserProfile, setShowUserProfile] = useState<string | null>(null);
  const [lastUserProfileNickname, setLastUserProfileNickname] =
    useState<string | null>(null);

  // 🔹 route -> boolean 네비게이션 상태 동기화
  useEffect(() => {
    switch (route.name) {
      case "home":
        setShowMyPage(false);
        setShowCategoryScreen(false);
        setShowSearchScreen(false);
        setShowTitleShop(false);
        setShowTitlesCollection(false);
        setShowRanking(false);
        setShowAchievements(false);
        setShowFollowList(null);
        setShowMyContentList(null);
        setShowUserProfile(null);
        setCurrentScreen("home");
        break;

      case "myPage":
        setShowMyPage(true);
        setShowCategoryScreen(false);
        setShowSearchScreen(false);
        setShowTitleShop(false);
        setShowTitlesCollection(false);
        setShowRanking(false);
        setShowAchievements(false);
        setShowFollowList(null);
        setShowMyContentList(null);
        setShowUserProfile(null);
        setCurrentScreen("profile");
        break;

      case "ranking":
        setShowMyPage(false);
        setShowCategoryScreen(false);
        setShowSearchScreen(false);
        setShowTitleShop(false);
        setShowTitlesCollection(false);
        setShowRanking(true);
        setShowAchievements(false);
        setShowFollowList(null);
        setShowMyContentList(null);
        setShowUserProfile(null);
        setCurrentScreen("ranking");
        break;

      case "bookmarks":
        setShowMyPage(false);
        setShowCategoryScreen(false);
        setShowSearchScreen(false);
        setShowTitleShop(false);
        setShowTitlesCollection(false);
        setShowRanking(false);
        setShowAchievements(false);
        setShowFollowList(null);
        setShowMyContentList(null);
        setShowUserProfile(null);
        setCurrentScreen("bookmarks");
        break;

      case "category":
        setShowMyPage(false);
        setShowCategoryScreen(true);
        setShowSearchScreen(false);
        setShowTitleShop(false);
        setShowTitlesCollection(false);
        setShowRanking(false);
        setShowAchievements(false);
        setShowFollowList(null);
        setShowMyContentList(null);
        setShowUserProfile(null);
        setCurrentScreen("home");
        break;

      case "search":
        setShowMyPage(false);
        setShowCategoryScreen(false);
        setShowSearchScreen(true);
        setShowTitleShop(false);
        setShowTitlesCollection(false);
        setShowRanking(false);
        setShowAchievements(false);
        setShowFollowList(null);
        setShowMyContentList(null);
        setShowUserProfile(null);
        setCurrentScreen("home");
        break;

      case "titleShop":
        setShowMyPage(false);
        setShowCategoryScreen(false);
        setShowSearchScreen(false);
        setShowTitleShop(true);
        setShowTitlesCollection(false);
        setShowRanking(false);
        setShowAchievements(false);
        setShowFollowList(null);
        setShowMyContentList(null);
        setShowUserProfile(null);
        setCurrentScreen("home");
        break;

      case "titlesCollection":
        setShowMyPage(false);
        setShowCategoryScreen(false);
        setShowSearchScreen(false);
        setShowTitleShop(false);
        setShowTitlesCollection(true);
        setShowRanking(false);
        setShowAchievements(false);
        setShowFollowList(null);
        setShowMyContentList(null);
        setShowUserProfile(null);
        setCurrentScreen("profile");
        break;

      case "achievements":
        setShowMyPage(false);
        setShowCategoryScreen(false);
        setShowSearchScreen(false);
        setShowTitleShop(false);
        setShowTitlesCollection(false);
        setShowRanking(false);
        setShowAchievements(true);
        setShowFollowList(null);
        setShowMyContentList(null);
        setShowUserProfile(null);
        setCurrentScreen("achievements");
        break;

      case "followList":
        setShowMyPage(false);
        setShowCategoryScreen(false);
        setShowSearchScreen(false);
        setShowTitleShop(false);
        setShowTitlesCollection(false);
        setShowRanking(false);
        setShowAchievements(false);
        setShowFollowList(route.mode);
        setShowMyContentList(null);
        setShowUserProfile(null);
        setCurrentScreen("profile");
        break;

      case "myContentList":
        setShowMyPage(false);
        setShowCategoryScreen(false);
        setShowSearchScreen(false);
        setShowTitleShop(false);
        setShowTitlesCollection(false);
        setShowRanking(false);
        setShowAchievements(false);
        setShowFollowList(null);
        setShowMyContentList(route.mode);
        setShowUserProfile(null);
        setCurrentScreen("profile");
        break;

      case "userProfile":
        setShowMyPage(false);
        setShowCategoryScreen(false);
        setShowSearchScreen(false);
        setShowTitleShop(false);
        setShowTitlesCollection(false);
        setShowRanking(false);
        setShowAchievements(false);
        setShowFollowList(null);
        setShowMyContentList(null);
        setShowUserProfile(route.nickname);
        setCurrentScreen("home");
        break;

      case "adminReports":
        // 관리자 전용 화면. route 만으로 제어
        setShowMyPage(false);
        setShowCategoryScreen(false);
        setShowSearchScreen(false);
        setShowTitleShop(false);
        setShowTitlesCollection(false);
        setShowRanking(false);
        setShowAchievements(false);
        setShowFollowList(null);
        setShowMyContentList(null);
        setShowUserProfile(null);
        setCurrentScreen("home");
        break;

      case "postDetail":
        // postDetail 은 상단/하단 네비는 home 과 동일 취급
        setShowMyPage(false);
        setShowCategoryScreen(false);
        setShowSearchScreen(false);
        setShowTitleShop(false);
        setShowTitlesCollection(false);
        setShowRanking(false);
        setShowAchievements(false);
        setShowFollowList(null);
        setShowMyContentList(null);
        setShowUserProfile(null);
        setCurrentScreen("home");
        break;

      default:
        break;
    }
  }, [route]);

  // 신고 다이얼로그 상태
  const [reportingPost, setReportingPost] = useState<Post | null>(null);
  const [reportingReply, setReportingReply] = useState<Reply | null>(null);

  // 카테고리 데이터
  const [categories] = useState(initialCategories);
  const [userProfileSection, setUserProfileSection] = useState<
    "profile" | "followers" | "following" | "posts" | "replies"
  >("profile");

  // 관리자 UID 리스트 (백업용)
  const ADMIN_UIDS = [
    "qOyIJeJmdjbqWDpwXiWVcCqZd9m1", // 네 계정 uid 넣기
    // 필요하면 더 추가
  ];

  // ========================================
  // 2. 기존 훅 연결
  // ========================================
  const { posts, setPosts } = usePosts();
  const { balance: lumenBalance, addLumens, spendLumens } = useLumens();

  // Firestore에서 posts가 바뀌면, 현재 열려있는 글(selectedPost)도 자동으로 최신 상태로 맞춰주기
  useEffect(() => {
    if (!selectedPost) return;

    const updated = posts.find((p) => p.id === selectedPost.id);
    if (updated && updated !== selectedPost) {
      setSelectedPost(updated);
    }
  }, [posts, selectedPost]);

  // ========================================
  // 3. 분리된 훅들 연결
  // ========================================

  // 신뢰도 훅
  const {
    clampedTrust,
    updateTrust,
    addLumensWithTrust,
  } = useTrustScore({ addLumens });

  // 칭호 훅 (업적 훅에서 사용하므로 먼저 선언)
  const titleActions = useTitleActions({
    lumenBalance,
    spendLumens,
  });

  // 업적 훅 (신뢰도 적용된 루멘 함수 사용)
  const { userActivity, updateActivity } = useAchievements(
    addLumensWithTrust,
    (titleId, titleName) => {
      titleActions.addSpecialTitle(titleId, titleName);
    }
  );

  // 🔹 현재 로그인한 유저의 Lite 프로필 (role 포함)
  const currentUserProfileLite = useCurrentUserProfileLite();

  // 🔹 1) Firestore users.role 기반 관리자 여부
  const isAdminByRole = currentUserProfileLite?.role === "admin";

  // 🔹 2) 예비용: 하드코딩 UID 기반 관리자 여부 (기존 방식 유지)
  const isAdminByUid =
    !!auth.currentUser && ADMIN_UIDS.includes(auth.currentUser.uid);

  // 🔹 최종 관리자 여부: 둘 중 하나라도 true면 관리자
  const isAdmin = isAdminByRole || isAdminByUid;

  // 사용자 통계 훅
  const userStats = useUserStats({ posts, userNickname });

  // 🔹 마이페이지에서 쓰는 프로필 소개 상태
  const [profileDescription, setProfileDescription] = useState("");

  // 🔹 현재 로그인한 유저의 profileDescription을 Firestore에서 실시간으로 가져오기
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

  // 등불 훅
  const lanternActions = useLanternActions({
    posts,
    setPosts,
    selectedPost,
    setSelectedPost,
    userNickname,
    userActivity,
    updateActivity,
    userPostLanterns: userStats.userPostLanterns,
    setUserPostLanterns: userStats.setUserPostLanterns,
    userReplyLanterns: userStats.userReplyLanterns,
    setUserReplyLanterns: userStats.setUserReplyLanterns,
    addLumensWithTrust,
    updateTrust,
  });

  // 북마크 훅
  const bookmarkActions = useBookmarkActions({ userNickname });

  // 팔로우 훅
  const followActions = useFollowActions({ userNickname });

  // 🔹 현재 route 기반으로 활성 userProfile 닉네임 결정
  const activeUserProfileNickname =
    route.name === "userProfile" ? route.nickname : showUserProfile;

  // 🔹 다른 유저 프로필용: 닉네임으로 users 실시간 구독
  const otherUserProfile = useUserProfileByNickname(
    activeUserProfileNickname && activeUserProfileNickname !== userNickname
      ? activeUserProfileNickname
      : null
  );

  // 🔹 다른 유저 프로필용: UID → 프로필 정보 실시간 구독
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

  const profileOwnerProfiles = useUserProfiles(
    profileOwnerUid ? [profileOwnerUid] : []
  );

  const profileOwnerProfile =
    profileOwnerUid ? profileOwnerProfiles[profileOwnerUid] ?? null : null;

  // 다른 유저 프로필용 팔로우 통계 훅
  const otherFollowStats = useOtherUserFollowStats({
    viewedNickname: activeUserProfileNickname,
    currentUserNickname: userNickname,
  });

  // 길잡이 훅
  const guideActions = useGuideActions({
    posts,
    setPosts,
    selectedPost,
    setSelectedPost,
    userNickname,
    userGuideCount: userStats.userGuideCount,
    setUserGuideCount: userStats.setUserGuideCount,
    addLumensWithTrust,
    updateActivity,
    updateTrust,
  });

  // 답글 훅
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

  // 알림 훅
  const notificationActions = useNotificationActions({
    posts,
    onPostSelect: (post) => setSelectedPost(post),
  });

  // 게시물 관리 훅
  const postManagement = usePostManagement({
    posts,
    setPosts,
    userNickname,
    userProfileImage,
    clampedTrust,
    updateActivity,
  });

  // 🔵 글 상세 진입 공통 함수
  const openPostDetail = useCallback(
    (post: Post, source: PostDetailSource) => {
      setRoute({ name: "postDetail", postId: post.id, source });

      setPostDetailSource(source);
      setSelectedPost(post);

      postManagement.incrementViews(post.id);
    },
    [postManagement]
  );

  // ========================================
  // 4. 네비게이션 핸들러
  // ========================================
  const navigateToHome = useCallback(() => {
    setSelectedPost(null);
    setRoute({ name: "home" });
  }, []);

  const navigateToRanking = useCallback(() => {
    setSelectedPost(null);
    setRoute({ name: "ranking" });
  }, []);

  const navigateToBookmarks = useCallback(() => {
    setSelectedPost(null);
    setRoute({ name: "bookmarks" });
  }, []);

  const navigateToMyPage = useCallback(() => {
    setSelectedPost(null);
    setRoute({ name: "myPage" });
  }, []);

  const navigateToAchievements = useCallback(() => {
    setSelectedPost(null);
    setRoute({ name: "achievements" });
  }, []);

  // ========================================
  // 5. 초기화 및 뒤로가기 처리
  // ========================================

  // 초기 마이페이지 열기
  useEffect(() => {
    if (shouldOpenMyPageOnMain) {
      setRoute({ name: "myPage" });
      onMainScreenReady?.();
    }
  }, [shouldOpenMyPageOnMain, onMainScreenReady]);

  // 뒤로가기 상태 참조
  const navigationStateRef = useRef({
    route,
    showWriteScreen,
    selectedPost,
    showTitlesCollection,
    showTitleShop,
    showAchievements,
    showMyPage,
    showCategoryScreen,
    showNotificationSettings,
    showRanking,
    showGuidelines,
    showMyContentList,
    showFollowList,
    showUserProfile,
    userProfileSection,
    lastUserProfileNickname,
    currentScreen,
    postDetailSource,
  });

  useEffect(() => {
    navigationStateRef.current = {
      route,
      showWriteScreen,
      selectedPost,
      showTitlesCollection,
      showTitleShop,
      showAchievements,
      showMyPage,
      showCategoryScreen,
      showNotificationSettings,
      showRanking,
      showGuidelines,
      showMyContentList,
      showFollowList,
      showUserProfile,
      userProfileSection,
      lastUserProfileNickname,
      currentScreen,
      postDetailSource,
    };
  });

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
      setRoute({
        name: "followList",
        mode: s.showFollowList ?? "followers",
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
    } else {
      setSelectedPost(null);
      setRoute({ name: "home" });
    }

    setPostDetailSource("home");
  }, []);

  // 팔로워 목록 화면 열릴 때 서버에서 팔로워 목록 불러오기
  useEffect(() => {
    if (showFollowList === "followers") {
      followActions.fetchFollowerUsers();
    }
  }, [showFollowList, followActions]);

  // 하드웨어 백버튼 처리
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
          closePostDetailFromState(state);
          return;
        }
        if (state.showTitlesCollection) {
          setRoute({ name: "myPage" });
          return;
        }
        if (state.showTitleShop) {
          setRoute({ name: "home" });
          return;
        }
        if (state.showAchievements) {
          setRoute({ name: "myPage" });
          setCurrentScreen("profile");
          return;
        }
        if (state.showUserProfile) {
          if (state.userProfileSection && state.userProfileSection !== "profile") {
            setUserProfileSection("profile");
          } else {
            setRoute({ name: "home" });
          }
          return;
        }
        if (state.showMyContentList) {
          setRoute({ name: "myPage" });
          setCurrentScreen("profile");
          return;
        }
        if (state.showFollowList) {
          setRoute({ name: "myPage" });
          setCurrentScreen("profile");
          return;
        }
        if (state.showMyPage) {
          setRoute({ name: "home" });
          setCurrentScreen("home");
          return;
        }
        if (state.showGuidelines) {
          setShowGuidelines(false);
          return;
        }
        if (state.showCategoryScreen) {
          setRoute({ name: "home" });
          return;
        }
        if (state.showRanking) {
          setRoute({ name: "home" });
          setCurrentScreen("home");
          return;
        }

        if (state.currentScreen === "home" && !state.selectedPost) {
          onRequestExit?.();
        }
      });
    };

    setupBackButtonListener();
    return () => {
      backButtonListener?.remove();
    };
  }, [closePostDetailFromState, onRequestExit]);

  // ========================================
  // 6. 글쓰기 핸들러
  // ========================================
  const handleStartWriting = useCallback(() => {
    postManagement.handleStartWriting(() => {
      setShowWriteScreen(true);
      setRoute({ name: "home" });
    });
  }, [postManagement]);

  const handlePostSubmit = useCallback(
    async (postData: Parameters<typeof postManagement.createPost>[0]) => {
      const createdPost = await postManagement.createPost(postData);
      if (createdPost) {
        setShowWriteScreen(false);
        setSelectedPost(createdPost);
        setRoute({ name: "postDetail", postId: createdPost.id, source: "home" });
      }
    },
    [postManagement]
  );

  // ========================================
  // 7. 멘션 클릭 핸들러
  // ========================================
  const handleMentionClick = useCallback((nickname: string) => {
    // 🔹 탈퇴한 사용자면 프로필 안 열기
    if (!nickname || nickname === DELETED_USER_NAME) {
      // 필요하면 토스트로 한 줄 안내해도 됨
      // toast("탈퇴한 사용자의 프로필은 볼 수 없어요.");
      return;
    }

    setUserProfileSection("profile");
    setLastUserProfileNickname(nickname);
    setRoute({ name: "userProfile", nickname });
  }, []);

  const renderContentWithMentions = useCallback(
    (content?: string | null): React.ReactNode => {
      return replyActions.renderContentWithMentions(content ?? "", handleMentionClick);
    },
    [replyActions, handleMentionClick]
  );

  // ========================================
  // 8. 조건부 렌더링
  // ========================================

  // 마이페이지
  if (showMyPage) {
    const userPosts = posts.filter((p) => p.author === userNickname);
    const userReplies = posts.flatMap((post) =>
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

    return (
      <div className={`w-full h-full ${isDarkMode ? "dark" : ""}`}>
        <div className="w-full h-full bg-background text-foreground flex flex-col">
          <MyPageScreen
            userNickname={userNickname}
            userProfileImage={userProfileImage}
            onProfileImageChange={onProfileImageChange}
            onBack={() => {
              setRoute({ name: "home" });
            }}
            onLogout={onLogout}
            isDarkMode={isDarkMode}
            onToggleDarkMode={onToggleDarkMode}
            onShowTerms={onShowTerms}
            onShowPrivacy={onShowPrivacy}
            onShowGuidelines={() => setShowGuidelines(true)}
            onShowOpenSourceLicenses={onShowOpenSourceLicenses}
            onShowAttributions={onShowAttributions}
            userPosts={userPosts}
            userReplies={userReplies}
            bookmarkedPosts={userBookmarkedPosts}
            currentTitle={titleActions.currentTitle}
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
                setPostDetailSource("myPage");
                setSelectedPost(post);
                setRoute({ name: "postDetail", postId: post.id, source: "myPage" });
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

        {showGuidelines && (
          <div className="fixed inset-0 z-50 bg-background">
            <CommunityGuidelinesScreen
              onBack={() => setShowGuidelines(false)}
              isAlreadyAgreed={true}
            />
          </div>
        )}
      </div>
    );
  }

  // 카테고리 화면
  if (showCategoryScreen) {
    return (
      <CategoryScreen
        onBack={() => {
          setRoute({ name: "home" });
        }}
        categories={categories}
        activeCategory={activeCategory}
        activeSubCategory={activeSubCategory}
        onCategorySelect={(catId, subCatId) => {
          setActiveCategory(catId);
          setActiveSubCategory(subCatId || "전체");
        }}
        posts={posts}
        onPostSelect={(post) => {
          setSelectedPost(post);
          setRoute({ name: "postDetail", postId: post.id, source: "home" });
        }}
      />
    );
  }

  // 칭호 상점
  if (showTitleShop) {
    return (
      <div className={`w-full h-full ${isDarkMode ? "dark" : ""}`}>
        <div className="w-full h-full bg-background text-foreground flex flex-col">
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            <TitleShop
              onBack={() => {
                setRoute({ name: "home" });
              }}
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
      </div>
    );
  }

  // 다른 유저 프로필
  if (showUserProfile) {
    const profilePosts = posts.filter((p) => p.author === showUserProfile);
    const isMyself = showUserProfile === userNickname;

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

    // 🔹 users 문서에서 가져온 실제 닉네임 / 삭제 여부
    const profileNicknameFromDoc =
      (profileOwnerProfile as any)?.nickname as string | undefined;

    const isDeletedProfile =
      (profileOwnerProfile as any)?.isDeleted === true ||
      profileNicknameFromDoc === "탈퇴한 사용자";

    // 실제로 UserProfileDialog에 넘길 이름
    const effectiveProfileName = isDeletedProfile
      ? "탈퇴한 사용자"
      : profileNicknameFromDoc || showUserProfile;

    return (
      <div className={`w-full h-full ${isDarkMode ? "dark" : ""}`}>
        <div className="w-full h-full bg-background text-foreground flex flex-col">
          <UserProfileDialog
            onBack={() => {
              if (userProfileSection !== "profile") {
                setUserProfileSection("profile");
              } else {
                setRoute({ name: "home" });
              }
            }}
            username={effectiveProfileName}
            userAvatar={
              isMyself
                ? userProfileImage
                : profileOwnerProfile?.profileImage ??
                profilePosts[0]?.authorAvatar ??
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
                setLastUserProfileNickname(showUserProfile);

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
                setLastUserProfileNickname(showUserProfile);

                setSelectedPost(post);
                setRoute({
                  name: "postDetail",
                  postId: post.id,
                  source: "userProfileReplies",
                });
              }
            }}
            isMyself={isMyself}
            isFollowing={followActions.isFollowing(showUserProfile)}
            onToggleFollowUser={followActions.handleToggleFollowUser}
            onFollowUserClick={(nickname) => {
              setUserProfileSection("profile");
              setLastUserProfileNickname(nickname);
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
      </div>
    );
  }

  // 칭호 도감
  if (showTitlesCollection) {
    return (
      <div className={`w-full h-full ${isDarkMode ? "dark" : ""}`}>
        <div className="w-full h-full bg-background text-foreground flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <TitlesCollection
              onBack={() => {
                setRoute({ name: "myPage" });
              }}
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
      </div>
    );
  }

  // 팔로우 목록
  if (showFollowList) {
    const users =
      showFollowList === "followers"
        ? followActions.followerUsersDetailed
        : followActions.followingUsersDetailed;

    return (
      <div className={`w-full h-full ${isDarkMode ? "dark" : ""}`}>
        <div className="w-full h-full bg-background text-foreground flex flex-col">
          <FollowListScreen
            mode={showFollowList}
            users={users}
            onBack={() => {
              setRoute({ name: "myPage" });
              setCurrentScreen("profile");
            }}
            onUserClick={(nickname) => {
              // 🔹 탈퇴한 사용자면 프로필 안 열기
              if (!nickname || nickname === DELETED_USER_NAME) {
                return;
              }
              setUserProfileSection("profile");
              setLastUserProfileNickname(nickname);
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
      </div>
    );
  }

  // 내 글/답글 목록
  if (showMyContentList) {
    return (
      <div className={`w-full h-full ${isDarkMode ? "dark" : ""}`}>
        <div className="w-full h-full bg-background text-foreground flex flex-col">
          <MyContentListScreen
            mode={showMyContentList}
            onBack={() => {
              setRoute({ name: "myPage" });
              setCurrentScreen("profile");
            }}
            posts={posts.filter((p) => p.author === userNickname)}
            replies={posts.flatMap((post) =>
              (post.replies ?? [])
                .filter((r: Reply) => r.author === userNickname)
                .map((r: Reply) => ({
                  ...r,
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
            )}
            onPostClick={(postId) => {
              const post = posts.find((p) => p.id === postId);
              if (post) {
                const source =
                  showMyContentList === "posts" ? "myPostsList" : "myRepliesList";

                setPostDetailSource(source);
                setSelectedPost(post);
                setRoute({ name: "postDetail", postId: post.id, source });
              }
            }}
            onReplyClick={(postId, _replyId) => {
              const post = posts.find((p) => p.id === postId);
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
      </div>
    );
  }

  // 랭킹
  if (showRanking) {
    return (
      <div className={`w-full h-full ${isDarkMode ? "dark" : ""}`}>
        <div className="w-full h-full bg-background text-foreground flex flex-col">
          <RankingScreen
            onBack={() => {
              setRoute({ name: "home" });
              setCurrentScreen("home");
            }}
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
      </div>
    );
  }

  // 업적
  if (showAchievements) {
    return (
      <div className={`w-full h-full ${isDarkMode ? "dark" : ""}`}>
        <div className="w-full h-full bg-background text-foreground flex flex-col">
          <AchievementsScreen
            onBack={() => {
              setRoute({ name: "myPage" });
              setCurrentScreen("profile");
            }}
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
      </div>
    );
  }

  // 북마크
  if (currentScreen === "bookmarks") {
    const visiblePosts = posts.filter((p) => !((p as any).hidden === true));
    return (
      <div className={`w-full h-full ${isDarkMode ? "dark" : ""}`}>
        <div className="w-full h-full bg-background text-foreground flex flex-col">
          <BookmarkScreen
            onBack={() => {
              setRoute({ name: "home" });
              setCurrentScreen("home");
            }}
            bookmarkedPosts={bookmarkActions.bookmarkedPosts}
            posts={visiblePosts as any}
            onPostSelect={(post) => {
              setSelectedPost(post as any as Post);
              setRoute({
                name: "postDetail",
                postId: (post as any as Post).id,
                source: "home",
              });
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
      </div>
    );
  }

  // 글쓰기
  if (showWriteScreen) {
    return (
      <WriteScreen
        onBack={() => {
          setShowWriteScreen(false);
          setRoute({ name: "home" });
        }}
        onSubmit={handlePostSubmit}
        categories={categories}
      />
    );
  }

  // 검색
  if (showSearchScreen) {
    return (
      <SearchScreen
        onBack={() => {
          setRoute({ name: "home" });
        }}
        posts={posts}
        onPostSelect={(post) => {
          setSelectedPost(post);
          setRoute({ name: "postDetail", postId: post.id, source: "home" });
        }}
      />
    );
  }

  // 운영자 신고 관리 화면
  if (route.name === "adminReports" && isAdmin) {
    return (
      <div className={`w-full h-full ${isDarkMode ? "dark" : ""}`}>
        <div className="w-full h-full bg-background text-foreground flex flex-col">
          {/* ❌ 제거: 불필요한 wrapper */}
          <AdminReportScreen
            onBack={() => {
              setRoute({ name: "home" });
            }}
          />

          {/* 하단 탭바 */}
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
    );
  }

  // 9. 메인 화면 (홈 + 게시물 상세)
  const isPostDetail =
    route.name === "postDetail" && selectedPost && route.postId === selectedPost.id;

  return (
    <div className={`w-full h-full ${isDarkMode ? "dark" : ""}`}>
      <div className="w-full h-full bg-background text-foreground flex flex-col">
        <div className="flex-1 overflow-hidden flex flex-col">
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
                setRoute({ name: "userProfile", nickname: selectedPost.author });
              }}
              onMentionAuthor={() =>
                replyActions.handleInsertMention(selectedPost.author)
              }
              onMentionReplyAuthor={replyActions.handleInsertMention}
              onReplyAuthorClick={(author) => {
                setUserProfileSection("profile");
                setLastUserProfileNickname(author);
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
            />
          ) : (
            <>
              <HomeHeader
                isDarkMode={isDarkMode}
                onToggleDarkMode={onToggleDarkMode}
                hasNotifications={notificationActions.hasNotifications}
                showNotifications={notificationActions.showNotifications}
                onNotificationsToggle={notificationActions.setShowNotifications}
                notifications={notificationActions.notifications}
                onNotificationClick={notificationActions.handleNotificationClick}
                onMarkAllNotificationsRead={
                  notificationActions.handleMarkAllNotificationsRead
                }
                onNotificationSettingsClick={() =>
                  setShowNotificationSettings(true)
                }
                activeCategory={activeCategory}
                activeSubCategory={activeSubCategory}
                onCategoryClick={() => {
                  setRoute({ name: "category" });
                }}
                onGuidelinesClick={() => setShowGuidelines(true)}
                onTitleShopClick={() => {
                  setRoute({ name: "titleShop" });
                }}
                isAdmin={isAdmin}
                onOpenAdminReports={() => {
                  if (!isAdmin) return;
                  setRoute({ name: "adminReports" });
                }}
              />
              <PostListView
                posts={posts}
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

      {showNotificationSettings && (
        <div className="fixed inset-0 z-50 bg-background">
          <NotificationSettingsDialog
            onBack={() => setShowNotificationSettings(false)}
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
                targetAuthorUid:
                  (reportingPost as any).authorUid ??
                  (reportingPost as any).uid ??
                  null,
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

                // 🔹 이 신고가 어떤 게시글의 댓글인지
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

      {showGuidelines && (
        <div className="fixed inset-0 z-50 bg-background">
          <CommunityGuidelinesScreen
            onBack={() => setShowGuidelines(false)}
            isAlreadyAgreed={true}
          />
        </div>
      )}

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
