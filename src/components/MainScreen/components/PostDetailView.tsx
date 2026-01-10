// MainScreen/components/PostDetailView.tsx
import React, { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useScrollRestoration } from "@/components/hooks/useScrollRestoration";
import { getUserTitle, getTitleLabelById } from "@/data/titleData";
import { formatRelativeOrDate } from "@/components/utils/timeUtils";
import { getDisplayName, isDeletedAuthor } from "@/components/utils/deletedUserHelpers";
import { useNow } from "@/components/hooks/useNow";
import { type UserProfileLite } from "@/components/MainScreen/hooks/useUserProfiles";
import { formatDateTime, usePostDetailViewModel, type ReplyWithGuide } from "../hooks/usePostDetailViewModel";
import { LanternIcon, LanternFilledIcon } from "@/components/icons/Lantern";
import {
  MessageCircle,
  MoreHorizontal,
  X,
  Send,
  Flag,
  ArrowLeft,
  Star,
  Bookmark,
  Eye,
} from "lucide-react";
import type { Post, Reply } from "../types";

interface PostDetailViewProps {
  post: Post;
  userNickname: string;
  userProfileImage: string;
  currentTitle: string;
  isDarkMode: boolean;

  // 🆕 [추가] 차단된 유저 ID 목록
  blockedUserIds: string[];

  // 등불 관련
  isPostLanterned: boolean;
  isReplyLanterned: (replyId: number) => boolean;
  onLanternToggle: () => void;
  onReplyLanternToggle: (replyId: number, postId: string | number) => void;

  // 북마크 관련
  isBookmarked: boolean;
  onBookmarkToggle: () => void;

  // 길잡이 관련
  isGuideReply: (replyId: number) => boolean;
  hasGuide: boolean;
  onGuideSelect: (replyId: number, replyAuthor: string, postId: string | number) => void;

  // 답글 입력
  newReplyContent: string;
  onReplyContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onReplySubmit: () => void;
  replyInputRef: React.RefObject<HTMLTextAreaElement | null>;

  // 네비게이션
  onClose: () => void;
  onAuthorClick: () => void;
  onMentionAuthor: () => void;
  onMentionReplyAuthor: (authorName: string) => void;
  onReplyAuthorClick: (authorName: string) => void;

  // 신고/삭제
  onReport: () => void;
  onDelete: () => void;
  onReportReply: (reply: Reply) => void;

  // 멘션 렌더링
  renderContentWithMentions: (content: string) => React.ReactNode;

  // 신뢰도 체크
  canSubmitReply: boolean;

  // 노트 저장 관련 (optional)
  onSaveNote?: () => void;
  hideSaveNote?: boolean;
}

// 상대시간 전용 컴포넌트로 타이머 리렌더 범위 국소화
const RelativeTime = React.memo(function RelativeTime({
  date,
  title,
}: {
  date: Date | null;
  title?: string | null;
}) {
  const now = useNow(60_000);
  if (!date) return null;
  return <span title={title || undefined}>{formatRelativeOrDate(date, now)}</span>;
});

export function PostDetailView({
  post,
  userNickname,
  userProfileImage: _userProfileImage,
  currentTitle,
  isDarkMode: _isDarkMode,
  blockedUserIds, // 🆕 구조 분해 할당
  isPostLanterned,
  isReplyLanterned,
  onLanternToggle,
  onReplyLanternToggle,
  isBookmarked,
  onBookmarkToggle,
  isGuideReply: _isGuideReply,
  hasGuide,
  onGuideSelect,
  newReplyContent,
  onReplyContentChange,
  onReplySubmit,
  replyInputRef,
  onClose,
  onAuthorClick,
  onMentionAuthor,
  onMentionReplyAuthor,
  onReplyAuthorClick,
  onReport,
  onDelete,
  onReportReply,
  renderContentWithMentions,
  canSubmitReply,
}: PostDetailViewProps) {
  const now = useNow(60_000);
  const scrollRef = useScrollRestoration({
    key: `post-detail-${post.id}`,
  });

  // 🔹 자신의 게시글인지 먼저 확인
  const isOwnPost = post.author === userNickname;

  const {
    userProfiles,
    postAuthorProfileImage: _postAuthorProfileImage,
    postAuthorName,
    isPostAuthorDeleted,
    authorTitle,
    postCreatedAtText,
    postCreatedAtDate,
    visibleReplies,
  } = usePostDetailViewModel({
    post,
    userNickname,
    currentTitle,
    userProfileImage: isOwnPost ? _userProfileImage : undefined
  });

  // 🔹 자신의 게시글일 때는 무조건 userProfileImage 사용 (실시간 프로필 완전히 무시)
  const postAuthorProfileImage = useMemo(() => {
    if (isOwnPost) {
      // 자신의 게시글일 때는 userProfileImage만 사용 (값이 없어도 undefined/null 전달)
      return _userProfileImage && _userProfileImage.trim().length > 0
        ? _userProfileImage
        : null;
    }
    // 다른 사람의 게시글일 때는 usePostDetailViewModel에서 계산한 값 사용
    return _postAuthorProfileImage;
  }, [isOwnPost, _userProfileImage, _postAuthorProfileImage]);

  // 답글 입력 엔터 처리 (조건부 호출 방지를 위해 early return 전에 정의)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onReplySubmit();
      }
    },
    [onReplySubmit]
  );

  // 🚨 [추가] 게시글 작성자가 차단된 경우 화면 표시 중단
  const isPostAuthorBlocked = useMemo(() => {
    const authorId = post.authorUid || (post as any).userId;
    return blockedUserIds?.includes(authorId);
  }, [post, blockedUserIds]);

  if (isPostAuthorBlocked) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4 bg-background">
        <div className="p-4 rounded-full bg-muted">
          <X className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium">차단된 사용자의 게시글입니다.</p>
        <Button variant="outline" onClick={onClose}>목록으로 돌아가기</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="bg-card/95 border-b border-border p-4 pt-[calc(var(--safe-area-inset-top)+1rem)] flex-shrink-0">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="font-medium">게시글 상세</h2>
        </div>
      </div>

      {/* 게시물 내용 */}
      <div ref={scrollRef} className="flex-1 scroll-container">
        <div className="px-4 py-3 pb-24 space-y-4">
          {/* 게시물 카드 */}
          <Card className="border-border/60 shadow-sm bg-card/80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="space-y-5">
                {/* 작성자 정보 */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <OptimizedAvatar
                      src={postAuthorProfileImage || undefined}
                      alt={
                        postAuthorName
                          ? `${postAuthorName}님의 프로필`
                          : "프로필 이미지"
                      }
                      nickname={isPostAuthorDeleted ? undefined : (post.author || postAuthorName)}
                      fallbackText={
                        postAuthorName.charAt(0)?.toUpperCase() || "?"
                      }
                      className="w-12 h-12 ring-2 ring-border/30 cursor-pointer"
                      size={48}
                      loading="eager"
                      decoding="async"
                      onClick={isPostAuthorDeleted ? undefined : onAuthorClick}
                    />

                    {/* 이름 + 칭호 한 줄, 그 아래에 날짜 */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <p
                          className={
                            "font-semibold text-base " +
                            (isPostAuthorDeleted
                              ? "text-muted-foreground cursor-default"
                              : "cursor-pointer hover:text-primary transition-colors duration-200")
                          }
                          onClick={
                            isPostAuthorDeleted ? undefined : onMentionAuthor
                          }
                        >
                          {postAuthorName}
                        </p>
                        {authorTitle && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-2 py-0.5 h-auto bg-primary/10 text-primary border-primary/20"
                          >
                            {authorTitle}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <RelativeTime date={postCreatedAtDate} title={postCreatedAtText} />
                      </div>
                    </div>
                  </div>

                  {/* 더보기 메뉴 */}
                  <div className="flex items-center space-x-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="touch-target">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2" align="end">
                        <div className="space-y-1">
                          {post.isOwner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-red-500"
                              onClick={onDelete}
                            >
                              <X className="w-4 h-4 mr-2" />
                              삭제하기
                            </Button>
                          )}
                          {!post.isOwner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-red-500"
                              onClick={onReport}
                            >
                              <Flag className="w-4 h-4 mr-2" />
                              신고하기
                            </Button>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* 게시물 제목 및 내용 */}
                <div>
                  <h1 className="text-xl font-medium mb-3">{post.title}</h1>
                  <div className="text-base text-foreground/90 leading-7 break-words [&>div:not(:first-child)]:mt-5 [&>div:not(:last-child)]:mb-0">
                    {renderContentWithMentions(post.content)}
                  </div>
                </div>

                {/* 태그 */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* 등불/댓글/조회수/북마크 */}
                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center space-x-4">
                    {post.author !== userNickname ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onLanternToggle}
                        className={`space-x-2 touch-target ${isPostLanterned ? "text-amber-500" : ""
                          }`}
                      >
                        {isPostLanterned ? (
                          <LanternFilledIcon className="w-4 h-4 text-amber-500" />
                        ) : (
                          <LanternIcon className="w-4 h-4" />
                        )}
                        <span>{post.lanterns}</span>
                      </Button>
                    ) : (
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <LanternIcon className="w-4 h-4" />
                        <span>{post.lanterns}</span>
                      </div>
                    )}

                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.comments ?? post.replies?.length ?? 0}</span>
                    </div>

                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <Eye className="w-4 h-4" />
                      <span>{post.views ?? 0}</span>
                    </div>
                  </div>

                  <Button
                    variant={isBookmarked ? "default" : "ghost"}
                    size="sm"
                    onClick={onBookmarkToggle}
                    className="flex items-center space-x-1 touch-target"
                  >
                    <Bookmark
                      className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""
                        }`}
                    />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 답글 목록 */}
          <ReplyList
            post={post}
            userNickname={userNickname}
            userProfileImage={_userProfileImage}
            currentTitle={currentTitle}
            now={now}
            hasGuide={hasGuide}
            isReplyLanterned={isReplyLanterned}
            onReplyLanternToggle={onReplyLanternToggle}
            onGuideSelect={onGuideSelect}
            onMentionReplyAuthor={onMentionReplyAuthor}
            onReplyAuthorClick={onReplyAuthorClick}
            onReportReply={onReportReply}
            renderContentWithMentions={renderContentWithMentions}
            userProfiles={userProfiles}
            visibleReplies={visibleReplies}
            blockedUserIds={blockedUserIds} // 🆕 필터링용 차단 목록 전달
          />

          {/* 답글 입력 카드 */}
          <Card className="border-border/60 shadow-sm bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="space-y-4">
                <Textarea
                  ref={replyInputRef as React.RefObject<HTMLTextAreaElement>}
                  placeholder={
                    canSubmitReply
                      ? "이 글에 대한 생각을 나눠보세요."
                      : "신뢰도 0점에서는 답글을 작성할 수 없습니다"
                  }
                  value={newReplyContent}
                  onChange={onReplyContentChange}
                  onKeyDown={handleKeyDown}
                  disabled={!canSubmitReply}
                  className="min-h-[100px] resize-none border-border/60 focus:border-primary/50 transition-colors duration-200 bg-background/50"
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {newReplyContent.length}/1000
                  </span>
                  <Button
                    onClick={onReplySubmit}
                    disabled={!newReplyContent.trim() || !canSubmitReply}
                    size="sm"
                    className="touch-target px-6 py-2 rounded-xl transition-all duration-200 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    답글 작성
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface ReplyListProps {
  post: Post;
  userNickname: string;
  userProfileImage: string;
  currentTitle: string;
  now: Date;
  hasGuide: boolean;
  visibleReplies: ReplyWithGuide[];
  isReplyLanterned: (replyId: number) => boolean;
  onReplyLanternToggle: (replyId: number, postId: string | number) => void;
  onGuideSelect: (
    replyId: number,
    replyAuthor: string,
    postId: string | number
  ) => void;
  onMentionReplyAuthor: (authorName: string) => void;
  onReplyAuthorClick: (authorName: string) => void;
  onReportReply: (reply: Reply) => void;
  renderContentWithMentions: (content: string) => React.ReactNode;
  userProfiles: Record<string, UserProfileLite>;
  blockedUserIds: string[]; // 🆕 추가
}

const ReplyList = React.memo(function ReplyList({
  post,
  userNickname,
  userProfileImage: _userProfileImage,
  currentTitle,
  now,
  hasGuide,
  visibleReplies,
  isReplyLanterned,
  onReplyLanternToggle,
  onGuideSelect,
  onMentionReplyAuthor,
  onReplyAuthorClick,
  onReportReply,
  renderContentWithMentions,
  userProfiles,
  blockedUserIds,
}: ReplyListProps) {
  const isPostAuthor = post.author === userNickname;

  // 🆕 차단된 유저의 댓글 필터링 (수정됨)
  const filteredReplies = React.useMemo(() => {
    if (!blockedUserIds || blockedUserIds.length === 0) return visibleReplies;

    return visibleReplies.filter((reply) => {
      // ⚠️ 수정: 'userId' 속성 오류 해결을 위해 (reply as any) 사용
      // 타입 정의에는 없지만 실제 DB에 있을 수 있는 userId 필드를 안전하게 참조
      const authorId = reply.authorUid || (reply as any).userId;

      // authorId가 없으면(undefined) 차단 목록에 포함되지 않은 것으로 간주
      if (!authorId) return true;

      return !blockedUserIds.includes(authorId);
    });
  }, [visibleReplies, blockedUserIds]);

  return (
    <div className="space-y-3">
      {filteredReplies.map((reply) => (
        <ReplyCard
          key={reply.id}
          reply={reply}
          postId={post.id}
          userNickname={userNickname}
          userProfileImage={_userProfileImage}
          currentTitle={currentTitle}
          now={now}
          isPostAuthor={isPostAuthor}
          isLanterned={isReplyLanterned(reply.id)}
          isGuide={reply.isGuide || post.guideReplyId === reply.id}
          hasGuideAlready={hasGuide}
          onReplyLanternToggle={onReplyLanternToggle}
          onGuideSelect={onGuideSelect}
          onMentionReplyAuthor={onMentionReplyAuthor}
          onReplyAuthorClick={onReplyAuthorClick}
          onReportReply={onReportReply}
          renderContentWithMentions={renderContentWithMentions}
          userProfiles={userProfiles}
        />
      ))}
    </div>
  );
});

// 답글 카드 컴포넌트
interface ReplyCardProps {
  reply: Reply;
  postId: string | number;
  userNickname: string;
  userProfileImage: string;
  currentTitle: string;
  now: Date;
  isPostAuthor: boolean;
  isLanterned: boolean;
  isGuide: boolean;
  hasGuideAlready: boolean;
  onReplyLanternToggle: (replyId: number, postId: string | number) => void;
  onGuideSelect: (
    replyId: number,
    replyAuthor: string,
    postId: string | number
  ) => void;
  onMentionReplyAuthor: (authorName: string) => void;
  onReplyAuthorClick: (authorName: string) => void;
  onReportReply: (reply: Reply) => void;
  renderContentWithMentions: (content: string) => React.ReactNode;
  userProfiles: Record<string, UserProfileLite>;
}

const ReplyCard = React.memo(function ReplyCard({
  reply,
  postId,
  userNickname,
  userProfileImage: _userProfileImage,
  currentTitle,
  now,
  isPostAuthor,
  isLanterned,
  isGuide,
  hasGuideAlready,
  onReplyLanternToggle,
  onGuideSelect,
  onMentionReplyAuthor,
  onReplyAuthorClick,
  onReportReply,
  renderContentWithMentions,
  userProfiles,
}: ReplyCardProps) {
  const isOwnReply = reply.author === userNickname;
  const isAiReply = reply.isAi === true;
  const aiLabel = reply.aiLabel ?? "[AI 자동응답]";
  const aiSummary =
    typeof reply.aiSummary === "string" && reply.aiSummary.length > 0
      ? reply.aiSummary
      : "1시간 동안 답변이 없어 자동으로 생성된 안내 답변입니다.";

  const handleLanternToggle = useCallback(() => {
    onReplyLanternToggle(reply.id, postId);
  }, [onReplyLanternToggle, postId, reply.id]);

  const handleGuideSelect = useCallback(() => {
    onGuideSelect(reply.id, reply.author, postId);
  }, [onGuideSelect, postId, reply.author, reply.id]);

  const handleMention = useCallback(() => {
    onMentionReplyAuthor(reply.author);
  }, [onMentionReplyAuthor, reply.author]);

  const handleAuthorClick = useCallback(() => {
    onReplyAuthorClick(reply.author);
  }, [onReplyAuthorClick, reply.author]);

  const handleReport = useCallback(() => {
    onReportReply(reply);
  }, [onReportReply, reply]);

  // 🔹 실시간 프로필에서 칭호 ID 가져오기
  const replyAuthorProfile = reply.authorUid
    ? userProfiles[reply.authorUid]
    : undefined;

  const liveReplyTitleId = replyAuthorProfile?.currentTitleId ?? null;
  const liveReplyTitle = getTitleLabelById(liveReplyTitleId);

  // 🔹 자신의 댓글일 때는 userProfileImage 우선, 그 외에는 실시간 프로필 이미지 우선 (댓글에 저장된 authorAvatar는 fallback)
  const replyProfileImage = isOwnReply && _userProfileImage
    ? _userProfileImage
    : (replyAuthorProfile?.profileImage ?? reply.authorAvatar ?? null);

  // 🔹 프로필 정보가 아직 없거나, uid가 없는 경우를 위한 예비용
  const replyTitleFallback = getUserTitle(
    reply.author ?? "",
    userNickname,
    currentTitle
  );

  const replyTitle = liveReplyTitle || replyTitleFallback;

  // 🔹 이 답글 작성자가 탈퇴한 사용자인지 체크
  const replyAuthorDeletedFlag =
    (reply as any).authorDeleted === true ||
    reply.author === "탈퇴한 사용자";

  const replyAuthorName = getDisplayName(
    reply.author,
    replyAuthorDeletedFlag
  );
  const isReplyAuthorDeleted = isDeletedAuthor(
    reply.author,
    replyAuthorDeletedFlag
  );

  // 🔹 삭제된 유저라면 프로필 이미지/칭호는 표시하지 않음
  const safeReplyProfileImage = isReplyAuthorDeleted
    ? null
    : replyProfileImage;
  const safeReplyTitle = isReplyAuthorDeleted ? null : replyTitle;

  // 🔹 createdAt 을 Date 로 변환 (Firestore Timestamp / string 모두 처리)
  let replyCreatedAtDate: Date | null = null;

  if (reply.createdAt instanceof Date) {
    replyCreatedAtDate = reply.createdAt;
  } else if (
    reply.createdAt &&
    typeof (reply.createdAt as any).toDate === "function"
  ) {
    // Firestore Timestamp 같은 객체
    replyCreatedAtDate = (reply.createdAt as any).toDate();
  } else if (
    typeof reply.createdAt === "string" ||
    typeof reply.createdAt === "number"
  ) {
    const parsed = new Date(reply.createdAt);
    if (!Number.isNaN(parsed.getTime())) {
      replyCreatedAtDate = parsed;
    }
  }

  let replyDisplayTime = "";

  if (replyCreatedAtDate) {
    replyDisplayTime = formatRelativeOrDate(replyCreatedAtDate, now);
  } else if (typeof reply.timeAgo === "string" && reply.timeAgo.length > 0) {
    replyDisplayTime = reply.timeAgo;
  }

  // 절대 시간(툴팁 용)
  const replyCreatedAtText = replyCreatedAtDate
    ? formatDateTime(replyCreatedAtDate)
    : "";

  return (
    <Card
      className={`border-border/60 shadow-sm bg-card/40 backdrop-blur-sm list-optimized ${isGuide ? "ring-2 ring-amber-500/50 bg-amber-500/5" : ""
        }`}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* 답글 작성자 정보 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <OptimizedAvatar
                src={safeReplyProfileImage || undefined}
                alt={
                  replyAuthorName
                    ? `${replyAuthorName}님의 프로필`
                    : "프로필 이미지"
                }
                nickname={isReplyAuthorDeleted ? undefined : (reply.author || replyAuthorName)}
                fallbackText={
                  replyAuthorName.charAt(0)?.toUpperCase() || "?"
                }
                className={
                  "w-9 h-9 ring-2 ring-border/20 " +
                  (isReplyAuthorDeleted ? "" : "cursor-pointer")
                }
                size={36}
                // 댓글은 아래에 여러 개 있으니까 lazy 로딩
                loading="lazy"
                decoding="async"
                onClick={isReplyAuthorDeleted ? undefined : handleAuthorClick}
              />
              <div>
                {/* 이름 + 칭호 + 길잡이 뱃지 한 줄 */}
                <div className="flex items-center space-x-2">
                  <p
                    className={
                      "font-medium text-sm " +
                      (isReplyAuthorDeleted
                        ? "text-muted-foreground cursor-default"
                        : "cursor-pointer hover:text-primary transition-colors duration-200")
                    }
                    onClick={isReplyAuthorDeleted ? undefined : handleMention}
                  >
                    {replyAuthorName}
                  </p>

                  {safeReplyTitle && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-2 py-0.5 h-auto bg-primary/10 text-primary border-primary/20"
                    >
                      {safeReplyTitle}
                    </Badge>
                  )}

                  {isAiReply && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0.5 h-auto border-primary/40 text-primary bg-primary/5"
                          >
                            {aiLabel}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="start">
                          <p className="max-w-xs text-xs leading-snug">
                            {aiSummary}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {isGuide && (
                    <Badge className="bg-amber-500 text-white text-[10px] px-2 py-0 flex items-center">
                      <Star className="w-3 h-3 mr-1" />
                      길잡이
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* 더보기 메뉴 */}
            {!isOwnReply && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-8 h-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" align="end">
                  <div className="space-y-1">
                    {/* 글 작성자이고, 아직 길잡이 없고, 이 답글도 길잡이가 아닐 때만 노출 */}
                    {isPostAuthor && !hasGuideAlready && !isGuide && !isAiReply && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-amber-600"
                        onClick={handleGuideSelect}
                      >
                        <Star className="w-4 h-4 mr-2" />
                        길잡이 선택
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-red-500"
                      onClick={handleReport}
                    >
                      <Flag className="w-4 h-4 mr-2" />
                      신고하기
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* 답글 내용 */}
          <div className="text-sm text-foreground/90 leading-6 break-words [&>div:not(:first-child)]:mt-4 [&>div:not(:last-child)]:mb-0">
            {renderContentWithMentions(reply.content)}
          </div>

          {/* 등불 + 오른쪽 하단 시간 */}
          <div className="flex items-center justify-between pt-2">
            {/* 왼쪽: 등불 버튼 */}
            <div className="flex items-center space-x-3">
              {!isOwnReply ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLanternToggle}
                  className={`space-x-1 h-8 ${isLanterned ? "text-amber-500" : ""
                    }`}
                >
                  {isLanterned ? (
                    <LanternFilledIcon className="w-4 h-4 text-amber-500" />
                  ) : (
                    <LanternIcon className="w-4 h-4" />
                  )}
                  <span className="text-xs">{reply.lanterns}</span>
                </Button>
              ) : (
                <div className="flex items-center space-x-1 text-muted-foreground px-2">
                  <LanternIcon className="w-4 h-4" />
                  <span className="text-xs">{reply.lanterns}</span>
                </div>
              )}
            </div>

            {/* 오른쪽: 시간 */}
            <div className="flex flex-col items-end leading-tight text-xs text-muted-foreground">
              {replyDisplayTime && (
                <span title={replyCreatedAtText || undefined}>
                  {replyDisplayTime}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}, (prev, next) => {
  if (prev.reply.id !== next.reply.id) return false;
  if (prev.isLanterned !== next.isLanterned) return false;
  if (prev.isGuide !== next.isGuide) return false;
  if (prev.hasGuideAlready !== next.hasGuideAlready) return false;
  if (prev.reply.lanterns !== next.reply.lanterns) return false;
  if (prev.reply.content !== next.reply.content) return false;
  if (prev.reply.author !== next.reply.author) return false;
  if (prev.reply.authorAvatar !== next.reply.authorAvatar) return false;
  if ((prev.reply.createdAt as any) !== (next.reply.createdAt as any)) return false;
  if (prev.reply.authorUid !== next.reply.authorUid) return false;
  if (prev.reply.timeAgo !== next.reply.timeAgo) return false;
  if (prev.reply.isAi !== next.reply.isAi) return false;
  if (prev.reply.aiLabel !== next.reply.aiLabel) return false;
  if (prev.reply.aiSummary !== next.reply.aiSummary) return false;
  if (prev.userNickname !== next.userNickname) return false;
  if (prev.currentTitle !== next.currentTitle) return false;
  if (prev.userProfileImage !== next.userProfileImage) return false;
  if (prev.isPostAuthor !== next.isPostAuthor) return false;
  return true;
});
