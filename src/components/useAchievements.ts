// useAchievements.ts - 업적 관리 + 자동 보상 시스템

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/toastHelper';
import {
    Achievement,
    allAchievements,
    normalAchievements,
    hiddenAchievements,
} from './achievements';

// Firestore / 인증
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// -----------------------------
// 타입 정의
// -----------------------------

export interface UserActivityData {
    explorePosts: number;
    sharePosts: number;
    replies: number;
    qualityReplies: number;
    lanternsReceived: number;
    lanternsGiven: number;
    guideCount: number;
    bookmarks: number;
    loginStreak: number;
    maxPostReplies: number;
    maxPostLanterns: number;
    maxDiscussionExchanges: number;
    followerCount: number;

    // 분야별 전문가를 위한 데이터
    economyReplies?: number;          // 경제 카테고리 답변 수
    economyAverageLanterns?: number;  // 경제 답변 평균 등불 개수
    itReplies?: number;               // IT 카테고리 답변 수
    itAverageLanterns?: number;       // IT 답변 평균 등불 개수
    languageReplies?: number;         // 외국어 카테고리 답변 수
    languageAverageLanterns?: number; // 외국어 답변 평균 등불 개수

    // 공학 특화 칭호를 위한 데이터
    engineeringExplorePosts?: number;          // 공학 질문 글 개수
    engineeringOnlyPosts?: number;             // 공학 카테고리만 작성한 글 개수
    engineeringFirstLanternReceived?: boolean; // 공학 카테 첫 등불 받았는지
    engineeringTotalReplies?: number;          // 공학 카테고리 전체 답변 개수

    // 히든 업적을 위한 데이터
    monthlyLoginDays?: number;           // 최근 30일 로그인 일수
    ownPostGuideSelected?: number;       // 내 글이 길잡이로 선택된 횟수
    singleCategoryMaxReplies?: number;   // 한 카테고리 최대 답변 수

    // 복합 업적을 위한 데이터
    unlockedFieldExpertCount?: number;  // 획득한 분야 전문가 칭호 개수
    tier3AchievementsCount?: number;    // 3단계 이상 달성한 기본 칭호 개수
    tier4AchievementsCount?: number;    // 4단계 달성한 기본 칭호 개수
}

export interface AchievedAchievement {
    achievementId: string;
    achievedAt: string;
    rewardClaimed: boolean;  // 보상을 받았는지 확인
}

// -----------------------------
// 기본값 / 마이그레이션용 상수
// -----------------------------

const DEFAULT_USER_ACTIVITY: UserActivityData = {
    explorePosts: 0,
    sharePosts: 0,
    replies: 0,
    qualityReplies: 0,
    lanternsReceived: 0,
    lanternsGiven: 0,
    guideCount: 0,
    bookmarks: 0,
    loginStreak: 0,
    maxPostReplies: 0,
    maxPostLanterns: 0,
    maxDiscussionExchanges: 0,
    followerCount: 0,
};

// 예전 localStorage 키 (있으면 한 번만 읽고 버리는 용도)
const STORAGE_KEYS = {
    ACHIEVED_ACHIEVEMENTS: 'app_achieved_achievements',
    USER_ACTIVITY: 'app_user_activity',
};

interface LegacyAchievementsData {
    achieved: AchievedAchievement[];
    activity: UserActivityData;
}

/**
 * 기존 localStorage에 저장돼 있던 업적/활동 데이터를
 * Firestore로 마이그레이션하기 위해 한 번만 읽는 함수
 */
function loadLegacyAchievementsFromLocalStorage(): LegacyAchievementsData | null {
    if (typeof window === 'undefined') return null;

    try {
        const rawAchieved = window.localStorage.getItem(
            STORAGE_KEYS.ACHIEVED_ACHIEVEMENTS,
        );
        const rawActivity = window.localStorage.getItem(STORAGE_KEYS.USER_ACTIVITY);

        if (!rawAchieved && !rawActivity) {
            return null;
        }

        let achieved: AchievedAchievement[] = [];
        let activity: UserActivityData = { ...DEFAULT_USER_ACTIVITY };

        if (rawAchieved) {
            try {
                const parsed = JSON.parse(rawAchieved);
                if (Array.isArray(parsed)) {
                    achieved = parsed
                        .map((item: any): AchievedAchievement | null => {
                            if (!item || typeof item !== 'object') return null;
                            if (typeof item.achievementId !== 'string') return null;
                            if (typeof item.achievedAt !== 'string') return null;

                            return {
                                achievementId: item.achievementId,
                                achievedAt: item.achievedAt,
                                rewardClaimed:
                                    typeof item.rewardClaimed === 'boolean'
                                        ? item.rewardClaimed
                                        : true,
                            };
                        })
                        .filter((a: AchievedAchievement | null): a is AchievedAchievement => a !== null);
                }
            } catch (e) {
                console.error('legacy achievedAchievements 파싱 실패:', e);
            }
        }

        if (rawActivity) {
            try {
                const parsed = JSON.parse(rawActivity);
                if (parsed && typeof parsed === 'object') {
                    activity = {
                        ...DEFAULT_USER_ACTIVITY,
                        ...(parsed as Partial<UserActivityData>),
                    };
                }
            } catch (e) {
                console.error('legacy userActivity 파싱 실패:', e);
            }
        }

        return { achieved, activity };
    } catch (error) {
        console.error('legacy 업적 데이터 로드 실패:', error);
        return null;
    }
}

// -----------------------------
// 메인 훅
// -----------------------------

/**
 * 업적 관리 훅
 * - 업적 달성 추적
 * - 자동 보상 지급
 * - 알림 표시
 * - Firestore(users/{uid})를 단일 진실 소스로 사용
 */
export function useAchievements(
    addLumensCallback?: (amount: number, reason: string, achievementId: string) => void,
    unlockTitleCallback?: (titleId: string, titleName: string) => void,
) {
    const [achievedAchievements, setAchievedAchievements] = useState<AchievedAchievement[]>([]);
    const [userActivity, setUserActivity] = useState<UserActivityData>(DEFAULT_USER_ACTIVITY);

    // Firestore에서 한 번 읽어왔는지 여부
    const [initialized, setInitialized] = useState(false);

    // Firestore에 불필요한 첫 업데이트를 막기 위한 플래그
    const firstSyncSkippedRef = useRef(false);

    // ✅ 특정 업적의 달성 정보(achievedAt 등)를 가져오는 함수
    const getAchievementInfo = useCallback(
        (achievementId: string): AchievedAchievement | undefined => {
            return achievedAchievements.find((a) => a.achievementId === achievementId);
        },
        [achievedAchievements],
    );

    // -----------------------------
    // Firestore 초기 로드 + legacy 마이그레이션
    // -----------------------------
    useEffect(() => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        let cancelled = false;

        const fetchFromServer = async () => {
            try {
                const userRef = doc(db, 'users', uid);
                const snap = await getDoc(userRef);

                if (snap.exists()) {
                    const data = snap.data() as any;

                    // Firestore userActivity
                    const serverActivity: UserActivityData = data.userActivity && typeof data.userActivity === 'object'
                        ? {
                            ...DEFAULT_USER_ACTIVITY,
                            ...(data.userActivity as Partial<UserActivityData>),
                        }
                        : { ...DEFAULT_USER_ACTIVITY };

                    // Firestore achievedAchievements
                    let serverAchieved: AchievedAchievement[] = [];
                    if (Array.isArray(data.achievedAchievements)) {
                        serverAchieved = (data.achievedAchievements as any[])
                            .filter(
                                (item: any) =>
                                    item &&
                                    typeof item.achievementId === 'string' &&
                                    typeof item.achievedAt === 'string',
                            )
                            .map((item: any) => ({
                                achievementId: item.achievementId,
                                achievedAt: item.achievedAt,
                                rewardClaimed:
                                    typeof item.rewardClaimed === 'boolean'
                                        ? item.rewardClaimed
                                        : true,
                            }));
                    }

                    if (!cancelled) {
                        setUserActivity(serverActivity);
                        setAchievedAchievements(serverAchieved);
                    }
                    return;
                }

                // 문서가 없는 경우 → localStorage 에서 한 번 마이그레이션 시도
                const legacy = loadLegacyAchievementsFromLocalStorage();

                const initialActivity = legacy?.activity ?? { ...DEFAULT_USER_ACTIVITY };
                const initialAchieved = legacy?.achieved ?? [];

                if (!cancelled) {
                    setUserActivity(initialActivity);
                    setAchievedAchievements(initialAchieved);
                }

                // Firestore 쪽에 초기값 저장
                await setDoc(
                    userRef,
                    {
                        userActivity: initialActivity,
                        achievedAchievements: initialAchieved,
                    },
                    { merge: true },
                );

                // 마이그레이션 성공 시 localStorage 제거
                if (legacy) {
                    try {
                        window.localStorage.removeItem(STORAGE_KEYS.USER_ACTIVITY);
                        window.localStorage.removeItem(STORAGE_KEYS.ACHIEVED_ACHIEVEMENTS);
                    } catch {
                        // 무시
                    }
                }
            } catch (error) {
                console.error('사용자 업적/활동 데이터 불러오기 실패:', error);
            } finally {
                if (!cancelled) {
                    setInitialized(true);
                }
            }
        };

        fetchFromServer();

        return () => {
            cancelled = true;
        };
    }, []);

    // -----------------------------
    // Firestore 동기화 (변경 시)
    // -----------------------------
    useEffect(() => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        if (!initialized) return;

        // 초기 로드 직후 한 번은 건너뛴다 (setDoc/getDoc 직후에 불필요한 updateDoc 방지)
        if (!firstSyncSkippedRef.current) {
            firstSyncSkippedRef.current = true;
            return;
        }

        const userRef = doc(db, 'users', uid);
        updateDoc(userRef, {
            userActivity,
            achievedAchievements,
        }).catch((error) => {
            console.error('사용자 업적/활동 Firestore 동기화 실패:', error);
        });
    }, [userActivity, achievedAchievements, initialized]);

    // -----------------------------
    // 업적 달성 여부 / 조건 체크
    // -----------------------------

    /**
     * 업적이 달성되었는지 확인
     */
    const isAchievementUnlocked = useCallback(
        (achievementId: string): boolean => {
            return achievedAchievements.some((a) => a.achievementId === achievementId);
        },
        [achievedAchievements],
    );

    /**
     * 업적 조건을 만족하는지 확인
     */
    const checkAchievementCondition = useCallback(
        (achievement: Achievement, activity: UserActivityData): boolean => {
            const { condition } = achievement;

            switch (condition.type) {
                case 'explore_post_count':
                    return activity.explorePosts >= condition.target;

                case 'share_post_count':
                    return activity.sharePosts >= condition.target;

                case 'quality_reply_count':
                    // 등불 기준(예: 10개 이상)을 만족한 “고퀄 답변” 개수
                    return activity.qualityReplies >= condition.target;

                case 'reply_count':
                    // 전체 답변 개수 (등불 상관 없음)
                    return activity.replies >= condition.target;

                case 'lanterns_received':
                    return activity.lanternsReceived >= condition.target;

                case 'lanterns_given':
                    return activity.lanternsGiven >= condition.target;

                case 'guide_count':
                    return activity.guideCount >= condition.target;

                case 'bookmark_count':
                    return activity.bookmarks >= condition.target;

                case 'login_streak':
                    return activity.loginStreak >= condition.target;

                case 'follower_count':
                    return activity.followerCount >= condition.target;

                case 'discussion_exchanges':
                    return activity.maxDiscussionExchanges >= condition.target;

                case 'max_post_lanterns':
                    return activity.maxPostLanterns >= condition.target;

                // 분야별 전문가 칭호 조건
                case 'category_quality_reply':
                    if (achievement.category === 'economy') {
                        return (
                            (activity.economyReplies || 0) >= condition.target &&
                            (activity.economyAverageLanterns || 0) >=
                            (condition.minAverageLanterns || 0)
                        );
                    } else if (achievement.category === 'it') {
                        return (
                            (activity.itReplies || 0) >= condition.target &&
                            (activity.itAverageLanterns || 0) >=
                            (condition.minAverageLanterns || 0)
                        );
                    } else if (achievement.category === 'language') {
                        return (
                            (activity.languageReplies || 0) >= condition.target &&
                            (activity.languageAverageLanterns || 0) >=
                            (condition.minAverageLanterns || 0)
                        );
                    }
                    return false;

                // 복합 업적 조건
                case 'multi_field_expert':
                    // 3개 분야 전문가 달성
                    return (activity.unlockedFieldExpertCount || 0) >= condition.target;

                case 'all_categories_tier3':
                    // 모든 기본 칭호 3단계 이상 달성
                    return (activity.tier3AchievementsCount || 0) >= 6; // 6개 기본 카테고리

                case 'all_categories_tier4':
                    // 모든 기본 칭호 4단계 달성
                    return (activity.tier4AchievementsCount || 0) >= 6; // 6개 기본 카테고리

                // 공학 특화 칭호 조건
                case 'category_explore_count':
                    return (activity.engineeringExplorePosts || 0) >= condition.target;

                case 'single_category_posts':
                    return (activity.engineeringOnlyPosts || 0) >= condition.target;

                case 'category_first_lantern':
                    return activity.engineeringFirstLanternReceived === true;

                case 'category_reply_count':
                    return (activity.engineeringTotalReplies || 0) >= condition.target;

                // 히든 업적 조건
                case 'monthly_login_rate':
                    return (activity.monthlyLoginDays || 0) >= condition.target;

                case 'own_post_guide_selected':
                    return (activity.ownPostGuideSelected || 0) >= condition.target;

                case 'single_category_replies':
                    return (activity.singleCategoryMaxReplies || 0) >= condition.target;

                default:
                    return false;
            }
        },
        [],
    );

    // -----------------------------
    // 업적 달성 처리 + 보상 지급
    // -----------------------------

    /**
     * 업적 달성 처리 및 보상 지급
     */
    const unlockAchievement = useCallback(
        (achievement: Achievement) => {
            // 이미 달성한 업적인지 + 보상 지급 여부 확인
            const existing = achievedAchievements.find(
                (a) => a.achievementId === achievement.id,
            );

            // 이미 달성했고, 보상까지 지급된 상태면 아무 것도 안 함 (중복 방지)
            if (existing && existing.rewardClaimed) {
                return;
            }

            const { reward } = achievement;

            // 보상은 "처음 보상 받을 때" 한 번만 지급
            const shouldGrantReward = !existing || !existing.rewardClaimed;

            if (shouldGrantReward) {
                // 루멘 보상이 있나요?
                if (reward.lumens > 0 && addLumensCallback) {
                    addLumensCallback(
                        reward.lumens,
                        `업적 달성: ${achievement.name}`,
                        achievement.id,
                    );
                }

                // 특별 칭호 보상
                if (reward.specialTitle && unlockTitleCallback) {
                    unlockTitleCallback(
                        achievement.id,      // 업적 ID 자체를 칭호 ID로 사용
                        reward.specialTitle, // 칭호 이름
                    );
                }
            }

            // 달성 기록은 항상 유지/갱신
            const nowIso = new Date().toISOString();
            const updatedAchievement: AchievedAchievement = existing
                ? {
                    ...existing,
                    achievedAt: existing.achievedAt || nowIso,
                    rewardClaimed: true,
                }
                : {
                    achievementId: achievement.id,
                    achievedAt: nowIso,
                    rewardClaimed: true,
                };

            setAchievedAchievements((prev) => {
                const index = prev.findIndex(
                    (a) => a.achievementId === achievement.id,
                );
                if (index === -1) {
                    return [...prev, updatedAchievement];
                }
                const copy = [...prev];
                copy[index] = updatedAchievement;
                return copy;
            });

            // 알림 메시지 만들기 (보상이 실제 지급되었을 때만 상세 메시지)
            let message = `${achievement.name} 업적을 달성했습니다!`;

            if (shouldGrantReward) {
                if (reward.lumens > 0 && reward.specialTitle) {
                    message += ` (루멘 ${reward.lumens}개 + 칭호 "${reward.specialTitle}" 획득)`;
                } else if (reward.lumens > 0) {
                    message += ` (루멘 ${reward.lumens}개 획득)`;
                } else if (reward.specialTitle) {
                    message += ` (특별 칭호 "${reward.specialTitle}" 획득)`;
                }
            }

            // 히든 업적은 특별하게 표시
            if (achievement.hidden) {
                toast.success(`🌟 히든 업적 달성! 🌟\n${message}`, {
                    duration: 5000,
                });
            } else {
                toast.success(`🎉 ${message}`, {
                    duration: 4000,
                });
            }
        },
        [achievedAchievements, addLumensCallback, unlockTitleCallback],
    );

    /**
     * 모든 업적 체크하고 새로 달성한 것 처리
     */
    const checkAchievements = useCallback(
        (activity: UserActivityData) => {
            allAchievements.forEach((achievement) => {
                // 이미 달성했으면 넘어가기
                if (isAchievementUnlocked(achievement.id)) {
                    return;
                }

                // 조건 체크
                if (checkAchievementCondition(achievement, activity)) {
                    unlockAchievement(achievement);
                }
            });
        },
        [checkAchievementCondition, unlockAchievement, isAchievementUnlocked],
    );

    /**
     * 사용자 활동 업데이트 + 자동 업적 체크
     */
    const updateActivity = useCallback(
        (newActivity: Partial<UserActivityData>) => {
            setUserActivity((prev) => {
                const updated = { ...prev, ...newActivity };

                // 업데이트 후 바로 업적 체크
                // setTimeout을 사용해서 상태 업데이트가 완료된 후 체크
                setTimeout(() => {
                    checkAchievements(updated);
                }, 100);

                return updated;
            });
        },
        [checkAchievements],
    );

    // -----------------------------
    // 카운트/집계
    // -----------------------------

    const achievedNormalCount = achievedAchievements.filter((a) =>
        normalAchievements.some((na) => na.id === a.achievementId),
    ).length;

    const achievedHiddenCount = achievedAchievements.filter((a) =>
        hiddenAchievements.some((ha) => ha.id === a.achievementId),
    ).length;

    const normalCount = normalAchievements.length;
    const hiddenCount = hiddenAchievements.length;

    return {
        achievedAchievements,
        userActivity,
        isAchievementUnlocked,
        getAchievementInfo,
        updateActivity,
        checkAchievements, // 수동으로 체크할 때 사용
        achievedNormalCount,
        achievedHiddenCount,
        normalCount,
        hiddenCount,
    };
}
