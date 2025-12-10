import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowLeft, Search, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { LanternFilledIcon } from "./icons/Lantern";
import { Input } from "./ui/input";
import { useState, useCallback } from "react";
import { useScrollRestoration } from "./hooks/useScrollRestoration";

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
}

export function CategoryScreen({
  onBack,
  categories,
  activeCategory,
  activeSubCategory,
  onCategorySelect,
  posts,
  onPostSelect
}: CategoryScreenProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState<"category" | "post">("category");

  // Scroll restoration
  const scrollRef = useScrollRestoration({ key: `category-${searchMode}` });

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.subCategories.some(sub =>
      sub.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (post.tags && post.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const handleCategoryClick = useCallback((categoryId: string) => {
    onCategorySelect(categoryId, "전체");
    onBack();
  }, [onCategorySelect, onBack]);

  const handleSubCategoryClick = useCallback((categoryId: string, subCategoryId: string) => {
    onCategorySelect(categoryId, subCategoryId);
    onBack();
  }, [onCategorySelect, onBack]);

  const handleSearchTermChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleCategoryModeClick = useCallback(() => {
    setSearchMode("category");
    setSearchTerm("");
  }, []);

  const handlePostModeClick = useCallback(() => {
    setSearchMode("post");
    setSearchTerm("");
  }, []);

  const handlePostClickWithBack = useCallback((post: any) => {
    onPostSelect(post);
    onBack();
  }, [onPostSelect, onBack]);

  const handleCategoryDivClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const categoryId = e.currentTarget.dataset.categoryId;
    if (categoryId) {
      handleCategoryClick(categoryId);
    }
  }, [handleCategoryClick]);

  const handleSubCategoryDivClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const categoryId = e.currentTarget.dataset.categoryId;
    const subCategoryId = e.currentTarget.dataset.subCategoryId;
    if (categoryId && subCategoryId) {
      handleSubCategoryClick(categoryId, subCategoryId);
    }
  }, [handleSubCategoryClick]);

  const handlePostCardClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const postId = Number(e.currentTarget.dataset.postId);
    const post = posts.find(p => p.id === postId);
    if (post) {
      handlePostClickWithBack(post);
    }
  }, [posts, handlePostClickWithBack]);

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
              placeholder={searchMode === "category" ? "카테고리 검색..." : "글 제목, 내용, 작성자 검색..."}
              value={searchTerm}
              onChange={handleSearchTermChange}
              className="pl-10 h-9"
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 scroll-container scrollbar-hide">
        <div className="p-4 space-y-4">
          {searchMode === "category" ? (
            // Category Search Results
            <>
              {filteredCategories.map((category) => {
                const CategoryIcon = category.icon;
                const isActive = activeCategory === category.id;

                return (
                  <Card key={category.id} className={`transition-all list-optimized ${isActive ? 'ring-2 ring-primary' : ''}`}>
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
                                .filter(sub => sub.id !== "전체")
                                .filter(sub =>
                                  searchTerm === "" ||
                                  sub.name.toLowerCase().includes(searchTerm.toLowerCase())
                                )
                                .map((subCategory) => {
                                  const isSubActive = isActive && activeSubCategory === subCategory.id;

                                  return (
                                    <div
                                      key={subCategory.id}
                                      className={`flex items-center justify-between cursor-pointer hover:bg-accent/50 p-3 rounded-md transition-colors touch-target ${isSubActive ? 'bg-accent' : ''
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
            </>
          ) : (
            // Post Search Results
            <>
              {filteredPosts.map((post) => (
                <Card
                  key={post.id}
                  className="cursor-pointer hover:shadow-md transition-shadow list-optimized"
                  data-post-id={post.id}
                  onClick={handlePostCardClick}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                              {post.author.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{post.author}</p>
                            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                              <span>{post.timeAgo}</span>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">
                                {post.subCategory}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium mb-2">{post.title}</h3>
                        <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
                          {post.content}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <LanternFilledIcon className="w-4 h-4 text-amber-500" />
                            <span className="text-sm text-muted-foreground">{post.lanterns}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{post.comments}</span>
                          </div>
                        </div>

                        {post.tags && post.tags.length > 0 && (
                          <div className="flex space-x-1">
                            {post.tags.slice(0, 2).map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredPosts.length === 0 && searchTerm && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">검색된 글이 없습니다.</p>
                </div>
              )}

              {searchTerm === "" && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">검색어를 입력해주세요.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}