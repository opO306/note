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