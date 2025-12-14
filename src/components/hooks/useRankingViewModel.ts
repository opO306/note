import { useEffect, useMemo, useState } from "react";
import type { Firestore } from "firebase/firestore";
import { useRankingData, type RankingItem, type WeeklyReward } from "./useRankingData";
import { useUserProfiles, type UserProfileLite } from "@/components/MainScreen/hooks/useUserProfiles";

export type RankingMap = Record<
  string,
  {
    author: string;
    authorUid: string | null;
    count: number;
  }
>;

const mapRankingMapToItems = (rankingMap?: RankingMap, limitCount = 5): RankingItem[] =>
  Object.values(rankingMap ?? {})
    .map((entry) => ({
      author: entry.author,
      count: entry.count,
      authorUid: entry.authorUid,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limitCount);

const getNextResetTimeMs = (from: Date) => {
  const nextMonday = new Date(from);
  const daysUntilMonday = (7 - from.getDay() + 1) % 7 || 7;
  nextMonday.setDate(from.getDate() + daysUntilMonday);
  nextMonday.setHours(8, 0, 0, 0);

  if (from.getDay() === 1 && from.getHours() < 8) {
    nextMonday.setDate(from.getDate());
  }

  return nextMonday.getTime();
};

export function useWeeklyResetCountdown() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    const nextReset = getNextResetTimeMs(new Date(now));
    const diff = Math.max(0, nextReset - now);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return { days, hours };
  }, [now]);
}

interface UseRankingViewModelParams {
  db: Firestore;
  weeklyGuideRanking: RankingMap;
  totalGuideRanking: RankingMap;
  weeklyLanternRanking: RankingMap;
}

export interface UseRankingViewModelResult {
  fallbackWeeklyGuide: RankingItem[];
  fallbackWeeklyLantern: RankingItem[];
  weeklyGuideForView: RankingItem[];
  weeklyLanternForView: RankingItem[];
  totalGuideData: RankingItem[];
  lastWeekGuideRewards: WeeklyReward[];
  lastWeekLanternRewards: WeeklyReward[];
  userProfiles: Record<string, UserProfileLite>;
  isLoading: boolean;
  resetCountdown: { days: number; hours: number };
}

export function useRankingViewModel({
  db,
  weeklyGuideRanking,
  totalGuideRanking,
  weeklyLanternRanking,
}: UseRankingViewModelParams): UseRankingViewModelResult {
  const fallbackWeeklyGuide = useMemo(
    () => mapRankingMapToItems(weeklyGuideRanking),
    [weeklyGuideRanking]
  );

  const fallbackWeeklyLantern = useMemo(
    () => mapRankingMapToItems(weeklyLanternRanking),
    [weeklyLanternRanking]
  );

  const totalGuideData = useMemo<RankingItem[]>(
    () => mapRankingMapToItems(totalGuideRanking),
    [totalGuideRanking]
  );

  const {
    weeklyGuideData,
    weeklyLanternData,
    visibleWeeklyGuide,
    visibleWeeklyLantern,
    lastWeekGuideRewards,
    lastWeekLanternRewards,
    isLoading,
  } = useRankingData(db, fallbackWeeklyGuide, fallbackWeeklyLantern);

  const weeklyGuideForProfiles =
    weeklyGuideData.length > 0 ? weeklyGuideData : fallbackWeeklyGuide;
  const weeklyLanternForProfiles =
    weeklyLanternData.length > 0 ? weeklyLanternData : fallbackWeeklyLantern;

  const weeklyGuideForView =
    visibleWeeklyGuide.length > 0 ? visibleWeeklyGuide : fallbackWeeklyGuide;
  const weeklyLanternForView =
    visibleWeeklyLantern.length > 0 ? visibleWeeklyLantern : fallbackWeeklyLantern;

  const allRankingUids = useMemo(
    () => {
      // 활성 탭에 따라 필요한 UID만 수집 (성능 최적화)
      const uids = new Set<string>();

      // 활성 탭이 "weekly" 또는 "lantern"일 때만 해당 데이터의 UID 수집
      // "total" 탭은 이미 로드된 데이터만 사용
      if (weeklyGuideForProfiles.length > 0) {
        weeklyGuideForProfiles.forEach(item => {
          if (item.authorUid) uids.add(item.authorUid);
        });
      }
      if (weeklyLanternForProfiles.length > 0) {
        weeklyLanternForProfiles.forEach(item => {
          if (item.authorUid) uids.add(item.authorUid);
        });
      }
      if (totalGuideData.length > 0) {
        totalGuideData.forEach(item => {
          if (item.authorUid) uids.add(item.authorUid);
        });
      }

      return Array.from(uids);
    },
    [weeklyGuideForProfiles, totalGuideData, weeklyLanternForProfiles]
  );

  const userProfiles: Record<string, UserProfileLite> = useUserProfiles(allRankingUids);
  const resetCountdown = useWeeklyResetCountdown();

  return {
    fallbackWeeklyGuide,
    fallbackWeeklyLantern,
    weeklyGuideForView,
    weeklyLanternForView,
    totalGuideData,
    lastWeekGuideRewards,
    lastWeekLanternRewards,
    userProfiles,
    isLoading,
    resetCountdown,
  };
}

