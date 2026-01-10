import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Notification as AppNotification,
  NotificationSettings,
  NotificationType,
  NotificationPriority,
  createNotificationMessage,
  groupNotifications,
  filterNotifications,
  getUnreadCount,
  sortNotifications,
  isDoNotDisturbActive,
  NotificationTypeConfig,
} from "../types/notifications";
import { auth, db } from "../../firebase";
import { toast } from "@/toastHelper";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  getDoc,
} from "firebase/firestore";

const STORAGE_KEY_NOTIFICATIONS = "notifications";
const STORAGE_KEY_SETTINGS = "notificationSettings_v2"; // 또는 "inAppNotificationSettings"

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  sound: true,
  vibration: true,
  types: {
    lantern: true,
    reply: true,
    guide: true,
    mention: true,
    follow: true,
    system: true,
    achievement: true,
  },
  pushEnabled: false,
  inAppEnabled: true,
  doNotDisturb: {
    enabled: false,
    start: "22:00",
    end: "08:00",
  },
};

interface UseNotificationsOptions {
  /** 최대 저장 개수 */
  maxNotifications?: number;
  /** 자동 삭제 기간 (일) */
  autoDeleteAfterDays?: number;
}

/** Firestore 경로 헬퍼 */
const getUserId = () => auth.currentUser?.uid ?? null;
const notificationsCol = (uid: string) =>
  collection(db, "user_notifications", uid, "items");
const notificationDoc = (uid: string, id: string) =>
  doc(db, "user_notifications", uid, "items", id);
const settingsDoc = (uid: string) =>
  doc(db, "user_notification_settings", uid);

/**
 * 알림 관리 훅 (로그인: Firestore 기준, 비로그인: localStorage 기준)
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { maxNotifications = 100, autoDeleteAfterDays = 30 } = options;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  const cutoffMs = autoDeleteAfterDays * 24 * 60 * 60 * 1000;

  /** 🔹 localStorage 저장 (게스트/백업용) */
  const saveNotificationsLocal = useCallback((newNotifications: AppNotification[]) => {
    try {
      localStorage.setItem(
        STORAGE_KEY_NOTIFICATIONS,
        JSON.stringify(newNotifications)
      );
    } catch (error) {
      console.error("Failed to save notifications (local):", error);
    }
  }, []);

  const saveSettingsLocal = useCallback((newSettings: NotificationSettings) => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(newSettings));
    } catch (error) {
      console.error("Failed to save notification settings (local):", error);
    }
  }, []);

  /** 🔹 초기 로드: 로그인 O → Firestore, 로그인 X → localStorage */
  useEffect(() => {
    const uid = getUserId();

    // 비로그인: 예전 방식(localStorage) 그대로 유지
    if (!uid) {
      try {
        const savedNotifications = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
        if (savedNotifications) {
          const parsed = JSON.parse(savedNotifications) as AppNotification[];

          const cutoffTime = Date.now() - cutoffMs;
          const filtered = parsed.filter((n) => n.timestamp > cutoffTime);

          setNotifications(filtered.slice(0, maxNotifications));
        }

        const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        }
      } catch (error) {
        console.error("Failed to load notifications from localStorage:", error);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // 로그인: Firestore 기준
    setIsLoading(true);

    // 1) 알림 스트림
    const q = query(
      notificationsCol(uid),
      orderBy("timestamp", "desc"),
      limit(maxNotifications)
    );

    const unsubNotifications = onSnapshot(
      q,
      (snapshot) => {
        const now = Date.now();
        const cutoffTime = now - cutoffMs;

        const list: AppNotification[] = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data() as any;
            const ts =
              typeof data.timestamp === "number"
                ? data.timestamp
                : now;

            const type = data.type as NotificationType;
            const config = NotificationTypeConfig[type];

            const n: AppNotification = {
              id: docSnap.id,
              type,
              priority: (data.priority as NotificationPriority) ??
                config.defaultPriority,
              title: data.title ?? "",
              message: data.message ?? "",
              timestamp: ts,
              read: !!data.read,
              data: data.data,
              action: data.action,
              groupId: data.groupId,
            };
            return n;
          })
          .filter((n) => n.timestamp > cutoffTime);

        setNotifications(list);
        setIsLoading(false);
      },
      (error) => {
        console.error("Failed to load notifications from Firestore:", error);
        setIsLoading(false);
      }
    );

    // 2) 설정 스트림
    const unsubSettings = onSnapshot(
      settingsDoc(uid),
      (snapshot) => {
        if (snapshot.exists()) {
          const remote = snapshot.data() as NotificationSettings;
          // DEFAULT_SETTINGS 위에 merge 해서 누락 필드 방지
          setSettings({
            ...DEFAULT_SETTINGS,
            ...remote,
            types: {
              ...DEFAULT_SETTINGS.types,
              ...(remote.types ?? {}),
            },
            doNotDisturb: {
              ...DEFAULT_SETTINGS.doNotDisturb,
              ...(remote.doNotDisturb ?? {}),
            },
          });
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      },
      (error) => {
        console.error("Failed to load notification settings from Firestore:", error);
      }
    );

    return () => {
      unsubNotifications();
      unsubSettings();
    };
  }, [maxNotifications, cutoffMs]);

  /** 🔹 설정 Firestore 저장 */
  const saveSettingsRemote = useCallback(async (newSettings: NotificationSettings) => {
    const uid = getUserId();
    if (!uid) {
      toast.error("로그인 후 알림 설정 동기화가 가능합니다.");
      return; // 비로그인 시에는 localStorage만
    }

    try {
      await setDoc(settingsDoc(uid), newSettings, { merge: true });
    } catch (error) {
      console.error("Failed to save notification settings to Firestore:", error);
    }
  }, []);

  /** 🔹 알림 Firestore에 반영 */
  const upsertNotificationRemote = useCallback(async (notification: AppNotification) => {
    const uid = getUserId();
    if (!uid) {
      // 비로그인 상태에서는 Firestore에 알림을 저장하지 않음
      return;
    }

    try {
      await setDoc(notificationDoc(uid, notification.id), notification, { merge: true });
    } catch (error) {
      console.error("Failed to save notification to Firestore:", error);
    }
  }, []);

  const markReadRemote = useCallback(async (id: string) => {
    const uid = getUserId();
    if (!uid) {
      return;
    }

    try {
      await updateDoc(notificationDoc(uid, id), { read: true });
    } catch (error) {
      console.error("Failed to mark notification as read in Firestore:", error);
    }
  }, []);

  const deleteRemote = useCallback(async (id: string) => {
    const uid = getUserId();
    if (!uid) {
      return;
    }

    try {
      await deleteDoc(notificationDoc(uid, id));
    } catch (error) {
      console.error("Failed to delete notification from Firestore:", error);
    }
  }, []);

  const clearAllRemote = useCallback(async () => {
    const uid = getUserId();
    if (!uid) return;

    try {
      await getDoc(settingsDoc(uid)); // 단순히 호출해서 에러 체크 (실제 삭제는 onSnapshot 쿼리에서 처리해도 되고)
      // 여기서는 모든 삭제를 클라이언트에서 직접 돌리는 대신,
      // setNotifications([])만 하고, 서버 정리는 나중에 Cloud Functions로 옮길 수도 있음.
    } catch (error) {
      console.error("Failed to prepare clearAll in Firestore:", error);
    }
  }, []);

  // 알림 추가
  const addNotification = useCallback(
    (
      type: NotificationType,
      data?: AppNotification["data"],
      options?: {
        priority?: NotificationPriority;
        groupId?: string;
        action?: AppNotification["action"];
      }
    ) => {
      // 설정 확인
      if (!settings.enabled || !settings.types[type]) {
        return null;
      }

      // Do Not Disturb 확인
      if (isDoNotDisturbActive(settings)) {
        return null;
      }

      const { title, message } = createNotificationMessage(type, data);
      const config = NotificationTypeConfig[type];
      const now = Date.now();

      const notification: AppNotification = {
        id: now.toString() + Math.random().toString(36).substr(2, 9),
        type,
        priority: options?.priority || config.defaultPriority,
        title,
        message,
        timestamp: now,
        read: false,
        data,
        action: options?.action,
        groupId: options?.groupId,
      };

      setNotifications((prev) => {
        const newNotifications = [notification, ...prev].slice(0, maxNotifications);

        // 로그인 여부에 따라 저장 방식 분기
        const uid = getUserId();
        if (!uid) {
          // 게스트 → localStorage
          saveNotificationsLocal(newNotifications);
        } else {
          // 로그인 → Firestore (비동기)
          upsertNotificationRemote(notification);
        }

        return newNotifications;
      });

      // 인앱 알림 표시
      if (settings.inAppEnabled && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("showInAppNotification", {
            detail: notification,
          })
        );
      }

      // 푸시 알림
      if (
        settings.pushEnabled &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        showPushNotification(notification, settings);
      }

      return notification;
    },
    [
      settings,
      maxNotifications,
      saveNotificationsLocal,
      upsertNotificationRemote,
    ]
  );

  // 알림 읽음 처리
  const markAsRead = useCallback(
    (id: string) => {
      setNotifications((prev) => {
        const newNotifications = prev.map((n) =>
          n.id === id ? { ...n, read: true } : n
        );

        const uid = getUserId();
        if (!uid) {
          saveNotificationsLocal(newNotifications);
        } else {
          markReadRemote(id);
        }

        return newNotifications;
      });
    },
    [saveNotificationsLocal, markReadRemote]
  );

  // 모두 읽음 처리
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => {
      // 🔹 1) 이전 상태에서 아직 안 읽힌 알림들만 따로 저장
      const unread = prev.filter((n) => !n.read);

      // 🔹 2) 로컬 상태는 모두 읽음으로
      const newNotifications = prev.map((n) => ({ ...n, read: true }));

      const uid = getUserId();
      if (!uid) {
        saveNotificationsLocal(newNotifications);
      } else {
        // 🔹 3) Firestore 에도 안 읽힌 것들만 read: true 로 반영
        unread.forEach((n) => {
          markReadRemote(n.id);
        });
      }

      return newNotifications;
    });
  }, [saveNotificationsLocal, markReadRemote]);

  // 알림 삭제
  const removeNotification = useCallback(
    (id: string) => {
      setNotifications((prev) => {
        const newNotifications = prev.filter((n) => n.id !== id);

        const uid = getUserId();
        if (!uid) {
          saveNotificationsLocal(newNotifications);
        } else {
          deleteRemote(id);
        }

        return newNotifications;
      });
    },
    [saveNotificationsLocal, deleteRemote]
  );

  // 모두 삭제
  const clearAll = useCallback(() => {
    setNotifications([]);

    const uid = getUserId();
    if (!uid) {
      saveNotificationsLocal([]);
    } else {
      clearAllRemote();
      // 실제 Firestore 전체 삭제는 나중에 배치/함수로 처리해도 되고,
      // 여기서 쿼리 돌려서 전부 deleteDoc 해도 됨 (비용/속도 고려).
    }
  }, [saveNotificationsLocal, clearAllRemote]);

  // 타입별 삭제
  const clearByType = useCallback(
    (type: NotificationType) => {
      setNotifications((prev) => {
        const newNotifications = prev.filter((n) => n.type !== type);

        const uid = getUserId();
        if (!uid) {
          saveNotificationsLocal(newNotifications);
        } else {
          // 간단 구현: 클라이언트 상태만 갱신, Firestore는 추후 정리
          // 필요하면 여기서 type 기준 쿼리 날려서 deleteDoc 반복
        }

        return newNotifications;
      });
    },
    [saveNotificationsLocal]
  );

  // 설정 업데이트
  const updateSettings = useCallback(
    (updates: Partial<NotificationSettings>) => {
      setSettings((prev) => {
        const newSettings: NotificationSettings = {
          ...prev,
          ...updates,
          types: {
            ...prev.types,
            ...(updates.types ?? {}),
          },
          doNotDisturb: {
            ...prev.doNotDisturb,
            ...(updates.doNotDisturb ?? {}),
          },
        };

        const uid = getUserId();
        if (!uid) {
          saveSettingsLocal(newSettings);
        } else {
          saveSettingsRemote(newSettings);
        }

        return newSettings;
      });
    },
    [saveSettingsLocal, saveSettingsRemote]
  );

  // 읽지 않은 알림 개수
  const unreadCount = useMemo(() => getUnreadCount(notifications), [notifications]);

  // 그룹화된 알림
  const groupedNotifications = useMemo(
    () => groupNotifications(notifications),
    [notifications]
  );

  // 타입별 필터링
  const getNotificationsByType = useCallback(
    (type: NotificationType) => filterNotifications(notifications, { type }),
    [notifications]
  );

  // 읽지 않은 알림만
  const unreadNotifications = useMemo(
    () => filterNotifications(notifications, { read: false }),
    [notifications]
  );

  // 정렬된 알림
  const sortedNotifications = useMemo(
    () => sortNotifications(notifications),
    [notifications]
  );

  return {
    notifications: sortedNotifications,
    groupedNotifications,
    unreadNotifications,
    unreadCount,
    settings,
    isLoading,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    clearByType,
    updateSettings,
    getNotificationsByType,
  };
}

/**
 * 푸시 알림 표시
 */
function showPushNotification(
  notification: AppNotification,
  settings: NotificationSettings
) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;

  const options: NotificationOptions = {
    body: notification.message,
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    tag: notification.groupId || notification.id,
    requireInteraction: notification.priority === "urgent",
    silent: !settings.sound,
    data: {
      notificationId: notification.id,
      type: notification.type,
      ...notification.data,
    },
  };

  if (notification.data?.userAvatar) {
    options.icon = notification.data.userAvatar;
  }

  const pushNotification = new Notification(notification.title, options);

  pushNotification.onclick = () => {
    window.focus();
    if (notification.action?.url) {
      window.location.href = notification.action.url;
    } else if (notification.action?.onClick) {
      notification.action.onClick();
    }
    pushNotification.close();
  };

  if (notification.priority !== "urgent") {
    setTimeout(() => {
      pushNotification.close();
    }, 5000);
  }
}

/**
 * 테스트 알림 생성
 */
export function createTestNotifications(): AppNotification[] {
  const now = Date.now();

  return [
    {
      id: "1",
      type: "lantern",
      priority: "normal",
      title: "등불을 받았습니다",
      message: "철수님이 등불 3개를 켜주셨습니다",
      timestamp: now - 5 * 60 * 1000,
      read: false,
      data: {
        postId: 123,
        userName: "철수",
        lanternCount: 3,
      },
    },
    {
      id: "2",
      type: "reply",
      priority: "normal",
      title: "새 답글이 있습니다",
      message: "영희님이 답글을 남겼습니다",
      timestamp: now - 30 * 60 * 1000,
      read: false,
      data: {
        postId: 123,
        replyId: 456,
        userName: "영희",
      },
    },
    {
      id: "3",
      type: "guide",
      priority: "high",
      title: "길잡이로 채택되었습니다!",
      message: "루멘 5개를 받았습니다",
      timestamp: now - 2 * 60 * 60 * 1000,
      read: false,
      data: {
        postId: 123,
        replyId: 456,
        lumenReward: 5,
      },
    },
    {
      id: "4",
      type: "achievement",
      priority: "high",
      title: "새 칭호를 획득했습니다!",
      message: "'길잡이 견습생'을 획득했습니다",
      timestamp: now - 24 * 60 * 60 * 1000,
      read: true,
      data: {
        titleName: "길잡이 견습생",
      },
    },
  ];
}
