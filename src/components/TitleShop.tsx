// TitleShop.tsx

import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { LanternFilledIcon } from "./icons/Lantern";
import { toast } from "@/toastHelper";
import { SHOP_TITLES, type ShopTitle } from "@/data/shopTitles";
import { ArrowLeft, Compass, Check, Lock, Sparkles, AlertCircle } from "lucide-react";

interface TitleShopProps {
  onBack: () => void;
  userPostLanterns: number; // (사용되지 않지만 인터페이스 유지를 위해 남김)
  userReplyLanterns: number;
  userGuideCount: number;
  userLumens: number;
  ownedTitles: string[];
  currentTitle: string;
  onTitlePurchase: (titleId: string, cost: number) => void;
  onTitleEquip: (titleId: string) => void;
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
  const titles: ShopTitle[] = SHOP_TITLES;

  // 칭호 상태를 판별하는 헬퍼 함수
  const getTitleStatus = (title: ShopTitle) => {
    const isOwned = ownedTitles.includes(title.id);
    const isEquipped = currentTitle === title.id;

    // 조건 충족 여부 (돈 제외)
    const isRequirementsMet =
      title.requiredReplyLanterns <= userReplyLanterns &&
      title.requiredGuideCount <= userGuideCount;

    // 돈 충분 여부
    const isAffordable = title.cost <= userLumens;

    return { isOwned, isEquipped, isRequirementsMet, isAffordable };
  };

  const handlePurchaseClick = (title: ShopTitle) => {
    const { isRequirementsMet, isAffordable } = getTitleStatus(title);

    if (!isRequirementsMet) {
      toast.error("구매 조건을 먼저 달성해야 합니다.");
      return;
    }

    if (!isAffordable) {
      toast.error(`루멘이 부족합니다! (필요: ${title.cost}, 보유: ${userLumens})`);
      return;
    }

    onTitlePurchase(title.id, title.cost);
  };

  return (
    <div className="w-full h-full bg-background flex flex-col">
      {/* 헤더 */}
      <header className="bg-card/95 backdrop-blur-xl border-b border-border flex-shrink-0 safe-top sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="font-medium text-lg">칭호 상점</h1>
            </div>

            {/* 루멘 표시 */}
            <div className="flex items-center space-x-2 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {userLumens.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">루멘</span>
            </div>
          </div>
        </div>
      </header>

      {/* 칭호 목록 */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3 pb-20">
        {titles.map((title) => {
          const { isOwned, isEquipped, isRequirementsMet, isAffordable } = getTitleStatus(title);

          // 스타일링을 위한 상태 결정
          // 1. 착용중 -> 테두리 강조
          // 2. 미보유 & 조건 미달 -> 흐리게 처리
          const cardOpacity = (!isOwned && !isRequirementsMet) ? "opacity-60 bg-muted/30" : "bg-card";
          const borderStyle = isEquipped
            ? "border-primary ring-1 ring-primary"
            : (!isOwned && !isRequirementsMet) ? "border-dashed" : "";

          return (
            <Card
              key={title.id}
              className={`transition-all duration-200 ${cardOpacity} ${borderStyle}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  {/* 왼쪽: 칭호 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-bold text-base truncate">{title.name}</h3>
                      {isEquipped && (
                        <Badge variant="default" className="text-[10px] px-1.5 h-5 flex-shrink-0">
                          착용 중
                        </Badge>
                      )}
                      {!isOwned && !isRequirementsMet && (
                        <Badge variant="outline" className="text-[10px] px-1.5 h-5 text-muted-foreground flex-shrink-0">
                          잠김
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-3 line-clamp-1">
                      {title.description}
                    </p>

                    {/* 하단 정보: 가격 및 요구조건 */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      {/* 가격 */}
                      <div className={`flex items-center space-x-1 font-medium ${!isOwned
                          ? (isAffordable ? 'text-amber-600 dark:text-amber-400' : 'text-red-500')
                          : 'text-muted-foreground'
                        }`}>
                        <Sparkles className="w-3 h-3" />
                        <span>{title.cost.toLocaleString()} 루멘</span>
                      </div>

                      {/* 구분선 (조건이 있을 때만) */}
                      {(title.requiredReplyLanterns > 0 || title.requiredGuideCount > 0) && (
                        <div className="w-px h-3 bg-border" />
                      )}

                      {/* 요구사항: 답변 등불 */}
                      {title.requiredReplyLanterns > 0 && (
                        <div className={`flex items-center space-x-1 ${title.requiredReplyLanterns > userReplyLanterns
                            ? 'text-red-500 font-medium'
                            : 'text-muted-foreground'
                          }`}>
                          <LanternFilledIcon className="w-3 h-3" />
                          <span>{userReplyLanterns}/{title.requiredReplyLanterns}</span>
                        </div>
                      )}

                      {/* 요구사항: 길잡이 횟수 */}
                      {title.requiredGuideCount > 0 && (
                        <div className={`flex items-center space-x-1 ${title.requiredGuideCount > userGuideCount
                            ? 'text-red-500 font-medium'
                            : 'text-muted-foreground'
                          }`}>
                          <Compass className="w-3 h-3" />
                          <span>{userGuideCount}/{title.requiredGuideCount}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 오른쪽: 액션 버튼 */}
                  <div className="flex-shrink-0">
                    {isOwned ? (
                      isEquipped ? (
                        <Button disabled variant="secondary" size="sm" className="w-20 bg-primary/10 text-primary hover:bg-primary/20">
                          <Check className="w-3.5 h-3.5 mr-1" />
                          완료
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-20"
                          onClick={() => onTitleEquip(title.id)}
                        >
                          착용
                        </Button>
                      )
                    ) : (
                      // 미보유 상태
                      <Button
                        size="sm"
                        // 조건이 충족되지 않았거나 돈이 부족하면 비활성화 처리?
                        // UX 선택: 
                        // 1. 아예 클릭 불가 (disabled)
                        // 2. 클릭 시 토스트 메시지 (disabled 제거)
                        // 여기서는 명확한 피드백을 위해 disabled를 유지하되, 상태별 텍스트를 다르게 보여줌
                        disabled={!isRequirementsMet || !isAffordable}
                        onClick={() => handlePurchaseClick(title)}
                        className={`w-24 ${!isRequirementsMet || !isAffordable ? "opacity-80" : ""}`}
                        variant={(!isRequirementsMet || !isAffordable) ? "secondary" : "default"}
                      >
                        {!isRequirementsMet ? (
                          <>
                            <Lock className="w-3.5 h-3.5 mr-1.5" />
                            <span className="text-xs">조건 미달</span>
                          </>
                        ) : !isAffordable ? (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                            <span className="text-xs">루멘 부족</span>
                          </>
                        ) : (
                          <>구매하기</>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}