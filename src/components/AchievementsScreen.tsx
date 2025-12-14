// AchievementsScreen.tsx

import { useMemo } from 'react';
import { useScrollRestoration } from './hooks/useScrollRestoration';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ArrowLeft, Trophy, Lock } from 'lucide-react'; // Lock 아이콘 추가
import { useAchievements } from './useAchievements';
import {
    allAchievements,
    getCategoryName,
    Achievement // (권장) achievements.ts에서 타입을 export 한다고 가정
} from './achievements';

interface AchievementsScreenProps {
    onBack: () => void;
    userNickname?: string;
    isDarkMode?: boolean;
}

// 타입 정의가 achievements.ts에 없다면 여기서 확장하여 사용
interface AchievementWithMeta extends Omit<Achievement, 'hidden'> {
    hidden?: boolean;
}

export function AchievementsScreen({ onBack }: AchievementsScreenProps) {
    const scrollRef = useScrollRestoration({ key: 'achievements' });

    const {
        isAchievementUnlocked,
        getAchievementInfo,
    } = useAchievements();

    // 1. 최적화: 렌더링 시마다 필터링하지 않도록 useMemo 사용
    const visibleAchievements = useMemo(() => {
        return allAchievements.filter((achievement) => {
            const typedAchievement = achievement as AchievementWithMeta;

            // 히든 업적: 달성한 경우에만 표시
            if (typedAchievement.hidden) {
                return isAchievementUnlocked(achievement.id);
            }
            // 일반 업적: 항상 표시
            return true;
        });
    }, [isAchievementUnlocked]);

    // 2. 최적화: 통계 계산 메모이제이션
    const { achievedCount, totalCount, progressPercentage } = useMemo(() => {
        const achieved = visibleAchievements.filter(a => isAchievementUnlocked(a.id)).length;
        const total = visibleAchievements.length;
        const percentage = total > 0 ? (achieved / total) * 100 : 0;

        return { achievedCount: achieved, totalCount: total, progressPercentage: percentage };
    }, [visibleAchievements, isAchievementUnlocked]);

    return (
        <div className="w-full h-full bg-background text-foreground flex flex-col overflow-hidden">
            {/* Header */}
            <header className="bg-card/95 backdrop-blur-xl border-b border-border flex-shrink-0 safe-top z-10">
                <div className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                        <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h1 className="font-medium text-lg">업적</h1>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto no-scrollbar p-4 pb-24 space-y-4"
            >
                {/* Progress Card */}
                <Card className="border-border/50 shadow-sm">
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-3xl font-bold text-primary flex items-baseline gap-1">
                                        {achievedCount}
                                        <span className="text-sm font-normal text-muted-foreground">/ {totalCount}</span>
                                    </h2>
                                    <p className="text-sm text-muted-foreground mt-1">현재 달성도</p>
                                </div>
                                <div className="p-3 bg-amber-500/10 rounded-full">
                                    <Trophy className="w-8 h-8 text-amber-500" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Progress value={progressPercentage} className="h-2.5" />
                                <p className="text-xs text-right text-muted-foreground">
                                    {Math.round(progressPercentage)}% 완료
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Achievements List */}
                <div className="space-y-3">
                    {visibleAchievements.map(achievement => {
                        const isUnlocked = isAchievementUnlocked(achievement.id);
                        const isHidden = (achievement as AchievementWithMeta).hidden;
                        const achievementInfo = getAchievementInfo(achievement.id);

                        return (
                            <Card
                                key={achievement.id}
                                className={`transition-colors duration-200 ${!isUnlocked ? "bg-muted/30 border-dashed border-border" : "bg-card border-border shadow-sm"
                                    }`}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-4">
                                        {/* Icon / Status Indicator */}
                                        <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${isUnlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                            }`}>
                                            {isUnlocked ? (
                                                <Trophy className="w-5 h-5" />
                                            ) : (
                                                <Lock className="w-5 h-5 opacity-50" />
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1 gap-2">
                                                <h3 className={`font-medium truncate ${!isUnlocked && "text-muted-foreground"}`}>
                                                    {achievement.name}
                                                </h3>

                                                {/* 뱃지 영역 */}
                                                <div className="flex-shrink-0 flex gap-1.5">
                                                    {isHidden && isUnlocked && (
                                                        <Badge variant="outline" className="text-[10px] px-1.5 h-5 border-amber-500/50 text-amber-600 bg-amber-500/5">
                                                            히든
                                                        </Badge>
                                                    )}
                                                    {isUnlocked ? (
                                                        <Badge variant="default" className="text-[10px] px-1.5 h-5">
                                                            달성
                                                        </Badge>
                                                    ) : (
                                                        // 잠겨 있어도 카테고리는 보여주는 것이 일반적 (도전 욕구 자극)
                                                        <Badge variant="outline" className="text-[10px] px-1.5 h-5 text-muted-foreground">
                                                            {getCategoryName(achievement.category)}
                                                        </Badge>
                                                    )}

                                                    {/* 달성 시 카테고리 표시 (선택 사항: 위 로직과 합쳐도 됨) */}
                                                    {isUnlocked && (
                                                        <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                                                            {getCategoryName(achievement.category)}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>

                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                {achievement.description}
                                            </p>

                                            {isUnlocked && achievementInfo?.achievedAt && (
                                                <p className="text-xs text-muted-foreground/70 mt-2 flex items-center gap-1">
                                                    <span>달성일: {new Date(achievementInfo.achievedAt).toLocaleDateString("ko-KR")}</span>
                                                </p>
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
    );
}