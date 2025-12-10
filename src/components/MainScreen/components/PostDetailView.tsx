// MainScreen/components/PostDetailView.tsx
// 게시물 상세 보기 화면 컴포넌트
/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */
import React, { useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useScrollRestoration } from "@/components/hooks/useScrollRestoration";
import { getUserTitle, getTitleLabelById } from "@/data/titleData";
import { formatRelativeOrDate } from "@/components/utils/timeUtils";
import { useNow } from "@/components/hooks/useNow";
import { useUserProfiles, type UserProfileLite } from "@/components/MainScreen/hooks/useUserProfiles";
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

// Firestore Timestamp / Date / string 모두 안전하게 처리해서
// "2025.12.05 18:49" 같은 형식으로 보여주는 함수
function formatDateTime(value: unknown): string {
  if (!value) return "";

  let date: Date | null = null;

  if (value instanceof Date) {
    date = value;
  } else if (value && typeof (value as any).toDate === "function") {
    // Firestore Timestamp 같은 객체
    date = (value as any).toDate();
  } else if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      date = parsed;
    }
  }

  if (!date) return "";

  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface PostDetailViewProps {
  post: Post;
  userNickname: string;
  userProfileImage: string;
  currentTitle: string;
  isDarkMode: boolean;

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
}

export function PostDetailView({
  post,
  userNickname,
  userProfileImage,
  currentTitle,
  isDarkMode: _isDarkMode,
  isPostLanterned,
  isReplyLanterned,
  onLanternToggle,
  onReplyLanternToggle,
  isBookmarked,
  onBookmarkToggle,
  isGuideReply,
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
  const scrollRef = useScrollRestoration({
    key: `post-detail-${post.id}`,
  });

  // 🔹 1분마다 바뀌는 현재 시각 (화면 강제 갱신용)
  const now = useNow(60_000);

  // 🔹 이 화면에 등장하는 모든 UID 모으기 (글 작성자 + 댓글 작성자들)
  const replyAuthorUids =
    post.replies
      ?.map((r) => r.authorUid)
      .filter(
        (uid): uid is string => typeof uid === "string" && uid.length > 0
      ) ?? [];

  const allUidsForThisScreen = useMemo(
    () =>
      Array.from(
        new Set(
          [
            post.authorUid, // 글 작성자
            ...replyAuthorUids, // 댓글 작성자들
          ].filter(
            (uid): uid is string => typeof uid === "string" && uid.length > 0
          )
        )
      ),
    // replyAuthorUids 배열을 문자열로 묶어서 의존성으로 사용
    [post.authorUid, replyAuthorUids.join("|")]
  );

  // 🔹 공통 훅으로 유저 프로필/칭호 실시간 구독
  const userProfiles = useUserProfiles(allUidsForThisScreen);

  // 답글 입력 엔터 처리
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onReplySubmit();
      }
    },
    [onReplySubmit]
  );
  // 작성자 칭호 / 작성 시간 (실시간 프로필 기준)
  const postAuthorProfile = post.authorUid
    ? userProfiles[post.authorUid]
    : undefined;

  const liveAuthorTitleId = postAuthorProfile?.currentTitleId ?? null;
  const liveAuthorTitle = getTitleLabelById(liveAuthorTitleId);

  // 🔹 1순위: users 컬렉션 (실시간 프로필)
  // 🔹 2순위: 글 저장할 때 같이 저장해 둔 authorAvatar (옛 데이터/백업용)
  const postAuthorProfileImage =
    postAuthorProfile?.profileImage ?? post.authorAvatar ?? null;

  const authorTitleFallback = getUserTitle(
    post.author ?? "",
    userNickname,
    currentTitle
  );

  const authorTitle = liveAuthorTitle || authorTitleFallback;
  const postCreatedAtText = formatDateTime(post.createdAt);

  // 🔹 createdAt 을 Date 로 변환 (Firestore Timestamp / string 모두 처리)
  let postCreatedAtDate: Date | null = null;

  if (post.createdAt instanceof Date) {
    postCreatedAtDate = post.createdAt;
  } else if (
    post.createdAt &&
    typeof (post.createdAt as any).toDate === "function"
  ) {
    // Firestore Timestamp 같은 객체
    postCreatedAtDate = (post.createdAt as any).toDate();
  } else if (
    typeof post.createdAt === "string" ||
    typeof post.createdAt === "number"
  ) {
    const parsed = new Date(post.createdAt);
    if (!Number.isNaN(parsed.getTime())) {
      postCreatedAtDate = parsed;
    }
  }

  // 🔹 화면에 직접 보여줄 문자열 (24시간 이내: 상대시간, 이후: 날짜)
  const postDisplayTime = postCreatedAtDate
    ? formatRelativeOrDate(postCreatedAtDate, now)
    : "";

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="bg-card/95 border-b border-border p-4 flex-shrink-0">
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
                      alt={post.author ? `${post.author}님의 프로필` : "프로필 이미지"}
                      fallbackText={post.author?.charAt(0)?.toUpperCase() || "?"}
                      className="w-12 h-12 ring-2 ring-border/30 cursor-pointer"
                      // 상세 화면 상단이라 eager 그대로 사용
                      loading="eager"
                      decoding="async"
                    />

                    {/* 이름 + 칭호 한 줄, 그 아래에 날짜 */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <p
                          className="font-semibold text-base cursor-pointer hover:text-primary transition-colors duration-200"
                          onClick={onMentionAuthor}
                        >
                          {post.author}
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
                        {postDisplayTime && (
                          <span title={postCreatedAtText || undefined}>
                            {postDisplayTime}
                          </span>
                        )}
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
                  <p className="text-muted-foreground leading-relaxed">
                    {renderContentWithMentions(post.content)}
                  </p>
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
                    {/* 등불 버튼 - 내 글이면 숫자만, 남의 글이면 버튼 */}
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

                    {/* 댓글 수 */}
                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.comments ?? post.replies?.length ?? 0}</span>
                    </div>

                    {/* 조회수 */}
                    <div className="flex items-center space-x-1 text-muted-foreground">
                      <Eye className="w-4 h-4" />
                      <span>{post.views ?? 0}</span>
                    </div>
                  </div>

                  {/* 북마크 */}
                  <Button
                    variant={isBookmarked ? "default" : "ghost"}
                    size="sm"
                    onClick={onBookmarkToggle}
                    className="flex items-center space-x-1 touch-target"
                  >
                    <Bookmark
                      className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`}
                    />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 답글 목록 */}
          <div className="space-y-3">
            {post.replies
              // ✅ 1) hidden === true 인 댓글은 먼저 제외
              ?.filter((reply) => !((reply as any).hidden === true))
              // ✅ 2) 나머지만 실제로 렌더링
              .map((reply: Reply) => (
                <ReplyCard
                  key={reply.id}
                  reply={reply}
                  userNickname={userNickname}
                  userProfileImage={userProfileImage}
                  currentTitle={currentTitle}
                  isPostAuthor={post.author === userNickname}
                  isLanterned={isReplyLanterned(reply.id)}
                  isGuide={reply.isGuide || post.guideReplyId === reply.id}
                  hasGuideAlready={hasGuide}
                  onLanternToggle={() =>
                    onReplyLanternToggle(reply.id, post.id)
                  }
                  onGuideSelect={() =>
                    onGuideSelect(reply.id, reply.author, post.id)
                  }
                  onMention={() => onMentionReplyAuthor(reply.author)}
                  onAuthorClick={() => onReplyAuthorClick(reply.author)}
                  onReport={() => onReportReply(reply)}
                  renderContentWithMentions={renderContentWithMentions}
                  userProfiles={userProfiles}
                />
              ))}
          </div>

          {/* 답글 입력 카드 */}
          <Card className="border-border/60 shadow-sm bg-card/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="space-y-4">
                <Textarea
                  ref={replyInputRef}
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

// 답글 카드 컴포넌트
interface ReplyCardProps {
  reply: Reply;
  //postId: string | number;
  userNickname: string;
  userProfileImage: string;
  currentTitle: string;
  isPostAuthor: boolean;
  isLanterned: boolean;
  isGuide: boolean;
  hasGuideAlready: boolean;
  onLanternToggle: () => void;
  onGuideSelect: () => void;
  onMention: () => void;
  onAuthorClick: () => void;
  onReport: () => void;
  renderContentWithMentions: (content: string) => React.ReactNode;
  userProfiles: Record<string, UserProfileLite>;
}

function ReplyCard({
  reply,
  //postId,
  userNickname,
  userProfileImage,
  currentTitle,
  isPostAuthor,
  isLanterned,
  isGuide,
  hasGuideAlready,
  onLanternToggle,
  onGuideSelect,
  onMention,
  onAuthorClick,
  onReport,
  renderContentWithMentions,
  userProfiles,
}: ReplyCardProps) {
  const now = useNow(60_000);
  const isOwnReply = reply.author === userNickname;

  // 🔹 실시간 프로필에서 칭호 ID 가져오기
  const replyAuthorProfile = reply.authorUid
    ? userProfiles[reply.authorUid]
    : undefined;

  const liveReplyTitleId = replyAuthorProfile?.currentTitleId ?? null;
  const liveReplyTitle = getTitleLabelById(liveReplyTitleId);

  // 🔹 1순위: users 컬렉션 (실시간 프로필)
  // 🔹 2순위: 댓글에 저장된 authorAvatar (옛 데이터/백업용)
  const replyProfileImage =
    replyAuthorProfile?.profileImage ?? reply.authorAvatar ?? null;

  // 🔹 프로필 정보가 아직 없거나, uid가 없는 경우를 위한 예비용
  const replyTitleFallback = getUserTitle(
    reply.author ?? "",
    userNickname,
    currentTitle
  );

  const replyTitle = liveReplyTitle || replyTitleFallback;

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
    // 🔹 createdAt 이 Date 로 있을 때는 공통 함수 사용 (1분마다 갱신)
    replyDisplayTime = formatRelativeOrDate(replyCreatedAtDate, now);
  } else if (typeof reply.timeAgo === "string" && reply.timeAgo.length > 0) {
    // 🔹 예전 데이터: createdAt 이 없고, timeAgo 문자열만 있을 때
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
                src={replyProfileImage || undefined}
                alt={reply.author ? `${reply.author}님의 프로필` : "프로필 이미지"}
                fallbackText={reply.author?.charAt(0)?.toUpperCase() || "?"}
                className="w-9 h-9 ring-2 ring-border/20 cursor-pointer"
                // 댓글은 아래에 여러 개 있으니까 lazy 로딩
                loading="lazy"
                decoding="async"
              />
              <div>
                {/* 이름 + 칭호 + 길잡이 뱃지 한 줄 */}
                <div className="flex items-center space-x-2">
                  <p
                    className="font-medium text-sm cursor-pointer hover:text-primary transition-colors duration-200"
                    onClick={onMention}
                  >
                    {reply.author}
                  </p>

                  {replyTitle && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-2 py-0.5 h-auto bg-primary/10 text-primary border-primary/20"
                    >
                      {replyTitle}
                    </Badge>
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
                    {isPostAuthor && !hasGuideAlready && !isGuide && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-amber-600"
                        onClick={onGuideSelect}
                      >
                        <Star className="w-4 h-4 mr-2" />
                        길잡이 선택
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-red-500"
                      onClick={onReport}
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
          <p className="text-sm text-muted-foreground leading-relaxed">
            {renderContentWithMentions(reply.content)}
          </p>

          {/* 등불 + 오른쪽 하단 시간 */}
          <div className="flex items-center justify-between pt-2">
            {/* 왼쪽: 등불 버튼 (기존 그대로) */}
            <div className="flex items-center space-x-3">
              {!isOwnReply ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLanternToggle}
                  className={`space-x-1 h-8 ${isLanterned ? "text-amber-500" : ""}`}
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

            {/* 오른쪽: 시간(오른쪽 하단) */}
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
}
