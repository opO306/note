// MainScreen/hooks/useNotificationActions.ts
// 알림 관련 로직을 관리하는 훅 (UI 어댑터 역할)
// ✅ 새 도메인 훅 useNotifications 를 사용해서 Firestore 알림을 그대로 물려줌

import { useState, useCallback } from "react";
import { toast } from "@/toastHelper";
import type { Notification, Post } from "../types";
import { useNotifications } from "@/components/hooks/useNotifications";
import React from "react";

interface UseNotificationActionsParams {
  posts: Post[];
  onPostSelect: (post: Post) => void;
}

export function useNotificationActions({
  posts,
  onPostSelect,
}: UseNotificationActionsParams) {
  // 팝오버 열림 상태는 UI에서만 관리
  const [showNotifications, setShowNotifications] = useState(false);

  // 🔹 도메인 레벨 Firestore 알림 훅
  const {
    notifications: domainNotifications,
    // unreadCount,  // ❌ 사용 안 하므로 제거
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotifications({
    maxNotifications: 100,
    autoDeleteAfterDays: 30,
  });

  // 🔹 UI 에서는 "안 읽힌 알림"만 사용
  const notifications: Notification[] = React.useMemo(
    () =>
      domainNotifications
        .filter((n) => !n.read)                    // ★ 추가: unread 만 남김
        .map((n) => {
          const rawPostId = (n.data as any)?.postId as
            | string
            | number
            | undefined;

          const postId =
            typeof rawPostId === "string" || typeof rawPostId === "number"
              ? rawPostId
              : undefined;

          let postTitle: string | undefined = undefined;

          if (postId !== undefined) {
            const post = posts.find(
              (p) => String(p.id) === String(postId)
            );
            if (post) {
              postTitle = post.title;
            }
          }

          return {
            id: n.id,
            type: n.type as Notification["type"],
            message: n.message,
            postId,
            postTitle,
            time: new Date(n.timestamp).toLocaleString("ko-KR"),
            isRead: n.read,
          };
        }),
    [domainNotifications, posts]
  );

  // 🔹 “새 알림 있음” 여부: 안 읽힌 알림이 하나라도 있으면 true
  const hasNotifications = notifications.length > 0;

  // 🔹 알림 클릭 시 처리
  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      // 1) 읽음 처리 (Firestore + 클라이언트)
      markAsRead(notification.id);

      // 2) 팝오버 닫기
      setShowNotifications(false);

      // 3) 게시글로 이동 (postId 가 있는 알림에 한해)
      if (notification.postId != null) {
        const post = posts.find(
          (p) => String(p.id) === String(notification.postId)
        );
        if (post) {
          onPostSelect(post);
          return;
        }
      }

      // 게시글을 못 찾는 알림(팔로우, 시스템 등)은 일단 읽기만 처리
      // 필요하면 여기서 타입별로 추가 동작(프로필로 이동 등)을 붙이면 됨
      // ex) if (notification.type === "follow") { ... }
    },
    [markAsRead, posts, onPostSelect]
  );

  // 🔹 모든 알림 읽음 처리
  const handleMarkAllNotificationsRead = useCallback(() => {
    if (!notifications.length) return;
    markAllAsRead();
    toast.success("모든 알림을 읽음으로 표시했습니다");
  }, [markAllAsRead, notifications.length]);

  // 🔹 알림 하나 삭제 (UI 버튼에서 쓸 수 있게 유지)
  const handleRemoveNotification = useCallback(
    (notificationId: string) => {
      removeNotification(notificationId);
    },
    [removeNotification]
  );

  // 🔹 모든 알림 삭제
  const clearAllNotifications = useCallback(() => {
    if (!notifications.length) return;
    clearAll();
    toast.success("모든 알림을 삭제했습니다");
  }, [clearAll, notifications.length]);

  // 🔹 팝오버 토글
  const toggleNotifications = useCallback((open?: boolean) => {
    setShowNotifications((prev) => (open !== undefined ? open : !prev));
  }, []);

  return {
    notifications,
    hasNotifications,
    showNotifications,
    handleNotificationClick,
    handleMarkAllNotificationsRead,
    // 아래 프로퍼티들은 기존 MainScreenRefactored 코드와의 호환성 유지용
    removeNotification: handleRemoveNotification,
    clearAllNotifications,
    toggleNotifications,
    setShowNotifications,
  };
}
