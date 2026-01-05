// MainScreen/components/PostListView.tsx
// 게시물 목록 화면 컴포넌트 - 서브카테고리 필터 + 정렬 + 차단 필터링 포함
import React, { useCallback, useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { Badge } from "@/components/ui/badge";
import { SimpleDropdown } from "@/components/ui/simple-dropdown";
import { EmptyStatePanel } from "@/components/ui/empty-state";
import { PostListSkeleton } from "@/components/ui/skeleton";
import { LanternIcon, LanternFilledIcon } from "@/components/icons/Lantern";
import { MessageCircle, Bookmark, Plus, RotateCw } from "lucide-react";
import { getUserTitle, getTitleLabelById } from "@/data/titleData";
import { filterGoogleProfileImage } from "@/utils/profileImageUtils";
import { GreekColumn, getColumnStyleByTrustScore } from "@/components/icons/GreekColumn";
import { LaurelWreath } from "@/components/icons/LaurelWreath";
// import { getBookShelfLevelByTrustScore } from "@/components/icons/BookShelf"; // TODO: 향후 황금빛 서재 테마 구현 시 사용 예정
import {
  getDisplayName,
  isDeletedAuthor,
} from "@/components/utils/deletedUserHelpers";
import { type UserProfileLite } from "@/components/MainScreen/hooks/useUserProfiles";
import {
  usePostListViewModel,
  SORT_OPTIONS,
} from "../hooks/usePostListViewModel";
import type { Post, Category, SortOption } from "../types";

const isSameProfileShallow = (a?: UserProfileLite, b?: UserProfileLite) => {
  if (a === b) return true;
  return a?.profileImage === b?.profileImage && a?.currentTitleId === b?.currentTitleId;
};

interface PostListViewProps {
  posts: Post[];
  userNickname: string;
  userProfileImage: string;
  userUid: string; // userUid 추가
  activeCategory: string;
  activeSubCategory: string;
  sortBy: SortOption["value"];
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isLoading?: boolean; // ✅ 초기 로딩 상태
  // 🆕 [추가] 차단된 유저 ID 목록
  blockedUserIds: string[];

  // 카테고리 데이터
  categories: Category[];

  // 서브카테고리/정렬 변경
  onSubCategoryChange: (subId: string) => void;
  onSortChange: (value: SortOption["value"]) => void;

  // 등불/북마크 상태 확인 함수
  isPostLanterned: (postId: string | number) => boolean;
  isBookmarked: (postId: string | number) => boolean;

  // 액션
  onPostClick: (post: Post) => void;
  onLanternToggle: (postId: string | number) => void;
  onBookmarkToggle: (postId: string | number) => void;
  onStartWriting: () => void;
  currentTitle: string;
  // 자신의 신뢰도 (자신의 게시물에 기둥 표시용)
  userTrustScore?: number;
  isGuest: boolean; // 게스트 모드 여부 추가
}

function PostListViewComponent({
  posts,
  userNickname,
  userProfileImage,
  userUid, // userUid 추가
  activeCategory,
  activeSubCategory,
  sortBy,
  blockedUserIds, // 🆕 구조 분해 할당
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
  onRefresh,
  isRefreshing = false,
  isLoading = false, // ✅ 초기 로딩 상태
  userTrustScore,
  isGuest, // 게스트 모드 여부 추가
}: PostListViewProps) {

  // 🆕 [추가] 차단된 유저의 게시글 필터링
  // ViewModel로 넘기기 전에 원본 posts에서 차단 유저 글을 미리 제거합니다.
  const filteredPostsByBlock = useMemo(() => {
    if (!blockedUserIds || blockedUserIds.length === 0) {
      return posts;
    }
    return posts.filter((post) => {
      // Post 타입에 따라 authorUid 또는 userId가 있을 수 있음
      const authorId = post.authorUid || (post as any).userId;
      // 작성자가 차단 목록에 포함되지 않은 글만 반환
      return !blockedUserIds.includes(authorId);
    });
  }, [posts, blockedUserIds]);

  // moderationStatus에 따른 추가 필터링
  const moderatedPosts = useMemo(() => {
    return filteredPostsByBlock.filter((post) => {
      const isOwnPost = post.authorUid === userUid; // 현재 사용자가 작성자인지 확인
      const hasAiReply = post.replies?.some((r) => r.isAi === true) === true; // AI 답변이 있는지 확인

      // 자신의 게시물 또는 AI 답변이 있는 게시물은 moderationStatus가 'approved'가 아니더라도 볼 수 있게 함
      if (isOwnPost || hasAiReply) {
        return true; // 자신의 게시물 또는 AI 답변이 있는 게시물은 항상 표시
      }
      // 다른 사람의 게시물은 moderationStatus가 'approved'인 경우에만 볼 수 있게 함
      return post.moderationStatus === "approved";
    });
  }, [filteredPostsByBlock, userUid]); // userUid 의존성 추가

  const {
    scrollRef,
    currentSubCategories,
    visiblePosts,
    filteredCount,
    handleSubCategoryClick,
    formatTimeAgo,
    formatCreatedAt,
    userProfiles,
  } = usePostListViewModel({
    posts: moderatedPosts, // 🆕 필터링된 posts 전달
    activeCategory,
    activeSubCategory,
    sortBy,
    categories,
    onSubCategoryChange,
  });

  const handleSortChange = useCallback(
    (value: string) => {
      onSortChange(value as SortOption["value"]);
    },
    [onSortChange]
  );

  return (
    <div className="h-full flex flex-col">
      {/* 서브카테고리 + 정렬 */}
      <SubCategoryBar
        currentSubCategories={currentSubCategories}
        activeSubCategory={activeSubCategory}
        handleSubCategoryClick={handleSubCategoryClick}
        filteredCount={filteredCount}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        // 🆕 [추가] 하위 컴포넌트로 전달
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Posts */}
      <div className="flex-1 overflow-hidden bg-background">
        {/* ✅ 초기 로딩 또는 새로고침 중일 때 Skeleton UI 표시 */}
        {(isLoading || isRefreshing) && posts.length === 0 ? (
          <div className="h-full overflow-y-auto scrollbar-hide">
            <PostListSkeleton count={5} />
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="h-full overflow-y-auto scrollbar-hide p-4">
            <EmptyState onStartWriting={onStartWriting} isGuest={isGuest} />
          </div>
        ) : (
          <PostCardsList
            posts={visiblePosts}
            userNickname={userNickname}
            userProfileImage={userProfileImage}
            userUid={userUid} // userUid 전달
            isPostLanterned={isPostLanterned}
            isBookmarked={isBookmarked}
            currentTitle={currentTitle}
            userProfiles={userProfiles}
            formatTimeAgo={formatTimeAgo}
            formatCreatedAt={formatCreatedAt}
            onPostClick={onPostClick}
            onLanternToggle={onLanternToggle}
            onBookmarkToggle={onBookmarkToggle}
            scrollRef={scrollRef}
            userTrustScore={userTrustScore}
            isGuest={isGuest} // 게스트 모드 여부 추가
          />
        )}
      </div>
    </div>
  );
}

export const PostListView = React.memo(PostListViewComponent);

interface SubCategoryBarProps {
  currentSubCategories: NonNullable<Category["subCategories"]>;
  activeSubCategory: string;
  handleSubCategoryClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  filteredCount: number;
  sortBy: SortOption["value"];
  onSortChange: (value: string) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

function SubCategoryBar({
  currentSubCategories,
  activeSubCategory,
  handleSubCategoryClick,
  filteredCount,
  sortBy,
  onSortChange,
  onRefresh,
  isRefreshing,
}: SubCategoryBarProps) {
  return (
    <div className="bg-card/98 glass-effect border-b border-border px-4 py-3 flex-shrink-0 shadow-sm relative z-20">
      {currentSubCategories.length > 1 && (
        <div className="flex space-x-2 overflow-x-auto scrollbar-hide mb-3">
          {currentSubCategories.map((sub) => {
            const isActive = activeSubCategory === sub.id;
            return (
              <Button
                key={sub.id}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                data-sub-id={sub.id}
                onClick={handleSubCategoryClick}
                className={`whitespace-nowrap flex-shrink-0 rounded-full px-4 transition-all duration-200 ${isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "hover:bg-accent/80"
                  }`}
              >
                {sub.name}
              </Button>
            );
          })}
        </div>
      )}

      {/* 4. 버튼 UI 배치 수정 */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{filteredCount}개의 글</span>

        {/* 우측 컨트롤 그룹 (새로고침 + 정렬) */}
        <div className="flex items-center space-x-2">

          {/* 🆕 새로고침 버튼 추가 */}
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 p-0 rounded-full hover:bg-accent transition-all"
            >
              <RotateCw
                className={`w-4 h-4 text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`}
              />
            </Button>
          )}

          <SimpleDropdown
            value={sortBy}
            onChange={(value) => onSortChange(value as SortOption["value"])}
            options={SORT_OPTIONS}
            triggerClassName="w-24 h-8"
          />
        </div>
      </div>
    </div>
  );
}
function EmptyState({ onStartWriting, isGuest }: { onStartWriting: () => void; isGuest: boolean }) {
  return (
    <EmptyStatePanel
      icon={<LanternIcon className="w-20 h-20 text-amber-900 dark:text-amber-200" />}
      title="아직 글이 없어요"
      description="첫 번째 글을 작성해서 비유노트 커뮤니티를 시작해보세요!"
      action={
        <Button
          onClick={isGuest ? () => console.log("로그인 후 글쓰기 기능을 이용할 수 있습니다.") : onStartWriting}
          className="bg-primary text-primary-foreground px-6 py-2 rounded-xl"
          disabled={isGuest} // 게스트 모드 시 비활성화
        >
          <Plus className="w-4 h-4 mr-2" />
          첫 글 작성하기
        </Button>
      }
      glowClassName="bg-amber-500/30 dark:bg-amber-400/30"
      circleClassName="bg-amber-100 dark:bg-amber-900/40 border-4 border-amber-400 dark:border-amber-600"
    />
  );
}

interface PostCardsListProps {
  posts: Post[];
  userNickname: string;
  userProfileImage: string;
  userUid: string; // userUid 추가
  isPostLanterned: (postId: string | number) => boolean;
  isBookmarked: (postId: string | number) => boolean;
  currentTitle: string;
  userProfiles: Record<string, UserProfileLite>;
  formatTimeAgo: (date?: Date) => string;
  formatCreatedAt: (date?: Date) => string;
  onPostClick: (post: Post) => void;
  onLanternToggle: (postId: string | number) => void;
  onBookmarkToggle: (postId: string | number) => void;
  scrollRef?: React.RefObject<HTMLElement | null>;
  userTrustScore?: number;
  isGuest: boolean; // 게스트 모드 여부 추가
}

export const PostCardsList = React.memo(function PostCardsList({
  posts,
  userNickname,
  userProfileImage,
  userUid, // userUid 추가
  isPostLanterned,
  isBookmarked,
  currentTitle,
  userProfiles,
  formatTimeAgo,
  formatCreatedAt,
  onPostClick,
  onLanternToggle,
  onBookmarkToggle,
  scrollRef,
  userTrustScore,
  isGuest, // 게스트 모드 여부 추가
}: PostCardsListProps) {
  const cardItems = useMemo(
    () =>
      posts.map((post) => ({
        post,
        isLanterned: isPostLanterned(post.id),
        isBookmarked: isBookmarked(post.id),
        timeAgo: formatTimeAgo(post.createdAt),
        createdAtText: formatCreatedAt(post.createdAt),
        authorProfile: post.authorUid ? userProfiles[post.authorUid] : undefined,
      })),
    [
      posts,
      isPostLanterned,
      isBookmarked,
      formatTimeAgo,
      formatCreatedAt,
      userProfiles,
    ]
  );

  return (
    <Virtuoso
      style={{ height: "100%" }}
      scrollerRef={(ref) => {
        if (scrollRef && ref) {
          (scrollRef as React.MutableRefObject<HTMLElement | null>).current = ref as HTMLElement;
        }
      }}
      data={cardItems}
      className="scrollbar-hide"
      itemContent={(index, { post, isLanterned, isBookmarked, timeAgo, createdAtText, authorProfile }) => {
        return (
          <div className="px-4 py-1.5 first:pt-3 last:pb-24">
            <PostCard
              key={post.id}
              post={post}
              userNickname={userNickname}
              userProfileImage={userProfileImage}
              userUid={userUid} // userUid 전달
              isLanterned={isLanterned}
              isBookmarked={isBookmarked}
              timeAgo={timeAgo}
              createdAtText={createdAtText}
              currentTitle={currentTitle}
              authorProfile={authorProfile}
              onPostClick={onPostClick}
              onLanternToggle={onLanternToggle}
              onBookmarkToggle={onBookmarkToggle}
              index={index}
              userTrustScore={userTrustScore}
              isGuest={isGuest} // 게스트 모드 여부 추가
            />
          </div>
        );
      }}
    />
  );
});
// 개별 게시물 카드 컴포넌트
export interface PostCardProps {
  post: Post;
  userNickname: string;
  userProfileImage: string;
  userUid: string; // userUid 추가
  isLanterned: boolean;
  isBookmarked: boolean;
  timeAgo: string;
  createdAtText: string;
  currentTitle: string;
  authorProfile?: UserProfileLite;
  onPostClick: (post: Post) => void;
  onLanternToggle: (postId: string | number) => void;
  onBookmarkToggle: (postId: string | number) => void;
  index?: number;
  userTrustScore?: number;
  isGuest: boolean; // 게스트 모드 여부 추가
}

export const PostCard = React.memo(
  ({
    post,
    userNickname,
    userProfileImage,
    userUid, // userUid 추가
    isLanterned,
    isBookmarked,
    timeAgo,
    createdAtText,
    currentTitle,
    authorProfile,
    onPostClick,
    onLanternToggle,
    onBookmarkToggle,
    index = 999,
    userTrustScore,
    isGuest, // 게스트 모드 여부 추가
  }: PostCardProps & { index?: number }) => {
    const isOwnPost = post.authorUid === userUid; // userUid로 비교
    // AI 답변이 있는 게시글은 moderationStatus와 상관없이 모더레이션 상태가 아니라고 간주
    const isAiPost = post.replies?.some((r) => r.isAi === true) === true;
    const isModerated = !isAiPost && post.moderationStatus && post.moderationStatus !== "approved";
    const isRejected = !isAiPost && post.moderationStatus === "rejected";

    const liveAuthorTitleId = authorProfile?.currentTitleId ?? null;
    const liveAuthorTitle = getTitleLabelById(liveAuthorTitleId);

    // 🔹 아바타 이미지 (post.authorAvatar 우선, 없으면 authorProfile, 구글 이미지 필터링)
    const postAuthorProfileImage = useMemo(() => {
      if (isOwnPost) {
        return userProfileImage ?? "";
      }
      // 다른 사람의 게시글: 실시간 프로필 우선, 없으면 post.authorAvatar (구글 이미지 필터링)
      return authorProfile?.profileImage ?? filterGoogleProfileImage(post.authorAvatar) ?? "";
    }, [isOwnPost, userProfileImage, authorProfile?.profileImage, post.authorAvatar]);

    const authorTitleFallback = getUserTitle(
      post.author ?? "",
      userNickname,
      currentTitle
    );

    // 🔹 삭제 여부(글 문서의 authorDeleted + users.isDeleted + 문자열 체크)
    const authorDeletedFlag =
      (post as any).authorDeleted === true ||
      post.author === "탈퇴한 사용자";

    const displayAuthorName = getDisplayName(post.author, authorDeletedFlag);
    const isAuthorDeleted = isDeletedAuthor(post.author, authorDeletedFlag);

    // 🔹 작성자 칭호 (post.authorTitleName 우선, 없으면 authorProfile)
    const authorTitle = isAuthorDeleted
      ? null
      : post.authorTitleName || liveAuthorTitle || authorTitleFallback;

    const handleCardClick = useCallback(() => {
      if (isModerated) { // moderation 중이거나 거부된 게시글 클릭 불가
        console.log("조정 중이거나 거부된 게시글입니다.");
        return;
      }
      onPostClick(post);
    }, [onPostClick, post, isModerated]);

    const handleLanternClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (isGuest || isModerated) { // 게스트 모드 시 제한 또는 moderation 중/거부 시 제한
          console.log("로그인 후 등불을 사용할 수 있거나 조정 중인 게시글입니다.");
          e.preventDefault();
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();

        // 현재 버튼이 클릭되었는지 확인
        const target = e.currentTarget;
        const buttonPostId = target.getAttribute('data-post-id');
        if (buttonPostId !== String(post.id)) {
          console.warn('등불 버튼 ID 불일치:', buttonPostId, post.id);
          return;
        }

        // 한 번만 실행되도록 보장
        if (target.hasAttribute('data-processing')) {
          return;
        }
        target.setAttribute('data-processing', 'true');

        setTimeout(() => {
          target.removeAttribute('data-processing');
        }, 1000);

        onLanternToggle(post.id);
      },
      [onLanternToggle, post.id, isGuest, isModerated] // isGuest, isModerated 의존성 추가
    );

    const handleBookmarkClick = useCallback(
      (e: React.MouseEvent) => {
        if (isGuest || isModerated) { // 게스트 모드 시 제한 또는 moderation 중/거부 시 제한
          console.log("로그인 후 북마크를 사용할 수 있거나 조정 중인 게시글입니다.");
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        onBookmarkToggle(post.id);
      },
      [onBookmarkToggle, post.id, isGuest, isModerated] // isGuest, isModerated 의존성 추가
    );

    // 현재 테마 확인 (useMemo로 최적화)
    const cardThemeClass = useMemo(() => {
      const currentTheme = typeof window !== "undefined"
        ? document.documentElement.getAttribute("data-theme") || "default"
        : "default";

      const themeClasses = {
        "midnight": "border-l-4 border-l-[#d4af37] shadow-md bg-card/90 hover:shadow-lg hover:border-l-[#e6c85a]",
        "e-ink": "border-l-2 border-l-[#5a564d] shadow-sm bg-card/98 border-t border-t-[#d4cfc2]/50",
        "golden-library": "bg-card/90 hover:shadow-lg",
        "default": "border-border/60 shadow-sm bg-card/80"
      };

      return themeClasses[currentTheme as keyof typeof themeClasses] || themeClasses.default;
    }, []);

    // 그리스 신전 테마 확인
    const isGreekTempleTheme = useMemo(() => {
      if (typeof window === "undefined") return false;
      const currentTheme = document.documentElement.getAttribute("data-theme") || "default";
      return currentTheme === "greek-temple";
    }, []);

    // 황금빛 서재 테마 확인
    const isGoldenLibraryTheme = useMemo(() => {
      if (typeof window === "undefined") return false;
      const currentTheme = document.documentElement.getAttribute("data-theme") || "default";
      return currentTheme === "golden-library";
    }, []);

    // 신뢰도 기반 기둥 스타일 결정
    // 자신의 게시물이면 자신의 신뢰도 사용, 아니면 작성자의 신뢰도 사용
    const authorTrustScore = isOwnPost ? userTrustScore : (authorProfile?.trustScore);
    const columnStyle = useMemo(() => {
      if (!isGreekTempleTheme) return null;
      return getColumnStyleByTrustScore(authorTrustScore);
    }, [isGreekTempleTheme, authorTrustScore]);

    // 신뢰도 기반 책장 레벨 결정 (황금빛 서재 테마용)
    // TODO: 향후 황금빛 서재 테마 구현 시 사용 예정
    // const bookShelfLevel = useMemo(() => {
    //   if (!isGoldenLibraryTheme) return null;
    //   return getBookShelfLevelByTrustScore(authorTrustScore);
    // }, [isGoldenLibraryTheme, authorTrustScore]);

    // 강조가 필요한 게시글인지 판단 (인기글, 길잡이 글, 내가 쓴 글 등)
    const isHighlighted = useMemo(() => {
      const lanternCount = post.lanterns ?? 0;
      const viewCount = post.views ?? 0;
      const isGuide = post.type === "guide";
      const isMyPostByNickname = post.author === userNickname; // 닉네임 비교 (UI 표시용)

      // 등불 10개 이상, 조회수 100 이상, 길잡이 글, 내가 쓴 글 중 하나라도 해당되면 강조
      return lanternCount >= 10 || viewCount >= 100 || isGuide || isMyPostByNickname;
    }, [post.lanterns, post.views, post.type, post.author, userNickname]);

    return (
      <Card
        className={`${cardThemeClass} backdrop-blur-sm transition-all cursor-pointer list-optimized relative ${isOwnPost && isGoldenLibraryTheme ? 'my-post-golden-border' : ''} ${isModerated ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={handleCardClick}
        data-highlighted={isHighlighted ? "true" : "false"}
        data-lanterns={post.lanterns ?? 0}
        data-views={post.views ?? 0}
        data-type={post.type || ""}
        data-is-owner={isOwnPost ? "true" : "false"} // userUid로 비교
      >
        {/* 그리스 신전 테마: 신뢰도 기반 기둥 장식 (왼쪽) */}
        {isGreekTempleTheme && columnStyle && (
          <div className="absolute left-0 top-0 bottom-0 w-1 flex items-center justify-center opacity-60">
            <div className="h-full flex items-center justify-center py-2">
              <GreekColumn style={columnStyle} size={16} className="text-primary/70" />
            </div>
          </div>
        )}
        <CardContent className="p-4 relative z-10">
          <div className="space-y-3">
            {/* 작성자 + 시간 */}
            <div className="flex items-center space-x-3">
              <OptimizedAvatar
                src={postAuthorProfileImage || undefined}
                alt={
                  displayAuthorName
                    ? `${displayAuthorName}님의 프로필`
                    : "프로필 이미지"
                }
                nickname={isAuthorDeleted ? undefined : displayAuthorName}
                fallbackText={displayAuthorName.charAt(0)?.toUpperCase() || "?"}
                className="w-10 h-10 ring-2 ring-border/20"
                size={40}
                loading={index < 3 ? "eager" : "lazy"}
                decoding="async"
              />
              <div className="w-full">
                <div className="flex flex-col">
                  {/* 윗줄: 닉네임 + 칭호 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center gap-1.5">
                        {/* 월계관 왕관 (그리스 신전 테마 + 신뢰도 70 이상) */}
                        {isGreekTempleTheme && authorTrustScore !== undefined && authorTrustScore >= 70 && (
                          <div className={`shrink-0 ${isGreekTempleTheme ? 'laurel-wreath-premium' : 'laurel-wreath'}`}>
                            <LaurelWreath size={14} isPremium={isGreekTempleTheme} />
                          </div>
                        )}
                        <p
                          className={
                            "text-sm font-medium " +
                            (isAuthorDeleted ? "text-muted-foreground" : "")
                          }
                        >
                          {displayAuthorName}
                        </p>
                      </div>
                      {authorTitle && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-2 py-0.5 h-auto bg-primary/10 text-primary border-primary/20"
                        >
                          {authorTitle}
                        </Badge>
                      )}
                      {/* moderationStatus 표시 */}
                      {isModerated && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] px-2 py-0.5 h-auto bg-red-500/10 text-red-500 border-red-500/20"
                        >
                          {isRejected ? "게시글 거부됨" : "검토 중"}
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

                  {/* 타입 / 카테고리 텍스트 (닉네임 아래, 배지 제거) */}
                  {(() => {
                    const parts = [
                      post.category && post.category !== "전체" ? post.category : null,
                      post.subCategory && post.subCategory !== "전체" ? post.subCategory : null,
                      post.type ? (post.type === "guide" ? "길잡이 글" : "질문글") : null,
                    ].filter(Boolean) as string[];
                    return parts.length ? (
                      <div className="text-xs text-muted-foreground mt-2">
                        {parts.join(" · ")}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>

            {/* 제목 + 내용 미리보기 */}
            <div className="space-y-2">
              <h3 className="font-medium text-base mb-1 line-clamp-1">
                {post.title}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {post.content}
              </p>
            </div>

            {/* 태그 (앞 2개만) */}
            {/* 목록에서는 태그 미표시 (상세에서만 표시) */}

            {/* 등불 / 댓글 / 조회수 / 북마크 */}
            <div
              className="flex items-center justify-between pt-2 border-t border-border/50 relative z-10"
              onClick={(e) => {
                e.stopPropagation();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-4 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                {/* 등불 */}
                {!isOwnPost ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleLanternClick}
                      data-post-id={post.id}
                      className={`h-8 px-2 space-x-1 ${isLanterned ? "text-amber-500" : "text-muted-foreground"
                        }`}
                      disabled={isGuest || isModerated} // 게스트 모드 시 비활성화 또는 moderation 중/거부 시 비활성화
                    >
                      {isLanterned ? (
                        <LanternFilledIcon className="w-4 h-4" />
                      ) : (
                        <LanternIcon className="w-4 h-4" />
                      )}
                      <span className="text-xs">{post.lanterns ?? 0}</span>
                    </Button>
                  </div>
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
              <div onClick={(e) => e.stopPropagation()}>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBookmarkClick}
                  className={`h-8 px-2 ${isBookmarked ? "text-primary" : "text-muted-foreground"
                    }`}
                  disabled={isGuest || isModerated} // 게스트 모드 시 비활성화 또는 moderation 중/거부 시 비활성화
                >
                  <Bookmark
                    className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""
                      }`}
                  />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  },
  (prev, next) => {
    // 최소한의 비교로 불필요한 리렌더 차단
    if (prev.post.id !== next.post.id) return false;
    if (prev.isLanterned !== next.isLanterned) return false;
    if (prev.isBookmarked !== next.isBookmarked) return false;
    if (prev.post.lanterns !== next.post.lanterns) return false;
    if ((prev.post.comments ?? prev.post.replies?.length) !== (next.post.comments ?? next.post.replies?.length)) return false;
    if (prev.post.views !== next.post.views) return false;
    if (prev.post.title !== next.post.title) return false;
    if (prev.post.content !== next.post.content) return false;
    if (prev.post.type !== next.post.type) return false;
    if (prev.post.author !== next.post.author) return false;
    if (prev.post.authorAvatar !== next.post.authorAvatar) return false;
    if ((prev.post.createdAt?.getTime?.() ?? 0) !== (next.post.createdAt?.getTime?.() ?? 0)) return false;
    const prevTags = prev.post.tags?.join(",") ?? "";
    const nextTags = next.post.tags?.join(",") ?? "";
    if (prevTags !== nextTags) return false;
    if (!isSameProfileShallow(prev.authorProfile, next.authorProfile)) return false;
    if (prev.timeAgo !== next.timeAgo) return false;
    if (prev.createdAtText !== next.createdAtText) return false;
    if (prev.currentTitle !== next.currentTitle) return false;
    if (prev.userProfileImage !== next.userProfileImage) return false;
    if (prev.userNickname !== next.userNickname) return false;
    if (prev.userUid !== next.userUid) return false; // userUid 비교 추가
    if (prev.post.moderationStatus !== next.post.moderationStatus) return false; // moderationStatus 비교 추가
    return true;
  }
);