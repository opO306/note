import * as logger from "firebase-functions/logger";
// 👇 [핵심 수정] "firebase-admin"에서 직접 가져오지 말고, 우리가 만든 설정 파일에서 가져옵니다.
import { admin, db } from "./firebaseAdmin";

// 알림 유형 정의
export type NotificationType =
    | "reply"           // 내 글에 댓글
    | "mention"         // 나를 멘션 (@닉네임)
    | "follow"          // 팔로우
    | "guide_selected"  // 길잡이 채택
    | "lantern"         // 등불
    | "popular"         // 인기 글
    | "achievement"     // 업적
    | "daily_digest"    // 아침 추천
    | "marketing";      // 기타 공지

// 유형별 설정 필드 매핑
const SETTING_KEYS: Record<NotificationType, string> = {
    reply: "notifyOnReply",
    mention: "notifyOnMention",
    follow: "notifyOnFollow",
    guide_selected: "notifyOnGuide",
    lantern: "notifyOnLantern",      // 클라이언트 설정과 매핑 필요 (기본값 true)
    popular: "notifyOnPopular",      // 클라이언트 설정과 매핑 필요 (기본값 true)
    achievement: "notifyOnAchievement", // 클라이언트 설정과 매핑 필요 (기본값 true)
    daily_digest: "notifyOnDailyDigest",
    marketing: "notifyOnMarketing"
};

interface SendNotificationParams {
    targetUid: string;
    type: NotificationType;
    title: string;
    body: string;
    link: string;
    data?: Record<string, string>;
}

export async function sendPushNotification({
    targetUid,
    type,
    title,
    body,
    link,
    data = {}
}: SendNotificationParams): Promise<boolean> {
    try {
        // 1. 유저 정보(토큰 + 설정) 가져오기
        const userSnap = await db.collection("users").doc(targetUid).get();
        if (!userSnap.exists) return false;

        const userData = userSnap.data();
        const fcmToken = userData?.fcmToken;
        const settings = userData?.notificationSettings || {};

        // 2. 사용자가 설정을 껐는지 확인
        const settingKey = SETTING_KEYS[type];
        // 설정 키가 없으면 기본값 허용 (lantern, popular, achievement 등 새로 추가된 타입)
        const isAllowed = !settingKey || settings[settingKey] !== false; // false일 때만 차단

        if (!isAllowed) {
            logger.info(`[Notification] ${targetUid}님이 ${type} 알림을 꺼뒀습니다. 발송 취소.`);
            return false;
        }

        if (!fcmToken) {
            logger.info(`[Notification] ${targetUid}님의 FCM 토큰이 없습니다.`);
            return false;
        }

        // 3. 하드웨어 푸시 발송
        await admin.messaging().send({
            token: fcmToken,
            notification: { title, body },
            data: {
                ...data,
                link: link,
                type: type
            }
        });

        // 4. 앱 내 알림함(In-App Notification) 저장은 이미 트리거에서 처리됨
        // onNotificationCreated 트리거가 user_notifications/{uid}/items에 문서를 생성하므로
        // 여기서는 푸시 발송만 수행 (중복 저장 방지)

        return true;

    } catch (error) {
        logger.error(`[Notification] 발송 실패 (${type} -> ${targetUid})`, error);
        return false;
    }
}

/**
 * 현자의 종 호출: 신뢰도 70점 이상 또는 길잡이 선택 횟수가 많은 고수들에게 질문 알림 발송
 */
export async function callSagesForQuestion(
    categoryId: string,
    questionTitle: string,
    questionLink: string
): Promise<number> {
    try {
        // 1. 신뢰도 70점 이상인 사용자들 조회
        // Firestore 쿼리 제약: 하나의 범위 조건만 지원하므로 trustScore >= 70로 필터링
        const sagesSnap = await db.collection("users")
            .where("trustScore", ">=", 70)
            .limit(50) // 더 많이 가져와서 정렬 후 선별
            .get();

        if (sagesSnap.empty) {
            logger.info(`[SagesBell] trustScore 70 이상인 사용자가 없습니다.`);
            return 0;
        }

        // 2. 클라이언트 측에서 userGuideCount를 기준으로 정렬하여 상위 10명 선별
        const sages = sagesSnap.docs.map(doc => ({
            uid: doc.id,
            data: doc.data(),
        }));

        // userGuideCount가 높은 순으로 정렬 (없으면 0으로 처리)
        sages.sort((a, b) => {
            const aCount = a.data.userGuideCount || 0;
            const bCount = b.data.userGuideCount || 0;
            return bCount - aCount; // 내림차순
        });

        // 상위 10명 선별
        const topSages = sages.slice(0, 10);

        // 3. 각 고수에게 알림 발송
        const notifications = topSages.map(({ uid, data }) => {
            const guideCount = data.userGuideCount || 0;
            return sendPushNotification({
                targetUid: uid,
                type: "guide_selected", // 현자 호출 타입으로 재활용
                title: "🔔 현자의 종이 울렸습니다",
                body: `실전 고수님의 지혜가 필요한 질문입니다: "${questionTitle}" (채택 시 보너스 신뢰도!)`,
                link: questionLink,
                data: {
                    isSagesBell: "true",
                    bonusReward: "10", // 추가 보상 수치
                    guideCount: guideCount.toString(),
                }
            });
        });

        const results = await Promise.all(notifications);
        const successCount = results.filter(r => r === true).length;

        logger.info(`[SagesBell] ${successCount}/${topSages.length}명에게 알림 발송 완료 (userGuideCount 기준 상위 선별)`);
        return successCount;

    } catch (error) {
        logger.error(`[SagesBell] 현자의 종 호출 실패`, error);
        return 0;
    }
}