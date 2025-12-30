import { useState, useCallback, useMemo, useEffect, type MouseEvent } from "react";
import { useScrollRestoration } from "./hooks/useScrollRestoration";
import { Button } from "./ui/button";
import { auth, db } from "@/firebase";
import { titles as titleData, ALL_TITLE_LABELS, getTitleLabelById } from "@/data/titleData";
import { doc, updateDoc } from "firebase/firestore";
import { Card, CardContent } from "./ui/card";
import { OptimizedAvatar } from "./OptimizedAvatar";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { SettingsScreen } from "./SettingsScreen";
import { toast } from "@/toastHelper";
import { LanternFilledIcon } from "./icons/Lantern";
import {
  Settings,
  LogOut,
  Moon,
  Sun,
  Camera,
  Edit,
  FileText,
  Star,
  MessageCircle,
  Compass,
  Trophy,
  BookOpen,
  ShieldCheck,
  Users,
  UserCheck,
  UserX,
} from "lucide-react";
import { AppHeader } from "./layout/AppHeader";
// 신뢰도 점수에 따라 텍스트 색 클래스 결정 (Tailwind)
function getTrustColorClass(score: number): string {
  if (score <= 10) return "text-red-400";
  if (score <= 30) return "text-orange-400";
  if (score <= 70) return "text-emerald-400";
  return "text-blue-400";
}

// 신뢰도 점수에 따른 간단 설명
function getTrustDescription(score: number): string {
  if (score <= 10)
    return "이제 막 첫 등불을 켜기 시작했어요. 질문하고 답변하면서 천천히 신뢰를 쌓아가 봐요.";
  if (score <= 30)
    return "기본 수준의 신뢰도예요. 이해를 돕는 질문과 비유, 예시가 쌓일수록 점수가 올라가요.";
  if (score <= 70)
    return "안정적인 신뢰도예요. 비유와 예시로 많은 사람에게 도움을 주고 있어요.";
  return "매우 높은 신뢰도예요. 이곳에서 믿고 보는 길잡이로, 당신의 설명이 길이 되고 있어요.";
}

interface MyPageScreenProps {
  userNickname: string;
  userProfileImage?: string;
  onProfileImageChange?: (file: File) => void;
  onBack: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onShowPrivacy?: () => void;
  onShowTerms?: () => void;
  onShowGuidelines?: () => void;
  onShowOpenSourceLicenses?: () => void;
  onShowAttributions?: () => void;
  userPosts?: any[];
  userReplies?: any[];
  bookmarkedPosts?: any[];
  currentTitle?: string;
  userGuideCount?: number;
  trustScore?: number;      // 🔹 신뢰도 점수 (0~100)

  /** 🔹 프로필 한 줄 설명 */
  profileDescription?: string;
  onProfileDescriptionChange?: (value: string) => void;

  /** 🔹 팔로워 / 팔로잉 개수 (추후 팔로우 기능과 연결) */
  followerCount?: number;
  followingCount?: number;

  /** 🔹 카드 눌렀을 때 새 화면으로 이동 */
  onFollowerCardClick?: () => void;
  onFollowingCardClick?: () => void;

  // 🔹 작성한 글 / 답글 카드 클릭 시 부모(MainScreen)로 알려줄 콜백
  onMyPostsCardClick?: () => void;
  onMyRepliesCardClick?: () => void;

  onHomeClick?: () => void;
  onRankingClick?: () => void;
  onBookmarksClick?: () => void;
  onWriteClick?: () => void;

  onTitleShopClick?: () => void;
  onAchievementsClick?: () => void;
  onTitlesCollectionClick?: () => void;
  onBadgeShopClick?: () => void;
  onPostClick?: (postId: string) => void;
  onReplyClick?: (postId: string, replyId: number) => void;
  /** 🔹 법적 문서 화면에서 뒤로왔을 때, 설정 화면을 자동으로 열지 여부 */
  autoOpenSettings?: boolean;
  /** 🔹 자동으로 설정 화면을 연 뒤, 플래그를 초기화하기 위한 콜백 */
  onAutoSettingsOpened?: () => void;

  /** 🆕 차단 관리 버튼 클릭 콜백 */
  onManageBlockedUsers?: () => void;
}

export function MyPageScreen({
  userNickname,
  userProfileImage = "",
  onProfileImageChange,
  onBack,
  onLogout,
  isDarkMode,
  onToggleDarkMode,
  onShowPrivacy,
  onShowTerms,
  onShowGuidelines,
  onShowOpenSourceLicenses,
  onShowAttributions,
  userPosts = [],
  userReplies = [],
  bookmarkedPosts = [],
  currentTitle = "",
  userGuideCount = 0,
  trustScore = 30,            // 🔹 기본 30점
  profileDescription: initialProfileDescription = "",
  onProfileDescriptionChange,
  onAchievementsClick,
  onTitlesCollectionClick,
  followerCount = 0,
  followingCount = 0,
  onFollowerCardClick,
  onFollowingCardClick,
  onMyPostsCardClick,
  onMyRepliesCardClick,
  onPostClick: onPostClick,
  onReplyClick: onReplyClick,
  autoOpenSettings,
  onAutoSettingsOpened,
  onManageBlockedUsers,
}: MyPageScreenProps) {

  const [profileDescription, setProfileDescription] =
    useState(initialProfileDescription);

  useEffect(() => {
    setProfileDescription(initialProfileDescription);
  }, [initialProfileDescription]);

  const [showDescriptionDialog, setShowDescriptionDialog] = useState(false);
  const [tempDescription, setTempDescription] = useState("");
  const DESCRIPTION_LIMIT = 80;
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    if (autoOpenSettings) {
      setShowSettings(true);
      if (onAutoSettingsOpened) {
        onAutoSettingsOpened();
      }
    }
  }, [autoOpenSettings, onAutoSettingsOpened]);

  const scrollRef = useScrollRestoration({ key: 'mypage' });

  const [showRecentPostsDialog, setShowRecentPostsDialog] = useState(false);
  const [showRecentRepliesDialog, setShowRecentRepliesDialog] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutClick = useCallback(() => {
    setShowLogoutConfirm(true);
  }, []);

  const handleLogoutConfirm = useCallback(async () => {
    setShowLogoutConfirm(false);

    try {
      onLogout(); // 부모 컴포넌트의 로그아웃 핸들러 호출 (resetAuthState가 모든 처리를 담당)
      toast.success("로그아웃 되었습니다.");
    } catch {
      toast.error("로그아웃 중 오류가 발생했습니다.");
    }
  }, [onLogout]);

  const handleLogoutCancel = useCallback(() => {
    setShowLogoutConfirm(false);
  }, []);

  const handleProfileImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onProfileImageChange) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("파일 크기는 5MB 이하로 선택해주세요.");
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error("이미지 파일만 선택 가능합니다.");
        return;
      }

      onProfileImageChange(file);
      toast.success("프로필 사진이 변경되었습니다!");
    }
  }, [onProfileImageChange]);

  const getCurrentTitleName = () => {
    if (!currentTitle) return "";
    // ALL_TITLE_LABELS에서 먼저 찾기 (업적 칭호 포함)
    const titleName = ALL_TITLE_LABELS[currentTitle];
    if (titleName) return titleName;
    // 없으면 titleData에서 찾기 (길잡이 칭호)
    const title = titleData.find(t => t.id === currentTitle);
    return title?.name || "";
  };

  const mockUserPosts = userPosts;
  const mockUserReplies = userReplies;

  const topUserPost = useMemo(() => {
    if (!mockUserPosts || mockUserPosts.length === 0) return null;
    return mockUserPosts.reduce((best: any, current: any) => {
      const bestLanterns = typeof best?.lanterns === "number" ? best.lanterns : 0;
      const currentLanterns = typeof current?.lanterns === "number" ? current.lanterns : 0;
      return currentLanterns > bestLanterns ? current : best;
    }, mockUserPosts[0]);
  }, [mockUserPosts]);

  const topUserReply = useMemo(() => {
    if (!mockUserReplies || mockUserReplies.length === 0) return null;
    return mockUserReplies.reduce((best: any, current: any) => {
      const bestLanterns = typeof best?.lanterns === "number" ? best.lanterns : 0;
      const currentLanterns = typeof current?.lanterns === "number" ? current.lanterns : 0;
      return currentLanterns > bestLanterns ? current : best;
    }, mockUserReplies[0]);
  }, [mockUserReplies]);

  const mockBookmarkedPosts = bookmarkedPosts;

  // 🧭 신뢰도 (0~100으로 보정 + 색/레이블)
  const trust = Math.max(0, Math.min(100, trustScore));
  const trustColorClass = getTrustColorClass(trust);
  const trustDescription = getTrustDescription(trust);

  const userStats = {
    postsCount: mockUserPosts.length,
    guidesReceived: userGuideCount,
    commentsCount: mockUserReplies.length,
    bookmarksCount: mockBookmarkedPosts.length
  };

  const recentUserPosts = userPosts
    ? [...userPosts].sort((a, b) => (b.lanterns || 0) - (a.lanterns || 0)).slice(0, 3)
    : [];

  const recentUserReplies = userReplies
    ? [...userReplies].sort((a, b) => (b.lanterns || 0) - (a.lanterns || 0)).slice(0, 3)
    : [];

  const handleDescriptionUpdate = useCallback(async () => {
    const trimmed = tempDescription.trim();

    if (!trimmed) {
      toast.error("프로필 설명을 입력해주세요.");
      return;
    }

    if (trimmed.length > DESCRIPTION_LIMIT) {
      toast.error(`최대 ${DESCRIPTION_LIMIT}자까지 입력할 수 있어요.`);
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error("로그인 후 이용해주세요.");
        return;
      }

      // 🔹 Firestore에 저장
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        profileDescription: trimmed,
      });

      // 🔹 MyPage 내부 상태도 반영
      setProfileDescription(trimmed);

      // 🔹 부모(MainScreen)에도 알려주기
      onProfileDescriptionChange?.(trimmed);

      toast.success("프로필 설명이 변경되었습니다!");
      setShowDescriptionDialog(false);
      setTempDescription("");
    } catch {
      toast.error("프로필 설명을 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
    }
  }, [tempDescription, onProfileDescriptionChange]);

  const handleSettingsBack = useCallback(() => {
    setShowSettings(false);
  }, []);

  const handleTempDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const v = e.target.value;
      const isComposing = (e.nativeEvent as any)?.isComposing;
      if (isComposing) setTempDescription(v);
      else setTempDescription(v.slice(0, DESCRIPTION_LIMIT));
    },
    []
  );

  const handleCloseDescriptionDialog = useCallback(() => {
    setShowDescriptionDialog(false);
  }, []);

  const handleDescriptionOpenChange = useCallback((open: boolean) => {
    setShowDescriptionDialog(open);
    if (open) {
      setTempDescription(profileDescription);
    }
  }, [profileDescription]);

  const handleShowSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const handleCompositionEnd = useCallback(() => {
    setTempDescription((prev) => prev.slice(0, DESCRIPTION_LIMIT));
  }, []);

  const handlePostsCardClick = useCallback(() => {
    if (onMyPostsCardClick) {
      onMyPostsCardClick();
    } else {
      setShowRecentPostsDialog(true);
    }
  }, [onMyPostsCardClick]);

  const handleRepliesCardClick = useCallback(() => {
    if (onMyRepliesCardClick) {
      onMyRepliesCardClick();
    } else {
      setShowRecentRepliesDialog(true);
    }
  }, [onMyRepliesCardClick]);

  const handleCloseRecentPostsDialog = useCallback(() => {
    setShowRecentPostsDialog(false);
  }, []);

  const handleCloseRecentRepliesDialog = useCallback(() => {
    setShowRecentRepliesDialog(false);
  }, []);

  const handlePostItemClick = useCallback((postId: string) => {
    setShowRecentPostsDialog(false);
    onPostClick?.(postId);
  }, [onPostClick]);

  const handleReplyItemClick = useCallback((postId: string, replyId: number) => {
    setShowRecentRepliesDialog(false);
    onReplyClick?.(postId, replyId);
  }, [onReplyClick]);

  const handleRecentPostCardClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const postIdAttr = event.currentTarget.getAttribute("data-post-id");
      if (!postIdAttr) return;

      handlePostItemClick(postIdAttr);
    },
    [handlePostItemClick],
  );

  const handleRecentReplyCardClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const postIdAttr = event.currentTarget.getAttribute("data-post-id");
      const replyIdAttr = event.currentTarget.getAttribute("data-reply-id");
      if (!postIdAttr || !replyIdAttr) return;

      const replyId = Number(replyIdAttr);
      if (!Number.isNaN(replyId)) {
        handleReplyItemClick(postIdAttr, replyId);
      }
    },
    [handleReplyItemClick],
  );

  if (showSettings) {
    return (
      <SettingsScreen
        onBack={handleSettingsBack}
        isDarkMode={isDarkMode}
        onToggleDarkMode={onToggleDarkMode}
        onShowPrivacy={onShowPrivacy}
        onShowTerms={onShowTerms}
        onShowGuidelines={onShowGuidelines}
        onShowOpenSourceLicenses={onShowOpenSourceLicenses}
        onShowAttributions={onShowAttributions}
        onLogout={handleLogoutConfirm}
      />
    );
  }

  return (
    <div className="w-full h-full bg-background text-foreground flex flex-col overflow-hidden">
      <AppHeader
        title="마이페이지"
        onBack={onBack}
        rightSlot={
          <Button variant="ghost" size="icon" onClick={onToggleDarkMode}>
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        }
      />

      <div
        ref={scrollRef}
        className="flex-1 scroll-container scrollbar-hide p-4 pb-24 space-y-4"
      >
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <OptimizedAvatar
                  src={userProfileImage}
                  alt={userNickname ? `${userNickname}님의 프로필` : "프로필 이미지"}
                  fallbackText={userNickname?.charAt(0)?.toUpperCase() || "?"}
                  nickname={userNickname}
                  className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-xl"
                />

                <div className="absolute -bottom-1 -right-1">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="profile-image-upload"
                    onChange={handleProfileImageUpload}
                  />
                  <Button
                    size="icon"
                    asChild
                    className="w-9 h-9 rounded-full cursor-pointer touch-target"
                  >
                    <label htmlFor="profile-image-upload">
                      <Camera className="w-4 h-4" />
                    </label>
                  </Button>
                </div>
              </div>
              <div className="flex-1 min-h-20 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <h2 className="text-xl font-semibold truncate">{userNickname}</h2>
                    {getCurrentTitleName() && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {getCurrentTitleName()}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="touch-target"
                    onClick={() => handleDescriptionOpenChange(true)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
                {profileDescription && (
                  <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap break-words leading-snug line-clamp-2">
                    {profileDescription}
                  </p>
                )}

              </div>
            </div>
          </CardContent>
        </Card>

        {/* 신뢰도 정보 카드 */}
        <Card className="border-border/70 shadow-sm rounded-xl mt-3">
          <CardContent className="p-4 flex flex-col items-center text-center gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                신뢰도{" "}
                <span className={`font-semibold ${trustColorClass}`}>
                  {Math.round(trust)}점
                </span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-snug">
              {trustDescription}
            </p>
          </CardContent>
        </Card>

        {/* 선원 / 승선한 배 카드 */}
        <div className="grid grid-cols-2 gap-3">
          <Card
            className="cursor-pointer"
            onClick={onFollowerCardClick}
          >
            <CardContent className="p-6 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-amber-500" />
              <div className="text-lg font-medium">{followerCount}</div>
              <div className="text-xs text-muted-foreground leading-snug">
                선원
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer"
            onClick={onFollowingCardClick}
          >
            <CardContent className="p-6 text-center">
              <UserCheck className="w-6 h-6 mx-auto mb-2 text-amber-500" />
              <div className="text-lg font-medium">{followingCount}</div>
              <div className="text-xs text-muted-foreground leading-snug">
                승선한 배
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 활동 통계 카드 */}
        <div className="grid grid-cols-2 gap-3">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
            onClick={handlePostsCardClick}
          >
            <CardContent className="p-4 text-center">
              <FileText className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <div className="text-lg font-medium">{userStats.postsCount}</div>
              <div className="text-xs text-muted-foreground">작성한 글</div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
            onClick={handleRepliesCardClick}
          >
            <CardContent className="p-4 text-center">
              <MessageCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <div className="text-lg font-medium">{userStats.commentsCount}</div>
              <div className="text-xs text-muted-foreground">답글</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Compass className="w-6 h-6 mx-auto mb-2 text-primary" />
              <div className="text-lg font-medium">{userStats.guidesReceived}</div>
              <div className="text-xs text-muted-foreground">길잡이</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Star className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <div className="text-lg font-medium">{userStats.bookmarksCount}</div>
              <div className="text-xs text-muted-foreground">북마크</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="posts" className="text-xs">
              <FileText className="w-4 h-4 mr-1" />
              내 글
            </TabsTrigger>
            <TabsTrigger value="replies" className="text-xs">
              <MessageCircle className="w-4 h-4 mr-1" />
              내 답글
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-3 mt-4">
            {topUserPost ? (
              <Card
                key={topUserPost.id}
                className="hover:shadow-md transition-shadow cursor-pointer list-optimized"
                data-post-id={topUserPost.id}
                onClick={handleRecentPostCardClick}
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {topUserPost.subCategory}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {topUserPost.timeAgo}
                      </span>
                    </div>
                    <h3 className="font-medium text-sm">{topUserPost.title}</h3>
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <LanternFilledIcon className="w-3 h-3 text-amber-500" />
                          <span className="text-xs text-amber-600">
                            {topUserPost.lanterns}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {topUserPost.comments}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-blue-500/30 dark:bg-blue-400/30 blur-2xl rounded-full"></div>
                    <div className="relative w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center border-4 border-blue-400 dark:border-blue-600 shadow-lg mx-auto">
                      <FileText className="w-12 h-12 text-blue-900 dark:text-blue-200" strokeWidth={2.5} />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    아직 작성한 글이 없습니다. 궁금한 것을 편하게 질문해 보세요.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="replies" className="space-y-3 mt-4">
            {topUserReply ? (
              <Card
                key={topUserReply.id}
                className="hover:shadow-md transition-shadow cursor-pointer list-optimized"
                data-post-id={topUserReply.postId}
                data-reply-id={topUserReply.id}
                onClick={handleRecentReplyCardClick}
              >
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-primary truncate max-w-[60%]">
                        {topUserReply.postAuthor}님의 글
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {topUserReply.timeAgo}
                      </span>
                    </div>
                    <h4 className="text-sm text-muted-foreground">
                      "{topUserReply.postTitle}"
                    </h4>
                    <p className="text-sm leading-relaxed">
                      {topUserReply.content}
                    </p>
                    <div className="flex items-center space-x-1 pt-1">
                      <LanternFilledIcon className="w-3 h-3 text-amber-500" />
                      <span className="text-xs text-amber-600">
                        {topUserReply.lanterns}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-green-500/30 dark:bg-green-400/30 blur-2xl rounded-full"></div>
                    <div className="relative w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center border-4 border-green-400 dark:border-green-600 shadow-lg mx-auto">
                      <MessageCircle className="w-12 h-12 text-green-900 dark:text-green-200" strokeWidth={2.5} />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    아직 작성한 답글이 없습니다. 다른 사람의 질문에 비유와 예시로 답해 보세요.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="space-y-2 mt-6">
          {onTitlesCollectionClick && (
            <Button
              variant="ghost"
              className="w-full justify-start p-4 h-auto"
              onClick={onTitlesCollectionClick}
            >
              <BookOpen className="w-5 h-5 mr-3 text-purple-500" />
              <div className="text-left">
                <p className="font-medium">칭호 도감</p>
                <p className="text-sm text-muted-foreground">
                  비유노트에서 모은 칭호들을 한눈에 볼 수 있어요.
                </p>
              </div>
            </Button>
          )}

          {onAchievementsClick && (
            <Button
              variant="ghost"
              className="w-full justify-start p-4 h-auto"
              onClick={onAchievementsClick}
            >
              <Trophy className="w-5 h-5 mr-3 text-amber-500" />
              <div className="text-left">
                <p className="font-medium">업적</p>
                <p className="text-sm text-muted-foreground">
                  질문과 답변으로 쌓인 나의 기록을 확인해 보세요.
                </p>
              </div>
            </Button>
          )}

          {/* 🆕 차단 관리 버튼 */}
          {onManageBlockedUsers && (
            <Button
              variant="ghost"
              className="w-full justify-start p-4 h-auto"
              onClick={onManageBlockedUsers}
            >
              <UserX className="w-5 h-5 mr-3 text-red-500" />
              <div className="text-left">
                <p className="font-medium">차단 관리</p>
                <p className="text-sm text-muted-foreground">
                  차단한 사용자 목록을 확인하고 해제할 수 있어요.
                </p>
              </div>
            </Button>
          )}

          <Button
            variant="ghost"
            className="w-full justify-start p-4 h-auto"
            onClick={handleShowSettings}
          >
            <Settings className="w-5 h-5 mr-3" />
            <div className="text-left">
              <p className="font-medium">설정</p>
            </div>
          </Button>

          <Button
            variant="ghost"
            className="w-full justify-start p-4 h-auto text-destructive hover:text-destructive"
            onClick={handleLogoutClick}
          >
            <LogOut className="w-5 h-5 mr-3" />
            <div className="text-left">
              <p className="font-medium">로그아웃</p>
              <p className="text-sm text-muted-foreground">계정에서 로그아웃합니다</p>
            </div>
          </Button>
        </div>
      </div>

      {/* 🔹 최근 3일 작성한 글 Dialog */}
      <Dialog open={showRecentPostsDialog} onOpenChange={setShowRecentPostsDialog}>
        <DialogContent className="w-[340px] max-w-[90vw] max-h-[70vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>최근 3일간 작성한 글</DialogTitle>
            <DialogDescription>
              최근 3일 이내에 작성한 게시글 목록입니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            {recentUserPosts.length > 0 ? (
              recentUserPosts.map((post: any) => (
                <Card
                  key={post.id}
                  data-post-id={post.id}
                  className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
                  onClick={handleRecentPostCardClick}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline" className="text-xs">
                        {post.subCategory || post.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{post.timeAgo}</span>
                    </div>
                    <h4 className="text-sm font-medium line-clamp-2">{post.title}</h4>
                    <div className="flex items-center space-x-3 mt-2">
                      <div className="flex items-center space-x-1">
                        <LanternFilledIcon className="w-3 h-3 text-amber-500" />
                        <span className="text-xs text-amber-600">{post.lanterns}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{post.comments}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="py-8 text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">최근 3일간 작성한 글이 없습니다</p>
              </div>
            )}
          </div>
          <Button variant="outline" onClick={handleCloseRecentPostsDialog} className="mt-2">
            닫기
          </Button>
        </DialogContent>
      </Dialog>

      {/* 🔹 최근 3일 작성한 답글 Dialog */}
      <Dialog open={showRecentRepliesDialog} onOpenChange={setShowRecentRepliesDialog}>
        <DialogContent className="w-[340px] max-w-[90vw] max-h-[70vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>최근 3일간 작성한 답글</DialogTitle>
            <DialogDescription>
              최근 3일 이내에 작성한 답글 목록입니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            {recentUserReplies.length > 0 ? (
              recentUserReplies.map((reply: any) => (
                <Card
                  key={reply.id}
                  data-post-id={reply.postId}
                  data-reply-id={reply.id}
                  className="cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
                  onClick={handleRecentReplyCardClick}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-primary truncate max-w-[60%]">
                        {reply.postAuthor}님의 글
                      </span>
                      <span className="text-xs text-muted-foreground">{reply.timeAgo}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1 line-clamp-1">
                      "{reply.postTitle}"
                    </p>
                    <p className="text-sm line-clamp-2">{reply.content}</p>
                    <div className="flex items-center space-x-1 mt-2">
                      <LanternFilledIcon className="w-3 h-3 text-amber-500" />
                      <span className="text-xs text-amber-600">{reply.lanterns}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="py-8 text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">최근 3일간 작성한 답글이 없습니다</p>
              </div>
            )}
          </div>
          <Button variant="outline" onClick={handleCloseRecentRepliesDialog} className="mt-2">
            닫기
          </Button>
        </DialogContent>
      </Dialog>

      {/* 🔹 로그아웃 확인 모달 */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-[360px] max-w-full rounded-2xl border border-border/60 bg-card shadow-2xl shadow-black/20 p-6 space-y-5">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-accent/50 flex items-center justify-center shrink-0 mb-1">
                <LogOut className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold text-foreground">로그아웃 하시겠어요?</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  계정에서 로그아웃하면 다시 로그인해야 합니다.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                className="flex-1 h-11 rounded-xl border border-input bg-background hover:bg-accent hover:text-accent-foreground text-foreground font-medium transition-colors text-sm"
                onClick={handleLogoutCancel}
              >
                취소
              </button>
              <button
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-lg shadow-primary/20 transition-colors text-sm"
                onClick={handleLogoutConfirm}
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔹 프로필 설명 다이얼로그 */}
      {showDescriptionDialog && (
        <div className="fixed inset-0 z-[999] bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-[360px] max-w-full rounded-lg border border-border bg-card p-6 shadow-2xl">
            <div className="flex flex-col space-y-1.5 text-left">
              <h3 className="text-lg font-semibold leading-none tracking-tight">프로필 설명</h3>
              <p className="text-sm text-muted-foreground">
                비유노트에서 어떻게 배우고, 설명하고 싶은지 짧게 적어보세요.
              </p>
            </div>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  placeholder="예: 비유와 예시로 다른 사람의 이해를 돕는 걸 좋아합니다."
                  value={tempDescription}
                  onChange={handleTempDescriptionChange}
                  onCompositionEnd={handleCompositionEnd}
                  maxLength={DESCRIPTION_LIMIT}
                  className="min-h-[100px]"
                  autoFocus
                />
                <div className="text-right text-xs text-muted-foreground">
                  {tempDescription.length}/{DESCRIPTION_LIMIT}
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleCloseDescriptionDialog}>
                취소
              </Button>
              <Button onClick={handleDescriptionUpdate}>
                저장
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}