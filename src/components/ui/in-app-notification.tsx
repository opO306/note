import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "./card";
import { OptimizedAvatar } from "../OptimizedAvatar";
import { Button } from "./button";
import { X } from "lucide-react";
import { cn } from "./utils";
import {
  Notification,
  NotificationTypeConfig,
} from "../types/notifications";
import { LanternIcon } from "../icons/Lantern";

interface InAppNotificationProps {
  /** 자동 숨김 시간 (ms, 0이면 자동 숨김 안 함) */
  autoHideDuration?: number;
  /** 위치 */
  position?: "top" | "bottom";
  /** 최대 표시 개수 */
  maxVisible?: number;
  /** 클릭 시 콜백 */
  onClick?: (notification: Notification) => void;
  /** 닫기 시 콜백 */
  onClose?: (notification: Notification) => void;
}

/**
 * 인앱 알림 컴포넌트
 * window 이벤트를 통해 알림 표시
 */
export function InAppNotification({
  autoHideDuration = 1500,
  position = "top",
  maxVisible = 3,
  onClick,
  onClose,
}: InAppNotificationProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timersRef = React.useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const handleShowNotification = (event: Event) => {
      const customEvent = event as CustomEvent<Notification>;
      const notification = customEvent.detail;

      setNotifications((prev) => {
        // 최대 개수 제한
        const newNotifications = [notification, ...prev].slice(0, maxVisible);
        return newNotifications;
      });

      // 자동 숨김 타이머 설정
      if (autoHideDuration > 0) {
        const timerId = setTimeout(() => {
          setNotifications((prev) =>
            prev.filter((n) => n.id !== notification.id)
          );
          timersRef.current.delete(notification.id);
        }, autoHideDuration);
        timersRef.current.set(notification.id, timerId);
      }
    };

    window.addEventListener("showInAppNotification", handleShowNotification);

    return () => {
      window.removeEventListener(
        "showInAppNotification",
        handleShowNotification
      );
      // 컴포넌트 언마운트 시 모든 타이머 정리
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, [autoHideDuration, maxVisible]);

  const handleClose = React.useCallback((notification: Notification) => {
    // 타이머가 있으면 취소
    const timerId = timersRef.current.get(notification.id);
    if (timerId) {
      clearTimeout(timerId);
      timersRef.current.delete(notification.id);
    }
    setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    onClose?.(notification);
  }, [onClose]);

  const handleClick = React.useCallback((notification: Notification) => {
    onClick?.(notification);
    handleClose(notification);
  }, [onClick, handleClose]);

  const positionClasses =
    position === "top"
      ? "top-4 safe-top"
      : "bottom-20 safe-nav-bottom";

  return (
    <div
      className={cn(
        "fixed left-4 right-4 z-50 pointer-events-none",
        positionClasses
      )}
    >
      <AnimatePresence mode="popLayout">
        {notifications.map((notification, index) => (
          <InAppNotificationItem
            key={notification.id}
            notification={notification}
            index={index}
            onClick={() => handleClick(notification)}
            onClose={() => handleClose(notification)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

interface InAppNotificationItemProps {
  notification: Notification;
  index: number;
  onClick: () => void;
  onClose: () => void;
}

function InAppNotificationItem({
  notification,
  index,
  onClick,
  onClose,
}: InAppNotificationItemProps) {
  const config = NotificationTypeConfig[notification.type];

  const getIcon = () => {
    if (notification.type === "lantern") {
      return <LanternIcon className="w-5 h-5 text-primary" />;
    }
    return <span className="text-xl">{config.icon}</span>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      style={{ marginBottom: index > 0 ? "0.5rem" : 0 }}
      className="pointer-events-auto"
    >
      <Card
        className={cn(
          "p-4 shadow-lg cursor-pointer hover:shadow-xl transition-shadow",
          "bg-card/95 backdrop-blur-sm border-l-4",
          notification.priority === "urgent" && "border-l-destructive",
          notification.priority === "high" && "border-l-primary",
          notification.priority === "normal" && "border-l-blue-500",
          notification.priority === "low" && "border-l-muted-foreground"
        )}
        onClick={onClick}
      >
        <div className="flex items-start gap-3">
          {/* 아이콘 또는 아바타 */}
          {notification.data?.userAvatar || notification.data?.userName ? (
            <OptimizedAvatar
              src={notification.data?.userAvatar}
              alt={notification.data?.userName || "알림 사용자"}
              nickname={notification.data?.userName}
              fallbackText={notification.data?.userName?.charAt(0).toUpperCase() || "?"}
              className="w-10 h-10"
              size={40}
              loading="lazy"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              {getIcon()}
            </div>
          )}

          {/* 내용 */}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm mb-0.5 truncate">
              {notification.title}
            </p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {notification.message}
            </p>

            {/* 액션 버튼 */}
            {notification.action && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 mt-1 text-primary"
              >
                {notification.action.label}
              </Button>
            )}
          </div>

          {/* 닫기 버튼 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="h-8 w-8 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

/**
 * 간단한 토스트 스타일 알림
 */
export function ToastNotification({
  notification,
  onClose,
}: {
  notification: Notification;
  onClose: () => void;
}) {
  const config = NotificationTypeConfig[notification.type];

  useEffect(() => {
    const timer = setTimeout(onClose, 1500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 safe-top"
    >
      <Card className="px-4 py-3 shadow-lg bg-card/95 backdrop-blur-sm flex items-center gap-2 min-w-[200px] max-w-[90vw]">
        <span className="text-lg">{config.icon}</span>
        <span className="text-sm font-medium truncate">
          {notification.title}
        </span>
      </Card>
    </motion.div>
  );
}

/**
 * 뱃지 스타일 알림
 */
export function BadgeNotification({
  count,
  onClick,
  className,
}: {
  count: number;
  onClick?: () => void;
  className?: string;
}) {
  if (count === 0) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      className={cn(
        "absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs font-semibold cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {count > 99 ? "99+" : count}
    </motion.div>
  );
}

/**
 * 점 스타일 뱃지
 */
export function DotBadge({
  show,
  className,
}: {
  show: boolean;
  className?: string;
}) {
  if (!show) return null;

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      exit={{ scale: 0 }}
      className={cn(
        "absolute top-0 right-0 w-2 h-2 bg-destructive rounded-full",
        className
      )}
    />
  );
}
