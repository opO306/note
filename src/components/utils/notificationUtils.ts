import { collection, addDoc } from "firebase/firestore";
import { db } from "@/firebase"; // 프로젝트의 Firebase 초기화 파일 경로

/**
 * 알림 생성 시 필요한 데이터 구조 정의
 */
export interface NotificationEvent {
    toUserUid: string;       // 알림을 받을 사용자의 UID
    fromUserUid: string;     // 알림을 발생시킨 사용자의 UID
    type: "reply" | "mention" | "guide" | "follow"; // 알림 타입
    categoryId?: string | null;
    data: {
        postId: string | number;
        replyId?: number;
        userId: string | null;
        userName: string;
        userAvatar?: string | null;
        [key: string]: any; // 'guide' 타입의 추가 데이터(lumenReward 등)를 위해 추가
    };
}

/**
 * Firestore에 앱 내부 알림 문서를 생성합니다.
 *
 * 이 함수는 Firestore의 'addDoc'을 사용하여 문서를 바로 생성합니다.
 * 'addDoc'은 순수한 쓰기(생성) 작업이므로, 다른 사람의 알림 데이터를
 * 읽으려고 시도하지 않아 Firestore 보안 규칙의 '읽기 권한' 문제를 해결합니다.
 *
 * @param event - 알림 생성에 필요한 데이터 객체
 */
export async function createNotificationForEvent(event: NotificationEvent): Promise<void> {
    const { toUserUid, fromUserUid, type, categoryId, data } = event;

    if (!toUserUid) {
        // 알림 생성 실패: 수신자가 지정되지 않았습니다 (로그 제거)
        return;
    }

    // 자기 자신에게 보내는 알림은 생성하지 않습니다.
    if (toUserUid === fromUserUid) {
        return;
    }

    try {
        // 알림을 저장할 Firestore 경로를 지정합니다.
        // '/user_notifications/{수신자UID}/items' 컬렉션에 문서를 추가합니다.
        // 'items' 컬렉션 이름은 useNotifications.ts 파일과 일치시켰습니다.
        const notificationCollectionRef = collection(
            db,
            "user_notifications", // 최상위 컬렉션
            toUserUid,            // 알림을 받을 사용자의 문서 ID
            "items"               // 해당 사용자 문서 내의 하위 알림 컬렉션
        );

        // addDoc 함수로 문서를 생성합니다. 이 작업은 읽기 권한이 필요 없습니다.
        await addDoc(notificationCollectionRef, {
            fromUserUid: fromUserUid,
            type: type,
            categoryId: categoryId ?? null,
            data: data,
            read: false, // Firestore 필드명은 'read'
            timestamp: Date.now(), // useNotifications.ts와 일관성을 위해 서버 타임스탬프 대신 클라이언트 시간 사용
            // createNotificationMessage에서 생성하는 title, message는 Firestore에 저장하지 않고
            // 클라이언트에서 동적으로 생성하는 것이 데이터 중복을 줄여 더 좋습니다.
        });

    } catch (error) {
        // 알림 생성 중 Firestore 오류 (로그 제거)
        throw error; // 오류가 발생했음을 상위로 알려줌
    }
}