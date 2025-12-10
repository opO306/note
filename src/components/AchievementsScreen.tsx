// AchievementsScreen.tsx - 이모지 없는 깔끔한 업적 화면

import { useScrollRestoration } from './hooks/useScrollRestoration';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useAchievements } from './useAchievements';
import {
    allAchievements,
    getCategoryName
} from './achievements';

interface AchievementsScreenProps {
    onBack: () => void;
    userNickname?: string;
    isDarkMode?: boolean;
}

export function AchievementsScreen({ onBack, userNickname: _userNickname, isDarkMode: _isDarkMode }: AchievementsScreenProps) {
    const scrollRef = useScrollRestoration({ key: 'achievements' });

    const {
        isAchievementUnlocked,
        getAchievementInfo,
    } = useAchievements();

    // 히든 업적: 달성 전까지는 완전히 숨기기
    // 일반 업적: 항상 목록에 표시
    const visibleAchievements = allAchievements.filter((achievement) => {
        // achievements.ts에서 hidden: true 로 표시된 업적만 히든 취급
        if ((achievement as any).hidden) {
            // 히든 업적은 "달성한 후"에만 보이게
            return isAchievementUnlocked(achievement.id);
        }
        // 일반 업적은 항상 보이게
        return true;
    });

    // 진행도는 "지금 화면에 보이는 업적" 기준으로 계산
    const achievedAchievementsList = visibleAchievements.filter(a => isAchievementUnlocked(a.id));
    const achievedCount = achievedAchievementsList.length;
    const totalCount = visibleAchievements.length;
    const progressPercentage = totalCount > 0 ? (achievedCount / totalCount) * 100 : 0;


    return (
        <div className="w-full h-full bg-background text-foreground flex flex-col overflow-hidden">
            <header className="bg-card/95 backdrop-blur-xl border-b border-border flex-shrink-0 safe-top">
                <div className="px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Button variant="ghost" size="icon" onClick={onBack}>
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <h1 className="text-lg font-medium">업적</h1>
                        </div>
                    </div>
                </div>
            </header>

            <div
                ref={scrollRef}
                className="flex-1 scroll-container no-scrollbar p-4 pb-24 space-y-4"
            >
                <Card>
                    <CardContent className="p-6">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-primary">
                                        {achievedCount} / {totalCount}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">업적 달성</p>
                                </div>
                                <Trophy className="w-12 h-12 text-amber-500" />
                            </div>
                            <Progress value={progressPercentage} className="h-2" />
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-3">
                    {visibleAchievements.map(achievement => {
                        const isUnlocked = isAchievementUnlocked(achievement.id);
                        const isHidden = (achievement as any).hidden;
                        const achievementInfo = getAchievementInfo(achievement.id);

                        return (
                            <Card
                                key={achievement.id}
                                className={!isUnlocked ? "opacity-60" : ""}
                            >
                                <CardContent className="p-4">
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    {/* 일반 업적은 잠겨 있어도 이름 그대로 노출 */}
                                                    <h3 className="font-medium">
                                                        {achievement.name}
                                                    </h3>

                                                    {/* 히든 업적은 달성 후에만 등장 + 히든 뱃지 */}
                                                    {isHidden && (
                                                        <Badge variant="outline" className="text-xs">
                                                            히든
                                                        </Badge>
                                                    )}

                                                    {isUnlocked && (
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-xs"
                                                        >
                                                            달성
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    {/* 일반 업적은 잠겨 있어도 설명 그대로 보여줌 */}
                                                    {achievement.description}
                                                </p>

                                                {isUnlocked && achievementInfo?.achievedAt && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        달성일: {new Date(achievementInfo.achievedAt).toLocaleString("ko-KR")}
                                                    </p>
                                                )}
                                            </div>

                                            {isUnlocked && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs ml-2"
                                                >
                                                    {getCategoryName(achievement.category)}
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
    );
}