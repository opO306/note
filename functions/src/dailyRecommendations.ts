import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import { admin, db } from "./firebaseAdmin";
import { sendPushNotification } from "./notificationService";

type CategoryScore = {
    score: number;
    signals: number;
};

type KeywordScore = {
    score: number;
    signals: number;
};

interface InterestProfile {
    windowStart: FirebaseFirestore.Timestamp;
    windowEnd: FirebaseFirestore.Timestamp;
    topCategories: Array<{ id: string; score: number; signals: number }>;
    topKeywords: Array<{ keyword: string; score: number; signals: number }>;
    rawCounts: {
        views: number;
        bookmarks: number;
        lanterns: number;
        searches: number;
    };
}

interface PostRecommendation {
    kind: "post";
    postId: string;
    title: string;
    category?: string;
    subCategory?: string;
    lanterns?: number;
    replyCount?: number;
    createdAt?: number;
    score: number;
    excerpt?: string;
}

interface ExternalRecommendation {
    kind: "external";
    title: string;
    url: string;
    source?: string;
    summary?: string;
    score: number;
}

interface DigestPayload {
    dateId: string;
    createdAt: FirebaseFirestore.FieldValue;
    interestProfile: InterestProfile;
    recommendations: {
        posts: PostRecommendation[];
        external: ExternalRecommendation[];
    };
    pinnedCard: {
        title: string;
        subtitle: string;
        actions: Array<{ label: string; type: string; target?: string; digestId?: string }>;
    };
    push: {
        title: string;
        body: string;
        deepLink?: string;
    };
}

const WINDOW_DAYS = 14; // 최근 7~14일 신호만 사용 (최대 14일)
const DIGEST_COLLECTION = "user_morning_digest";
const ACTIVITY_ROOT = "user_activity";
const MAX_USERS_PER_RUN = 500;

const WEIGHTS = {
    view: 1,
    bookmark: 3,
    lantern: 2,
    search: 1.5,
};

function getKstDate(date: Date): Date {
    const kstString = date.toLocaleString("en-US", { timeZone: "Asia/Seoul" });
    return new Date(kstString);
}

function getKstDateId(date: Date): string {
    const kst = getKstDate(date);
    const y = kst.getFullYear();
    const m = `${kst.getMonth() + 1}`.padStart(2, "0");
    const d = `${kst.getDate()}`.padStart(2, "0");
    return `${y}-${m}-${d}`;
}

async function collectCategorySignals(
    uid: string,
    start: FirebaseFirestore.Timestamp,
    end: FirebaseFirestore.Timestamp,
): Promise<{
    categoryScores: Record<string, CategoryScore>;
    keywordScores: Record<string, KeywordScore>;
    counts: InterestProfile["rawCounts"];
}> {
    const categoryScores: Record<string, CategoryScore> = {};
    const keywordScores: Record<string, KeywordScore> = {};

    const bumpCategory = (categoryId?: string | null, weight = 1) => {
        if (!categoryId) return;
        const current = categoryScores[categoryId] ?? { score: 0, signals: 0 };
        categoryScores[categoryId] = {
            score: current.score + weight,
            signals: current.signals + 1,
        };
    };

    const bumpKeyword = (keyword?: string | null, weight = 1) => {
        if (!keyword) return;
        const normalized = keyword.trim().toLowerCase();
        if (!normalized) return;
        const current = keywordScores[normalized] ?? { score: 0, signals: 0 };
        keywordScores[normalized] = {
            score: current.score + weight,
            signals: current.signals + 1,
        };
    };

    const counts = {
        views: 0,
        bookmarks: 0,
        lanterns: 0,
        searches: 0,
    };

    const activityRef = db.collection(ACTIVITY_ROOT).doc(uid);

    const [viewsSnap, searchSnap, bookmarkSnap, lanternSnap] = await Promise.all([
        activityRef.collection("viewLogs").where("createdAt", ">=", start).where("createdAt", "<", end).limit(800).get(),
        activityRef.collection("searchLogs").where("createdAt", ">=", start).where("createdAt", "<", end).limit(300).get(),
        db.collection("user_bookmarks").doc(uid).collection("posts").where("createdAt", ">=", start).where("createdAt", "<", end).limit(500).get(),
        db.collection("user_lanterns").doc(uid).collection("posts").where("createdAt", ">=", start).where("createdAt", "<", end).limit(500).get(),
    ]);

    viewsSnap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        bumpCategory(data.category, WEIGHTS.view);
        bumpCategory(data.subCategory, WEIGHTS.view * 0.7);
        counts.views += 1;
    });

    bookmarkSnap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        bumpCategory(data.category, WEIGHTS.bookmark);
        bumpCategory(data.subCategory, WEIGHTS.bookmark * 0.7);
        counts.bookmarks += 1;
    });

    lanternSnap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        bumpCategory(data.category, WEIGHTS.lantern);
        bumpCategory(data.subCategory, WEIGHTS.lantern * 0.7);
        counts.lanterns += 1;
    });

    searchSnap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        bumpKeyword(data.keyword, WEIGHTS.search);
        counts.searches += 1;
    });

    return { categoryScores, keywordScores, counts };
}

function buildInterestProfile(
    categoryScores: Record<string, CategoryScore>,
    keywordScores: Record<string, KeywordScore>,
    counts: InterestProfile["rawCounts"],
    windowStart: FirebaseFirestore.Timestamp,
    windowEnd: FirebaseFirestore.Timestamp,
): InterestProfile {
    const topCategories = Object.entries(categoryScores)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 5)
        .map(([id, meta]) => ({ id, score: meta.score, signals: meta.signals }));

    const topKeywords = Object.entries(keywordScores)
        .sort((a, b) => b[1].score - a[1].score)
        .slice(0, 5)
        .map(([keyword, meta]) => ({ keyword, score: meta.score, signals: meta.signals }));

    return {
        windowStart,
        windowEnd,
        topCategories,
        topKeywords,
        rawCounts: counts,
    };
}

async function fetchInternalPosts(topCategories: string[]): Promise<PostRecommendation[]> {
    if (topCategories.length === 0) return [];
    const results: PostRecommendation[] = [];

    for (const category of topCategories.slice(0, 3)) {
        try {
            const snap = await db
                .collection("posts")
                .where("category", "==", category)
                .orderBy("createdAt", "desc")
                .limit(10)
                .get();

            snap.forEach((docSnap) => {
                const data = docSnap.data() as any;
                results.push({
                    kind: "post",
                    postId: docSnap.id,
                    title: data.title ?? "추천 글",
                    category: data.category,
                    subCategory: data.subCategory,
                    lanterns: typeof data.lanterns === "number" ? data.lanterns : undefined,
                    replyCount: typeof data.replyCount === "number" ? data.replyCount : undefined,
                    createdAt: data.createdAt?.toMillis?.() ?? undefined,
                    score: (data.lanterns ?? 0) + (data.replyCount ?? 0) * 0.5,
                    excerpt: typeof data.content === "string" ? String(data.content).slice(0, 120) : undefined,
                });
            });
        } catch (error: any) {
            logger.error("[morningReco] 내부 게시글 조회 실패", {
                category,
                error: error?.message,
            });
        }
    }

    return results.slice(0, 6);
}

async function fetchExternalArticles(keywords: string[]): Promise<ExternalRecommendation[]> {
    const url = process.env.EXTERNAL_RECO_API_URL;
    const apiKey = process.env.EXTERNAL_RECO_API_KEY;

    if (!url || !apiKey || keywords.length === 0) {
        return [];
    }

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                keywords,
                limit: 3,
            }),
        });

        if (!res.ok) {
            const text = await res.text();
            logger.warn("[morningReco] 외부 기사 API 응답 오류", {
                status: res.status,
                text,
            });
            return [];
        }

        const json = (await res.json()) as any;
        const items: any[] = Array.isArray(json?.items) ? json.items : [];

        return items.slice(0, 3).map((item, idx) => ({
            kind: "external" as const,
            title: item.title ?? "추천 아티클",
            url: item.url ?? "#",
            source: item.source ?? json?.source ?? "external_api",
            summary: item.summary ?? item.description ?? undefined,
            score: item.score ?? (items.length - idx),
        }));
    } catch (error: any) {
        logger.error("[morningReco] 외부 기사 API 호출 실패", {
            error: error?.message,
        });
        return [];
    }
}

async function saveDigest(uid: string, dateId: string, payload: DigestPayload) {
    const digestRef = db
        .collection(DIGEST_COLLECTION)
        .doc(uid)
        .collection("items")
        .doc(dateId);

    await digestRef.set(payload, { merge: true });
}

async function pushInAppNotification(uid: string, dateId: string, body: string) {
    const notifRef = db
        .collection("user_notifications")
        .doc(uid)
        .collection("items")
        .doc();

    const nowMs = Date.now();

    await notifRef.set({
        id: notifRef.id,
        type: "system",
        priority: "high",
        title: "맞춤 아침 추천",
        message: body,
        timestamp: nowMs,
        read: false,
        data: {
            digestId: dateId,
            dateId,
        },
        channel: "push",
        toUserUid: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

async function processUser(uid: string, dateId: string) {
    const now = new Date();
    const windowEndDate = getKstDate(now);
    const windowStartDate = new Date(windowEndDate.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const windowStart = admin.firestore.Timestamp.fromDate(windowStartDate);
    const windowEnd = admin.firestore.Timestamp.fromDate(windowEndDate);

    const { categoryScores, keywordScores, counts } = await collectCategorySignals(
        uid,
        windowStart,
        windowEnd,
    );

    const interestProfile = buildInterestProfile(
        categoryScores,
        keywordScores,
        counts,
        windowStart,
        windowEnd,
    );

    if (
        interestProfile.topCategories.length === 0 &&
        interestProfile.topKeywords.length === 0
    ) {
        logger.info("[morningReco] 관심 신호 없음, 스킵", { uid });
        return;
    }

    const topCategoryIds = interestProfile.topCategories.map((c) => c.id);
    const topKeywords = interestProfile.topKeywords.map((k) => k.keyword);

    const [posts, external] = await Promise.all([
        fetchInternalPosts(topCategoryIds),
        fetchExternalArticles(topKeywords),
    ]);

    if (posts.length === 0 && external.length === 0) {
        logger.info("[morningReco] 추천 결과 없음, 스킵", { uid });
        return;
    }

    const subtitle =
        topCategoryIds.length > 0
            ? `최근 관심사: ${topCategoryIds.slice(0, 3).join(", ")}`
            : "최근 활동을 기반으로 추천을 준비했어요";

    const payload: DigestPayload = {
        dateId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        interestProfile,
        recommendations: {
            posts,
            external,
        },
        pinnedCard: {
            title: "오늘의 맞춤 추천",
            subtitle,
            actions: [
                { label: "바로 보기", type: "open_digest", digestId: dateId },
                { label: "숨기기", type: "dismiss" },
            ],
        },
        push: {
            title: "맞춤 추천이 도착했어요",
            body: "오늘 아침 관심사에 맞는 글과 자료를 준비했어요.",
            deepLink: `app://digest/${dateId}`,
        },
    };

    await saveDigest(uid, dateId, payload); // 다이제스트 데이터 저장은 그대로

    // ✅ [여기만 추가] 하드웨어 푸시 알림 발송 (설정 체크 포함)
    await sendPushNotification({
        targetUid: uid,
        type: "daily_digest",
        title: payload.push.title,
        body: payload.push.body,
        link: `/digest/${dateId}`,
    });
}

export const sendMorningRecommendations = onSchedule(
    {
        schedule: "0 9 * * *", // 매일 09:00 KST
        timeZone: "Asia/Seoul",
        region: "asia-northeast3",
        memory: "1GiB",
        timeoutSeconds: 300,
    },
    async () => {
        const todayId = getKstDateId(new Date());
        logger.info("[morningReco] 시작", { todayId });

        const userSnap = await db
            .collection("users")
            .where("consents.personalizedDigest", "==", true)
            .limit(MAX_USERS_PER_RUN)
            .get();

        logger.info("[morningReco] 대상 사용자", { count: userSnap.size });

        for (const docSnap of userSnap.docs) {
            const uid = docSnap.id;
            try {
                await processUser(uid, todayId);
            } catch (error: any) {
                logger.error("[morningReco] 사용자 처리 실패", {
                    uid,
                    error: error?.message,
                });
            }
        }

        logger.info("[morningReco] 완료", { todayId, processed: userSnap.size });
    },
);
