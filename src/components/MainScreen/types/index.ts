// MainScreen/types/index.ts
// MainScreen에서 사용하는 모든 타입 정의

/**
 * 게시물 타입
 */
export interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  subCategory: string;
  type: "question" | "guide" | string;
  tags: string[];
  author: string;
  authorUid: string | null;
  authorAvatar: string;
  createdAt: Date;
  lanterns: number;
  replies: Reply[];
  replyCount: number;
  comments: number;
  views: number;
  isBookmarked: boolean;
  isOwner: boolean;
  timeAgo?: string;
  [key: string]: any;
  guideReplyId?: number;        // ← 이 줄
  guideReplyAuthor?: string;
  /** 작성자의 현재 칭호 ID (Firestore users 컬렉션의 currentTitle) */
  authorTitleId?: string | null;

  /** 작성자의 현재 칭호 이름 (UI용, titleData.ts의 매핑 결과) */
  authorTitleName?: string | null;
  hidden?: boolean;
  reportCount?: number;
}

/**
 * 답글 타입
 */
export interface Reply {
  id: number;
  content: string;
  author: string;
  authorUid?: string | null;
  authorAvatar?: string | null;
  timeAgo: string;
  lanterns: number;
  isGuide?: boolean;
  createdAt?: Date;
  /** 작성자의 현재 칭호 ID */
  authorTitleId?: string | null;

  /** 작성자의 현재 칭호 이름 (UI용) */
  authorTitleName?: string | null;
  postId?: string;
  postTitle?: string;
  postAuthor?: string;
  postAuthorUid?: string | null;
  /** 자동응답 여부 */
  isAi?: boolean;
  /** 예: [AI 자동응답] */
  aiLabel?: string;
  /** 요약/툴팁용 설명 */
  aiSummary?: string;
  /** auto_reply 등 생성 소스 */
  aiSource?: string;
}

/**
 * 알림 타입
 */
export interface Notification {
  id: string;
  type:
  | "reply"
  | "lantern"
  | "popular"
  | "guide"
  | "follow"
  | "mention"
  | "system"
  | "achievement";
  message: string;
  postId?: string | number;
  postTitle?: string;
  time: string;
  isRead: boolean;
}

/**
 * 현재 표시 중인 화면 타입
 */
export type CurrentScreen =
  | "home"
  | "ranking"
  | "bookmarks"
  | "profile"
  | "achievements"
  | "mypage"
  | "titlesCollection";

/**
 * 화면 표시 상태 (showXXX 상태들)
 */
export interface ScreenVisibility {
  showMyPage: boolean;
  showCategoryScreen: boolean;
  showSearchScreen: boolean;
  showNotificationSettings: boolean;
  showBookmarks: boolean;
  showWriteScreen: boolean;
  showPostWarning: boolean;
  showTitleShop: boolean;
  showTitlesCollection: boolean;
  showRanking: boolean;
  showAchievements: boolean;
  showTheme: boolean;
  showGuidelines: boolean;
  showNotifications: boolean;
  showFollowList: "followers" | "following" | null;
  showMyContentList: "posts" | "replies" | null;
  showUserProfile: string | null;
}

/**
 * 사용자 프로필 데이터
 */
export interface UserProfile {
  nickname: string;
  profileImage: string;
  profileDescription: string;
  trustScore: number;
  currentTitle: string;
  ownedTitles: string[];
  userPostLanterns: number;
  userReplyLanterns: number;
  userGuideCount: number;
}

/**
 * 팔로우 관련 데이터
 */
export interface FollowData {
  followingUsers: string[];
  followerUsers: string[];
  followerCount: number;
}

/**
 * 등불 상태
 */
export interface LanternState {
  lanternedPosts: Set<string>;
  lanternedReplies: Set<number>;
}

/**
 * 북마크 상태
 */
export interface BookmarkState {
  bookmarkedPosts: Set<string>;
}

/**
 * 가이드(길잡이) 상태
 */
export interface GuideState {
  guideReplies: Set<number>;
  postGuides: Map<string, number>;
}

/**
 * 카테고리 타입
 */
export interface Category {
  id: string;
  name: string;
  subCategories: SubCategory[];
}

/**
 * 서브 카테고리 타입
 */
export interface SubCategory {
  id: string;
  name: string;
}

/**
 * 정렬 옵션
 */
export interface SortOption {
  label: string;
  value: "latest" | "oldest" | "lanterns";
}

/**
 * 퀴즈 관련 타입
 */
export type { QuizQuestion, WeeklyQuiz, UserQuizAnswer, QuizProgress } from "./quiz";

/**
 * MainScreen Props
 */
export interface MainScreenProps {
  userNickname: string;
  userProfileImage: string;
  onProfileImageChange: (file: File) => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onRequestExit: () => void;
  onShowTerms?: () => void;
  onShowPrivacy?: () => void;
  onShowGuidelines?: () => void;
  onShowOpenSourceLicenses?: () => void;
  onShowAttributions?: () => void;
  onThemeClick?: () => void;
  shouldOpenMyPageOnMain?: boolean;
  shouldOpenSettingsOnMyPage?: boolean;
  onMainScreenReady?: () => void;
  onSettingsOpenedFromMain?: () => void;
}

/**
 * 네비게이션 상태 Ref (뒤로가기 처리용)
 */
export interface NavigationStateRef {
  showWriteScreen: boolean;
  selectedPost: Post | null;
  showTitlesCollection: boolean;
  showTitleShop: boolean;
  showAchievements: boolean;
  showMyPage: boolean;
  showCategoryScreen: boolean;
  showSearchScreen: boolean;
  showNotificationSettings: boolean;
  showBookmarks: boolean;
  showRanking: boolean;
  showGuidelines: boolean;
  showMyContentList: "posts" | "replies" | null;
  showFollowList: "followers" | "following" | null;
  showUserProfile: string | null;
  currentScreen: CurrentScreen;
}
