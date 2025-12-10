// functions/src/weeklyStats.ts

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { admin, db } from "./firebaseAdmin";

// 유저별 집계 구조
interface UserAggregates {
    uid: string;
    nickname?: string | null;
    guideCount: number;
    lanternCount: number;
}

// 랭킹 한 줄 구조
interface RankingRow {
    uid: string;
    nickname: string | null;
    count: number;
    rank: number;
    rewardLumen: number;
}

// YYYY-MM-DD 문자열로 포맷
function formatDateId(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// 등수별 보상 규칙
function getRewardByRank(rank: number): number {
    if (rank === 1) return 10;
    if (rank === 2) return 8;
    if (rank === 3) return 6;
    if (rank >= 4 && rank <= 10) return 3;
    return 0;
}

/**
 * 주간 랭킹 + 보상 지급 (v2 스케줄 함수)
 * - 매주 월요일 08:00(Asia/Seoul) 기준으로 "지난 7일" 데이터 집계
 * - weekly_stats/{periodId} 문서 생성
 * - users/{uid} 의 루멘 보상 지급
 */
export const calcWeeklyStats = onSchedule(
    {
        schedule: "0 8 * * 1", // 매주 월요일 08:00
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
        timeoutSeconds: 540,
        memory: "1GiB",
    },
    async () => {
        logger.info("[calcWeeklyStats] started");

        // 1) 기준 기간 계산: 오늘 00:00 기준 7일 간
        const now = new Date();

        // periodEnd: 오늘 00:00(자정)
        const periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        // periodStart: 7일 전 00:00
        const periodStart = new Date(
            periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000
        );

        const periodId = formatDateId(periodEnd); // 예: 2025-12-08 같은 형식

        logger.info("[calcWeeklyStats] period", {
            periodId,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
        });

        const weeklyRef = db.collection("weekly_stats").doc(periodId);

        // 2) 이미 같은 periodId 문서가 있는지와, 보상이 끝난 상태인지 확인
        const weeklySnap = await weeklyRef.get();

        let rewardsDistributed = false;
        let existingGuideRanking: RankingRow[] | null = null;
        let existingLanternRanking: RankingRow[] | null = null;

        if (weeklySnap.exists) {
            const weeklyData = weeklySnap.data() as any;

            rewardsDistributed = weeklyData?.rewardsDistributed === true;

            // 이미 랭킹이 저장되어 있다면 재사용할 수 있도록 보관
            if (Array.isArray(weeklyData?.guideRanking)) {
                existingGuideRanking = weeklyData.guideRanking as RankingRow[];
            }
            if (Array.isArray(weeklyData?.lanternRanking)) {
                existingLanternRanking = weeklyData.lanternRanking as RankingRow[];
            }
        }

        // 이미 이 주차 보상이 완전히 끝난 경우 → 바로 종료
        if (weeklySnap.exists && rewardsDistributed) {
            logger.info(
                `[calcWeeklyStats] weekly_stats/${periodId} already exists and rewardsDistributed=true. Skip.`
            );
            return;
        }

        // 3) 지난 7일 동안의 posts, replies 불러오기
        // ⚠️ 여기서 필드 이름은 "네 프로젝트 스키마"에 맞게 필요하면 수정해야 함.
        //    - createdAt: Timestamp 필드
        //    - 작성자 UID: 보통 authorId 또는 authorUid
        const startTs = admin.firestore.Timestamp.fromDate(periodStart);
        const endTs = admin.firestore.Timestamp.fromDate(periodEnd);

        const postsSnap = await db
            .collection("posts")
            .where("createdAt", ">=", startTs)
            .where("createdAt", "<", endTs)
            .get();

        logger.info("[calcWeeklyStats] fetched posts", {
            postsCount: postsSnap.size,
        });


        // 4) 유저별 집계 Map
        const userStats = new Map<string, UserAggregates>();

        const ensureUser = (uid: string): UserAggregates => {
            let stats = userStats.get(uid);
            if (!stats) {
                stats = {
                    uid,
                    nickname: null,
                    guideCount: 0,
                    lanternCount: 0,
                };
                userStats.set(uid, stats);
            }
            return stats;
        };

        // 🔸 게시글 + 댓글 한 번에 집계
        postsSnap.forEach((docSnap) => {
            const data = docSnap.data() as any;

            // 1) 글 작성자 (authorUid)
            const postAuthorUid: string | undefined = data.authorUid;
            if (postAuthorUid) {
                const postStats = ensureUser(postAuthorUid);

                // 글이 받은 등불 합산 (lanterns)
                if (typeof data.lanterns === "number") {
                    postStats.lanternCount += data.lanterns;
                }
            }

            // 2) 글 안의 댓글 배열(replies)을 돌면서 집계
            const replies: any[] = Array.isArray(data.replies) ? data.replies : [];

            replies.forEach((reply) => {
                const replyAuthorUid: string | undefined = reply.authorUid;
                if (!replyAuthorUid) return;

                const replyStats = ensureUser(replyAuthorUid);

                // 댓글이 받은 등불 합산
                if (typeof reply.lanterns === "number") {
                    replyStats.lanternCount += reply.lanterns;
                }

                // 길잡이로 채택된 댓글이면 guideCount +1
                if (reply.isGuide === true) {
                    replyStats.guideCount += 1;
                }
            });
        });

        logger.info("[calcWeeklyStats] aggregated userStats count", {
            userCount: userStats.size,
        });

        // 5) 랭킹에 포함될 유저들의 닉네임 채우기
        const userIds = Array.from(userStats.keys());
        if (userIds.length > 0) {
            const chunks: string[][] = [];
            const CHUNK_SIZE = 300; // 한번에 너무 많이 가져오지 않기 위해

            for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
                chunks.push(userIds.slice(i, i + CHUNK_SIZE));
            }

            for (const idsChunk of chunks) {
                const refs = idsChunk.map((uid) => db.collection("users").doc(uid));
                const snaps = await db.getAll(...refs);
                snaps.forEach((snap) => {
                    if (!snap.exists) return;
                    const data = snap.data() as any;
                    const stats = userStats.get(snap.id);
                    if (!stats) return;
                    stats.nickname =
                        typeof data.nickname === "string" ? data.nickname : null;
                });
            }
        }

        const allUsers = Array.from(userStats.values());

        let guideRanking: RankingRow[];
        let lanternRanking: RankingRow[];

        // 6) 길잡이 랭킹
        if (existingGuideRanking) {
            // 🔁 weekly_stats 문서에 이미 저장된 랭킹이 있으면 그대로 재사용
            guideRanking = existingGuideRanking;
            logger.info("[calcWeeklyStats] using existing guideRanking from weekly_stats", {
                size: guideRanking.length,
            });
        } else {
            // 🆕 처음 계산하는 경우에는 새로 랭킹 생성
            guideRanking = allUsers
                .filter((u) => u.guideCount > 0)
                .sort((a, b) => b.guideCount - a.guideCount)
                .slice(0, 10)
                .map((u, index) => ({
                    uid: u.uid,
                    nickname: u.nickname ?? null,
                    count: u.guideCount,
                    rank: index + 1,
                    rewardLumen: getRewardByRank(index + 1),
                }));
        }

        // 7) 등불 랭킹
        if (existingLanternRanking) {
            lanternRanking = existingLanternRanking;
            logger.info("[calcWeeklyStats] using existing lanternRanking from weekly_stats", {
                size: lanternRanking.length,
            });
        } else {
            lanternRanking = allUsers
                .filter((u) => u.lanternCount > 0)
                .sort((a, b) => b.lanternCount - a.lanternCount)
                .slice(0, 10)
                .map((u, index) => ({
                    uid: u.uid,
                    nickname: u.nickname ?? null,
                    count: u.lanternCount,
                    rank: index + 1,
                    rewardLumen: getRewardByRank(index + 1),
                }));
        }

        logger.info("[calcWeeklyStats] ranking sizes", {
            guideRanking: guideRanking.length,
            lanternRanking: lanternRanking.length,
        });

        // 8) 유저별 최종 보상 합산 (길잡이 + 등불 둘 다 받을 수 있음)
        const rewardByUser = new Map<string, number>();

        const addReward = (uid: string, amount: number) => {
            if (amount <= 0) return;
            const prev = rewardByUser.get(uid) ?? 0;
            rewardByUser.set(uid, prev + amount);
        };

        guideRanking.forEach((row) => addReward(row.uid, row.rewardLumen));
        lanternRanking.forEach((row) => addReward(row.uid, row.rewardLumen));

        logger.info("[calcWeeklyStats] rewardByUser size", {
            count: rewardByUser.size,
        });

        // 9) weekly_stats 문서 저장 (최초 생성 or 보완)
        //    - rewardsDistributed: 아직 보상 완전히 끝나지 않았다는 표시(false)
        await weeklyRef.set(
            {
                periodStart: admin.firestore.Timestamp.fromDate(periodStart),
                periodEnd: admin.firestore.Timestamp.fromDate(periodEnd),
                weekEnding: periodId,
                createdAt:
                    (weeklySnap.exists && (weeklySnap.data() as any)?.createdAt) ||
                    admin.firestore.FieldValue.serverTimestamp(),
                guideRanking,
                lanternRanking,
                rewardsDistributed: false,
            },
            { merge: true }
        );

        // 10) 각 유저 보상 업데이트 (유저당 작은 트랜잭션)
        // 10) 각 유저 보상 업데이트 (유저당 작은 트랜잭션)
        //     - 같은 periodId에 대해 중복 지급되지 않도록 weeklyRewards 플래그 사용
        for (const [uid, amount] of rewardByUser.entries()) {
            const userRef = db.collection("users").doc(uid);

            await db.runTransaction(async (tx) => {
                const userSnap = await tx.get(userRef);
                const userData = userSnap.exists ? (userSnap.data() as any) : {};

                const prevBalance =
                    typeof userData.lumenBalance === "number"
                        ? userData.lumenBalance
                        : 0;
                const prevTotalEarned =
                    typeof userData.lumenTotalEarned === "number"
                        ? userData.lumenTotalEarned
                        : 0;

                // 🔐 이 유저가 이 주차(periodId) 보상을 이미 받았는지 체크
                const prevWeeklyRewards =
                    (userData.weeklyRewards as Record<string, boolean> | undefined) ||
                    {};

                if (prevWeeklyRewards[periodId]) {
                    // 이미 이 주차 보상을 받은 유저 → 스킵 (중복 지급 방지)
                    logger.info("[calcWeeklyStats] user already rewarded for period", {
                        uid,
                        periodId,
                    });
                    return;
                }

                const transactionRecord = {
                    id: `weekly_${periodId}_${uid}`,
                    amount,
                    reason: `주간 랭킹 보상 (${periodId})`,
                    timestamp: Date.now(), // useLumens.ts에서 기대하는 ms 단위 숫자
                    type: "weekly_reward",
                    meta: {
                        periodId,
                    },
                };

                const newWeeklyRewards = {
                    ...prevWeeklyRewards,
                    [periodId]: true,
                };

                tx.set(
                    userRef,
                    {
                        lumenBalance: prevBalance + amount,
                        lumenTotalEarned: prevTotalEarned + amount,
                        lumenTransactions: admin.firestore.FieldValue.arrayUnion(
                            transactionRecord
                        ),
                        weeklyRewards: newWeeklyRewards,
                    },
                    { merge: true }
                );
            });
        }

        // 11) 모든 보상 트랜잭션 시도 후, weekly_stats 상태를 완료로 표시
        await weeklyRef.set(
            {
                rewardsDistributed: true,
                rewardsDistributedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
        );

        logger.info("[calcWeeklyStats] done", { periodId });

    }
);
