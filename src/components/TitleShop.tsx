import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { LanternFilledIcon } from "./icons/Lantern";
import { toast } from "@/toastHelper";
import { SHOP_TITLES, type ShopTitle } from "@/data/shopTitles";
import { ArrowLeft, Compass, Check, Lock, Sparkles, AlertCircle } from "lucide-react";

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
  const titles: ShopTitle[] = SHOP_TITLES.filter(t => !t.hidden);

  const getTitleStatus = (title: ShopTitle) => {
    const isOwned = ownedTitles.includes(title.id);
    const isEquipped = currentTitle === title.id;
    const isRequirementsMet =
      title.requiredReplyLanterns <= userReplyLanterns &&
      title.requiredGuideCount <= userGuideCount;
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
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 min-w-0">
              <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2 flex-shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="font-medium text-lg truncate">칭호 상점</h1>
            </div>
            <div className="flex items-center space-x-2 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 flex-shrink-0">
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
              <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums whitespace-nowrap">
                {userLumens.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">루멘</span>
            </div>
          </div>
        </div>
      </header>

      {/* 칭호 목록 */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3 pb-20">
        {titles.map((title) => {
          const { isOwned, isEquipped, isRequirementsMet, isAffordable } = getTitleStatus(title);

          // 디자인 변수 설정
          const cardOpacity = (!isOwned && !isRequirementsMet) ? "opacity-70 bg-muted/40" : "bg-card";
          const borderStyle = isEquipped
            ? "border-primary ring-1 ring-primary"
            : (!isOwned && !isRequirementsMet) ? "border-dashed" : "";

          return (
            <Card
              key={title.id}
              className={`transition-all duration-200 ${cardOpacity} ${borderStyle}`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                  {/* 정보 영역 */}
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* 타이틀 및 뱃지 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base truncate">{title.name}</h3>
                      {isEquipped && (
                        <Badge className="text-[10px] px-1.5 h-5">착용 중</Badge>
                      )}
                      {!isOwned && !isRequirementsMet && (
                        <Badge variant="outline" className="text-[10px] px-1.5 h-5 text-muted-foreground">잠김</Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {title.description}
                    </p>

                    {/* ✨ [핵심 수정] 가격과 조건을 분리하고 박스 형태로 디자인 (모바일 최적화: 패딩/간격 축소) */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">

                      {/* 1. 가격 표시 */}
                      <div className={`
                        flex items-center gap-1 sm:gap-1.5 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md border
                        ${!isOwned
                          ? (isAffordable ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400')
                          : 'bg-muted border-transparent text-muted-foreground'}
                      `}>
                        <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span className="font-semibold tabular-nums">{title.cost.toLocaleString()}</span>
                        <span className="text-[10px] opacity-80">루멘</span>
                      </div>

                      {/* 2. 조건 표시 (등불) */}
                      {title.requiredReplyLanterns > 0 && (
                        <div className={`
                          flex items-center gap-1 sm:gap-1.5 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md border
                          ${title.requiredReplyLanterns > userReplyLanterns
                            ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                            : 'bg-muted border-border text-muted-foreground'}
                        `}>
                          <LanternFilledIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span className="tabular-nums">
                            {userReplyLanterns} / {title.requiredReplyLanterns}
                          </span>
                        </div>
                      )}

                      {/* 3. 조건 표시 (길잡이) */}
                      {title.requiredGuideCount > 0 && (
                        <div className={`
                          flex items-center gap-1 sm:gap-1.5 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md border
                          ${title.requiredGuideCount > userGuideCount
                            ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                            : 'bg-muted border-border text-muted-foreground'}
                        `}>
                          <Compass className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span className="tabular-nums">
                            {userGuideCount} / {title.requiredGuideCount}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 버튼 영역 */}
                  <div className="flex-shrink-0 pt-2 sm:pt-0 w-full sm:w-auto sm:self-center">
                    {isOwned ? (
                      isEquipped ? (
                        <Button disabled variant="secondary" size="sm" className="w-full sm:w-auto min-w-[5rem] bg-primary/10 text-primary">
                          <Check className="w-3.5 h-3.5 mr-1" />
                          완료
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="w-full sm:w-auto min-w-[5rem]" onClick={() => onTitleEquip(title.id)}>
                          착용
                        </Button>
                      )
                    ) : (
                      <Button
                        size="sm"
                        disabled={!isRequirementsMet || !isAffordable}
                        onClick={() => handlePurchaseClick(title)}
                        className={`w-full sm:w-auto min-w-[6rem] ${!isRequirementsMet || !isAffordable ? "opacity-80" : ""}`}
                        variant={(!isRequirementsMet || !isAffordable) ? "secondary" : "default"}
                      >
                        {!isRequirementsMet ? (
                          <>
                            <Lock className="w-3.5 h-3.5 mr-1.5" />
                            <span className="text-xs">잠김</span>
                          </>
                        ) : !isAffordable ? (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                            <span className="text-xs">부족</span>
                          </>
                        ) : (
                          "구매하기"
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