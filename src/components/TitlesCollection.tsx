import { useMemo } from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
    BookOpen,
    Lock,
    Sparkles,
    ShoppingBag,
    Trophy,
    ArrowLeft,
    Compass,
} from "lucide-react";
import { LanternFilledIcon } from "./icons/Lantern";
import { SHOP_TITLES, type ShopTitle } from "@/data/shopTitles";

// ----------------------
// 타입 정의
// ----------------------
type ShopTitleEntry = ShopTitle & { type: "shop" };

interface AchievementTitle {
    id: string;
    name: string;
    description: string;
    type: "achievement";
    isHidden?: boolean;
}

// 통합 타입
type AnyTitle = ShopTitleEntry | AchievementTitle;

interface TitlesCollectionProps {
    onBack: () => void;
    userTitles: string[]; // 보유한 칭호 ID 목록
    equippedTitle: string; // 현재 장착 중인 칭호 ID
    onTitleEquip: (titleId: string) => void;
    onTitleUnequip: () => void;
    isGuest: boolean; // 게스트 모드 여부 추가
}

// ----------------------
// 데이터 (컴포넌트 외부로 분리하여 리렌더링 방지)
// ----------------------
const SHOP_TITLES_MAPPED: ShopTitleEntry[] = SHOP_TITLES.map((t) => ({
    ...t,
    type: "shop",
}));

const ACHIEVEMENT_TITLES: AchievementTitle[] = [
    // ... (기존 데이터 유지 - 내용이 길어 생략, 기존과 동일하게 사용하시면 됩니다)
    // 탐구 칭호
    { id: "explore_brave_questioner", name: "용기 있는 질문러", description: "부끄러움을 이겨내고 질문 글을 5개 작성했습니다", type: "achievement" },
    { id: "explore_steady_questioner", name: "꾸준한 질문러", description: "포기하지 않고 질문 글을 20개 작성했습니다", type: "achievement" },
    { id: "explore_seeker", name: "탐색자", description: "질문 글을 10개 작성했습니다", type: "achievement" },
    { id: "explore_inquirer", name: "질문자", description: "질문 글을 30개 작성했습니다", type: "achievement" },
    { id: "explore_investigator", name: "조사자", description: "질문 글을 100개 작성했습니다", type: "achievement" },
    { id: "explore_philosopher", name: "사색가", description: "질문 글을 300개 작성했습니다", type: "achievement" },

    // 답변 칭호
    { id: "reply_challenger", name: "도전하는 답변가", description: "완벽하지 않아도 답변을 10개 시도했습니다", type: "achievement" },
    { id: "reply_persistent_helper", name: "끈기 있는 답변가", description: "도움을 주기 위해 답변 50개를 남겼습니다", type: "achievement" },
    { id: "reply_helper", name: "조력자", description: "등불 10개 이상 받은 답변을 10개 작성했습니다", type: "achievement" },
    { id: "reply_advisor", name: "조언자", description: "등불 10개 이상 받은 답변을 30개 작성했습니다", type: "achievement" },
    { id: "reply_mentor", name: "멘토", description: "등불 10개 이상 받은 답변을 100개 작성했습니다", type: "achievement" },
    { id: "reply_scholar", name: "학자", description: "등불 10개 이상 받은 답변을 300개 작성했습니다", type: "achievement" },

    // 길잡이 칭호
    { id: "guide_guide", name: "가이드", description: "길잡이로 5회 채택되었습니다", type: "achievement" },
    { id: "guide_navigator", name: "내비게이터", description: "길잡이로 20회 채택되었습니다", type: "achievement" },
    { id: "guide_luminary", name: "선도자", description: "길잡이로 100회 채택되었습니다", type: "achievement" },

    // 등불 칭호
    { id: "lantern_candle", name: "촛불", description: "등불을 50개 받았습니다", type: "achievement" },
    { id: "lantern_campfire", name: "모닥불", description: "등불을 200개 받았습니다", type: "achievement" },
    { id: "lantern_lantern", name: "랜턴", description: "등불을 500개 받았습니다", type: "achievement" },
    { id: "lantern_furnace", name: "용광로", description: "등불을 1500개 받았습니다", type: "achievement" },
    { id: "lantern_giver_small", name: "좋아요 요정", description: "다른 사람 글에 등불 50개를 켰습니다", type: "achievement" },
    { id: "lantern_giver_captain", name: "응원단장", description: "다른 사람 글에 등불 200개를 켰습니다", type: "achievement" },

    // 공유 칭호
    { id: "share_sharer", name: "공유자", description: "인기 공유 글을 10개 작성했습니다", type: "achievement" },
    { id: "share_curator", name: "큐레이터", description: "인기 공유 글을 30개 작성했습니다", type: "achievement" },
    { id: "share_publisher", name: "발행자", description: "인기 공유 글을 100개 작성했습니다", type: "achievement" },
    { id: "share_archivist", name: "기록 관리자", description: "인기 공유 글을 300개 작성했습니다", type: "achievement" },

    // 출석 칭호
    { id: "streak_visitor", name: "방문자", description: "연속 7일 로그인했습니다", type: "achievement" },
    { id: "streak_regular", name: "단골", description: "연속 30일 로그인했습니다", type: "achievement" },
    { id: "streak_resident", name: "주민", description: "연속 100일 로그인했습니다", type: "achievement" },
    { id: "streak_pillar", name: "기둥", description: "연속 365일 로그인했습니다", type: "achievement" },

    // 선장 칭호
    { id: "captain_captain", name: "선장", description: "선원 100명을 모았습니다", type: "achievement" },

    // 분야별 길잡이
    { id: "economy_analyst", name: "경제 분석인", description: "경제 분야 답변 활동을 했습니다", type: "achievement" },
    { id: "economy_expert", name: "경제 길잡이", description: "경제 분야를 함께 탐색하는 길잡이입니다", type: "achievement" },
    { id: "it_consultant", name: "기술 상담인", description: "IT 분야 답변 활동을 했습니다", type: "achievement" },
    { id: "it_expert", name: "기술 이야기꾼", description: "IT 분야를 함께 탐색하는 이야기꾼입니다", type: "achievement" },
    { id: "language_tutor", name: "언어 튜터", description: "외국어 분야 답변 활동을 했습니다", type: "achievement" },
    { id: "language_expert", name: "언어 항해사", description: "외국어 분야를 함께 탐색하는 항해사입니다", type: "achievement" },
    { id: "engineering_curious", name: "변수 연구자", description: "공학 분야 질문을 많이 했습니다", type: "achievement" },
    { id: "engineering_first_light", name: "공학자의 첫 등불", description: "공학 분야에서 첫 인정을 받았습니다", type: "achievement" },
    { id: "engineering_destroyer", name: "방정식 해결사", description: "공학 분야 답변을 많이 했습니다", type: "achievement" },

    // --- 히든 칭호 ---
    { id: "multi_specialist", name: "다중 분야 항해사", description: "3개 분야에서 길잡이 칭호를 획득했습니다", type: "achievement", isHidden: true },
    { id: "discussion_expert", name: "마라톤 토론러", description: "한 글에서 답변을 15회 이상 주고받았습니다", type: "achievement", isHidden: true },
    { id: "best_contributor", name: "베스트 컨트리뷰터", description: "한 글에서 등불 100개 이상을 받았습니다", type: "achievement", isHidden: true },
    { id: "community_fellow", name: "커뮤니티 펠로우", description: "모든 기본 칭호 3단계를 달성했습니다", type: "achievement", isHidden: true },
    { id: "honorary_scholar", name: "명예 학자", description: "모든 기본 칭호 4단계를 달성했습니다", type: "achievement", isHidden: true },
    { id: "lantern_giver", name: "등불 나눔이", description: "등불 500개를 나누어 주었습니다", type: "achievement", isHidden: true },
    { id: "engineering_focused", name: "함수 마스터", description: "공학 카테고리에만 집중했습니다", type: "achievement", isHidden: true },
    { id: "diligent_visitor", name: "성실한 방문자", description: "최근 30일 중 27일 이상 로그인했습니다", type: "achievement", isHidden: true },
    { id: "popular_questioner", name: "인기 질문러", description: "많은 공감을 받은 질문을 작성했습니다", type: "achievement", isHidden: true },
    { id: "specialized_replier", name: "특화 답변가", description: "한 카테고리를 깊게 파고들었습니다", type: "achievement", isHidden: true },
];

export function TitlesCollection({
    onBack,
    userTitles,
    equippedTitle,
    onTitleEquip,
    onTitleUnequip,
    isGuest, // 게스트 모드 여부 추가
}: TitlesCollectionProps) {

    // 1. 데이터 분류 및 메모이제이션
    const {
        visibleAchievementTitles,
        ownedHiddenTitles,
        shopTitles,
        totalStats
    } = useMemo(() => {
        const visibleAchievements = ACHIEVEMENT_TITLES.filter((title) => !title.isHidden);
        const ownedHidden = ACHIEVEMENT_TITLES.filter((title) => title.isHidden && userTitles.includes(title.id));

        // 전체 도감 진행도 계산용
        const allTrackedTitles = [
            ...SHOP_TITLES_MAPPED,
            ...visibleAchievements,
            ...ownedHidden,
        ];

        const unlockedCount = userTitles.filter(id => allTrackedTitles.some(t => t.id === id)).length;
        const totalCount = allTrackedTitles.length;
        const percentage = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

        return {
            visibleAchievementTitles: visibleAchievements,
            ownedHiddenTitles: ownedHidden,
            shopTitles: SHOP_TITLES_MAPPED,
            totalStats: { unlockedCount, totalCount, percentage }
        };
    }, [userTitles]); // userTitles가 변경될 때만 재계산

    return (
        <div className="w-full h-full bg-background flex flex-col">
            {/* 헤더 */}
            <header className="bg-card/95 backdrop-blur-xl border-b border-border flex-shrink-0 safe-top sticky top-0 z-10">
                <div className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                        <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h1 className="font-medium text-lg">칭호 도감</h1>
                    </div>
                </div>
            </header>

            {/* 컨텐츠 영역 */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-6 pb-24">

                {/* 1. 진행도 카드 */}
                <Card className="bg-gradient-to-br from-purple-500/10 via-background to-background border-purple-200/50 dark:border-purple-800/50">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    <span className="text-lg font-bold text-foreground">
                                        수집 현황
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    총 {totalStats.totalCount}개 중 {totalStats.unlockedCount}개 획득
                                </p>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-3xl font-bold text-purple-600 dark:text-purple-400 tabular-nums">
                                    {totalStats.percentage}%
                                </span>
                                <span className="text-xs text-muted-foreground">달성률</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. 일반 칭호 (상점) */}
                <SectionHeader
                    icon={<ShoppingBag className="w-5 h-5 text-indigo-500" />}
                    title="일반 칭호"
                    count={shopTitles.length}
                />
                <div className="space-y-2">
                    {shopTitles.map((title) => (
                        <TitleCard
                            key={title.id}
                            title={title}
                            isUnlocked={userTitles.includes(title.id)}
                            isEquipped={equippedTitle === title.id}
                            onEquip={onTitleEquip}
                            onUnequip={onTitleUnequip}
                            variant="shop"
                            isGuest={isGuest} // 게스트 모드 여부 추가
                        />
                    ))}
                </div>

                {/* 3. 히든 칭호 (획득한 경우만 표시) */}
                {ownedHiddenTitles.length > 0 && (
                    <>
                        <SectionHeader
                            icon={<Sparkles className="w-5 h-5 text-amber-500" />}
                            title="히든 칭호"
                            count={ownedHiddenTitles.length}
                        />
                        <div className="space-y-2">
                            {ownedHiddenTitles.map((title) => (
                                <TitleCard
                                    key={title.id}
                                    title={title}
                                    isUnlocked={true} // 히든은 획득해야만 보이므로 항상 true
                                    isEquipped={equippedTitle === title.id}
                                    onEquip={onTitleEquip}
                                    onUnequip={onTitleUnequip}
                                    variant="hidden"
                                    isGuest={isGuest} // 게스트 모드 여부 추가
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* 4. 업적 칭호 */}
                <SectionHeader
                    icon={<Trophy className="w-5 h-5 text-slate-500" />}
                    title="업적 칭호"
                    count={visibleAchievementTitles.length}
                />
                <div className="space-y-2">
                    {visibleAchievementTitles.map((title) => (
                        <TitleCard
                            key={title.id}
                            title={title}
                            isUnlocked={userTitles.includes(title.id)}
                            isEquipped={equippedTitle === title.id}
                            onEquip={onTitleEquip}
                            onUnequip={onTitleUnequip}
                            variant="achievement"
                            isGuest={isGuest} // 게스트 모드 여부 추가
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ----------------------
// 하위 컴포넌트: 섹션 헤더
// ----------------------
function SectionHeader({ icon, title, count }: { icon: React.ReactNode, title: string, count: number }) {
    return (
        <div className="flex items-center gap-2 px-1 pt-2">
            {icon}
            <h3 className="text-lg font-bold text-foreground">
                {title}
            </h3>
            <Badge variant="outline" className="text-xs ml-auto">
                {count}개
            </Badge>
        </div>
    );
}

// ----------------------
// 하위 컴포넌트: 칭호 카드 (중복 제거)
// ----------------------
interface TitleCardProps {
    title: AnyTitle;
    isUnlocked: boolean;
    isEquipped: boolean;
    onEquip: (id: string) => void;
    onUnequip: () => void;
    variant: 'shop' | 'hidden' | 'achievement';
    isGuest: boolean; // 게스트 모드 여부 추가
}

function TitleCard({ title, isUnlocked, isEquipped, onEquip, onUnequip, variant, isGuest }: TitleCardProps) {
    // 스타일 설정
    const styles = {
        shop: {
            activeBg: "bg-indigo-50/80 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800",
            iconBg: "bg-indigo-100 dark:bg-indigo-900/40",
            iconColor: "text-indigo-600 dark:text-indigo-400",
            Icon: ShoppingBag,
            badge: "bg-indigo-600"
        },
        hidden: {
            activeBg: "bg-amber-50/80 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
            iconBg: "bg-amber-100 dark:bg-amber-900/40",
            iconColor: "text-amber-600 dark:text-amber-400",
            Icon: Sparkles,
            badge: "bg-amber-600"
        },
        achievement: {
            activeBg: "bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800",
            iconBg: "bg-slate-200 dark:bg-slate-800",
            iconColor: "text-slate-600 dark:text-slate-400",
            Icon: Trophy,
            badge: "bg-slate-600"
        }
    };

    const currentStyle = styles[variant];
    const { Icon } = currentStyle;

    // Shop 타입인 경우 추가 정보 표시 (가격 등) - 잠겨있을 때만
    const isShopType = variant === 'shop';
    const shopTitle = title as ShopTitleEntry;

    return (
        <Card
            className={`transition-all duration-200 min-h-[88px] ${isUnlocked
                ? `${currentStyle.activeBg} shadow-sm`
                : "opacity-60 bg-muted/30 border-dashed border-border"
                }`}
        >
            <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                    {/* 아이콘 및 텍스트 영역 */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`p-2.5 rounded-lg shrink-0 ${isUnlocked ? currentStyle.iconBg : "bg-muted"}`}>
                            {isUnlocked ? (
                                <Icon className={`w-5 h-5 ${currentStyle.iconColor}`} />
                            ) : (
                                <Lock className="w-5 h-5 text-muted-foreground/50" />
                            )}
                        </div>

                        <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`font-bold truncate ${isUnlocked ? "text-foreground" : "text-muted-foreground"}`}>
                                    {title.name}
                                </span>
                                {isEquipped && (
                                    <Badge variant="default" className={`text-[10px] px-1.5 h-5 ${currentStyle.badge} text-white shrink-0`}>
                                        장착 중
                                    </Badge>
                                )}
                                {variant === 'hidden' && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 h-5 border-amber-500/50 text-amber-600 shrink-0">
                                        히든
                                    </Badge>
                                )}
                            </div>

                            <p className="text-[10px] text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                                {title.description}
                            </p>

                            {/* 상점 아이템이고 잠겨있을 때 요구사항 표시 */}
                            {!isUnlocked && isShopType && (
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px]">
                                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-500">
                                        <Sparkles className="w-3 h-3" />
                                        <span className="font-medium">{shopTitle.cost} 루멘</span>
                                    </div>
                                    {/* 구분선 */}
                                    {(shopTitle.requiredReplyLanterns > 0 || shopTitle.requiredGuideCount > 0) && (
                                        <div className="w-px h-2 bg-border" />
                                    )}
                                    {shopTitle.requiredReplyLanterns > 0 && (
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                            <LanternFilledIcon className="w-3 h-3" />
                                            <span>등불 {shopTitle.requiredReplyLanterns}개</span>
                                        </div>
                                    )}
                                    {shopTitle.requiredGuideCount > 0 && (
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                            <Compass className="w-3 h-3" />
                                            <span>길잡이 {shopTitle.requiredGuideCount}회</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 버튼 영역 */}
                    <div className="shrink-0">
                        {isUnlocked ? (
                            isEquipped ? (
                                <Button size="sm" variant="outline" onClick={isGuest ? () => console.log("로그인 후 칭호를 해제할 수 있습니다.") : onUnequip} className="h-8 text-xs" disabled={isGuest}>
                                    해제
                                </Button>
                            ) : (
                                <Button size="sm" onClick={isGuest ? () => console.log("로그인 후 칭호를 장착할 수 있습니다.") : () => onEquip(title.id)} className="h-8 text-xs" disabled={isGuest}>
                                    장착
                                </Button>
                            )
                        ) : (
                            <div className="flex items-center text-xs text-muted-foreground bg-muted/50 px-2 py-1.5 rounded">
                                <Lock className="w-3 h-3 mr-1.5 opacity-70" />
                                미획득
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}