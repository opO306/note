// src/components/RankingScreen.tsx
import React, { useCallback, useMemo, useState } from "react";
import { useScrollRestoration } from "./hooks/useScrollRestoration";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ArrowLeft, Crown, Award, Flame, TrendingUp, Star, Zap, Calendar } from "lucide-react";

type RankItem = { author: string; count: number };

export interface RankingScreenProps {
    onBack: () => void;
    weeklyGuideRanking: Record<string, number>;
}

function getNextWeeklyReset(): Date {
    const now = new Date();
    const dow = now.getDay(); // 0 Sun
    const base = new Date(now);
    const diffToMon = (1 - dow + 7) % 7;
    base.setDate(now.getDate() + diffToMon);
    base.setHours(8, 0, 0, 0);
    if (diffToMon === 0 && now.getTime() >= base.getTime()) {
        base.setDate(base.getDate() + 7);
    }
    return base;
}

const RankIcon = React.memo(function RankIcon({ index }: { index: number }) {
    if (index === 0) return <Crown className="w-5 h-5 text-amber-500" />;
    if (index === 1) return <Award className="w-5 h-5 text-zinc-400" />;
    if (index === 2) return <Flame className="w-5 h-5 text-amber-700" />;
    return (
        <div className="w-5 h-5 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[10px]">
            {index + 1}
        </div>
    );
});

const RankBadge = React.memo(function RankBadge({ index }: { index: number }) {
    if (index === 0) return <Badge className="text-[10px] bg-amber-500 text-white">1위</Badge>;
    if (index === 1) return <Badge variant="secondary" className="text-[10px]">2위</Badge>;
    if (index === 2) return <Badge variant="outline" className="text-[10px]">3위</Badge>;
    return null;
});

const RankRow = React.memo(function RankRow({
    index,
    item,
    type,
}: { index: number; item: RankItem; type: "guide" | "lantern" }) {
    return (
        <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
                <RankIcon index={index} />
            </div>
            <Avatar className="w-10 h-10">
                <AvatarImage />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {item.author?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{item.author}</p>
                    <RankBadge index={index} />
                </div>
                <div className="flex items-center gap-1 mt-1">
                    {type === "guide" ? (
                        <>
                            <Star className="w-3 h-3 text-amber-500" />
                            <span className="text-xs text-muted-foreground">길잡이 {item.count}회</span>
                        </>
                    ) : (
                        <>
                            <Zap className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs text-muted-foreground">등불 {item.count}개</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
});

export const RankingScreen = React.memo(function RankingScreen({
    onBack,
    weeklyGuideRanking,
}: RankingScreenProps) {
    const [activeTab, setActiveTab] = useState<"weekly" | "total" | "lantern">("weekly");
    const scrollRef = useScrollRestoration({ key: `ranking-${activeTab}` });

    const handleBack = useCallback(() => onBack(), [onBack]);
    const onTabValueChange = useCallback((value: string) => {
        if (value === "total" || value === "lantern" || value === "weekly") setActiveTab(value);
    }, []);

    const nextReset = useMemo(() => getNextWeeklyReset(), []);
    const remaining = useMemo(() => {
        const diff = nextReset.getTime() - Date.now();
        const days = Math.max(0, Math.floor(diff / 86400000));
        const hours = Math.max(0, Math.floor((diff % 86400000) / 3600000));
        return { days, hours };
    }, [nextReset]);

    const weeklyGuideTop5 = useMemo<RankItem[]>(() => {
        const entries = Object.entries(weeklyGuideRanking ?? {}) as Array<[string, number]>;
        return entries
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([author, count]) => ({ author, count }));
    }, [weeklyGuideRanking]);

    const totalGuideTop5 = useMemo<RankItem[]>(() => weeklyGuideTop5, [weeklyGuideTop5]);
    const weeklyLanternTop5 = useMemo<RankItem[]>(() => [], []);

    const renderRankingList = useCallback((list: RankItem[], type: "guide" | "lantern") => {
        if (!list || list.length === 0) {
            return (
                <Card className="border-dashed">
                    <CardContent className="p-6 text-center">
                        <div className="flex items-center justify-center mb-2">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                {type === "guide" ? <Star className="w-8 h-8 text-amber-500" /> : <Zap className="w-8 h-8 text-yellow-500" />}
                            </div>
                        </div>
                        <h3 className="font-medium mb-1">아직 랭킹이 없어요</h3>
                        <p className="text-sm text-muted-foreground">
                            {type === "guide" ? "길잡이 채택이 이루어지면 랭킹이 표시됩니다" : "등불이 밝혀지면 랭킹이 표시됩니다"}
                        </p>
                    </CardContent>
                </Card>
            );
        }
        return (
            <Card>
                <CardContent className="p-3 space-y-3">
                    {list.map((item, index) => (
                        <RankRow key={`${type}-${index}-${item.author}`} index={index} item={item} type={type} />
                    ))}
                </CardContent>
            </Card>
        );
    }, []);

    return (
        <div className="w-full h-full bg-background text-foreground flex flex-col">
            <header className="bg-card/95 backdrop-blur-xl border-b border-border flex-shrink-0 safe-top">
                <div className="px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={handleBack} aria-label="뒤로">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            <h1 className="font-medium">랭킹</h1>
                        </div>
                        <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>다음 초기화까지 {remaining.days}일 {remaining.hours}시간</span>
                        </div>
                    </div>
                </div>
            </header>

            <div ref={scrollRef} className="flex-1 scroll-container">
                <div className="max-w-screen-md mx-auto px-4 py-4">
                    <Tabs value={activeTab} onValueChange={onTabValueChange}>
                        <TabsList className="grid grid-cols-3">
                            <TabsTrigger value="weekly">주간</TabsTrigger>
                            <TabsTrigger value="total">누적</TabsTrigger>
                            <TabsTrigger value="lantern">등불</TabsTrigger>
                        </TabsList>

                        <TabsContent value="weekly" className="space-y-3 mt-3">
                            {renderRankingList(weeklyGuideTop5, "guide")}
                            <Card>
                                <CardContent className="p-3">
                                    <div className="flex items-center gap-2 mb-2">
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
                        </TabsContent>

                        <TabsContent value="total" className="space-y-3 mt-3">
                            {renderRankingList(totalGuideTop5, "guide")}
                        </TabsContent>

                        <TabsContent value="lantern" className="space-y-3 mt-3">
                            {renderRankingList(weeklyLanternTop5, "lantern")}
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </div>
    );
});