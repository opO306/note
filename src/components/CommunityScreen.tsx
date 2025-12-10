import { useState, useCallback } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Heart, MessageCircle, Share2, Search, Plus, TrendingUp, Users, BookOpen } from "lucide-react";

interface CommunityScreenProps {
  userNickname: string;
  onLogout: () => void;
}

export function CommunityScreen({ userNickname, onLogout }: CommunityScreenProps) {
  const [activeTab, setActiveTab] = useState("feed");
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleTabClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const tabId = e.currentTarget.dataset.tabId;
    if (tabId) {
      setActiveTab(tabId);
    }
  }, []);

  const posts = [
    {
      id: 1,
      author: "철학탐구자42",
      timeAgo: "2시간 전",
      content: "플라톤의 동굴 이론을 현대의 SNS와 연결해서 생각해보면 어떨까요? 우리가 보는 것들이 진짜 현실일까요?",
      likes: 23,
      comments: 8,
      tags: ["철학", "플라톤", "현실"]
    },
    {
      id: 2,
      author: "수학러버",
      timeAgo: "4시간 전",
      content: "∫ 적분의 개념을 일상생활에서 찾아볼 수 있는 예시들을 모아보고 있어요. 누적된 경험이나 시간의 흐름도 일종의 적분 같다고 생각해요.",
      likes: 31,
      comments: 12,
      tags: ["수학", "적분", "일상"]
    },
    {
      id: 3,
      author: "질문하는사람",
      timeAgo: "6시간 전",
      content: "왜 우리는 질문을 할까요? 질문 자체가 인간의 본질적 특성일까요? 🤔",
      likes: 18,
      comments: 15,
      tags: ["질문", "철학", "본질"]
    }
  ];

  const trendingTopics = [
    { name: "철학적사고", count: 127 },
    { name: "수학의미학", count: 89 },
    { name: "질문의힘", count: 156 },
    { name: "지식공유", count: 73 }
  ];

  return (
    <div className="h-full bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-mono text-gray-900">비유노트</h1>
            <div className="flex items-center space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-sm bg-gradient-to-br from-gray-700 to-black text-white">
                  {userNickname.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogout}
                className="text-gray-600 hover:text-gray-900"
              >
                로그아웃
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="질문이나 주제를 검색해보세요..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10 bg-gray-100 border-gray-200 font-mono"
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-white/70 backdrop-blur-sm p-1 rounded-lg border border-gray-200">
          {[
            { id: "feed", label: "피드", icon: TrendingUp },
            { id: "community", label: "커뮤니티", icon: Users },
            { id: "study", label: "학습", icon: BookOpen }
          ].map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              className={`flex-1 font-mono ${activeTab === tab.id
                ? "bg-gradient-to-r from-black to-gray-800 text-white"
                : "text-gray-600 hover:text-gray-900"
                }`}
              data-tab-id={tab.id}
              onClick={handleTabClick}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Create Post */}
        <Card className="bg-white/90 backdrop-blur-sm border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-gradient-to-br from-gray-700 to-black text-white">
                  {userNickname.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Input
                  placeholder="어떤 생각을 나누고 싶으신가요?"
                  className="border-gray-200 font-mono"
                />
              </div>
              <Button
                size="sm"
                className="bg-gradient-to-r from-black to-gray-800 font-mono"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Trending Topics */}
        <Card className="bg-white/90 backdrop-blur-sm border border-gray-200">
          <CardHeader className="pb-3">
            <h2 className="font-mono text-gray-900">트렌딩 주제</h2>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {trendingTopics.map((topic) => (
                <Badge
                  key={topic.name}
                  variant="secondary"
                  className="bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer font-mono"
                >
                  #{topic.name} ({topic.count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Posts */}
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="bg-white/90 backdrop-blur-sm border border-gray-200 hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Post Header */}
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-800 text-white text-sm">
                        {post.author.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-mono text-sm text-gray-900">{post.author}</p>
                      <p className="text-xs text-gray-500">{post.timeAgo}</p>
                    </div>
                  </div>

                  {/* Post Content */}
                  <p className="text-gray-700 leading-relaxed">{post.content}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {post.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-xs border-gray-300 text-gray-600 font-mono"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Post Actions */}
                  <div className="flex items-center space-x-6 pt-2">
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-red-500 font-mono">
                      <Heart className="w-4 h-4 mr-1" />
                      {post.likes}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-blue-500 font-mono">
                      <MessageCircle className="w-4 h-4 mr-1" />
                      {post.comments}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-500 hover:text-green-500 font-mono">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Philosophy Quote */}
        <Card className="bg-gradient-to-r from-gray-800 to-black text-white border-0">
          <CardContent className="p-6 text-center">
            <p className="italic font-light mb-2">"비유는 암기 할려하지 말자 이해하자"</p>
            <p className="text-xs text-gray-300 font-mono">비유노트 커뮤니티와 함께 생각해보세요</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}