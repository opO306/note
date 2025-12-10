import { useState, useEffect, useMemo } from "react";
import { useScrollRestoration } from "./hooks/useScrollRestoration";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { Badge } from "./ui/badge";
import { useUserProfiles, type UserProfileLite } from "@/components/MainScreen/hooks/useUserProfiles";
import { getTitleLabelById } from "@/data/titleData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  ArrowLeft,
  Crown,
  Award,
  Flame,
  TrendingUp,
  Star,
  Zap,
  Calendar
} from "lucide-react";
import { db } from "../firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

interface RankingEntry {
  author: string;
  authorUid: string | null;
  count: number;
}

type RankingMap = Record<string, RankingEntry>;

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

interface WeeklyReward {
  rank: number;
  author: string;
  lumens: number;
  weekEnding: string;
}

interface RankingItem {
  author: string;
  count: number;
  authorUid?: string | null;
}

export function RankingScreen({
  onBack,
  weeklyGuideRanking,
  totalGuideRanking,
  weeklyLanternRanking,
}: RankingScreenProps) {

  const [activeTab, setActiveTab] = useState("weekly");

  // Scroll restoration
  const scrollRef = useScrollRestoration({ key: `ranking-${activeTab}` });

  // 다음 초기화 시간 계산 (매주 월요일 08:00)
  const getNextResetTime = () => {
    const now = new Date();
    const nextMonday = new Date();
    const daysUntilMonday = (7 - now.getDay() + 1) % 7 || 7;
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(8, 0, 0, 0);

    if (now.getDay() === 1 && now.getHours() < 8) {
      // 오늘이 월요일이고 8시 이전이면 오늘 8시
      nextMonday.setDate(now.getDate());
    }

    return nextMonday;
  };

  const nextReset = getNextResetTime();
  const timeUntilReset = nextReset.getTime() - new Date().getTime();
  const daysUntilReset = Math.floor(timeUntilReset / (1000 * 60 * 60 * 24));
  const hoursUntilReset = Math.floor((timeUntilReset % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  // 🔹 서버에서 가져온 "주간" 랭킹 데이터 (weekly_stats 기준)
  const [weeklyGuideData, setWeeklyGuideData] = useState<RankingItem[]>([]);
  const [weeklyLanternData, setWeeklyLanternData] = useState<RankingItem[]>([]);

  // 🔹 누적 길잡이 랭킹은 기존처럼 props 기반으로 계산
  const totalGuideData = useMemo<RankingItem[]>(
    () =>
      Object.values(totalGuideRanking ?? {})
        .map((entry) => ({
          author: entry.author,
          count: entry.count,
          authorUid: entry.authorUid,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    [totalGuideRanking],
  );

  // 지난 주 길잡이 보상 내역
  const [lastWeekGuideRewards, setLastWeekGuideRewards] = useState<WeeklyReward[]>([]);

  // 지난 주 등불 보상 내역
  const [lastWeekLanternRewards, setLastWeekLanternRewards] = useState<WeeklyReward[]>([]);


  // 🔹 Firestore에서 주간/누적 랭킹 정보 불러오기
  // 🔹 Firestore에서 "서버 기준 주간 랭킹 + 보상 내역" 불러오기
  useEffect(() => {
    const fetchWeeklyStats = async () => {
      try {
        // weekly_stats 컬렉션에서 periodEnd 기준으로 가장 최근 문서 1개만 가져옵니다.
        const statsCol = collection(db, "weekly_stats");
        const q = query(statsCol, orderBy("periodEnd", "desc"), limit(1));
        const snap = await getDocs(q);

        if (snap.empty) {
          setWeeklyGuideData([]);
          setWeeklyLanternData([]);
          setLastWeekGuideRewards([]);
          setLastWeekLanternRewards([]);
          return;
        }

        const docSnap = snap.docs[0];
        const data: any = docSnap.data();

        // 🔹 periodEnd(타임스탬프) → "YYYY-MM-DD" 문자열로 변환
        let weekEnding = "";
        const periodEnd = data.periodEnd;
        if (periodEnd && typeof periodEnd.toDate === "function") {
          const d: Date = periodEnd.toDate();
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          weekEnding = `${y}-${m}-${day}`;
        } else if (typeof data.weekEnding === "string") {
          // 혹시 서버에서 weekEnding 문자열을 넣어줄 경우 대비
          weekEnding = data.weekEnding;
        }

        // 🔹 서버에서 계산된 주간 랭킹 (calcWeeklyStats가 저장한 guideRanking / lanternRanking)
        const serverGuideRanking = Array.isArray(data.guideRanking)
          ? data.guideRanking
          : [];
        const serverLanternRanking = Array.isArray(data.lanternRanking)
          ? data.lanternRanking
          : [];

        // 1) 화면에 바로 쓸 주간 길잡이 / 등불 랭킹 (TOP 5만)
        const mappedWeeklyGuide: RankingItem[] = serverGuideRanking
          .slice(0, 5)
          .map((r: any) => ({
            author: String(r.nickname ?? ""),
            count:
              typeof r.count === "number" ? r.count : 0,
            authorUid:
              typeof r.uid === "string" ? r.uid : null,
          }));

        const mappedWeeklyLantern: RankingItem[] = serverLanternRanking
          .slice(0, 5)
          .map((r: any) => ({
            author: String(r.nickname ?? ""),
            count:
              typeof r.count === "number" ? r.count : 0,
            authorUid:
              typeof r.uid === "string" ? r.uid : null,
          }));

        setWeeklyGuideData(mappedWeeklyGuide);
        setWeeklyLanternData(mappedWeeklyLantern);

        // 2) "지난 주 보상" 카드에 쓸 데이터
        //    → guideRanking / lanternRanking 안에 있는 rank, rewardLumen 사용
        setLastWeekGuideRewards(
          serverGuideRanking.map((r: any, index: number) => ({
            rank: typeof r.rank === "number" ? r.rank : index + 1,
            author: String(r.nickname ?? ""),
            lumens:
              typeof r.rewardLumen === "number" ? r.rewardLumen : 0,
            weekEnding,
          })),
        );

        setLastWeekLanternRewards(
          serverLanternRanking.map((r: any, index: number) => ({
            rank: typeof r.rank === "number" ? r.rank : index + 1,
            author: String(r.nickname ?? ""),
            lumens:
              typeof r.rewardLumen === "number" ? r.rewardLumen : 0,
            weekEnding,
          })),
        );
      } catch (error) {
        console.error("주간 랭킹 데이터 불러오기 실패:", error);
        // 실패 시에는 단순히 빈 상태로 유지 → 화면에서는 "아직 랭킹이 없어요" 문구가 나옵니다.
        setWeeklyGuideData([]);
        setWeeklyLanternData([]);
        setLastWeekGuideRewards([]);
        setLastWeekLanternRewards([]);
      }
    };

    fetchWeeklyStats();
  }, []);

  // 🔹 랭킹에 등장하는 모든 유저 UID 모으기
  const allRankingUids = Array.from(
    new Set(
      [
        ...weeklyGuideData,
        ...totalGuideData,
        ...weeklyLanternData,
      ]
        .map((item) => item.authorUid)
        .filter((uid): uid is string => !!uid),
    ),
  );

  // 🔹 공통 프로필 훅으로 실시간 프로필/칭호 구독
  const userProfiles: Record<string, UserProfileLite> = useUserProfiles(allRankingUids);

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

  const renderRankingList = (data: RankingItem[], type: "guide" | "lantern") => {
    return (
      <div className="space-y-3">
        {data.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              {/* Empty ranking state with visual icon */}
              <div className="relative mb-6">
                <div
                  className={`absolute inset-0 ${type === "guide"
                    ? "bg-amber-500/30 dark:bg-amber-400/30"
                    : "bg-yellow-500/30 dark:bg-yellow-400/30"
                    } blur-2xl rounded-full`}
                ></div>
                <div
                  className={`relative w-24 h-24 rounded-full ${type === "guide"
                    ? "bg-amber-100 dark:bg-amber-900/40 border-4 border-amber-400 dark:border-amber-600"
                    : "bg-yellow-100 dark:bg-yellow-900/40 border-4 border-yellow-400 dark:border-yellow-600"
                    } shadow-lg flex items-center justify-center mx-auto`}
                >
                  {type === "guide" ? (
                    <Star className="w-14 h-14 text-amber-900 dark:text-amber-200" strokeWidth={2.5} />
                  ) : (
                    <Zap className="w-14 h-14 text-yellow-900 dark:text-yellow-200" strokeWidth={2.5} />
                  )}
                </div>
              </div>
              <h3 className="font-medium text-foreground mb-2">아직 랭킹이 없어요</h3>
              <p className="text-sm text-muted-foreground">
                {type === "guide"
                  ? "길잡이 채택이 이루어지면 랭킹이 표시됩니다"
                  : "등불이 밝혀지면 랭킹이 표시됩니다"}
              </p>
            </CardContent>
          </Card>
        ) : (
          data.map((item, index) => {
            // 🔹 이 랭킹 항목에 해당하는 실시간 프로필/칭호 정보
            const profile =
              item.authorUid && userProfiles[item.authorUid]
                ? userProfiles[item.authorUid]
                : undefined;

            const liveTitleId = profile?.currentTitleId ?? null;
            const liveTitleLabel = getTitleLabelById(liveTitleId);
            const avatarSrc = profile?.profileImage;

            return (
              <Card
                key={item.author}
                className={`list-optimized ${index < 3 ? "bg-gradient-to-r from-muted/50 to-muted/30" : ""
                  }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">{getRankIcon(index)}</div>
                    <OptimizedAvatar
                      src={avatarSrc || undefined}
                      alt={item.author ? `${item.author}님의 프로필` : "프로필 이미지"}
                      fallbackText={item.author?.charAt(0)?.toUpperCase() || "?"}
                      className="w-10 h-10"
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
          })
        )}
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="bg-card/95 backdrop-blur-xl border-b border-border flex-shrink-0 safe-top">
        <div className="px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h1 className="font-medium">랭킹</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div ref={scrollRef} className="flex-1 scroll-container">
        <div className="p-4 pb-24">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 !h-8">
              <TabsTrigger value="weekly" className="text-xs">주간 길잡이</TabsTrigger>
              <TabsTrigger value="total" className="text-xs">누적 길잡이</TabsTrigger>
              <TabsTrigger value="lantern" className="text-xs">주간 등불</TabsTrigger>
            </TabsList>

            <TabsContent value="weekly" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        이번 주 길잡이 채택 랭킹
                      </p>
                      <p className="text-xs text-muted-foreground">
                        초기화: {daysUntilReset}일 {hoursUntilReset}시간 후
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Weekly
                  </Badge>
                </div>

                {/* 보상 안내 */}
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

                {/* 지난 주 보상 내역 */}
                {lastWeekGuideRewards.length > 0 && (
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <Award className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm font-medium">지난 주 보상 ({lastWeekGuideRewards[0].weekEnding} 주)</p>
                      </div>
                      <div className="space-y-2">
                        {lastWeekGuideRewards.map((reward) => (
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
                )}

                {renderRankingList(weeklyGuideData, "guide")}
              </div>
            </TabsContent>

            <TabsContent value="total" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      누적 길잡이 채택 랭킹 (전체)
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Total
                  </Badge>
                </div>
                {renderRankingList(totalGuideData, "guide")}
              </div>
            </TabsContent>

            <TabsContent value="lantern" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        이번 주 받은 등불 랭킹
                      </p>
                      <p className="text-xs text-muted-foreground">
                        초기화: {daysUntilReset}일 {hoursUntilReset}시간 후
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Weekly
                  </Badge>
                </div>

                {/* 보상 안내 */}
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

                {/* 지난 주 등불 보상 내역 */}
                {lastWeekLanternRewards.length > 0 && (
                  <Card>
                    <CardContent className="p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <Award className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm font-medium">지난 주 보상 ({lastWeekLanternRewards[0].weekEnding} 주)</p>
                      </div>
                      <div className="space-y-2">
                        {lastWeekLanternRewards.map((reward) => (
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
                )}

                {renderRankingList(weeklyLanternData, "lantern")}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}