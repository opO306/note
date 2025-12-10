import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { LanternFilledIcon } from "./icons/Lantern";
import { toast } from "@/toastHelper";
import {
  ArrowLeft,
  Star,
  Award,
  Sparkles,
  Compass,
  BookOpen,
  Mountain,
  Check,
  Lock,
} from "lucide-react";

interface TitleShopProps {
  onBack: () => void;
  userPostLanterns: number;
  userReplyLanterns: number;
  userGuideCount: number;
  userLumens: number;
  ownedTitles: string[];
  currentTitle: string;
  onTitlePurchase: (titleId: string, cost: number) => void;
  onTitleEquip: (titleId: string) => void;
}

interface Title {
  id: string;
  name: string;
  description: string;
  cost: number;
  tier: number;
  icon: any;
  requiredReplyLanterns: number;
  requiredGuideCount: number;
  color: string;
}

export function TitleShop({
  onBack,
  userReplyLanterns,
  userGuideCount,
  userLumens,
  ownedTitles,
  currentTitle,
  onTitlePurchase,
  onTitleEquip,
}: TitleShopProps) {
  const titles: Title[] = [
    // ===== 길잡이 계열 =====
    {
      id: "guide_sprout",
      name: "길잡이 꿈나무",
      description: "길잡이의 씨앗이 막 싹튼 초심자",
      cost: 0,
      tier: 1,
      icon: Star,
      requiredReplyLanterns: 0,
      requiredGuideCount: 1, // 🔼 0 → 1
      color: "text-green-500",
    },

    {
      id: "little_guide",
      name: "꼬마 길잡이",
      description: "처음으로 길잡이 채택을 경험한 작은 안내자",
      cost: 3,
      tier: 1,
      icon: Star,
      requiredReplyLanterns: 0,
      requiredGuideCount: 1,
      color: "text-green-500",
    },
    {
      id: "ordinary_guide",
      name: "평범한 길잡이",
      description: "여러 글에서 자연스럽게 길을 안내하는 일상적인 길잡이",
      cost: 8,
      tier: 2,
      icon: BookOpen,
      requiredReplyLanterns: 0,
      requiredGuideCount: 5,
      color: "text-blue-500",
    },
    {
      id: "kind_guide",
      name: "친절한 길잡이",
      description: "공감과 배려로 질문자의 이해를 도와주는 따뜻한 길잡이",
      cost: 15,
      tier: 3,
      icon: Sparkles,
      requiredReplyLanterns: 20,
      requiredGuideCount: 15,
      color: "text-purple-500",
    },
    {
      id: "famous_guide",
      name: "유명한 길잡이",
      description: "채택과 등불로 커뮤니티에 이름이 오르내리는 인기 길잡이",
      cost: 25,
      tier: 4,
      icon: Award,
      requiredReplyLanterns: 50,
      requiredGuideCount: 30,
      color: "text-orange-500",
    },
    {
      id: "master_on_path",
      name: "길 위의 스승",
      description: "꾸준한 채택과 높은 등불로 실력을 인정받은 교육적 스승",
      cost: 40,
      tier: 5,
      icon: Compass,
      requiredReplyLanterns: 100,
      requiredGuideCount: 50,
      color: "text-red-500",
    },
    {
      id: "sherpa",
      name: "세르파",
      description: "어려운 여정도 끝까지 함께하는 베테랑 안내자",
      cost: 60,
      tier: 6,
      icon: Mountain,
      requiredReplyLanterns: 200,
      requiredGuideCount: 100,
      color: "text-amber-500",
    },
    {
      id: "immortal_lantern",
      name: "네비게이션",
      description: "수많은 질문을 안내해 본 길찾기의 끝판왕",
      cost: 80,
      tier: 7,
      icon: LanternFilledIcon,
      requiredReplyLanterns: 400,
      requiredGuideCount: 200,
      color: "text-yellow-500",
    },

    // ===== 지식·통찰 계열 (도감에만 있던 것들 포함) =====
    {
      id: "curiosity_spark",
      name: "호기심의 불꽃",
      description: "사소한 것에도 물음표를 던지는 작은 불꽃",
      cost: 5,
      tier: 1,
      icon: Sparkles,
      requiredReplyLanterns: 5,
      requiredGuideCount: 1,   // 🔼 0 → 1
      color: "text-amber-500",
    },

    {
      id: "truth_seeker",
      name: "진리의 탐험가",
      description: "진리를 향해 끊임없이 질문을 던지는 탐험가",
      cost: 10,
      tier: 2,
      icon: Compass,
      requiredReplyLanterns: 15, // 🔽 20 → 15 (조금 완화)
      requiredGuideCount: 3,     // 🔼 0 → 3
      color: "text-blue-500",
    },

    {
      id: "thought_architect",
      name: "사고의 건축가",
      description: "논리적인 구조로 생각을 설계하는 사고의 건축가",
      cost: 15,
      tier: 3,
      icon: BookOpen,
      requiredReplyLanterns: 40, // 🔽 50 → 40
      requiredGuideCount: 5,     // 🔼 0 → 5
      color: "text-blue-500",
    },

    {
      id: "insight_collector",
      name: "통찰의 수집가",
      description: "주고받는 대화 속에서 통찰을 모아두는 수집가",
      cost: 20,
      tier: 3,
      icon: Award,
      requiredReplyLanterns: 70, // 🔽 80 → 70
      requiredGuideCount: 7,     // 🔼 0 → 7
      color: "text-orange-500",
    },

    {
      id: "knowledge_sage",
      name: "지혜의 현자",
      description: "지식을 맥락까지 설명해주는 깊은 지혜의 현자",
      cost: 30,
      tier: 4,
      icon: BookOpen,
      requiredReplyLanterns: 110, // 🔽 120 → 110
      requiredGuideCount: 10,     // 🔼 5 → 10
      color: "text-purple-500",
    },

    {
      id: "discussion_maestro",
      name: "토론의 거장",
      description: "격한 토론도 배움의 장으로 바꾸는 토론의 지휘자",
      cost: 35,
      tier: 4,
      icon: Award,
      requiredReplyLanterns: 150,
      requiredGuideCount: 10,
      color: "text-red-500",
    },
    {
      id: "wisdom_lighthouse",
      name: "지혜의 등대",
      description: "방향을 잃은 질문에 빛을 비추는 지혜의 등대",
      cost: 45,
      tier: 5,
      icon: LanternFilledIcon,
      requiredReplyLanterns: 200,
      requiredGuideCount: 30,
      color: "text-amber-500",
    },
    {
      id: "philosopher_soul",
      name: "사유의 항해자",
      description: "생각의 바다를 끝없이 항해하는 사람",
      cost: 50,                  // 도감 price 50과 동일
      tier: 5,
      icon: Sparkles,
      requiredReplyLanterns: 250, // 깊게 생각하고 답변 많이 한 유저
      requiredGuideCount: 40,    // 🔼 0 → 40 (길잡이 40회 이상)
      color: "text-purple-500",
    },

  ];




  const canPurchase = (title: Title): boolean => {
    // 이미 보유 중?
    if (ownedTitles.includes(title.id)) {
      return false;
    }

    // 필요 조건 충족?
    if (title.requiredReplyLanterns > userReplyLanterns) {
      return false;
    }
    if (title.requiredGuideCount > userGuideCount) {
      return false;
    }

    // 루멘 충분? 🆕
    if (title.cost > userLumens) {
      return false;
    }

    return true;
  };

  const handlePurchaseClick = (title: Title) => {
    // 루멘 부족 체크 🆕
    if (title.cost > userLumens) {
      toast.error(`루멘이 부족합니다! (필요: ${title.cost}, 보유: ${userLumens})`);
      return;
    }

    // 조건 체크
    if (title.requiredReplyLanterns > userReplyLanterns) {
      toast.error(`답변 등불이 부족합니다! (필요: ${title.requiredReplyLanterns})`);
      return;
    }

    if (title.requiredGuideCount > userGuideCount) {
      toast.error(`길잡이 횟수가 부족합니다! (필요: ${title.requiredGuideCount})`);
      return;
    }

    // 구매 처리
    onTitlePurchase(title.id, title.cost);
  };

  return (
    <div className="w-full h-full bg-background flex flex-col">
      {/* 헤더 */}
      <header className="bg-card/95 backdrop-blur-xl border-b border-border safe-top">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="p-0 h-8 w-8"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-bold">칭호 상점</h1>
            </div>

            {/* 루멘 표시 🆕 */}
            <div className="flex items-center space-x-2 bg-amber-500/10 px-3 py-1.5 rounded-full">
              <span className="text-amber-500 text-lg"></span>
              <span className="font-bold text-amber-500">{userLumens}</span>
              <span className="text-xs text-muted-foreground">루멘</span>
            </div>
          </div>
        </div>
      </header>

      {/* 칭호 목록 */}
      <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-3">
        {/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */}
        {titles.map((title) => {
          const isOwned = ownedTitles.includes(title.id);
          const isEquipped = currentTitle === title.id;
          const canBuy = canPurchase(title);
          const lacksLumens = title.cost > userLumens;  // 🆕

          return (
            <Card key={title.id} className={isEquipped ? "border-2 border-primary" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  {/* 왼쪽: 칭호 정보 */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-bold">{title.name}</h3>
                      {isEquipped && (
                        <Badge variant="default" className="text-xs">착용 중</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {title.description}
                    </p>

                    {/* 가격 표시 🆕 */}
                    <div className="flex items-center space-x-3 text-xs">
                      <div className={`flex items-center space-x-1 ${lacksLumens ? 'text-red-500' : 'text-amber-500'
                        }`}>
                        <span></span>
                        <span className="font-medium">{title.cost} 루멘</span>
                      </div>

                      {/* 필요 조건 */}
                      {title.requiredReplyLanterns > 0 && (
                        <div className={`flex items-center space-x-1 ${title.requiredReplyLanterns > userReplyLanterns
                          ? 'text-red-500'
                          : 'text-muted-foreground'
                          }`}>
                          <LanternFilledIcon className="w-3 h-3" />
                          <span>{title.requiredReplyLanterns}</span>
                        </div>
                      )}

                      {title.requiredGuideCount > 0 && (
                        <div className={`flex items-center space-x-1 ${title.requiredGuideCount > userGuideCount
                          ? 'text-red-500'
                          : 'text-muted-foreground'
                          }`}>
                          <Compass className="w-3 h-3" />
                          <span>{title.requiredGuideCount}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 오른쪽: 버튼 */}
                  <div className="ml-4">
                    {isOwned ? (
                      isEquipped ? (
                        <Badge variant="outline" className="text-xs">
                          <Check className="w-3 h-3 mr-1" />
                          착용 중
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onTitleEquip(title.id)}
                        >
                          착용
                        </Button>
                      )
                    ) : (
                      <Button
                        size="sm"
                        disabled={!canBuy}
                        onClick={() => handlePurchaseClick(title)}
                        className={lacksLumens ? "opacity-50" : ""}
                      >
                        {lacksLumens ? (
                          <>
                            <Lock className="w-3 h-3 mr-1" />
                            루멘 부족
                          </>
                        ) : !canBuy ? (
                          <>
                            <Lock className="w-3 h-3 mr-1" />
                            잠김
                          </>
                        ) : (
                          <>구매</>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {/* eslint-enable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */}
      </div>
    </div>
  );
}