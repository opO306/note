// MainScreen/components/PostListView.tsx
// 게시물 목록 화면 컴포넌트 - 서브카테고리 필터 + 정렬 포함
/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */
import React, { useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { Badge } from "@/components/ui/badge";
import { SimpleDropdown } from "@/components/ui/simple-dropdown";
import { useScrollRestoration } from "@/components/hooks/useScrollRestoration";
import { LanternIcon, LanternFilledIcon } from "@/components/icons/Lantern";
import { MessageCircle, Bookmark, Plus } from "lucide-react";
import { getUserTitle, getTitleLabelById } from "@/data/titleData";
import { formatRelativeOrDate } from "@/components/utils/timeUtils";
import { useUserProfiles, type UserProfileLite } from "@/components/MainScreen/hooks/useUserProfiles";
// 경로는 현재 프로젝트 구조에 맞게 조정
import type { Post, Category, SortOption } from "../types";

const SORT_OPTIONS: SortOption[] = [
  { label: "최신순", value: "latest" },
  { label: "오래된순", value: "oldest" },
  { label: "인기순", value: "lanterns" },
];

interface PostListViewProps {
  posts: Post[];
  userNickname: string;
  userProfileImage: string;
  activeCategory: string;
  activeSubCategory: string;
  sortBy: string;

  // 카테고리 데이터
  categories: Category[];

  // 서브카테고리/정렬 변경
  onSubCategoryChange: (subId: string) => void;
  onSortChange: (value: string) => void;

  // 등불/북마크 상태 확인 함수
  isPostLanterned: (postId: string | number) => boolean;
  isBookmarked: (postId: string | number) => boolean;

  // 액션
  onPostClick: (post: Post) => void;
  onLanternToggle: (postId: string | number) => void;
  onBookmarkToggle: (postId: string | number) => void;
  onStartWriting: () => void;
  currentTitle: string;
}

export function PostListView({
  posts,
  userNickname,
  userProfileImage,
  activeCategory,
  activeSubCategory,
  sortBy,
  categories,
  onSubCategoryChange,
  onSortChange,
  isPostLanterned,
  isBookmarked,
  onPostClick,
  onLanternToggle,
  onBookmarkToggle,
  onStartWriting,
  currentTitle,
}: PostListViewProps) {
  // 스크롤 복원
  const scrollRef = useScrollRestoration({
    key: `main-posts-${activeCategory}-${activeSubCategory}`,
  });

  // 🔹 이 목록에 등장하는 모든 글 작성자 UID 모으기
  const postAuthorUids = useMemo(
    () =>
      Array.from(
        new Set(
          posts
            .map((p) => p.authorUid)
            .filter(
              (uid): uid is string => typeof uid === "string" && uid.length > 0
            )
        )
      ),
    [posts]
  );

  // 🔹 공통 훅으로 유저 프로필/칭호 실시간 구독
  const userProfiles = useUserProfiles(postAuthorUids);

  // 현재 카테고리의 서브카테고리 목록
  const currentCategory = useMemo(
    () => categories.find((cat) => cat.id === activeCategory),
    [categories, activeCategory]
  );

  const currentSubCategories = useMemo(
    () => currentCategory?.subCategories ?? [],
    [currentCategory]
  );

  // 서브카테고리 클릭 핸들러
  const handleSubCategoryClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const subId = e.currentTarget.getAttribute("data-sub-id");
      if (subId) {
        onSubCategoryChange(subId);
      }
    },
    [onSubCategoryChange]
  );

  // 필터링 및 정렬된 게시물
  const filteredAndSortedPosts = useMemo(() => {
    // ✅ 1) 먼저 hidden === true 인 글은 전부 빼고 시작
    const visiblePosts = posts.filter(
      (post) => !((post as any).hidden === true)
    );

    let filtered = visiblePosts;

    // 카테고리 필터링
    if (activeCategory !== "전체") {
      filtered = filtered.filter((post) => post.category === activeCategory);
    }

    // 서브카테고리 필터링
    if (activeSubCategory !== "전체") {
      filtered = filtered.filter(
        (post) => post.subCategory === activeSubCategory
      );
    }

    // 정렬
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "lanterns":
          return b.lanterns - a.lanterns;

        case "oldest": {
          const aTime = a.createdAt ? a.createdAt.getTime() : 0;
          const bTime = b.createdAt ? b.createdAt.getTime() : 0;
          return aTime - bTime;
        }

        default: {
          const aTime = a.createdAt ? a.createdAt.getTime() : 0;
          const bTime = b.createdAt ? b.createdAt.getTime() : 0;
          return bTime - aTime;
        }
      }
    });
  }, [posts, activeCategory, activeSubCategory, sortBy]);

  // 상대 시간 (몇 분 전)
  const formatTimeAgo = useCallback((date?: Date): string => {
    // 🔹 이제 공통 함수만 사용
    return formatRelativeOrDate(date);
  }, []);

  // 🔹 이 함수는 더 이상 안 쓰면 지워도 되고,
  //    혹시 나중에 절대시간이 필요하면 남겨둬도 됨.
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

  // 서브카테고리 버튼들
  const subCategoryButtons = useMemo(
    () =>
      currentSubCategories.map((sub) => (
        <Button
          key={sub.id}
          variant={activeSubCategory === sub.id ? "default" : "ghost"}
          size="sm"
          data-sub-id={sub.id}
          onClick={handleSubCategoryClick}
          className={`whitespace-nowrap flex-shrink-0 rounded-full px-4 transition-all duration-200 ${activeSubCategory === sub.id
            ? "bg-primary text-primary-foreground shadow-sm"
            : "hover:bg-accent/80"
            }`}
        >
          {sub.name}
        </Button>
      )),
    [currentSubCategories, activeSubCategory, handleSubCategoryClick]
  );

  return (
    <div className="h-full flex flex-col">
      {/* 서브카테고리 + 정렬 */}
      <div className="bg-card/98 glass-effect border-b border-border px-4 py-3 flex-shrink-0 shadow-sm relative z-20">
        {currentSubCategories.length > 1 && (
          <div className="flex space-x-2 overflow-x-auto scrollbar-hide mb-3">
            {subCategoryButtons}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {filteredAndSortedPosts.length}개의 글
          </span>
          <SimpleDropdown
            value={sortBy}
            onChange={onSortChange}
            options={SORT_OPTIONS}
            triggerClassName="w-24 h-8"
          />
        </div>
      </div>

      {/* Posts */}
      <div ref={scrollRef} className="flex-1 scroll-container scrollbar-hide">
        <div className="px-4 py-3 pb-24 space-y-3">
          {filteredAndSortedPosts.length === 0 ? (
            // 비어 있을 때
            <div className="flex flex-col items-center justify-center h-96 text-center px-4">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-amber-500/30 dark:bg-amber-400/30 blur-3xl rounded-full animate-pulse" />
                <div className="relative w-32 h-32 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center border-4 border-amber-400 dark:border-amber-600 shadow-lg">
                  <LanternIcon className="w-20 h-20 text-amber-900 dark:text-amber-200" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                아직 글이 없어요
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-64">
                첫 번째 글을 작성해서 비유노트 커뮤니티를 시작해보세요!
              </p>
              <Button
                onClick={onStartWriting}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                첫 글 작성하기
              </Button>
            </div>
          ) : (
            filteredAndSortedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                userNickname={userNickname}
                userProfileImage={userProfileImage}
                isLanterned={isPostLanterned(post.id)}
                isBookmarked={isBookmarked(post.id)}
                timeAgo={formatTimeAgo(post.createdAt)}
                createdAtText={formatCreatedAt(post.createdAt)}
                currentTitle={currentTitle}
                onClick={() => onPostClick(post)}
                onLanternClick={(e) => {
                  e.stopPropagation();
                  onLanternToggle(post.id);
                }}
                onBookmarkClick={(e) => {
                  e.stopPropagation();
                  onBookmarkToggle(post.id);
                }}
                userProfiles={userProfiles}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// 개별 게시물 카드 컴포넌트
interface PostCardProps {
  post: Post;
  userNickname: string;
  userProfileImage: string;
  isLanterned: boolean;
  isBookmarked: boolean;
  timeAgo: string;
  createdAtText: string;
  currentTitle: string;
  onClick: () => void;
  onLanternClick: (e: React.MouseEvent) => void;
  onBookmarkClick: (e: React.MouseEvent) => void;
  userProfiles: Record<string, UserProfileLite>;
}

function PostCard({
  post,
  userNickname,
  userProfileImage,
  isLanterned,
  isBookmarked,
  timeAgo,
  createdAtText,
  currentTitle,
  onClick,
  onLanternClick,
  onBookmarkClick,
  userProfiles,
}: PostCardProps) {
  const isOwnPost = post.author === userNickname;

  // 🔹 실시간 프로필에서 칭호/이미지 가져오기
  const postAuthorProfile = post.authorUid
    ? userProfiles[post.authorUid]
    : undefined;

  const liveAuthorTitleId = postAuthorProfile?.currentTitleId ?? null;
  const liveAuthorTitle = getTitleLabelById(liveAuthorTitleId);

  // 🔹 아바타 이미지도 users 컬렉션 기준으로 우선 사용
  const postAuthorProfileImage =
    postAuthorProfile?.profileImage ??
    (isOwnPost ? userProfileImage : post.authorAvatar ?? "");

  const authorTitleFallback = getUserTitle(
    post.author ?? "",
    userNickname,
    currentTitle
  );

  const authorTitle = liveAuthorTitle || authorTitleFallback;

  return (
    <Card
      className="border-border/60 shadow-sm bg-card/80 backdrop-blur-sm hover:shadow-md transition-shadow cursor-pointer list-optimized"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* 작성자 + 시간 */}
          <div className="flex items-center space-x-3">
            <OptimizedAvatar
              src={postAuthorProfileImage || undefined}
              alt={post.author ? `${post.author}님의 프로필` : "프로필 이미지"}
              fallbackText={post.author?.charAt(0)?.toUpperCase() || "?"}
              className="w-10 h-10 ring-2 ring-border/20"
              // 목록은 많이 나오니까 lazy
              loading="lazy"
              decoding="async"
            />
            <div className="w-full">
              <div className="flex flex-col">
                {/* 윗줄: 닉네임 + 칭호 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">{post.author}</p>
                    {authorTitle && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-2 py-0.5 h-auto bg-primary/10 text-primary border-primary/20"
                      >
                        {authorTitle}
                      </Badge>
                    )}
                  </div>

                  {/* 오른쪽: 시간 */}
                  <div className="text-xs text-muted-foreground">
                    {(post.timeAgo ?? timeAgo) && (
                      <span title={createdAtText || undefined}>
                        {post.timeAgo ?? timeAgo}
                      </span>
                    )}
                  </div>
                </div>

                {/* 아랫줄: 길잡이 글 뱃지 */}
                {post.type === "guide" && (
                  <div className="mt-1">
                    <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-semibold">
                      길잡이 글
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 제목 + 내용 미리보기 */}
          <div>
            <h3 className="font-medium text-base mb-1 line-clamp-1">
              {post.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {post.content}
            </p>
          </div>

          {/* 태그 (앞 2개만) */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex space-x-1">
              {post.tags[0] && (
                <Badge
                  variant="secondary"
                  className="text-xs px-1.5 py-0.5"
                >
                  #{post.tags[0]}
                </Badge>
              )}
              {post.tags[1] && (
                <Badge
                  variant="secondary"
                  className="text-xs px-1.5 py-0.5"
                >
                  #{post.tags[1]}
                </Badge>
              )}
            </div>
          )}

          {/* 등불 / 댓글 / 조회수 / 북마크 */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              {/* 등불 */}
              {!isOwnPost ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLanternClick}
                  className={`h-8 px-2 space-x-1 ${isLanterned ? "text-amber-500" : "text-muted-foreground"
                    }`}
                >
                  {isLanterned ? (
                    <LanternFilledIcon className="w-4 h-4" />
                  ) : (
                    <LanternIcon className="w-4 h-4" />
                  )}
                  <span className="text-xs">{post.lanterns ?? 0}</span>
                </Button>
              ) : (
                <div className="flex items-center space-x-1">
                  <LanternIcon className="w-4 h-4" />
                  <span className="text-xs">{post.lanterns ?? 0}</span>
                </div>
              )}

              {/* 댓글 수 */}
              <div className="flex items-center space-x-1">
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs">
                  {post.comments ?? post.replies?.length ?? 0}
                </span>
              </div>

              {/* 조회수 */}
              <span>조회수 {post.views ?? 0}</span>
            </div>

            {/* 북마크 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onBookmarkClick}
              className={`h-8 px-2 ${isBookmarked ? "text-primary" : "text-muted-foreground"
                }`}
            >
              <Bookmark
                className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""
                  }`}
              />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card >
  );
}
