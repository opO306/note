import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowLeft, Search } from "lucide-react";
import { Input } from "./ui/input";
import { useState, useCallback, useMemo } from "react";
import { useScrollRestoration } from "./hooks/useScrollRestoration";

// ✅ 메인 게시글 카드 UI + 프로필 동기화
import { PostCardsList } from "@/components/MainScreen/components/PostListView";
import { useUserProfiles } from "@/components/MainScreen/hooks/useUserProfiles";

interface Category {
  id: string;
  name: string;
  icon: any;
  count: number;
  subCategories: {
    id: string;
    name: string;
    count: number;
  }[];
}

interface CategoryScreenProps {
  onBack: () => void;
  categories: Category[];
  activeCategory: string;
  activeSubCategory: string;
  onCategorySelect: (categoryId: string, subCategoryId?: string) => void;
  posts: any[];
  onPostSelect: (post: any) => void;

  // ✅ 메인과 동일 UI/동기화를 위한 추가 props (없으면 기본값으로 동작)
  userNickname?: string;
  userProfileImage?: string;
  currentTitle?: string;

  isPostLanterned?: (postId: string | number) => boolean;
  isBookmarked?: (postId: string | number) => boolean;
  onLanternToggle?: (postId: string | number) => void;
  onBookmarkToggle?: (postId: string | number) => void;
  formatTimeAgo?: (date?: Date) => string;
  formatCreatedAt?: (date?: Date) => string;
  userUid?: string; // userUid 추가
}

export function CategoryScreen({
  onBack,
  categories,
  activeCategory,
  activeSubCategory,
  onCategorySelect,
  posts,
  onPostSelect,

  userNickname = "",
  userProfileImage = "",
  currentTitle = "",

  isPostLanterned,
  isBookmarked,
  onLanternToggle,
  onBookmarkToggle,
  formatTimeAgo,
  formatCreatedAt,
  userUid, // userUid 추가
}: CategoryScreenProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState<"category" | "post">("category");

  // Scroll restoration (카테고리 모드에서만 사용)
  const scrollRef = useScrollRestoration({ key: `category-${searchMode}` });

  const filteredCategories = categories.filter(
    (category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.subCategories.some((sub) =>
        sub.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const filteredPosts = posts.filter(
    (post) =>
      post.title?.toLowerCase?.().includes(searchTerm.toLowerCase()) ||
      post.content?.toLowerCase?.().includes(searchTerm.toLowerCase()) ||
      post.author?.toLowerCase?.().includes(searchTerm.toLowerCase()) ||
      (post.tags &&
        post.tags.some((tag: string) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        ))
  );

  const handleCategoryClick = useCallback(
    (categoryId: string) => {
      onCategorySelect(categoryId, "전체");
      onBack();
    },
    [onCategorySelect, onBack]
  );

  const handleSubCategoryClick = useCallback(
    (categoryId: string, subCategoryId: string) => {
      onCategorySelect(categoryId, subCategoryId);
      onBack();
    },
    [onCategorySelect, onBack]
  );

  const handleSearchTermChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    []
  );

  const handleCategoryModeClick = useCallback(() => {
    setSearchMode("category");
    setSearchTerm("");
  }, []);

  const handlePostModeClick = useCallback(() => {
    setSearchMode("post");
    setSearchTerm("");
  }, []);

  const handlePostClickWithBack = useCallback((post: any) => {
    // ✅ 글 상세로만 이동. 카테고리 화면은 닫지 않음.
    onPostSelect(post);
  }, [onPostSelect]);

  const handleCategoryDivClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const categoryId = e.currentTarget.dataset.categoryId;
      if (categoryId) handleCategoryClick(categoryId);
    },
    [handleCategoryClick]
  );

  const handleSubCategoryDivClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const categoryId = e.currentTarget.dataset.categoryId;
      const subCategoryId = e.currentTarget.dataset.subCategoryId;
      if (categoryId && subCategoryId) {
        handleSubCategoryClick(categoryId, subCategoryId);
      }
    },
    [handleSubCategoryClick]
  );

  // ✅ PostCardsList에 안전하게 넘길 기본 동작(부모에서 안 주면 기능 off)
  const safeIsPostLanterned = useCallback(
    (postId: string | number) => (isPostLanterned ? isPostLanterned(postId) : false),
    [isPostLanterned]
  );

  const safeIsBookmarked = useCallback(
    (postId: string | number) => (isBookmarked ? isBookmarked(postId) : false),
    [isBookmarked]
  );

  const safeOnLanternToggle = useCallback(
    (postId: string | number) => {
      onLanternToggle?.(postId);
    },
    [onLanternToggle]
  );

  const safeOnBookmarkToggle = useCallback(
    (postId: string | number) => {
      onBookmarkToggle?.(postId);
    },
    [onBookmarkToggle]
  );

  const safeFormatTimeAgo = useCallback(
    (date?: Date) => (formatTimeAgo ? formatTimeAgo(date) : ""),
    [formatTimeAgo]
  );

  const safeFormatCreatedAt = useCallback(
    (date?: Date) => (formatCreatedAt ? formatCreatedAt(date) : ""),
    [formatCreatedAt]
  );

  // ✅ 글 검색 결과 작성자 UID 수집 → 프로필/칭호 동기화
  const postSearchAuthorUids = useMemo(() => {
    const uids = new Set<string>();
    filteredPosts.forEach((post) => {
      if (typeof post?.authorUid === "string" && post.authorUid.length > 0) {
        uids.add(post.authorUid);
      }
    });
    return Array.from(uids);
  }, [filteredPosts]);

  const postSearchUserProfiles = useUserProfiles(postSearchAuthorUids);

  return (
    <div className="w-full h-full bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="bg-card/95 backdrop-blur-xl border-b border-border flex-shrink-0 safe-top">
        <div className="px-4 py-3">
          <div className="flex items-center space-x-3 mb-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-medium">카테고리 선택</h1>
          </div>

          {/* Search Mode Toggle */}
          <div className="flex space-x-2 mb-3">
            <Button
              variant={searchMode === "category" ? "default" : "outline"}
              size="sm"
              onClick={handleCategoryModeClick}
              className="flex-1"
            >
              카테고리 검색
            </Button>
            <Button
              variant={searchMode === "post" ? "default" : "outline"}
              size="sm"
              onClick={handlePostModeClick}
              className="flex-1"
            >
              글 검색
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={
                searchMode === "category"
                  ? "카테고리 검색..."
                  : "글 제목, 내용, 작성자 검색..."
              }
              value={searchTerm}
              onChange={handleSearchTermChange}
              className="pl-10 h-9"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      {searchMode === "category" ? (
        // ✅ 기존 카테고리 모드: 스크롤 복원 + 카드 리스트 그대로 유지
        <div ref={scrollRef} className="flex-1 scroll-container scrollbar-hide">
          <div className="p-4 space-y-4">
            {filteredCategories.map((category) => {
              const CategoryIcon = category.icon;
              const isActive = activeCategory === category.id;

              return (
                <Card
                  key={category.id}
                  className={`transition-all list-optimized ${isActive ? "ring-2 ring-primary" : ""
                    }`}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Main Category */}
                      <div
                        className="flex items-center justify-between cursor-pointer hover:bg-accent/50 p-3 rounded-md -m-2 touch-target"
                        data-category-id={category.id}
                        onClick={handleCategoryDivClick}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                            <CategoryIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-medium">{category.name}</h3>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {isActive && (
                            <Badge variant="default" className="text-xs">
                              선택됨
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs tabular-nums">
                            {category.count}
                          </Badge>
                        </div>
                      </div>

                      {/* Sub Categories - 전체 카테고리가 아닌 경우에만 표시 */}
                      {category.id !== "전체" && category.subCategories.length > 1 && (
                        <div className="ml-4 space-y-2">
                          <div className="border-l-2 border-border pl-4 space-y-2">
                            {category.subCategories
                              .filter((sub) => sub.id !== "전체")
                              .filter(
                                (sub) =>
                                  searchTerm === "" ||
                                  sub.name.toLowerCase().includes(searchTerm.toLowerCase())
                              )
                              .map((subCategory) => {
                                const isSubActive =
                                  isActive && activeSubCategory === subCategory.id;

                                return (
                                  <div
                                    key={subCategory.id}
                                    className={`flex items-center justify-between cursor-pointer hover:bg-accent/50 p-3 rounded-md transition-colors touch-target ${isSubActive ? "bg-accent" : ""
                                      }`}
                                    data-category-id={category.id}
                                    data-sub-category-id={subCategory.id}
                                    onClick={handleSubCategoryDivClick}
                                  >
                                    <div>
                                      <p className="text-sm font-medium">{subCategory.name}</p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {isSubActive && (
                                        <Badge variant="default" className="text-xs">
                                          선택됨
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredCategories.length === 0 && searchTerm && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">검색된 카테고리가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        // ✅ 글 검색 모드: Virtuoso(100% height)가 렌더되도록 부모 높이 확정
        <div className="flex-1 overflow-hidden bg-background">
          {filteredPosts.length > 0 ? (
            <PostCardsList
              posts={filteredPosts}
              userNickname={userNickname}
              userProfileImage={userProfileImage}
              isPostLanterned={safeIsPostLanterned}
              isBookmarked={safeIsBookmarked}
              currentTitle={currentTitle}
              userProfiles={postSearchUserProfiles}
              formatTimeAgo={safeFormatTimeAgo}
              formatCreatedAt={safeFormatCreatedAt}
              onPostClick={handlePostClickWithBack}
              onLanternToggle={safeOnLanternToggle}
              onBookmarkToggle={safeOnBookmarkToggle}
              userUid={userUid || ""} // userUid 추가 (기본값 설정)
            />
          ) : searchTerm ? (
            <div className="h-full flex items-center justify-center p-4">
              <p className="text-muted-foreground">검색된 글이 없습니다.</p>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-4">
              <p className="text-muted-foreground">검색어를 입력해주세요.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
