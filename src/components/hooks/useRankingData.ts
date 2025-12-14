import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, getDocs, type Firestore, type Timestamp } from "firebase/firestore";
import { useStabilizedList } from "./useStabilizedList";

export interface RankingItem {
    author: string;
    count: number;
    authorUid?: string | null;
}

export interface WeeklyReward {
    rank: number;
    author: string;
    lumens: number;
    weekEnding: string;
}

interface WeeklyStatsDoc {
    periodEnd?: Timestamp | { toDate?: () => Date };
    weekEnding?: string;
    guideRanking?: unknown;
    lanternRanking?: unknown;
}

const toWeekEndingString = (doc: WeeklyStatsDoc) => {
    const periodEnd = doc.periodEnd;

    if (periodEnd && typeof (periodEnd as Timestamp).toDate === "function") {
        const date = (periodEnd as Timestamp).toDate();
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    if (typeof doc.weekEnding === "string") {
        return doc.weekEnding;
    }

    return "";
};

const mapRankingItems = (ranking: unknown, weekEnding: string) => {
    const list = Array.isArray(ranking) ? ranking : [];

    const items: RankingItem[] = list.slice(0, 5).map((entry: any) => ({
        author: String(entry?.nickname ?? ""),
        count: typeof entry?.count === "number" ? entry.count : 0,
        authorUid: typeof entry?.uid === "string" ? entry.uid : null,
    }));

    const rewards: WeeklyReward[] = list.map((entry: any, index: number) => ({
        rank: typeof entry?.rank === "number" ? entry.rank : index + 1,
        author: String(entry?.nickname ?? ""),
        lumens: typeof entry?.rewardLumen === "number" ? entry.rewardLumen : 0,
        weekEnding,
    }));

    return { items, rewards };
};

export function useRankingData(
    db: Firestore,
    fallbackGuide: RankingItem[] = [],
    fallbackLantern: RankingItem[] = [],
) {
    const [weeklyGuideData, setWeeklyGuideData] = useState<RankingItem[]>(fallbackGuide);
    const [weeklyLanternData, setWeeklyLanternData] = useState<RankingItem[]>(fallbackLantern);
    const [lastWeekGuideRewards, setLastWeekGuideRewards] = useState<WeeklyReward[]>([]);
    const [lastWeekLanternRewards, setLastWeekLanternRewards] = useState<WeeklyReward[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        let firstLoad = true;

        const fetchWeeklyStats = async () => {
            if (firstLoad) {
                setIsLoading(true);
                firstLoad = false;
            }
            try {
                const statsCol = collection(db, "weekly_stats");
                const q = query(statsCol, orderBy("periodEnd", "desc"), limit(1));
                const snap = await getDocs(q);

                if (!isMounted) return;

                if (snap.empty) {
                    setWeeklyGuideData(fallbackGuide);
                    setWeeklyLanternData(fallbackLantern);
                    setLastWeekGuideRewards([]);
                    setLastWeekLanternRewards([]);
                    return;
                }

                const docSnap = snap.docs[0];
                const data = docSnap.data() as WeeklyStatsDoc;
                const weekEnding = toWeekEndingString(data);

                const { items: guideItems, rewards: guideRewards } = mapRankingItems(
                    data.guideRanking,
                    weekEnding,
                );
                const { items: lanternItems, rewards: lanternRewards } = mapRankingItems(
                    data.lanternRanking,
                    weekEnding,
                );

                setWeeklyGuideData(guideItems);
                setWeeklyLanternData(lanternItems);
                setLastWeekGuideRewards(guideRewards);
                setLastWeekLanternRewards(lanternRewards);
            } catch (error) {
                if (!isMounted) return;
                console.error("주간 랭킹 데이터 불러오기 실패:", error);
                setWeeklyGuideData(fallbackGuide);
                setWeeklyLanternData(fallbackLantern);
                setLastWeekGuideRewards([]);
                setLastWeekLanternRewards([]);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        fetchWeeklyStats();

        return () => {
            isMounted = false;
        };
    }, [db, fallbackGuide, fallbackLantern]);

    const { visible: visibleWeeklyGuide } = useStabilizedList(weeklyGuideData, isLoading);
    const { visible: visibleWeeklyLantern } = useStabilizedList(weeklyLanternData, isLoading);

    return {
        weeklyGuideData,
        weeklyLanternData,
        lastWeekGuideRewards,
        lastWeekLanternRewards,
        visibleWeeklyGuide,
        visibleWeeklyLantern,
        isLoading,
    };
}

