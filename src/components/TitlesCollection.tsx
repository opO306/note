import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { BookOpen, Lock, Sparkles, ShoppingBag, Trophy, ArrowLeft, Compass } from "lucide-react";
import { LanternFilledIcon } from "./icons/Lantern";

interface Title {
    id: string;
    name: string;
    description: string;
    price?: number;
    type: "shop" | "achievement";
    // 상점 칭호 전용: 구매 조건
    requiredReplyLanterns?: number; // 필요한 답변 등불 개수
    requiredGuideCount?: number;    // 필요한 길잡이 채택 횟수
    // 히든 칭호 여부 (히든이면 true)
    isHidden?: boolean;
}


interface TitlesCollectionProps {
    onBack: () => void;
    userTitles: string[];
    equippedTitle: string;
    onTitleEquip: (titleId: string) => void;
    onTitleUnequip: () => void;
}

const SHOP_TITLES: Title[] = [
    // 상점 칭호 (TitleShop.tsx와 동일하게 맞춘 버전)

    // 길잡이 계열
    {
        id: "guide_sprout",
        name: "길잡이 꿈나무",
        description: "길잡이의 씨앗이 막 싹튼 초심자",
        price: 0,
        type: "shop",
        requiredReplyLanterns: 0,
        requiredGuideCount: 1, // 0 → 1
    },

    {
        id: "little_guide",
        name: "꼬마 길잡이",
        description: "처음으로 길잡이 채택을 경험한 작은 안내자",
        price: 3,
        type: "shop",
        requiredReplyLanterns: 0,
        requiredGuideCount: 1,
    },
    {
        id: "ordinary_guide",
        name: "평범한 길잡이",
        description: "여러 글에서 자연스럽게 길을 안내하는 일상적인 길잡이",
        price: 8,
        type: "shop",
        requiredReplyLanterns: 0,
        requiredGuideCount: 5,
    },
    {
        id: "kind_guide",
        name: "친절한 길잡이",
        description: "공감과 배려로 질문자의 이해를 도와주는 따뜻한 길잡이",
        price: 15,
        type: "shop",
        requiredReplyLanterns: 20,
        requiredGuideCount: 15,
    },
    {
        id: "famous_guide",
        name: "유명한 길잡이",
        description: "채택과 등불로 커뮤니티에 이름이 오르내리는 인기 길잡이",
        price: 25,
        type: "shop",
        requiredReplyLanterns: 50,
        requiredGuideCount: 30,
    },
    {
        id: "master_on_path",
        name: "길 위의 스승",
        description: "꾸준한 채택과 높은 등불로 실력을 인정받은 교육적 스승",
        price: 40,
        type: "shop",
        requiredReplyLanterns: 100,
        requiredGuideCount: 50,
    },
    {
        id: "sherpa",
        name: "세르파",
        description: "어려운 여정도 끝까지 함께하는 베테랑 안내자",
        price: 60,
        type: "shop",
        requiredReplyLanterns: 200,
        requiredGuideCount: 100,
    },
    {
        id: "immortal_lantern",
        name: "네비게이션",
        description: "수많은 질문을 안내해 본 길찾기의 끝판왕",
        price: 80,
        type: "shop",
        requiredReplyLanterns: 400,
        requiredGuideCount: 200,
    },

    // 지식·통찰 계열
    {
        id: "curiosity_spark",
        name: "호기심의 불꽃",
        description: "사소한 것에도 물음표를 던지는 작은 불꽃",
        price: 5,
        type: "shop",
        requiredReplyLanterns: 5,
        requiredGuideCount: 1, // 0 → 1
    },

    {
        id: "truth_seeker",
        name: "진리의 탐험가",
        description: "진리를 향해 끊임없이 질문을 던지는 탐험가",
        price: 10,
        type: "shop",
        requiredReplyLanterns: 15, // 20 → 15
        requiredGuideCount: 3,     // 0 → 3
    },

    {
        id: "thought_architect",
        name: "사고의 건축가",
        description: "논리적인 구조로 생각을 설계하는 사고의 건축가",
        price: 15,
        type: "shop",
        requiredReplyLanterns: 40, // 50 → 40
        requiredGuideCount: 5,     // 0 → 5
    },

    {
        id: "insight_collector",
        name: "통찰의 수집가",
        description: "주고받는 대화 속에서 통찰을 모아두는 수집가",
        price: 20,
        type: "shop",
        requiredReplyLanterns: 70, // 80 → 70
        requiredGuideCount: 7,     // 0 → 7
    },

    {
        id: "knowledge_sage",
        name: "지혜의 현자",
        description: "지식을 맥락까지 설명해주는 깊은 지혜의 현자",
        price: 30,
        type: "shop",
        requiredReplyLanterns: 110, // 120 → 110
        requiredGuideCount: 10,     // 5 → 10
    },

    {
        id: "discussion_maestro",
        name: "토론의 거장",
        description: "격한 토론도 배움의 장으로 바꾸는 토론의 지휘자",
        price: 35,
        type: "shop",
        requiredReplyLanterns: 150,
        requiredGuideCount: 10,
    },
    {
        id: "wisdom_lighthouse",
        name: "지혜의 등대",
        description: "방향을 잃은 질문에 빛을 비추는 지혜의 등대",
        price: 45,
        type: "shop",
        requiredReplyLanterns: 200,
        requiredGuideCount: 30,
    },
    {
        id: "philosopher_soul",
        name: "사유의 항해자",
        description: "생각의 바다를 끝없이 항해하는 사람",
        price: 50,
        type: "shop",
        // 아래 두 줄 추가 (상점과 동일하게)
        requiredReplyLanterns: 250,
        requiredGuideCount: 40,
    },

];



// 🏆 업적/특별 칭호
const ACHIEVEMENT_TITLES: Title[] = [
    // 탐구 칭호 (4단계)
    {
        id: "explore_brave_questioner",
        name: "용기 있는 질문러",
        description: "부끄러움을 이겨내고 질문 글을 5개 작성했습니다 - 모르는 것을 인정하는 용기가 배움의 시작입니다",
        type: "achievement",
    },
    {
        id: "explore_steady_questioner",
        name: "꾸준한 질문러",
        description: "포기하지 않고 질문 글을 20개 작성했습니다 - 꾸준함이 성장의 열쇠입니다",
        type: "achievement",
    },
    {
        id: "explore_seeker",
        name: "탐색자",
        description: "질문 글을 10개 작성했습니다",
        type: "achievement",
    },
    {
        id: "explore_inquirer",
        name: "질문자",
        description: "질문 글을 30개 작성했습니다",
        type: "achievement",
    },
    {
        id: "explore_investigator",
        name: "조사자",
        description: "질문 글을 100개 작성했습니다",
        type: "achievement",
    },
    {
        id: "explore_philosopher",
        name: "사색가",
        description: "질문 글을 300개 작성했습니다",
        type: "achievement",
    },

    // 답변 칭호 (4단계)
    {
        id: "reply_challenger",
        name: "도전하는 답변가",
        description: "완벽하지 않아도, 자신의 이해 방식을 담은 답변을 10개 시도했습니다 - 시도하는 것만으로도 가치가 있습니다",
        type: "achievement",
    },
    {
        id: "reply_persistent_helper",
        name: "끈기 있는 답변가",
        description: "도움을 주기 위해 답변 50개를 남겼습니다 - 끈기 있는 도움은 커뮤니티의 힘입니다",
        type: "achievement",
    },
    {
        id: "reply_helper",
        name: "조력자",
        description: "등불 10개 이상 받은 답변을 10개 작성했습니다",
        type: "achievement",
    },
    {
        id: "reply_advisor",
        name: "조언자",
        description: "등불 10개 이상 받은 답변을 30개 작성했습니다",
        type: "achievement",
    },
    {
        id: "reply_mentor",
        name: "멘토",
        description: "등불 10개 이상 받은 답변을 100개 작성했습니다",
        type: "achievement",
    },
    {
        id: "reply_scholar",
        name: "학자",
        description: "등불 10개 이상 받은 답변을 300개 작성했습니다",
        type: "achievement",
    },

    // 길잡이 칭호 (4단계)
    {
        id: "guide_guide",
        name: "가이드",
        description: "길잡이로 5회 채택되었습니다",
        type: "achievement",
    },
    {
        id: "guide_navigator",
        name: "내비게이터",
        description: "길잡이로 20회 채택되었습니다",
        type: "achievement",
    },
    {
        id: "guide_pathfinder",
        name: "개척자",
        description: "길잡이로 50회 채택되었습니다",
        type: "achievement",
    },
    {
        id: "guide_luminary",
        name: "선도자",
        description: "길잡이로 100회 채택되었습니다",
        type: "achievement",
    },

    // 등불 칭호 (4단계)
    {
        id: "lantern_candle",
        name: "촛불",
        description: "등불을 50개 받았습니다",
        type: "achievement",
    },
    {
        id: "lantern_campfire",
        name: "모닥불",
        description: "등불을 200개 받았습니다",
        type: "achievement",
    },
    {
        id: "lantern_lantern",
        name: "랜턴",
        description: "등불을 500개 받았습니다",
        type: "achievement",
    },
    {
        id: "lantern_furnace",
        name: "용광로",
        description: "등불을 1500개 받았습니다",
        type: "achievement",
    },
    {
        id: "lantern_giver_small",
        name: "좋아요 요정",
        description: "다른 사람의 글에 등불을 50개 켜줬습니다 - 당신의 응원이 누군가에게 힘이 됩니다",
        type: "achievement",
    },
    {
        id: "lantern_giver_captain",
        name: "응원단장",
        description: "다른 사람의 글에 등불을 200개 켜줬습니다 - 따뜻한 응원이 커뮤니티를 밝힙니다",
        type: "achievement",
    },
    // 공유 칭호 (4단계)
    {
        id: "share_sharer",
        name: "공유자",
        description: "등불 3개 이상 받은 정보 공유 글을 10개 작성했습니다",
        type: "achievement",
    },
    {
        id: "share_curator",
        name: "큐레이터",
        description: "등불 3개 이상 받은 정보 공유 글을 30개 작성했습니다",
        type: "achievement",
    },
    {
        id: "share_publisher",
        name: "발행자",
        description: "등불 3개 이상 받은 정보 공유 글을 100개 작성했습니다",
        type: "achievement",
    },
    {
        id: "share_archivist",
        name: "기록 관리자",
        description: "등불 3개 이상 받은 정보 공유 글을 300개 작성했습니다",
        type: "achievement",
    },

    // 출석 칭호 (4단계)
    {
        id: "streak_visitor",
        name: "방문자",
        description: "연속 7일 로그인했습니다",
        type: "achievement",
    },
    {
        id: "streak_regular",
        name: "단골",
        description: "연속 30일 로그인했습니다",
        type: "achievement",
    },
    {
        id: "streak_resident",
        name: "주민",
        description: "연속 100일 로그인했습니다",
        type: "achievement",
    },
    {
        id: "streak_pillar",
        name: "기둥",
        description: "연속 365일 로그인했습니다",
        type: "achievement",
    },

    // 선장 (팔로워) 칭호  ← 새로 추가!
    {
        id: "captain_captain",
        name: "선장",
        description: "선원 100명을 모았습니다",
        type: "achievement",
    },

    // 분야별 전문가 칭호
    {
        id: "economy_analyst",
        name: "경제 분석인",
        description: "경제 카테고리에서 등불 5개 이상 받은 답변을 20개 작성했습니다",
        type: "achievement",
    },
    {
        id: "economy_expert",
        name: "경제 전문가",
        description: "경제 카테고리에서 등불 10개 이상 받은 답변을 100개 작성했습니다",
        type: "achievement",
    },
    {
        id: "it_consultant",
        name: "기술 상담인",
        description: "IT 카테고리에서 등불 5개 이상 받은 답변을 20개 작성했습니다",
        type: "achievement",
    },
    {
        id: "it_expert",
        name: "기술 전문가",
        description: "IT 카테고리에서 등불 10개 이상 받은 답변을 100개 작성했습니다",
        type: "achievement",
    },
    {
        id: "language_tutor",
        name: "언어 튜터",
        description: "외국어 카테고리에서 등불 5개 이상 받은 답변을 20개 작성했습니다",
        type: "achievement",
    },
    {
        id: "language_expert",
        name: "언어 전문가",
        description: "외국어 카테고리에서 등불 10개 이상 받은 답변을 100개 작성했습니다",
        type: "achievement",
    },

    // 특별 히든 칭호
    {
        id: "multi_specialist",
        name: "멀티 전문가",
        description: "3개 분야에서 전문가 칭호를 획득했습니다",
        type: "achievement",
        isHidden: true,
    },
    {
        id: "discussion_expert",
        name: "마라톤 토론러",
        description: "한 글에서 답변을 15회 이상 주고받았습니다",
        type: "achievement",
        isHidden: true,
    },

    {
        id: "best_contributor",
        name: "베스트 컨트리뷰터",
        description: "한 글에서 등불 100개 이상을 받았습니다",
        type: "achievement",
        isHidden: true,
    },
    {
        id: "community_fellow",
        name: "커뮤니티 펠로우",
        description: "모든 기본 칭호에서 3단계 이상을 달성했습니다",
        type: "achievement",
        isHidden: true,
    },
    {
        id: "honorary_scholar",
        name: "명예 학자",
        description: "모든 기본 칭호에서 4단계(최고)를 달성했습니다",
        type: "achievement",
        isHidden: true,
    },
    {
        id: "lantern_giver",
        name: "등불 나눔이",
        description: "다른 사람에게 등불을 500개 켜줬습니다",
        type: "achievement",
        isHidden: true,
    },

    // 공학 특화 칭호
    {
        id: "engineering_curious",
        name: "변수 연구자",
        description: "공학 카테고리에서 질문 글을 10개 작성했습니다",
        type: "achievement",
    },
    {
        id: "engineering_focused",
        name: "함수 마스터",
        description: "공학 카테고리에만 집중해서 글 40개를 작성했습니다",
        type: "achievement",
        isHidden: true,
    },
    {
        id: "engineering_first_light",
        name: "공학자의 첫 등불",
        description: "공학 카테고리에서 처음으로 등불을 받았습니다",
        type: "achievement",
    },
    {
        id: "engineering_destroyer",
        name: "방정식 해결사",
        description: "공학 카테고리에서 답변을 50개 작성했습니다",
        type: "achievement",
    },

    // 추가 히든 칭호
    {
        id: "diligent_visitor",
        name: "성실한 방문자",
        description: "최근 30일 중 27일 이상 로그인했습니다",
        type: "achievement",
        isHidden: true,
    },
    {
        id: "popular_questioner",
        name: "인기 질문러",
        description: "내가 올린 질문 중 하나가 등불 30개 이상을 받아, 많은 사람들이 공감한 질문이 되었습니다",
        type: "achievement",
        isHidden: true,
    },
    {
        id: "specialized_replier",
        name: "특화 답변가",
        description: "한 카테고리에서 답변 200개를 작성했습니다",
        type: "achievement",
        isHidden: true,
    },
];


export function TitlesCollection({
    onBack,
    userTitles,
    equippedTitle,
    onTitleEquip,
    onTitleUnequip,
}: TitlesCollectionProps) {
    // 히든 여부에 따라 분리
    const visibleAchievementTitles = ACHIEVEMENT_TITLES.filter((title) => !title.isHidden);
    const hiddenAchievementTitles = ACHIEVEMENT_TITLES.filter((title) => title.isHidden);

    // ✅ 수정 후 코드 (같은 자리 전체 교체)

    // 히든 칭호 중에서 "내가 실제로 획득한 것들"만
    const ownedHiddenTitles = hiddenAchievementTitles.filter((title) =>
        userTitles.includes(title.id)
    );

    // 화면에 실제로 표시될 수 있는 모든 칭호
    const allVisibleTitles: Title[] = [
        ...SHOP_TITLES,
        ...visibleAchievementTitles,
        ...ownedHiddenTitles,
    ];

    const totalTitles = allVisibleTitles.length;
    const unlockedTitles = userTitles.filter((id) =>
        allVisibleTitles.some((title) => title.id === id)
    ).length;

    return (
        <div className="w-full h-full bg-background flex flex-col">
            {/* 헤더 */}
            <header className="bg-card/98 glass-effect border-b border-border/60 flex-shrink-0 z-40 safe-top">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="touch-target rounded-xl hover:bg-accent/80 transition-all duration-200"
                                onClick={onBack}
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                            <h1 className="text-lg font-bold">칭호 도감</h1>
                        </div>
                    </div>
                </div>
            </header>

            {/* 컨텐츠 영역 */}
            <div className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-6">
                {/* 진행도 카드 */}
                <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 min-h-[120px]">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between min-h-[72px]">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-yellow-500" />
                                    <span className="text-lg font-bold text-gray-100 dark:text-gray-100">
                                        칭호 도감
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    수집 진행도: {unlockedTitles}/{totalTitles}
                                </p>
                            </div>
                            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                                {totalTitles > 0
                                    ? Math.round((unlockedTitles / totalTitles) * 100)
                                    : 0}%
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 일반 칭호 섹션 (상점) */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <ShoppingBag className="w-5 h-5 text-gray-300 dark:text-gray-300" />
                        <h3 className="text-lg font-bold text-gray-300 dark:text-gray-400">
                            일반 칭호
                        </h3>
                        <Badge variant="outline" className="text-xs">
                            {SHOP_TITLES.length}개
                        </Badge>
                    </div>
                    <div className="space-y-2">
                        {SHOP_TITLES.map((title) => {
                            const isUnlocked = userTitles.includes(title.id);
                            const isEquipped = equippedTitle === title.id;

                            return (
                                <Card
                                    key={title.id}
                                    className={`transition-all min-h-[88px] ${isUnlocked
                                        ? "border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/10"
                                        : "opacity-50 bg-gray-50 dark:bg-gray-900/20"
                                        }`}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between gap-3 min-h-[56px]">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div
                                                    className={`p-2 rounded-lg ${isUnlocked
                                                        ? "bg-purple-100 dark:bg-purple-900/30"
                                                        : "bg-gray-200 dark:bg-gray-800"
                                                        }`}
                                                >
                                                    <Trophy
                                                        className={`w-5 h-5 ${isUnlocked
                                                            ? "text-purple-600 dark:text-purple-400"
                                                            : "text-gray-400 dark:text-gray-600"
                                                            }`}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold truncate text-gray-300 dark:text-gray-400">
                                                            {title.name}
                                                        </span>
                                                        {isEquipped && (
                                                            <Badge
                                                                variant="default"
                                                                className="text-xs bg-purple-600 text-white shrink-0"
                                                            >
                                                                장착 중
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                                        {title.description}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                        {/* 루멘 가격 */}
                                                        <div className="flex items-center gap-1">
                                                            <Sparkles className="w-3 h-3 text-amber-500" />
                                                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                                                {title.price} 루멘
                                                            </span>
                                                        </div>

                                                        {/* 구매 조건: 답변 등불 */}
                                                        {title.requiredReplyLanterns !== undefined && title.requiredReplyLanterns > 0 && (
                                                            <div className="flex items-center gap-1">
                                                                <LanternFilledIcon className="w-3 h-3 text-yellow-500" />
                                                                <span className="text-[10px] text-gray-600 dark:text-gray-400">
                                                                    답변 등불 {title.requiredReplyLanterns}개 이상
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* 구매 조건: 길잡이 채택 수 */}
                                                        {title.requiredGuideCount !== undefined && title.requiredGuideCount > 0 && (
                                                            <div className="flex items-center gap-1">
                                                                <Compass className="w-3 h-3 text-sky-500" />
                                                                <span className="text-[10px] text-gray-600 dark:text-gray-400">
                                                                    길잡이 채택 {title.requiredGuideCount}회 이상
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                </div>
                                            </div>
                                            <div className="shrink-0">
                                                {isUnlocked ? (
                                                    isEquipped ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={onTitleUnequip}
                                                        >
                                                            해제
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            // eslint-disable-next-line react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop
                                                            onClick={() => onTitleEquip(title.id)}
                                                        >
                                                            장착
                                                        </Button>
                                                    )
                                                ) : (
                                                    <Badge variant="outline" className="text-xs">
                                                        <Lock className="w-3 h-3 mr-1" />
                                                        잠김
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* 히든 칭호 섹션 - 히든 칭호를 한 개 이상 가진 경우에만 표시 */}
                {ownedHiddenTitles.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                            <Trophy className="w-5 h-5 text-gray-300 dark:text-gray-300" />
                            <h3 className="text-lg font-bold text-gray-300 dark:text-gray-300">
                                히든 칭호
                            </h3>
                            <Badge variant="outline" className="text-xs">
                                {ownedHiddenTitles.length}개
                            </Badge>
                        </div>
                        <div className="space-y-2">
                            {ownedHiddenTitles.map((title) => {
                                const isEquipped = equippedTitle === title.id;

                                return (
                                    <Card
                                        key={title.id}
                                        className="transition-all min-h-[88px] border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20"
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between gap-3 min-h-[56px]">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                                                        <Sparkles className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-bold truncate text-gray-300 dark:text-gray-200">
                                                                {title.name}
                                                            </span>
                                                            <Badge
                                                                variant="default"
                                                                className="text-xs bg-amber-600 text-white shrink-0"
                                                            >
                                                                히든
                                                            </Badge>
                                                            {isEquipped && (
                                                                <Badge
                                                                    variant="default"
                                                                    className="text-xs bg-purple-600 text-white shrink-0"
                                                                >
                                                                    장착 중
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                                                            {title.description}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="shrink-0">
                                                    {isEquipped ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={onTitleUnequip}
                                                        >
                                                            해제
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            // eslint-disable-next-line react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop
                                                            onClick={() => onTitleEquip(title.id)}
                                                        >
                                                            장착
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
                )}


                {/* 특별 칭호 섹션 (업적) - 히든이 아닌 업적 칭호만 표시 */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                        <Trophy className="w-5 h-5 text-gray-300 dark:text-gray-300" />
                        <h3 className="text-lg font-bold text-gray-300 dark:text-gray-300">
                            업적 칭호
                        </h3>
                        <Badge variant="outline" className="text-xs">
                            {visibleAchievementTitles.length}개
                        </Badge>
                    </div>
                    <div className="space-y-2">
                        {visibleAchievementTitles.map((title) => {
                            const isUnlocked = userTitles.includes(title.id);
                            const isEquipped = equippedTitle === title.id;

                            return (
                                <Card
                                    key={title.id}
                                    className={`transition-all min-h-[88px] ${isUnlocked
                                        ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/10"
                                        : "opacity-30 bg-gray-50 dark:bg-gray-900/20"
                                        }`}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between gap-3 min-h-[56px]">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div
                                                    className={`p-2 rounded-lg ${isUnlocked
                                                        ? "bg-amber-100 dark:bg-amber-900/30"
                                                        : "bg-gray-200 dark:bg-gray-800"
                                                        }`}
                                                >
                                                    {isUnlocked ? (
                                                        <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                                    ) : (
                                                        <Lock className="w-5 h-5 text-gray-400 dark:text-gray-600" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {/* 일반 업적 칭호는 잠겨 있어도 이름 그대로 보여줌 */}
                                                        <span className="font-bold truncate text-gray-300 dark:text-gray-400">
                                                            {title.name}
                                                        </span>
                                                        {isEquipped && (
                                                            <Badge
                                                                variant="default"
                                                                className="text-xs bg-amber-600 text-white shrink-0"
                                                            >
                                                                장착 중
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    {/* 설명도 항상 노출 */}
                                                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                                                        {title.description}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="shrink-0">
                                                {isUnlocked ? (
                                                    isEquipped ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={onTitleUnequip}
                                                        >
                                                            해제
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            // eslint-disable-next-line react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop
                                                            onClick={() => onTitleEquip(title.id)}
                                                        >
                                                            장착
                                                        </Button>
                                                    )
                                                ) : (
                                                    <Badge variant="outline" className="text-xs">
                                                        <Lock className="w-3 h-3 mr-1" />
                                                        미획득
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
