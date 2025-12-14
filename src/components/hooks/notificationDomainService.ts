// src/components/MainScreen/hooks/notificationDomainService.ts
// 알림 생성 도메인 로직 (설정 + 카테고리 구독을 모두 확인하고 알림 생성)

import { db } from "../../firebase";
import {
    collection,
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
} from "firebase/firestore";

import {
    Notification as AppNotification,
    NotificationSettings,
    NotificationType,
    NotificationPriority,
    NotificationTypeConfig,
    createNotificationMessage,
    isDoNotDisturbActive,
} from "../types/notifications";

// 맨 위 근처(파일 상단)에 헬퍼 하나 추가해도 됩니다.
// undefined 인 필드는 Firestore에 안 넣도록 정리
function buildFirestoreNotification(notification: AppNotification) {
    const base: any = {
        id: notification.id,
        type: notification.type,
        priority: notification.priority,
        title: notification.title,
        message: notification.message,
        timestamp: notification.timestamp,
        read: notification.read,
    };

    // data / action / groupId 는 선택 필드이므로
    if (notification.data != null) {
        base.data = notification.data;
    }
    if (notification.action != null) {
        base.action = notification.action;
    }
    if (notification.groupId != null) {
        base.groupId = notification.groupId;
    }

    return base;
}

// 🔹 Firestore 경로 헬퍼 (useNotifications.ts와 동일 기준)
const notificationsCol = (uid: string) =>
    collection(db, "user_notifications", uid, "items");
const settingsDoc = (uid: string) =>
    doc(db, "user_notification_settings", uid);
const userDoc = (uid: string) => doc(db, "users", uid);

// 🔹 카테고리 구독 설정 타입
interface CategoryNotificationSettings {
    allEnabled: boolean;
    enabledCategories: string[]; // 허용된 카테고리 ID들
}

// 🔹 이벤트 정보를 담는 타입
export interface NotificationEventContext {
    toUserUid: string;          // 알림 받을 사람
    fromUserUid?: string | null; // 알림 발생시킨 사람 (없으면 null 허용)
    type: NotificationType;     // "reply" | "lantern" | "guide" | ...
    categoryId?: string | null; // 게시글/댓글이 속한 카테고리
    data?: AppNotification["data"];
    priority?: NotificationPriority;
    groupId?: string;
    action?: AppNotification["action"];
}

/** 1. 유저의 채널/타입 알림 설정 가져오기 */
async function getUserChannelSettings(
    uid: string,
): Promise<NotificationSettings | null> {
    const snap = await getDoc(settingsDoc(uid));
    if (!snap.exists()) return null;

    const data = snap.data() as NotificationSettings;
    return data;
}

/** 2. 유저의 카테고리 구독 설정 가져오기 (users/{uid}.notificationSettings) */
async function getUserCategorySettings(
    uid: string,
): Promise<CategoryNotificationSettings | null> {
    const snap = await getDoc(userDoc(uid));
    if (!snap.exists()) return null;

    const data = snap.data() as any;
    const ns = data.notificationSettings;

    if (!ns || typeof ns !== "object") {
        return null;
    }

    const allEnabled =
        typeof ns.allEnabled === "boolean" ? ns.allEnabled : true;

    const enabledCategories = Array.isArray(ns.enabledCategories)
        ? (ns.enabledCategories as string[])
        : [];

    return {
        allEnabled,
        enabledCategories,
    };
}

/**
 * 3. 이 이벤트에 대해 알림을 생성해야 하는지 여부
 *    - 채널 설정 (enabled, types, DND)
 *    - 카테고리 설정 (allEnabled + enabledCategories)
 *    둘 모두 검사
 */
export async function shouldCreateNotificationForEvent(
    ctx: NotificationEventContext,
): Promise<boolean> {
    const { toUserUid, fromUserUid, type, categoryId } = ctx;

    if (!toUserUid) return false;

    // 자기 자신 이벤트는 기본적으로 알림 X (원하면 나중에 옵션화 가능)
    if (fromUserUid && fromUserUid === toUserUid) {
        return false;
    }

    // 1) 채널/타입 설정 확인
    const channelSettings = await getUserChannelSettings(toUserUid);

    // 설정 문서가 없으면 → 기본값: 알림 허용
    if (channelSettings) {
        if (!channelSettings.enabled) return false;

        // 타입별 on/off
        if (
            channelSettings.types &&
            channelSettings.types[type] === false
        ) {
            return false;
        }

        // 방해 금지 시간
        if (isDoNotDisturbActive(channelSettings)) {
            return false;
        }
    }

    // 2) 카테고리 구독 설정 확인
    if (categoryId) {
        const categorySettings = await getUserCategorySettings(toUserUid);

        // 카테고리 설정이 없으면 → 기본값: 허용
        if (categorySettings) {
            const { allEnabled, enabledCategories } = categorySettings;

            // allEnabled === false 이고, 리스트에도 없으면 → 알림 생성 X
            if (!allEnabled && !enabledCategories.includes(categoryId)) {
                return false;
            }
        }
    }

    return true;
}

/**
 * 4. 실제 알림 문서를 Firestore에 생성하는 함수
 *    - 앞으로 댓글/등불/인기글 알림은 이 함수를 통해서만 만들도록 통일
 */
export async function createNotificationForEvent(
    ctx: NotificationEventContext,
): Promise<AppNotification | null> {
    const {
        toUserUid,
        fromUserUid = null,
        type,
        categoryId = null,
        data,
        priority,
        groupId,
        action,
    } = ctx;

    if (!toUserUid) return null;

    // 1) 알림 생성 여부 확인
    const shouldCreate = await shouldCreateNotificationForEvent(ctx);
    if (!shouldCreate) {
        return null;
    }

    // 2) 알림 내용 구성
    const { title, message } = createNotificationMessage(type, data);
    const config = NotificationTypeConfig[type];
    const now = Date.now();

    const colRef = notificationsCol(toUserUid);
    const newDocRef = doc(colRef);

    const notification: AppNotification = {
        id: newDocRef.id,
        type,
        priority: priority ?? config.defaultPriority,
        title,
        message,
        timestamp: now,
        read: false,
        data,
        action,
        groupId,
    };

    // 🔴 여기에서 더 이상 ...notification 을 그대로 넣지 말고
    // undefined 가 제거된 데이터만 넣는다.
    const firestoreNotification = buildFirestoreNotification(notification);

    await setDoc(newDocRef, {
        ...firestoreNotification,
        // 🔹 rules에서 검사하는 필드들 명시적으로 저장
        toUserUid,
        fromUserUid: fromUserUid ?? null,
        categoryId: categoryId ?? null,
        createdAt: serverTimestamp(),
    });

    return notification;
}

/**
 * 팔로우 알림 전용 헬퍼
 * - toUserUid : 알림을 받을 사람 (팔로우 당한 사람)
 * - fromUserUid : 팔로우를 건 사람 (나)
 * - followerNickname / followerAvatar : 알림 메시지 구성용
 */
export async function createFollowNotification(params: {
    toUserUid: string;
    fromUserUid: string;
    followerNickname: string;
    followerAvatar?: string | null;
}) {
    const { toUserUid, fromUserUid, followerNickname, followerAvatar } = params;

    // ✅ 여기서 절대 toUserUid를 data 안에 넣지 않는다.
    //    data 타입에는 toUserUid가 없어서, 넣으면 2561 에러가 난다.
    const data: AppNotification["data"] = {
        userId: fromUserUid,
        userName: followerNickname,
        userAvatar: followerAvatar ?? undefined,
    };

    // 아바타가 있을 때만 필드 추가 (undefined 절대 넣지 않기)
    if (followerAvatar) {
        data.userAvatar = followerAvatar;
    }

    return createNotificationForEvent({
        toUserUid,
        fromUserUid,
        type: "follow",
        data,
        // priority, groupId, action 이 필요하면 여기서 추가
    });
}