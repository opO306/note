import React, { useMemo, useState, useCallback } from "react";
import { useScrollRestoration } from "./hooks/useScrollRestoration";
import { type RankingItem, type WeeklyReward } from "./hooks/useRankingData";
import { Virtuoso } from "react-virtuoso";
import {
  useRankingViewModel,
  type RankingMap,
} from "./hooks/useRankingViewModel";
import { Card, CardContent } from "./ui/card";
import { EmptyStateCard } from "./ui/empty-state";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { Badge } from "./ui/badge";
import { type UserProfileLite } from "@/components/MainScreen/hooks/useUserProfiles";
import { getTitleLabelById } from "@/data/titleData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Crown,
  Award,
  Flame,
  TrendingUp,
  Star,
  Zap,
  Calendar,
} from "lucide-react";
import { db } from "../firebase";
import { AppHeader } from "./layout/AppHeader";

interface RankingScreenProps {
  onBack: () => void;
  weeklyGuideRanking: RankingMap;
  totalGuideRanking: RankingMap;
  weeklyLanternRanking: RankingMap;

  onHomeClick?: () => void;
  onBookmarksClick?: () => void;
  onMyPageClick?: () => void;
  onWriteClick?: () => void;
}

interface RankingListProps {
  data: RankingItem[];
  type: "guide" | "lantern";
  loading: boolean;
  userProfiles: Record<string, UserProfileLite>;
  scrollContainer?: HTMLElement | null;
}

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badgeLabel: string;
}

const SectionHeader = React.memo(({ icon, title, subtitle, badgeLabel }: SectionHeaderProps) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-2">
      {icon}
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
    </div>
    <Badge variant="secondary" className="text-xs">
      {badgeLabel}
    </Badge>
  </div>
));

const RewardInfoCard = React.memo(() => (
  <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
    <CardContent className="p-3">
      <div className="flex items-center space-x-2 mb-2">
        <Crown className="w-4 h-4 text-amber-500" />
        <p className="text-sm font-medium">주간 보상</p>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <div>🥇 1위: 루멘 5개</div>
        <div>🥈 2위: 루멘 3개</div>
        <div>🥉 3위: 루멘 1개</div>
      </div>
    </CardContent>
  </Card>
));

interface LastWeekRewardsCardProps {
  rewards: WeeklyReward[];
}

const LastWeekRewardsCard = React.memo(function LastWeekRewardsCard({ rewards }: LastWeekRewardsCardProps) {
  if (rewards.length === 0) return null;
  const weekEnding = rewards[0].weekEnding;

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center space-x-2 mb-2">
          <Award className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-medium">지난 주 보상 ({weekEnding} 주)</p>
        </div>
        <div className="space-y-2">
          {rewards.map((reward) => (
            <div key={reward.author} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-medium">{reward.rank}위</span>
                <span>{reward.author}</span>
              </div>
              <span className="text-amber-500">+{reward.lumens} 루멘</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

export const RankingScreen = React.memo(function RankingScreen({
  onBack,
  weeklyGuideRanking,
  totalGuideRanking,
  weeklyLanternRanking,
}: RankingScreenProps) {
  const [activeTab, setActiveTab] = useState("weekly");

  // Scroll restoration
  const scrollRef = useScrollRestoration({ key: `ranking-${activeTab}` });
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(null);

  // scrollRef와 state 동기화 (Virtuoso에 넘겨주기 위함)
  const handleScrollRef = useCallback((node: HTMLDivElement | null) => {
    if (scrollRef) {
      (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    }
    setScrollContainer(node);
  }, [scrollRef]);

  const {
    weeklyGuideForView,
    weeklyLanternForView,
    totalGuideData,
    lastWeekGuideRewards,
    lastWeekLanternRewards,
    userProfiles,
    isLoading,
    resetCountdown,
  } = useRankingViewModel({
    db,
    weeklyGuideRanking,
    totalGuideRanking,
    weeklyLanternRanking,
  });

  return (
    <div className="w-full h-full bg-background text-foreground flex flex-col overflow-hidden">
      {/* Header */}
      <AppHeader
        title="랭킹"
        icon={<TrendingUp className="w-5 h-5 text-primary" />}
        onBack={onBack}
      />

      {/* Content */}
      <div ref={handleScrollRef} className="flex-1 min-h-0 overflow-y-auto scroll-container">
        <div className="p-4 pb-24">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 !h-8">
              <TabsTrigger value="weekly" className="text-xs">주간 길잡이</TabsTrigger>
              <TabsTrigger value="total" className="text-xs">누적 길잡이</TabsTrigger>
              <TabsTrigger value="lantern" className="text-xs">주간 등불</TabsTrigger>
            </TabsList>

            {/* 한 번에 하나의 섹션만 렌더링하여 초기 렌더 비용 감소 */}
            {activeTab === "weekly" && (
              <TabsContent value="weekly" className="mt-4">
                <div className="space-y-4">
                  <SectionHeader
                    icon={<Calendar className="w-4 h-4 text-muted-foreground" />}
                    title="이번 주 길잡이 채택 랭킹"
                    subtitle={`초기화: ${resetCountdown.days}일 ${resetCountdown.hours}시간 후`}
                    badgeLabel="Weekly"
                  />
                  <RewardInfoCard />
                  <LastWeekRewardsCard rewards={lastWeekGuideRewards} />
                  <RankingList
                    data={weeklyGuideForView}
                    type="guide"
                    loading={isLoading}
                    userProfiles={userProfiles}
                    scrollContainer={scrollContainer}
                  />
                </div>
              </TabsContent>
            )}

            {activeTab === "total" && (
              <TabsContent value="total" className="mt-4">
                <div className="space-y-4">
                  <SectionHeader
                    icon={<Star className="w-4 h-4 text-muted-foreground" />}
                    title="누적 길잡이 채택 랭킹 (전체)"
                    badgeLabel="Total"
                  />
                  <RankingList
                    data={totalGuideData}
                    type="guide"
                    loading={false}
                    userProfiles={userProfiles}
                    scrollContainer={scrollContainer}
                  />
                </div>
              </TabsContent>
            )}

            {activeTab === "lantern" && (
              <TabsContent value="lantern" className="mt-4">
                <div className="space-y-4">
                  <SectionHeader
                    icon={<Zap className="w-4 h-4 text-muted-foreground" />}
                    title="이번 주 받은 등불 랭킹"
                    subtitle={`초기화: ${resetCountdown.days}일 ${resetCountdown.hours}시간 후`}
                    badgeLabel="Weekly"
                  />
                  <RewardInfoCard />
                  <LastWeekRewardsCard rewards={lastWeekLanternRewards} />
                  <RankingList
                    data={weeklyLanternForView}
                    type="lantern"
                    loading={isLoading}
                    userProfiles={userProfiles}
                    scrollContainer={scrollContainer}
                  />
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.weeklyGuideRanking === next.weeklyGuideRanking &&
    prev.totalGuideRanking === next.totalGuideRanking &&
    prev.weeklyLanternRanking === next.weeklyLanternRanking &&
    prev.onBack === next.onBack
  );
});

const getRankIcon = (index: number) => {
  switch (index) {
    case 0:
      return <Crown className="w-5 h-5 text-amber-500" />;
    case 1:
      return <Award className="w-5 h-5 text-gray-400" />;
    case 2:
      return <Flame className="w-5 h-5 text-amber-700" />;
    default:
      return <div className="w-5 h-5 flex items-center justify-center text-sm font-medium text-muted-foreground">{index + 1}</div>;
  }
};

const getRankBadge = (index: number) => {
  switch (index) {
    case 0:
      return <Badge className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white text-xs">1위</Badge>;
    case 1:
      return <Badge className="bg-gradient-to-r from-gray-400 to-gray-500 text-white text-xs">2위</Badge>;
    case 2:
      return <Badge className="bg-gradient-to-r from-amber-700 to-amber-800 text-white text-xs">3위</Badge>;
    default:
      return <Badge variant="outline" className="text-xs">{index + 1}위</Badge>;
  }
};

// 랭킹 리스트 컴포넌트
const RankingList = React.memo(function RankingList({ data, type, loading, userProfiles, scrollContainer }: RankingListProps) {
  const items = useMemo(() => data, [data]);

  if (loading && data.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Card key={idx} className="border border-border/60 bg-card/60">
            <CardContent className="p-4 animate-pulse space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 rounded-full bg-muted/60" />
                <div className="w-10 h-10 rounded-full bg-muted/50" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 bg-muted/50 rounded" />
                  <div className="h-3 w-1/4 bg-muted/40 rounded" />
                </div>
                <div className="w-12 h-6 rounded bg-muted/40" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyStateCard
        icon={
          type === "guide" ? (
            <Star className="w-14 h-14 text-amber-900 dark:text-amber-200" strokeWidth={2.5} />
          ) : (
            <Zap className="w-14 h-14 text-yellow-900 dark:text-yellow-200" strokeWidth={2.5} />
          )
        }
        title="아직 랭킹이 없어요"
        description={
          type === "guide"
            ? "길잡이 채택이 이루어지면 랭킹이 표시됩니다"
            : "등불이 밝혀지면 랭킹이 표시됩니다"
        }
        glowClassName={
          type === "guide"
            ? "bg-amber-500/30 dark:bg-amber-400/30"
            : "bg-yellow-500/30 dark:bg-yellow-400/30"
        }
        circleClassName={
          type === "guide"
            ? "bg-amber-100 dark:bg-amber-900/40 border-4 border-amber-400 dark:border-amber-600"
            : "bg-yellow-100 dark:bg-yellow-900/40 border-4 border-yellow-400 dark:border-yellow-600"
        }
      />
    );
  }

  // Virtuoso를 사용하기 위해 전체 높이를 부모로부터 받아야 함.
  // customScrollParent를 사용하여 부모의 스크롤 컨테이너에 반응하도록 설정.
  return (
    <Virtuoso
      customScrollParent={scrollContainer || undefined}
      data={items}
      itemContent={(index, item) => {
        const profile =
          item.authorUid && userProfiles[item.authorUid]
            ? userProfiles[item.authorUid]
            : undefined;

        return (
          <div className="pb-3 last:pb-0">
            <RankingCard
              key={item.author}
              item={item}
              index={index}
              type={type}
              profile={profile}
            />
          </div>
        );
      }}
    />
  );
});

interface RankingCardProps {
  item: RankingItem;
  index: number;
  type: "guide" | "lantern";
  profile?: UserProfileLite;
}

const RankingCard = React.memo(function RankingCard({ item, index, type, profile }: RankingCardProps) {
  const liveTitleId = profile?.currentTitleId ?? null;
  const liveTitleLabel = getTitleLabelById(liveTitleId);
  const avatarSrc = profile?.profileImage;

  return (
    <Card
      className={`list-optimized ${index < 3
        ? "bg-gradient-to-r from-muted/50 to-muted/30"
        : ""
        }`}
      style={index >= 3 ? { backgroundColor: 'var(--card)' } : undefined}
    >
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">{getRankIcon(index)}</div>
          <OptimizedAvatar
            src={avatarSrc || undefined}
            alt={item.author ? `${item.author}님의 프로필` : "프로필 이미지"}
            nickname={item.author}
            fallbackText={item.author?.charAt(0)?.toUpperCase() || "?"}
            className="w-10 h-10"
            size={40}
            loading="lazy"
            decoding="async"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <p className="font-medium text-sm truncate">{item.author}</p>
              {getRankBadge(index)}
            </div>
            {liveTitleLabel && (
              <Badge
                variant="secondary"
                className="text-xs px-1.5 py-0.5 mt-1 w-fit"
              >
                {liveTitleLabel}
              </Badge>
            )}
            <div className="flex items-center space-x-1 mt-1">
              {type === "guide" ? (
                <>
                  <Star className="w-3 h-3 text-amber-500" />
                  <span className="text-xs text-muted-foreground">
                    길잡이 {item.count}회
                  </span>
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span className="text-xs text-muted-foreground">
                    등불 {item.count}개
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}, (prev, next) => {
  if (prev.index !== next.index) return false;
  if (prev.type !== next.type) return false;
  if (prev.item.author !== next.item.author) return false;
  if (prev.item.count !== next.item.count) return false;
  if (prev.item.authorUid !== next.item.authorUid) return false;
  if (prev.profile?.currentTitleId !== next.profile?.currentTitleId) return false;
  if (prev.profile?.profileImage !== next.profile?.profileImage) return false;
  return true;
});