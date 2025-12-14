// src/components/types/notifications.ts

import type { ReactNode } from "react";
// ==========================================================
// 1. 타입 정의
// ==========================================================

export type NotificationType =
  | "reply"
  | "lantern"
  | "guide"
  | "popular"
  | "follow"
  | "mention"
  | "achievement"
  | "system";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export type NotificationChannel = "inApp" | "push";

export interface NotificationAction {
  label: string;
  url?: string;
  onClick?: () => void;
  screen?: string;
  [key: string]: any;
}

export interface NotificationData {
  postId?: string | number;
  replyId?: number;
  userId?: string;
  userName?: string;
  userAvatar?: string | null;
  lanternCount?: number;
  titleName?: string;
  lumenReward?: number;
  [key: string]: any;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  priority: NotificationPriority;
  data?: NotificationData;
  action?: NotificationAction | null;
  groupId?: string | null;
  channel?: NotificationChannel;
}

export interface NotificationGroup {
  /** 그룹 타입 (예: reply, lantern 등) */
  type: NotificationType;
  /** 이 그룹에 포함된 알림들 */
  notifications: Notification[];
  /** 가장 최근 알림의 타임스탬프(ms) */
  latestTimestamp: number;
  /** 그룹 전체가 읽음 처리 되었는지 */
  read: boolean;
  /** 그룹에 포함된 알림 개수 */
  count: number;
}

// ==========================================================
// 2. 설정 타입
// ==========================================================

export interface DoNotDisturbSettings {
  enabled?: boolean;
  // useNotifications 에서 쓰는 필드들(시간 숫자)
  startHour?: number;
  endHour?: number;
  // 문자열 "HH:mm" 형식으로 저장하는 경우 대비
  start?: string | null;
  end?: string | null;
  [key: string]: any;
}

export interface NotificationSettings {
  enabled: boolean;
  /**
   * 타입별 on/off
   * - reply, lantern, guide, popular, follow, mention, achievement, system
   */
  types: Partial<Record<NotificationType, boolean>>;

  /**
   * 예전 구조: settings.doNotDisturb.{enabled, startHour, endHour, start, end}
   * 새 구조: dndEnabled / dndStart / dndEnd
   * 둘 다 허용해서 타입 에러 안 나게 처리
   */
  doNotDisturb: DoNotDisturbSettings;

  // 대안 필드(지금 도메인 서비스에서 쓰는 쪽)
  dndEnabled?: boolean;
  dndStart?: string | null; // "HH:mm"
  dndEnd?: string | null; // "HH:mm"

  // 예전 useNotifications 에서 사용하던 필드들
  inAppEnabled?: boolean;
  pushEnabled?: boolean;
  sound?: any;

  [key: string]: any;
}

// ==========================================================
// 3. 타입별 기본 설정
// ==========================================================

export interface NotificationTypeConfigEntry {
  label: string;
  defaultPriority: NotificationPriority;
  icon: ReactNode;
}

export const NotificationTypeConfig: Record<
  NotificationType,
  NotificationTypeConfigEntry
> = {
  reply: {
    label: "새 답글",
    defaultPriority: "normal",
    icon: "",
  },
  lantern: {
    label: "등불",
    defaultPriority: "normal",
    icon: "",
  },
  guide: {
    label: "길잡이 채택",
    defaultPriority: "high",
    icon: "",
  },
  popular: {
    label: "인기 글",
    defaultPriority: "normal",
    icon: "",
  },
  follow: {
    label: "새 팔로워",
    defaultPriority: "normal",
    icon: "👤",
  },
  mention: {
    label: "멘션",
    defaultPriority: "normal",
    icon: "@",
  },
  achievement: {
    label: "업적",
    defaultPriority: "normal",
    icon: "",
  },
  system: {
    label: "시스템",
    defaultPriority: "high",
    icon: "",
  },
};


// 우선순위 가중치
const PRIORITY_WEIGHT: Record<NotificationPriority, number> = {
  low: 0,
  normal: 1,
  high: 2,
  urgent: 3,
};

// ==========================================================
// 4. 메시지 생성기
// ==========================================================

export function createNotificationMessage(
  type: NotificationType,
  data?: NotificationData
): { title: string; message: string } {
  const baseTitle = NotificationTypeConfig[type]?.label ?? "알림";
  const toSafeName = (raw?: string | null) => {
    const name = (raw ?? "").trim();
    if (!name) return "누군가";
    if (
      name === "탈퇴한 사용자" ||
      name === "탈퇴한 사용자입니다" ||
      name === "탈퇴한 사용자 입니다만"
    ) {
      return "탈퇴한 사용자 입니다만";
    }
    return name;
  };

  const userName = toSafeName(data?.userName);
  const lanternCount = data?.lanternCount ?? 1;
  const titleName = toSafeName(data?.titleName);
  const lumenReward = data?.lumenReward;

  switch (type) {
    case "reply":
      return {
        title: baseTitle,
        message: `${userName}님이 회원님의 글에 답글을 남겼습니다.`,
      };

    case "lantern":
      return {
        title: baseTitle,
        message:
          lanternCount > 1
            ? `${userName}님 외 ${lanternCount - 1}명이 등불을 밝혔습니다.`
            : `${userName}님이 등불을 밝혔습니다.`,
      };

    case "guide":
      return {
        title: baseTitle,
        message:
          lumenReward && titleName
            ? `${titleName}님의 답글이 길잡이로 채택되었습니다. (+${lumenReward} 루멘)`
            : `${userName}님의 답글이 길잡이로 채택되었습니다.`,
      };

    case "popular":
      return {
        title: baseTitle,
        message: "작성하신 글이 인기 글이 되었습니다.",
      };

    case "follow":
      return {
        title: baseTitle,
        message: `${userName}님이 회원님을 승선했습니다.`,
      };

    case "mention":
      return {
        title: baseTitle,
        message: `${userName}님이 회원님을 멘션했습니다.`,
      };

    case "achievement":
      return {
        title: baseTitle,
        message: "새 업적을 달성했습니다.",
      };

    case "system":
      return {
        title: baseTitle,
        message: "시스템 알림이 도착했습니다.",
      };

    default:
      return {
        title: "알림",
        message: "새 알림이 도착했습니다.",
      };
  }
}

// ==========================================================
// 5. 방해 금지 시간(DND) 계산
// ==========================================================

function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;

  const h = Number(m[1]);
  const min = Number(m[2]);
  if (Number.isNaN(h) || Number.isNaN(min)) return null;

  return h * 60 + min;
}

/**
 * useNotifications + notificationDomainService 양쪽에서 같이 쓰는 함수
 * - settings.doNotDisturb / dndEnabled / dndStart / dndEnd 모두를 지원
 */
export function isDoNotDisturbActive(
  settings: NotificationSettings | null | undefined,
  now: Date = new Date()
): boolean {
  if (!settings) return false;

  let enabled = false;
  let startMinutes: number | null = null;
  let endMinutes: number | null = null;

  // 1) settings.doNotDisturb 사용 (구조체)
  if (settings.doNotDisturb) {
    const d = settings.doNotDisturb;
    enabled = !!d.enabled;

    // 문자열 시간 우선
    if (typeof d.start === "string" && typeof d.end === "string") {
      startMinutes = parseTimeToMinutes(d.start);
      endMinutes = parseTimeToMinutes(d.end);
    }

    // 숫자 시(hour) 정보가 있으면 보정
    if (
      (startMinutes == null || endMinutes == null) &&
      typeof d.startHour === "number" &&
      typeof d.endHour === "number"
    ) {
      startMinutes = d.startHour * 60;
      endMinutes = d.endHour * 60;
    }
  }

  // 2) 상위 레벨(dndEnabled, dndStart, dndEnd) 사용
  if (
    (!enabled || startMinutes == null || endMinutes == null) &&
    settings.dndEnabled &&
    typeof settings.dndStart === "string" &&
    typeof settings.dndEnd === "string"
  ) {
    enabled = true;
    startMinutes = parseTimeToMinutes(settings.dndStart);
    endMinutes = parseTimeToMinutes(settings.dndEnd);
  }

  if (!enabled || startMinutes == null || endMinutes == null) {
    return false;
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // start == end 이면 비정상 설정으로 보고 비활성 처리
  if (startMinutes === endMinutes) return false;

  // 일반 구간 (예: 09:00~18:00)
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }

  // 자정을 넘는 구간 (예: 22:00~07:00)
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

// ==========================================================
// 6. 필터 / 유틸 함수들
// ==========================================================

export interface NotificationFilterOptions {
  // 새 형식
  types?: NotificationType[];
  onlyUnread?: boolean;
  minPriority?: NotificationPriority;

  // 예전 useNotifications.ts 호환용
  type?: NotificationType | "all";
  read?: boolean;
}

export function filterNotifications(
  list: Notification[],
  options?: NotificationFilterOptions
): Notification[] {
  if (!options) return list;

  return list.filter((n) => {
    // 1) 옛날 단일 type 필터
    if (options.type && options.type !== "all" && n.type !== options.type) {
      return false;
    }

    // 2) 복수 타입 필터
    if (options.types && options.types.length > 0) {
      if (!options.types.includes(n.type)) return false;
    }

    // 3) 읽지 않은 것만
    if (options.onlyUnread && n.read) {
      return false;
    }

    // 4) read 플래그 직접 지정
    if (typeof options.read === "boolean" && n.read !== options.read) {
      return false;
    }

    // 5) 최소 우선순위
    if (options.minPriority) {
      const minWeight = PRIORITY_WEIGHT[options.minPriority] ?? 0;
      const w = PRIORITY_WEIGHT[n.priority] ?? 0;
      if (w < minWeight) return false;
    }

    return true;
  });
}

export function getUnreadCount(list: Notification[]): number {
  return list.reduce((acc, n) => (n.read ? acc : acc + 1), 0);
}

/**
 * 비슷한 알림끼리 묶는 용도
 * - groupId 가 있으면 groupId 기준
 * - 없으면 (type + postId) 기준
 */
export function groupNotifications(
  list: Notification[]
): Record<string, Notification[]> {
  const groups: Record<string, Notification[]> = {};

  for (const n of list) {
    const key =
      n.groupId ??
      (n.data && n.data.postId
        ? `${n.type}:${String(n.data.postId)}`
        : n.id);

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(n);
  }

  return groups;
}

/**
 * 정렬 함수
 * - 우선순위(urgent > high > normal > low)
 * - 그 다음 timestamp 내림차순
 */
export function sortNotifications(list: Notification[]): Notification[] {
  return [...list].sort((a, b) => {
    const pa = PRIORITY_WEIGHT[a.priority] ?? 0;
    const pb = PRIORITY_WEIGHT[b.priority] ?? 0;

    if (pa !== pb) {
      return pb - pa;
    }

    return b.timestamp - a.timestamp;
  });
}
