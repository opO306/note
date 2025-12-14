import React, { useState, useCallback, useMemo, useDeferredValue, useEffect } from "react";
import { useScrollRestoration } from "./hooks/useScrollRestoration";
import { useStabilizedList } from "./hooks/useStabilizedList";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { ArrowLeft, Bookmark, Search, MessageCircle } from "lucide-react";
import { LanternIcon } from "./icons/Lantern";
import { getUserTitle as getTitleLabel } from "../data/titleData";

interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
  authorAvatar?: string;
  timeAgo: string;
  category: string;
  lanterns: number;
  comments: number;
  type: "question" | "guide";
  tags?: string[];
}

interface BookmarkScreenProps {
  onBack: () => void;
  bookmarkedPosts: Set<string>;
  posts: Post[];
  onPostSelect: (post: Post) => void;

  // ✅ 현재 로그인한 사용자 정보 (칭호 표시용)
  userNickname: string;
  currentTitle: string;
}

export function BookmarkScreen({
  onBack,
  bookmarkedPosts,
  posts,
  onPostSelect,
  userNickname,
  currentTitle,
}: BookmarkScreenProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);

  // 로딩/깜빡임 최소화를 위한 이전 데이터 보존
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  // Scroll restoration
  const scrollRef = useScrollRestoration({ key: "bookmarks" });

  // 숨김 처리된 글 제거
  const visiblePosts = useMemo(
    () => posts.filter((post) => !((post as any).hidden === true)),
    [posts]
  );

  // 1단계: 먼저 bookmarkedPostsList 계산 (메모)
  const bookmarkedPostsList = useMemo(
    () => visiblePosts.filter((post) => bookmarkedPosts.has(String(post.id))),
    [visiblePosts, bookmarkedPosts]
  );

  // 2단계: 그 다음 filteredBookmarks 계산 (메모 + 지연 검색어)
  const normalizedSearch = useMemo(
    () => deferredSearch.trim().toLowerCase(),
    [deferredSearch],
  );

  const filteredBookmarks = useMemo(
    () =>
      bookmarkedPostsList.filter((post) => {
        if (!normalizedSearch) return true;
        const title = post.title?.toLowerCase() ?? "";
        const content = post.content?.toLowerCase() ?? "";
        const author = post.author?.toLowerCase() ?? "";
        return (
          title.includes(normalizedSearch) ||
          content.includes(normalizedSearch) ||
          author.includes(normalizedSearch)
        );
      }),
    [bookmarkedPostsList, normalizedSearch]
  );

  // 최초 데이터 도착 여부
  useEffect(() => {
    if (bookmarkedPostsList.length > 0 || visiblePosts.length > 0) {
      setHasLoadedOnce(true);
    }
  }, [bookmarkedPostsList.length, visiblePosts.length]);

  // 데이터가 로딩 중일 때만 직전 목록 유지 (실제 빈 상태는 그대로 보여줌)
  const { visible: visibleBookmarks } = useStabilizedList(
    filteredBookmarks,
    !hasLoadedOnce && bookmarkedPosts.size > 0 && visiblePosts.length === 0
  );

  // 3단계: 마지막으로 함수들 (이제 filteredBookmarks를 사용 가능)
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // 빠른 조회용 맵 (id -> Post) 메모
  const postMap = useMemo(
    () => new Map(visiblePosts.map((p) => [p.id, p])),
    [visiblePosts]
  );

  const handlePostSelect = useCallback(
    (postId: number) => {
      const post = postMap.get(postId);
      if (post) {
        onPostSelect(post);
      }
    },
    [postMap, onPostSelect]
  );

  // ✅ 공용 헬퍼를 사용해서 "내가 쓴 글"일 때만 내 칭호를 표시
  const getAuthorTitle = useCallback(
    (author: string | undefined) =>
      getTitleLabel(author, userNickname, currentTitle),
    [userNickname, currentTitle]
  );

  return (
    <div className="w-full h-full bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="bg-card/95 backdrop-blur-xl border-b border-border flex-shrink-0 safe-top">
        <div className="px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <Bookmark className="w-5 h-5 text-primary" />
              <h1 className="font-medium">북마크</h1>
            </div>
            <Badge variant="secondary" className="ml-auto">
              {bookmarkedPostsList.length}개
            </Badge>
          </div>
        </div>
      </header>

      {/* Search */}
      <div className="border-b border-border p-4 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="북마크한 글 검색..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 scroll-container">
        {/* 로딩 초기 단계에서는 스켈레톤 표시로 깜빡임 최소화 */}
        {!hasLoadedOnce && bookmarkedPosts.size > 0 && posts.length === 0 ? (
          <div className="p-4 pb-24 space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Card key={idx} className="border border-border/60 bg-card/60">
                <CardContent className="p-4 space-y-3 animate-pulse">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-muted/50" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/3 bg-muted/50 rounded" />
                      <div className="h-3 w-1/4 bg-muted/40 rounded" />
                    </div>
                  </div>
                  <div className="h-4 w-3/4 bg-muted/40 rounded" />
                  <div className="h-3 w-full bg-muted/30 rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : visibleBookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8">
            <div className="text-center space-y-4">
              {bookmarkedPostsList.length === 0 ? (
                <>
                  {/* Empty bookmark state with visual icon */}
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-blue-500/30 dark:bg-blue-400/30 blur-2xl rounded-full"></div>
                    <div className="relative w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center border-4 border-blue-400 dark:border-blue-600 shadow-lg mx-auto">
                      <Bookmark className="w-14 h-14 text-blue-900 dark:text-blue-200" strokeWidth={2.5} />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">북마크한 글이 없습니다</h3>
                    <p className="text-sm text-muted-foreground">
                      관심 있는 글들을 북마크해서 나중에 다시 읽어보세요
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Search empty state */}
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-slate-500/30 dark:bg-slate-400/30 blur-2xl rounded-full"></div>
                    <div className="relative w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700/40 flex items-center justify-center border-4 border-slate-400 dark:border-slate-600 shadow-lg mx-auto">
                      <Search className="w-14 h-14 text-slate-900 dark:text-slate-200" strokeWidth={2.5} />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">검색 결과가 없습니다</h3>
                    <p className="text-sm text-muted-foreground">
                      다른 검색어를 시도해보세요
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 pb-24 space-y-3">
            {visibleBookmarks.map((post) => (
              <BookmarkCard
                key={post.id}
                post={post}
                onSelect={handlePostSelect}
                getAuthorTitle={getAuthorTitle}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface BookmarkCardProps {
  post: Post;
  onSelect: (postId: number) => void;
  getAuthorTitle: (author: string | undefined) => string | undefined;
}

const BookmarkCard = React.memo(
  ({ post, onSelect, getAuthorTitle }: BookmarkCardProps) => {
    const handleClick = useCallback(() => {
      onSelect(post.id);
    }, [onSelect, post.id]);

    const authorTitle = getAuthorTitle(post.author);
    const isBookmarked = true; // 북마크 화면이므로 항상 북마크 상태

    return (
      <Card
        className="border-border/60 shadow-sm bg-card/80 backdrop-blur-sm hover:shadow-md transition-shadow cursor-pointer list-optimized"
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* 상단: 작성자/칭호 + 시간 + 북마크 */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <OptimizedAvatar
                  src={post.authorAvatar || undefined}
                  alt={post.author ? `${post.author}님의 프로필` : "프로필 이미지"}
                  fallbackText={post.author?.charAt(0)?.toUpperCase() || "?"}
                  className="ring-2 ring-border/20"
                  size={40}
                  loading="lazy"
                  decoding="async"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-sm truncate">{post.author}</p>
                    {authorTitle && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-2 py-0.5 h-auto bg-primary/10 text-primary border-primary/20"
                      >
                        {authorTitle}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                    {(post.timeAgo || (post as any).createdAtText) && (
                      <span title={(post as any).createdAtText || post.category}>
                        {post.timeAgo ?? (post as any).createdAtText}
                      </span>
                    )}
                  </div>
                  {(() => {
                    const parts = [
                      post.category && post.category !== "전체" ? post.category : null,
                      (post as any).subCategory && (post as any).subCategory !== "전체"
                        ? (post as any).subCategory
                        : null,
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
              <Bookmark
                className={`w-4 h-4 ${isBookmarked ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`}
              />
            </div>

            {/* 제목/내용 */}
            <div>
              <h3 className="font-medium text-base mb-1 line-clamp-1">{post.title}</h3>
              {post.content && (
                <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
              )}
            </div>

            {/* 목록에서는 태그 미표시 (상세에서만 표시) */}

            {/* 하단 메타: 등불/댓글/조회수 */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <LanternIcon className="w-4 h-4 text-amber-500" />
                  <span>{post.lanterns ?? 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageCircle className="w-4 h-4" />
                  <span>{post.comments ?? 0}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/60 inline-block" />
                  <span>{(post as any).views ?? 0} 조회</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  },
  (prev, next) => {
    if (prev.post.id !== next.post.id) return false;
    if (prev.post.title !== next.post.title) return false;
    if (prev.post.content !== next.post.content) return false;
    if (prev.post.author !== next.post.author) return false;
    if (prev.post.authorAvatar !== next.post.authorAvatar) return false;
    if (prev.post.timeAgo !== next.post.timeAgo) return false;
    if (prev.post.category !== next.post.category) return false;
    if (prev.post.type !== next.post.type) return false;
    if (prev.post.lanterns !== next.post.lanterns) return false;
    if (prev.post.comments !== next.post.comments) return false;
    const prevTags = prev.post.tags?.join(",") ?? "";
    const nextTags = next.post.tags?.join(",") ?? "";
    if (prevTags !== nextTags) return false;
    return true;
  }
);