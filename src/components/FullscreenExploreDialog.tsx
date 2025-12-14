import { useState, useCallback, useMemo } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Card, CardContent } from "./ui/card";
import { LanternFilledIcon } from "./icons/Lantern";
import {
  Search, Hash, BookOpen, Users, PenTool, Cog, Globe,
  TrendingUp, Flame
} from "lucide-react";

interface FullscreenExploreDialogProps {
  children: React.ReactNode;
  onCategorySelect: (categoryId: string, subCategoryId?: string) => void;
}

const allCategories = [
  {
    id: "전체",
    name: "전체",
    icon: Globe,
    count: 578,
    color: "bg-blue-500",
    description: "모든 분야의 지식 탐구"
  },
  {
    id: "공학",
    name: "공학",
    icon: Cog,
    count: 124,
    color: "bg-green-500",
    description: "기술과 혁신의 최전선",
    subCategories: [
      { id: "소프트웨어", name: "소프트웨어", count: 45 },
      { id: "기계공학", name: "기계공학", count: 28 },
      { id: "전자공학", name: "전자공학", count: 32 },
      { id: "건축공학", name: "건축공학", count: 19 }
    ]
  },
  {
    id: "과학",
    name: "과학",
    icon: Hash,
    count: 156,
    color: "bg-purple-500",
    description: "자연의 법칙과 현상 탐구",
    subCategories: [
      { id: "물리학", name: "물리학", count: 45 },
      { id: "화학", name: "화학", count: 32 },
      { id: "생물학", name: "생물학", count: 38 },
      { id: "지구과학", name: "지구과학", count: 25 },
      { id: "천문학", name: "천문학", count: 16 }
    ]
  },
  {
    id: "수학",
    name: "수학",
    icon: BookOpen,
    count: 89,
    color: "bg-orange-500",
    description: "논리와 추상적 사고의 세계",
    subCategories: [
      { id: "대수학", name: "대수학", count: 23 },
      { id: "기하학", name: "기하학", count: 19 },
      { id: "해석학", name: "해석학", count: 21 },
      { id: "통계학", name: "통계학", count: 15 },
      { id: "이산수학", name: "이산수학", count: 11 }
    ]
  },
  {
    id: "예술",
    name: "예술",
    icon: Users,
    count: 67,
    color: "bg-pink-500",
    description: "창의성과 감성의 표현",
    subCategories: [
      { id: "미술", name: "미술", count: 28 },
      { id: "음악", name: "음악", count: 22 },
      { id: "문학", name: "문학", count: 17 }
    ]
  },
  {
    id: "철학",
    name: "철학",
    icon: PenTool,
    count: 42,
    color: "bg-indigo-500",
    description: "존재와 사고의 근본 탐구",
    subCategories: [
      { id: "동양철학", name: "동양철학", count: 18 },
      { id: "서양철학", name: "서양철학", count: 24 }
    ]
  }
];

const trendingTopics = [
  { name: "인공지능", count: 89, trend: "+12%" },
  { name: "양자컴퓨터", count: 67, trend: "+8%" },
  { name: "기후변화", count: 54, trend: "+15%" },
  { name: "메타버스", count: 43, trend: "+5%" },
  { name: "블록체인", count: 38, trend: "+3%" }
];

const popularPosts = [
  {
    id: 1,
    title: "머신러닝 알고리즘의 편향성 문제",
    author: "AI개발자99",
    category: "공학",
    lanterns: 192,
    timeAgo: "1시간 전"
  },
  {
    id: 2,
    title: "양자역학과 관찰자 효과의 철학적 의미",
    author: "과학탐험가",
    category: "과학",
    lanterns: 156,
    timeAgo: "3시간 전"
  },
  {
    id: 3,
    title: "일상 속에서 발견하는 수학적 아름다움",
    author: "수학러버",
    category: "수학",
    lanterns: 134,
    timeAgo: "5시간 전"
  }
];

export function FullscreenExploreDialog({ children, onCategorySelect }: FullscreenExploreDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("categories");

  // 검색어(소문자 + 앞뒤 공백 제거)
  const normalizedQuery = searchQuery.trim().toLowerCase();

  // 카테고리 필터링
  const filteredCategories = useMemo(
    () =>
      allCategories.filter((category) => {
        if (!normalizedQuery) return true; // 검색어 없으면 전부 표시

        const nameMatch = category.name
          .toLowerCase()
          .includes(normalizedQuery);
        const descriptionMatch = category.description
          .toLowerCase()
          .includes(normalizedQuery);

        const subMatch =
          category.subCategories?.some((sub) =>
            sub.name.toLowerCase().includes(normalizedQuery),
          ) ?? false;

        return nameMatch || descriptionMatch || subMatch;
      }),
    [normalizedQuery],   // ✅ allCategories 제거
  );

  // 트렌딩 토픽 필터링
  const filteredTrendingTopics = useMemo(
    () =>
      trendingTopics.filter((topic) => {
        if (!normalizedQuery) return true;

        return topic.name.toLowerCase().includes(normalizedQuery);
      }),
    [normalizedQuery],   // ✅ trendingTopics 제거
  );

  // 인기글 필터링
  const filteredPopularPosts = useMemo(
    () =>
      popularPosts.filter((post) => {
        if (!normalizedQuery) return true;

        return (
          post.title.toLowerCase().includes(normalizedQuery) ||
          post.category.toLowerCase().includes(normalizedQuery)
        );
      }),
    [normalizedQuery],   // ✅ popularPosts 제거
  );

  const handleCategorySelect = useCallback((categoryId: string, subCategoryId?: string) => {
    onCategorySelect(categoryId, subCategoryId);
    setIsOpen(false);
  }, [onCategorySelect]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleTabClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const tab = e.currentTarget.dataset.tab;
    if (tab) {
      setActiveTab(tab);
    }
  }, []);

  const handleCategoryCardClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const categoryId = e.currentTarget.dataset.categoryId;
    if (categoryId) {
      handleCategorySelect(categoryId);
    }
  }, [handleCategorySelect]);

  const handleSubCategoryClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const categoryId = e.currentTarget.dataset.categoryId;
    const subCategoryId = e.currentTarget.dataset.subCategoryId;
    if (categoryId && subCategoryId) {
      handleCategorySelect(categoryId, subCategoryId);
    }
  }, [handleCategorySelect]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="w-[350px] h-[750px] max-w-[350px] max-h-[750px] p-0">
        <div className="flex flex-col h-full">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>탐색</DialogTitle>
            <DialogDescription>카테고리별 콘텐츠, 트렌딩 토픽, 인기 게시글을 탐색할 수 있습니다.</DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="관심있는 주제를 검색해보세요..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b">
            <Button
              variant={activeTab === "categories" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 rounded-none"
              data-tab="categories"
              onClick={handleTabClick}
            >
              카테고리
            </Button>
            <Button
              variant={activeTab === "trending" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 rounded-none"
              data-tab="trending"
              onClick={handleTabClick}
            >
              트렌딩
            </Button>
            <Button
              variant={activeTab === "popular" ? "secondary" : "ghost"}
              size="sm"
              className="flex-1 rounded-none"
              data-tab="popular"
              onClick={handleTabClick}
            >
              인기글
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
            {activeTab === "categories" && (
              <div className="space-y-3">
                {filteredCategories.map((category) => (
                  <Card
                    key={category.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    data-category-id={category.id}
                    onClick={handleCategoryCardClick}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className={`w-10 h-10 ${category.color} rounded-lg flex items-center justify-center`}>
                          <category.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium">{category.name}</h3>
                            <Badge variant="secondary" className="text-xs">
                              {category.count}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{category.description}</p>
                        </div>
                      </div>

                      {category.subCategories && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {category.subCategories.slice(0, 3).map((sub) => (
                            <Badge
                              key={sub.id}
                              variant="outline"
                              className="text-xs cursor-pointer hover:bg-accent"
                              data-category-id={category.id}
                              data-sub-category-id={sub.id}
                              onClick={handleSubCategoryClick}
                            >
                              {sub.name} ({sub.count})
                            </Badge>
                          ))}
                          {category.subCategories.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{category.subCategories.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === "trending" && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <h3 className="font-medium">실시간 트렌딩 토픽</h3>
                </div>
                {filteredTrendingTopics.map((topic, index) => (
                  <Card key={topic.name} className="hover:bg-accent cursor-pointer">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded text-xs">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{topic.name}</p>
                            <p className="text-xs text-muted-foreground">{topic.count}개 게시글</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-green-600 text-xs">
                          {topic.trend}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {activeTab === "popular" && (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 mb-4">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <h3 className="font-medium">인기 게시글</h3>
                </div>
                {filteredPopularPosts.map((post) => (
                  <Card key={post.id} className="hover:bg-accent cursor-pointer">
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {post.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{post.timeAgo}</span>
                        </div>
                        <h4 className="font-medium text-sm line-clamp-2">{post.title}</h4>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Avatar className="w-5 h-5">
                              <AvatarFallback className="text-xs">
                                {post.author.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">{post.author}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <LanternFilledIcon className="w-3 h-3 text-amber-500" />
                            <span className="text-xs text-amber-600">{post.lanterns}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}