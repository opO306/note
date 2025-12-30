// src/components/UserProfileDialog.tsx

import { useState, useMemo, useCallback } from "react";
import { Button } from "./ui/button";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { LanternFilledIcon } from "./icons/Lantern";
import { toast } from "@/toastHelper";
import {
  FileText,
  MessageCircle,
  Trophy,
  BookOpen,
  ShieldCheck,
  Star,
  UserPlus,
  UserCheck,
  Users,
  MoreVertical,  // 🆕 더보기 아이콘
  AlertTriangle, // 🆕 차단 아이콘
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"; // 🆕 드롭다운 메뉴
import { AppHeader } from "./layout/AppHeader";
import { FollowListScreen } from "./FollowListScreen"; // 선원/승선한 배 전체 화면
import { MyContentListScreen } from "./MyContentListScreen"; // 작성 글/답글 전체 화면
import { DELETED_USER_NAME } from "@/components/utils/deletedUserHelpers";
import { getFunctions, httpsCallable } from "firebase/functions"; // 🆕 함수 호출용
import { AlertDialogSimple } from "./ui/alert-dialog-simple";
import { ALL_TITLE_LABELS, getTitleLabelById } from "@/data/titleData";

// ─────────────────────────────────────────────────────────────
// 헬퍼 함수들
// ─────────────────────────────────────────────────────────────

// 신뢰도 점수에 따라 텍스트 색 클래스 결정 (Tailwind)
function getTrustColorClass(score: number): string {
  if (score <= 10) return "text-red-400"; // 살짝 연한 빨강
  if (score <= 30) return "text-orange-400"; // 연한 주황
  if (score <= 70) return "text-emerald-400"; // 연한 초록
  return "text-blue-400"; // 연한 파랑
}

// 신뢰도 점수에 따른 간단 설명
function getTrustDescription(score: number): string {
  if (score <= 10)
    return "질문·답변 활동이 아직 적거나, 신고 이력이 있어 낮게 책정된 상태예요.";
  if (score <= 30)
    return "기본 수준의 신뢰도예요. 꾸준히 좋은 질문과 답변을 남기면 점수가 올라가요.";
  if (score <= 70)
    return "안정적인 신뢰도예요. 다른 사용자에게 도움을 꽤 많이 주고 있어요.";
  return "매우 높은 신뢰도예요. 많은 사용자들에게 신뢰를 받고 있는 계정입니다.";
}

// 🔹 Date나 기타 값을 화면에 안전하게 보여줄 수 있는 문자열로 변환
function normalizeTime(value: any): string {
  if (!value) return "";

  // Date 객체면 한국 시간 형식 문자열로 변환
  if (value instanceof Date) {
    return value.toLocaleString("ko-KR");
  }

  // Firestore Timestamp 같은 다른 타입이 올 수도 있으니
  // 일단 문자열로 강제 변환
  return String(value);
}

// ─────────────────────────────────────────────────────────────
// Props 인터페이스
// ─────────────────────────────────────────────────────────────

interface UserProfileScreenProps {
  onBack: () => void; // ← 뒤로가기(닫기)
  userName?: string;
  username?: string;
  userAvatar?: string; // 프로필 이미지 URL
  userBio?: string; // 🔹 프로필 한 줄 소개

  posts?: any[];

  // --- 추가: 신뢰/업적/칭호/길잡이 요약 ---
  trustScore?: number; // 0~100 신뢰도 점수
  reportCount?: number; // 누적 신고 횟수
  achievementCount?: number; // 달성한 업적 개수
  titleCount?: number; // 보유 칭호 개수
  guideCount?: number; // 길잡이로 선택된 횟수
  currentTitle?: string; // 🔹 현재 착용 중인 칭호 ID

  // 🔹 팔로워 / 팔로잉 수 & 목록 (있으면 사용)
  followerCount?: number;
  followingCount?: number;
  followerUsers?: string[];
  followingUsers?: string[];

  // 🔹 인기 글 / 인기 답변 클릭 시 호출할 콜백
  onPostClick?: (postId: string) => void;
  onReplyClick?: (postId: string, replyId: number) => void;

  // 🔹 팔로우 / 언팔로우 상태
  isMyself?: boolean;
  isFollowing?: boolean;
  onToggleFollowUser?: (targetUserName: string) => Promise<boolean> | boolean | void;

  // 🔹 팔로우 목록에서 유저를 눌렀을 때
  onFollowUserClick?: (nickname: string) => void;

  activeSection?: "profile" | "followers" | "following" | "posts" | "replies";
  onChangeSection?: (
    section: "profile" | "followers" | "following" | "posts" | "replies",
  ) => void;

  // 🆕 [추가] 차단 기능을 위한 대상 유저의 UID
  targetUid?: string | null;
}

// ─────────────────────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────────────────────

export function UserProfileDialog({
  onBack,
  userName,
  userAvatar,
  username,
  userBio,
  posts = [],
  trustScore = 30,
  reportCount = 0,
  achievementCount = 0,
  titleCount = 0,
  guideCount = 0,
  currentTitle = "",
  followerCount = 0,
  followingCount = 0,
  followerUsers = [],
  followingUsers = [],
  onPostClick,
  onReplyClick,
  isMyself = false,
  isFollowing = false,
  onToggleFollowUser,
  onFollowUserClick,
  activeSection,
  onChangeSection,
  targetUid,
}: UserProfileScreenProps) {
  // 🔹 표시용 닉네임
  const displayName = username || userName || "사용자";
  const isDeletedUser = displayName === DELETED_USER_NAME;
  const [internalSection, setInternalSection] = useState<
    "profile" | "followers" | "following" | "posts" | "replies"
  >("profile");
  const section = activeSection ?? internalSection;
  const setSection = onChangeSection ?? setInternalSection;

  const handleBackToProfile = useCallback(() => {
    setSection("profile");
  }, [setSection]);

  const handleOpenFollowers = useCallback(() => {
    setSection("followers");
  }, [setSection]);

  const handleOpenFollowing = useCallback(() => {
    setSection("following");
  }, [setSection]);

  const handleOpenPosts = useCallback(() => {
    setSection("posts");
  }, [setSection]);

  const handleOpenReplies = useCallback(() => {
    setSection("replies");
  }, [setSection]);

  // 🧭 신뢰도 (0~100으로 보정)
  const trust = useMemo(
    () => Math.max(0, Math.min(100, trustScore)),
    [trustScore]
  );
  // 색상은 클래스 이름으로 가져오기
  const trustColorClass = getTrustColorClass(trust);
  const trustDescription = getTrustDescription(trust);

  // 🔹 현재 칭호 이름 계산
  const currentTitleLabel = useMemo(() => {
    return getTitleLabelById(currentTitle);
  }, [currentTitle]);

  // 🔹 유저 데이터 집계 (인기글, 인기답글 등)
  const userData = useMemo(() => {
    const totalPosts = posts.length;
    let totalLanterns = 0;
    let totalComments = 0;

    let bestPost: any = null;

    posts.forEach((post) => {
      const postLanterns = post.lanterns ?? 0;
      const postComments =
        post.comments ?? (Array.isArray(post.replies) ? post.replies.length : 0);

      totalLanterns += postLanterns;
      totalComments += postComments;

      if (!bestPost || postLanterns > bestPost.lanterns) {
        bestPost = {
          id: post.id,
          title: post.title,
          lanterns: postLanterns,
          comments: postComments,
          category: post.category,
          timeAgo: normalizeTime(
            post.timeAgo || post.createdAtText || post.createdAt || "",
          ),
        };
      }
    });

    let bestReply: any = null;
    const targetName = username || userName;
    posts.forEach((post) => {
      const replies = post.replies ?? [];
      replies.forEach((reply: any) => {
        if (!targetName || reply.author !== targetName) return;
        const lanterns = reply.lanterns ?? 0;
        if (!bestReply || lanterns > bestReply.lanterns) {
          bestReply = {
            id: reply.id,
            content: reply.content,
            lanterns,
            timeAgo: normalizeTime(
              reply.timeAgo || reply.createdAtText || reply.createdAt || "",
            ),
            postTitle: post.title,
            postId: post.id,
          };
        }
      });
    });

    return {
      nickname: displayName,
      totalPosts,
      totalLanterns,
      totalComments,
      bio: userBio || "깊이 있는 학습을 추구하는 탐구자입니다.",
      bestPost,
      bestReply,
    };
  }, [displayName, posts, username, userName, userBio]);

  // ★ 이 유저가 남긴 "답글 목록" 만들기 (내 답변 전체 화면용)
  const userReplies = useMemo(() => {
    const repliesList: any[] = [];
    const targetName = username || userName;

    posts.forEach((post) => {
      const replies = post.replies ?? [];
      replies.forEach((reply: any) => {
        if (!targetName || reply.author !== targetName) return;

        repliesList.push({
          id: reply.id,
          postId: post.id,
          postAuthor:
            post.author ||
            post.nickname ||
            post.userName ||
            "질문 작성자",
          postTitle: post.title,
          content: reply.content,
          lanterns: reply.lanterns ?? 0,
          timeAgo: normalizeTime(
            reply.timeAgo || reply.createdAtText || reply.createdAt || "",
          ),
        });
      });
    });

    return repliesList;
  }, [posts, username, userName]);

  // 🔹 인기 글 카드 클릭 핸들러
  const handleBestPostCardClick = useCallback(() => {
    if (onPostClick && userData.bestPost?.id != null) {
      onPostClick(userData.bestPost.id);
    }
  }, [onPostClick, userData]);

  // 🔹 인기 답변 카드 클릭 핸들러
  const handleBestReplyCardClick = useCallback(() => {
    if (
      onReplyClick &&
      userData.bestReply?.postId != null &&
      userData.bestReply?.id != null
    ) {
      onReplyClick(userData.bestReply.postId, userData.bestReply.id);
    }
  }, [onReplyClick, userData]);

  const [isTogglingFollow, setIsTogglingFollow] = useState(false);

  const [showBlockAlert, setShowBlockAlert] = useState(false);

  const handleFollowButtonClick = useCallback(async () => {
    if (!onToggleFollowUser || isMyself || isTogglingFollow) return;

    const actionLabel = isFollowing ? "하선" : "승선";
    setIsTogglingFollow(true);
    try {
      const ok = await Promise.resolve(onToggleFollowUser(displayName));
      if (ok === true) {
        toast.success(`${actionLabel}이 완료되었습니다.`);
      }
    } catch (error) {
      console.error("팔로우 토글 실패:", error);
      toast.error(`${actionLabel}에 실패했습니다. 잠시 후 다시 시도해주세요.`);
    } finally {
      setIsTogglingFollow(false);
    }
  }, [onToggleFollowUser, isMyself, displayName, isTogglingFollow, isFollowing]);

  // 🆕 [차단 기능] 대상 UID 추론 (Props 우선, 없으면 Posts에서 탐색)
  const inferredTargetUid = useMemo(() => {
    if (targetUid) return targetUid;
    const post = posts.find((p) => p.author === displayName || p.nickname === displayName);
    return post?.authorUid || post?.uid || null;
  }, [targetUid, posts, displayName]);

  // ✨ [수정] 차단 버튼 클릭 시 팝업만 열도록 변경
  const handleBlockClick = useCallback(() => {
    if (!inferredTargetUid) {
      toast.error("사용자 정보를 찾을 수 없어 차단할 수 없습니다.");
      return;
    }
    setShowBlockAlert(true); // 팝업 열기
  }, [inferredTargetUid]);

  // ✨ [추가] 실제 차단을 수행하는 함수 (팝업에서 확인 눌렀을 때 실행)
  const executeBlockUser = useCallback(async () => {
    if (!inferredTargetUid) return;

    try {
      const functions = getFunctions();
      const blockUserFn = httpsCallable(functions, "blockUser");
      await blockUserFn({ targetUserId: inferredTargetUid });
      toast.success("차단되었습니다.");
      onBack(); // 차단 후 프로필 닫기
    } catch (error) {
      console.error(error);
      toast.error("차단에 실패했습니다.");
    }
  }, [inferredTargetUid, onBack]);

  /* ------------------------------------------------
   *  🔒 탈퇴한 사용자 안내 화면
   * ------------------------------------------------ */
  if (isDeletedUser) {
    return (
      <div className="w-full h-full bg-background text-foreground flex flex-col overflow-hidden">
        <AppHeader title="사용자 프로필" onBack={onBack} />

        <main className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-sm mx-auto text-center space-y-4">
            <OptimizedAvatar
              src={undefined}
              alt={displayName}
              nickname={DELETED_USER_NAME}
              size={64}
              fallbackText="탈퇴"
            />
            <div className="space-y-2">
              <h3 className="font-semibold text-base">{DELETED_USER_NAME}</h3>
              <p className="text-xs text-muted-foreground leading-snug">
                탈퇴한 계정입니다. 더 이상 프로필, 작성 글, 답글을 볼 수 없어요.
              </p>
            </div>
            <Button size="sm" className="mt-2" onClick={onBack}>
              닫기
            </Button>
          </div>
        </main>
      </div>
    );
  }

  /* ------------------------------------------------
   *  🔓 서브 화면 처리 (선원, 승선, 작성글, 답글)
   * ------------------------------------------------ */
  if (section === "followers") {
    return (
      <div className="w-full h-full bg-background text-foreground flex flex-col overflow-hidden">
        <FollowListScreen
          mode="followers"
          users={followerUsers}
          onBack={handleBackToProfile}
          onUserClick={onFollowUserClick}
        />
      </div>
    );
  }

  if (section === "following") {
    return (
      <div className="w-full h-full bg-background text-foreground flex flex-col overflow-hidden">
        <FollowListScreen
          mode="following"
          users={followingUsers}
          onBack={handleBackToProfile}
          onUserClick={onFollowUserClick}
        />
      </div>
    );
  }

  if (section === "posts") {
    return (
      <div className="w-full h-full bg-background text-foreground flex flex-col overflow-hidden">
        <MyContentListScreen
          mode="posts"
          posts={posts}
          onBack={handleBackToProfile}
          onPostClick={onPostClick}
        />
      </div>
    );
  }

  if (section === "replies") {
    return (
      <div className="w-full h-full bg-background text-foreground flex flex-col overflow-hidden">
        <MyContentListScreen
          mode="replies"
          replies={userReplies}
          onBack={handleBackToProfile}
          onReplyClick={onReplyClick}
        />
      </div>
    );
  }

  /* ------------------------------------------------
   *  🔓 메인 프로필 화면
   * ------------------------------------------------ */
  return (
    <div className="w-full h-full bg-background text-foreground flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="relative">
        <AppHeader title="사용자 프로필" onBack={onBack} />
        {!isMyself && !isDeletedUser && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50">
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-accent">
                  <MoreVertical className="w-5 h-5 text-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  className="text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-900/10 cursor-pointer"
                  onClick={handleBlockClick}
                >
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  차단하기
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* 내용 영역 */}
      <main className="flex-1 scroll-container scrollbar-hide">
        <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto p-4 space-y-4">
          {/* 프로필 헤더 카드 */}
          <Card className="border-border/70 shadow-sm rounded-xl">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              {/* 왼쪽: 아바타 + 닉네임/소개 */}
              <div className="flex items-center gap-4 flex-1">
                <OptimizedAvatar
                  src={userAvatar}
                  alt={displayName}
                  nickname={displayName}
                  size={64}
                  fallbackText={displayName.charAt(0).toUpperCase()}
                />
                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-semibold text-base truncate">
                      {userData.nickname}
                    </h3>
                    {currentTitleLabel && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {currentTitleLabel}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {userData.bio}
                  </p>
                </div>
              </div>

              {/* 오른쪽: 승선 / 하선 버튼 */}
              {!isMyself && onToggleFollowUser && (
                <div className="flex flex-col items-end gap-2">
                  <Button
                    size="sm"
                    className="h-8 px-3 rounded-full text-xs"
                    variant={isFollowing ? "outline" : "default"}
                    onClick={handleFollowButtonClick}
                    disabled={isTogglingFollow}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-3 h-3 mr-1" />
                        하선하기
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3 mr-1" />
                        승선하기
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 신뢰도 정보 카드 */}
          <Card className="border-border/70 shadow-sm rounded-xl">
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

              {reportCount > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  최근 신고 {reportCount}회가 신뢰도 계산에 함께 반영되어 있습니다.
                </p>
              )}
            </CardContent>
          </Card>

          {/* 선원 / 승선한 배 카드 */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="cursor-pointer" onClick={handleOpenFollowers}>
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                <div className="text-lg font-medium">{followerCount}</div>
                <div className="text-xs text-muted-foreground leading-snug">
                  선원
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer" onClick={handleOpenFollowing}>
              <CardContent className="p-4 text-center">
                <UserCheck className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                <div className="text-lg font-medium">{followingCount}</div>
                <div className="text-xs text-muted-foreground leading-snug">
                  승선한 배
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 통계 + 업적/칭호 요약 */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="cursor-pointer" onClick={handleOpenPosts}>
              <CardContent className="p-4 text-center">
                <FileText className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                <div className="text-lg font-medium">
                  {userData.totalPosts}
                </div>
                <div className="text-xs text-muted-foreground">작성한 글</div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer" onClick={handleOpenReplies}>
              <CardContent className="p-4 text-center">
                <MessageCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
                <div className="text-lg font-medium">
                  {userData.totalComments}
                </div>
                <div className="text-xs text-muted-foreground">답글</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Trophy className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                <div className="text-lg font-medium">{achievementCount}</div>
                <div className="text-xs text-muted-foreground">
                  달성한 업적
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <BookOpen className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                <div className="text-lg font-medium">{titleCount}</div>
                <div className="text-xs text-muted-foreground">
                  보유 칭호
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 받은 등불 + 길잡이 횟수 */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <LanternFilledIcon className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                <div className="text-lg font-medium">
                  {userData.totalLanterns}
                </div>
                <div className="text-xs text-muted-foreground">받은 등불</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <Star className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-lg font-medium">{guideCount}</div>
                <div className="text-xs text-muted-foreground">길잡이 횟수</div>
              </CardContent>
            </Card>
          </div>

          {/* 인기 글 / 인기 답변 탭 */}
          <div className="mt-4">
            <Tabs defaultValue="bestPost" className="w-full">
              <TabsList className="grid w-full grid-cols-2 gap-2 bg-transparent p-0 border-0">
                <TabsTrigger
                  value="bestPost"
                  className="
                    text-xs rounded-xl border border-border/70 bg-card/60
                    flex items-center justify-center gap-1 py-2
                    data-[state=active]:bg-card
                    data-[state=active]:text-foreground
                    data-[state=active]:shadow-sm
                  "
                >
                  <FileText className="w-4 h-4" />
                  <span>인기 글</span>
                </TabsTrigger>

                <TabsTrigger
                  value="bestReply"
                  className="
                    text-xs rounded-xl border border-border/70 bg-card/60
                    flex items-center justify-center gap-1 py-2
                    data-[state=active]:bg-card
                    data-[state=active]:text-foreground
                    data-[state=active]:shadow-sm
                  "
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>인기 답변</span>
                </TabsTrigger>
              </TabsList>

              {/* 인기 글 탭 내용 */}
              <TabsContent
                value="bestPost"
                className="mt-4 border-t border-border pt-4"
              >
                {userData.bestPost ? (
                  <Card
                    className="hover:shadow-md transition-shadow cursor-pointer list-optimized"
                    onClick={handleBestPostCardClick}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {userData.bestPost.category}
                          </Badge>
                          {userData.bestPost.timeAgo && (
                            <span className="text-xs text-muted-foreground">
                              {userData.bestPost.timeAgo}
                            </span>
                          )}
                        </div>

                        <h3 className="font-medium text-sm line-clamp-1">
                          {userData.bestPost.title}
                        </h3>

                        <div className="flex items-center space-x-3 pt-2 border-t border-border">
                          <div className="flex items-center space-x-1">
                            <LanternFilledIcon className="w-3 h-3 text-amber-500" />
                            <span className="text-xs text-amber-600">
                              {userData.bestPost.lanterns}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {userData.bestPost.comments}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="py-10 flex justify-center">
                    <p className="text-xs text-muted-foreground text-center">
                      아직 인기 글이 없습니다.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* 인기 답변 탭 내용 */}
              <TabsContent
                value="bestReply"
                className="mt-4 border-t border-border pt-4"
              >
                {userData.bestReply ? (
                  <Card
                    className="hover:shadow-md transition-shadow list-optimized cursor-pointer"
                    onClick={handleBestReplyCardClick}
                  >
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        {userData.bestReply.postTitle && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {userData.bestReply.postTitle}
                          </p>
                        )}
                        <p className="text-sm line-clamp-2">
                          {userData.bestReply.content}
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <div className="flex items-center space-x-1">
                            <LanternFilledIcon className="w-3 h-3 text-amber-500" />
                            <span className="text-xs text-amber-600">
                              {userData.bestReply.lanterns}
                            </span>
                          </div>
                          {userData.bestReply.timeAgo && (
                            <span className="text-xs text-muted-foreground">
                              {userData.bestReply.timeAgo}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="py-10 flex justify-center">
                    <p className="text-xs text-muted-foreground text-center">
                      아직 인기 답변이 없습니다.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* ✨ [추가] 차단 확인 팝업 (AlertDialogSimple) */}
      <AlertDialogSimple
        open={showBlockAlert}
        onOpenChange={setShowBlockAlert}
        title="사용자 차단"
        description={`'${displayName}' 님을 차단하시겠습니까?\n차단하면 서로의 글이 보이지 않으며, 팔로우가 취소됩니다.`}
        confirmText="차단하기"
        cancelText="취소"
        isDestructive={true} // 빨간색 버튼 스타일 적용 (지원 시)
        onConfirm={executeBlockUser}
      />
    </div>
  );
}