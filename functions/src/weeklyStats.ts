// functions/src/weeklyStats.ts

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { admin, db } from "./firebaseAdmin"; // firebaseAdmin.ts가 같은 폴더에 있다고 가정

// ─────────────────────────────────────────────────────────────
// 1. 인터페이스 정의
// ─────────────────────────────────────────────────────────────

// 집계 중 임시로 사용하는 유저 데이터 구조
interface UserAggregates {
    uid: string;
    nickname?: string | null;
    guideCount: number;   // 길잡이 채택 횟수
    lanternCount: number; // 받은 등불(게시글+댓글) 총합
}

// 랭킹 결과 한 줄 구조 (DB 저장용)
interface RankingRow {
    uid: string;
    nickname: string | null;
    count: number;
    rank: number;
    rewardLumen: number;
}

// ─────────────────────────────────────────────────────────────
// 2. 헬퍼 함수
// ─────────────────────────────────────────────────────────────

// YYYY-MM-DD 문자열 포맷팅
function formatDateId(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
}

// 등수별 보상 규칙 (기획에 따라 변경 가능)
function getRewardByRank(rank: number): number {
    if (rank === 1) return 10; // 1등 10 루멘
    if (rank === 2) return 8;  // 2등 8 루멘
    if (rank === 3) return 6;  // 3등 6 루멘
    if (rank >= 4 && rank <= 10) return 3; // 4~10등 3 루멘
    return 0;
}

// ─────────────────────────────────────────────────────────────
// 3. 메인 스케줄 함수
// ─────────────────────────────────────────────────────────────

/**
 * 주간 랭킹 산정 및 보상 지급
 * - 실행 시점: 매주 월요일 오전 08:00 (Asia/Seoul)
 * - 집계 범위: 실행일 기준 지난 7일 (지난주 월~일)
 * - 저장 위치: weekly_stats/{YYYY-MM-DD}
 * - 보상 지급: users/{uid} 문서 업데이트 (Idempotent)
 */
export const calcWeeklyStats = onSchedule(
    {
        schedule: "0 8 * * 1", // 매주 월요일 08:00
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
        timeoutSeconds: 540, // 최대 9분 실행 (데이터 양이 많을 수 있으므로 넉넉히)
        memory: "1GiB",
    },
    async (event) => {
        logger.info("[calcWeeklyStats] started");

        // 1) 기간 설정
        // 오늘(실행일) 00:00를 기준으로 잡음
        const now = new Date();
        const periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        // 7일 전 00:00
        const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

        // 문서 ID는 기준일(오늘) 날짜 사용 (예: 2023-10-30)
        const periodId = formatDateId(periodEnd);

        logger.info("[calcWeeklyStats] period info", {
            periodId,
            periodStart: periodStart.toISOString(),
            periodEnd: periodEnd.toISOString(),
        });

        const weeklyRef = db.collection("weekly_stats").doc(periodId);

        // 2) 중복 실행 방지 및 복구 로직
        const weeklySnap = await weeklyRef.get();
        let rewardsDistributed = false;
        let existingGuideRanking: RankingRow[] | null = null;
        let existingLanternRanking: RankingRow[] | null = null;

        if (weeklySnap.exists) {
            const weeklyData = weeklySnap.data();
            rewardsDistributed = weeklyData?.rewardsDistributed === true;

            // 이미 계산된 랭킹이 있다면 메모리에 로드 (재계산 방지)
            if (Array.isArray(weeklyData?.guideRanking)) {
                existingGuideRanking = weeklyData?.guideRanking as RankingRow[];
            }
            if (Array.isArray(weeklyData?.lanternRanking)) {
                existingLanternRanking = weeklyData?.lanternRanking as RankingRow[];
            }
        }

        // 이미 보상 지급까지 완벽히 끝난 주차라면 종료
        if (weeklySnap.exists && rewardsDistributed) {
            logger.info(`[calcWeeklyStats] Already completed for ${periodId}. Exiting.`);
            return;
        }

        // ─────────────────────────────────────────────────────────────
        // 3) 데이터 집계 (랭킹이 이미 존재하면 스킵)
        // ─────────────────────────────────────────────────────────────

        // 랭킹 결과 담을 변수
        let guideRanking: RankingRow[] = [];
        let lanternRanking: RankingRow[] = [];

        // 이미 저장된 랭킹이 있다면 그것을 사용 (일관성 유지)
        const skipAggregation = existingGuideRanking && existingLanternRanking;

        if (skipAggregation) {
            logger.info("[calcWeeklyStats] Using existing rankings from DB.");
            guideRanking = existingGuideRanking!;
            lanternRanking = existingLanternRanking!;
        } else {
            // 3-1. Firestore에서 지난주 게시글 가져오기
            logger.info("[calcWeeklyStats] Fetching posts from Firestore...");
            const startTs = admin.firestore.Timestamp.fromDate(periodStart);
            const endTs = admin.firestore.Timestamp.fromDate(periodEnd);

            const postsSnap = await db
                .collection("posts")
                .where("createdAt", ">=", startTs)
                .where("createdAt", "<", endTs)
                .get();

            logger.info(`[calcWeeklyStats] Fetched ${postsSnap.size} posts.`);

            // 3-2. 메모리에서 집계
            const userStats = new Map<string, UserAggregates>();

            const ensureUser = (uid: string): UserAggregates => {
                if (!userStats.has(uid)) {
                    userStats.set(uid, {
                        uid,
                        nickname: null,
                        guideCount: 0,
                        lanternCount: 0,
                    });
                }
                return userStats.get(uid)!;
            };

            postsSnap.forEach((doc) => {
                const post = doc.data();

                // A. 게시글 작성자 점수 (등불)
                const postAuthorUid = post.authorUid || post.userId;
                if (postAuthorUid) {
                    const stats = ensureUser(postAuthorUid);
                    if (typeof post.lanterns === "number") {
                        stats.lanternCount += post.lanterns;
                    }
                }

                // B. 답글 작성자 점수 (등불 + 길잡이)
                const replies = Array.isArray(post.replies) ? post.replies : [];
                replies.forEach((reply: any) => {
                    const replyAuthorUid = reply.authorUid || reply.userId;
                    if (!replyAuthorUid) return;

                    const stats = ensureUser(replyAuthorUid);

                    // 답글 등불 수
                    if (typeof reply.lanterns === "number") {
                        stats.lanternCount += reply.lanterns;
                    }
                    // 길잡이 채택 여부
                    if (reply.isGuide === true) {
                        stats.guideCount += 1;
                    }
                });
            });

            // 3-3. 닉네임 채우기 (Batch 조회)
            const allUserIds = Array.from(userStats.keys());
            if (allUserIds.length > 0) {
                const CHUNK_SIZE = 30; // 'in' 쿼리 제한 등을 고려해 적절히 (getAll은 제한이 덜하지만 안전하게)
                const chunks = [];
                for (let i = 0; i < allUserIds.length; i += CHUNK_SIZE) {
                    chunks.push(allUserIds.slice(i, i + CHUNK_SIZE));
                }

                for (const chunk of chunks) {
                    // db.getAll()은 document reference 배열을 받음
                    const refs = chunk.map(uid => db.collection("users").doc(uid));
                    const userDocs = await db.getAll(...refs);

                    userDocs.forEach(snap => {
                        if (snap.exists) {
                            const data = snap.data();
                            const stats = userStats.get(snap.id);
                            if (stats) {
                                stats.nickname = data?.nickname || "알 수 없음";
                            }
                        }
                    });
                }
            }

            // 3-4. 랭킹 산정 (정렬 및 자르기)
            const allStats = Array.from(userStats.values());

            // 길잡이 랭킹 (Count 내림차순)
            guideRanking = allStats
                .filter(u => u.guideCount > 0)
                .sort((a, b) => b.guideCount - a.guideCount)
                .slice(0, 10)
                .map((u, idx) => ({
                    uid: u.uid,
                    nickname: u.nickname || null,
                    count: u.guideCount,
                    rank: idx + 1,
                    rewardLumen: getRewardByRank(idx + 1)
                }));

            // 등불 랭킹 (Count 내림차순)
            lanternRanking = allStats
                .filter(u => u.lanternCount > 0)
                .sort((a, b) => b.lanternCount - a.lanternCount)
                .slice(0, 10)
                .map((u, idx) => ({
                    uid: u.uid,
                    nickname: u.nickname || null,
                    count: u.lanternCount,
                    rank: idx + 1,
                    rewardLumen: getRewardByRank(idx + 1)
                }));

            // 3-5. DB에 랭킹 저장 (보상 지급 전 백업)
            await weeklyRef.set({
                periodStart: startTs,
                periodEnd: endTs,
                weekEnding: periodId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                guideRanking,
                lanternRanking,
                rewardsDistributed: false, // 아직 보상 안 줌
            }, { merge: true });
        }

        // ─────────────────────────────────────────────────────────────
        // 4) 보상 지급 (Idempotency 보장)
        // ─────────────────────────────────────────────────────────────

        // 유저별 총 보상량 계산
        const rewardMap = new Map<string, number>();
        const addToRewardMap = (uid: string, amount: number) => {
            const current = rewardMap.get(uid) || 0;
            rewardMap.set(uid, current + amount);
        };

        guideRanking.forEach(r => addToRewardMap(r.uid, r.rewardLumen));
        lanternRanking.forEach(r => addToRewardMap(r.uid, r.rewardLumen));

        logger.info(`[calcWeeklyStats] Distributing rewards to ${rewardMap.size} users.`);

        // 각 유저별로 트랜잭션 실행
        for (const [uid, totalAmount] of rewardMap.entries()) {
            if (totalAmount <= 0) continue;

            try {
                await db.runTransaction(async (t) => {
                    const userRef = db.collection("users").doc(uid);
                    const userSnap = await t.get(userRef);

                    if (!userSnap.exists) return; // 탈퇴했거나 없는 유저

                    const userData = userSnap.data()!;
                    const userRewards = userData.weeklyRewards || {};

                    // 🚨 중복 지급 방지 핵심 로직
                    if (userRewards[periodId] === true) {
                        logger.info(`[Skip] User ${uid} already rewarded for ${periodId}`);
                        return;
                    }

                    // 잔액 업데이트
                    const currentBalance = userData.lumenBalance || 0;
                    const currentTotal = userData.lumenTotalEarned || 0;

                    const transactionRecord = {
                        id: `weekly_${periodId}_${uid}`,
                        amount: totalAmount,
                        reason: `주간 랭킹 보상 (${periodId})`,
                        timestamp: Date.now(),
                        type: "weekly_reward",
                        meta: { periodId }
                    };

                    t.update(userRef, {
                        lumenBalance: currentBalance + totalAmount,
                        lumenTotalEarned: currentTotal + totalAmount,
                        lumenTransactions: admin.firestore.FieldValue.arrayUnion(transactionRecord),
                        [`weeklyRewards.${periodId}`]: true // 맵에 플래그 설정
                    });
                });
            } catch (error) {
                logger.error(`[Error] Failed to reward user ${uid}`, error);
                // 개별 유저 실패는 로그만 남기고 다음 유저로 계속 진행
            }
        }

        // ─────────────────────────────────────────────────────────────
        // 5) 최종 완료 처리
        // ─────────────────────────────────────────────────────────────

        await weeklyRef.update({
            rewardsDistributed: true,
            rewardsDistributedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logger.info(`[calcWeeklyStats] Successfully completed for ${periodId}.`);
    }
);