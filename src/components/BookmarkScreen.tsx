import { useState, useCallback } from "react";
import { useScrollRestoration } from "./hooks/useScrollRestoration";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import {
  ArrowLeft,
  Bookmark,
  Search,
  MessageCircle,
  Compass
} from "lucide-react";
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

  // Scroll restoration
  const scrollRef = useScrollRestoration({ key: 'bookmarks' });

  // 1단계: 먼저 bookmarkedPostsList 계산
  const bookmarkedPostsList = posts.filter(post => bookmarkedPosts.has(String(post.id)));

  // 2단계: 그 다음 filteredBookmarks 계산
  const filteredBookmarks = bookmarkedPostsList.filter(post =>
    post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.author?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 3단계: 마지막으로 함수들 (이제 filteredBookmarks를 사용 가능)
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handlePostClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const postId = Number(e.currentTarget.dataset.postId);
    const post = posts.find(p => p.id === postId);
    if (post) {
      onPostSelect(post);
    }
  }, [posts, onPostSelect]);

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
        {filteredBookmarks.length === 0 ? (
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
            {filteredBookmarks.map((post) => (
              <Card key={post.id} className="cursor-pointer hover:shadow-md transition-shadow list-optimized">
                <CardContent
                  className="p-4"
                  data-post-id={post.id}
                  onClick={handlePostClick}
                >

                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <OptimizedAvatar
                          src={post.authorAvatar || undefined}
                          alt={post.author ? `${post.author}님의 프로필` : "프로필 이미지"}
                          fallbackText={post.author?.charAt(0)?.toUpperCase() || "?"}
                          className="w-8 h-8 flex-shrink-0"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-sm truncate">{post.author}</p>
                            {getAuthorTitle(post.author) && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0.5 flex-shrink-0">
                                {getAuthorTitle(post.author)}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                            <span>{post.timeAgo}</span>
                            <span>•</span>
                            <span>{post.category}</span>
                          </div>
                        </div>
                      </div>
                      <Bookmark className="w-4 h-4 text-primary fill-current flex-shrink-0" />
                    </div>

                    <div className="flex items-start space-x-2">
                      <div className="flex-shrink-0 mt-1">
                        {post.type === "question" ? (
                          <MessageCircle className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Compass className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <h3 className="font-medium line-clamp-2 leading-relaxed flex-1">{post.title}</h3>
                    </div>

                    {post.content && (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed pl-6">
                        {post.content}
                      </p>
                    )}

                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pl-6">
                        {post.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0.5">
                            #{tag}
                          </Badge>
                        ))}
                        {post.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                            +{post.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <LanternIcon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{post.lanterns}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{post.comments}</span>
                        </div>
                      </div>
                      <Badge
                        variant={post.type === "question" ? "secondary" : "default"}
                        className="text-xs"
                      >
                        {post.type === "question" ? "질문글" : "길잡이글"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}