import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { OptimizedAvatar } from "../OptimizedAvatar";
import { Badge } from "./badge";
import { Separator } from "./separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { ScrollArea } from "./scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";
import { cn } from "./utils";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  Settings,
  Filter,
} from "lucide-react";
import { LanternIcon } from "../icons/Lantern";
import {
  Notification,
  NotificationGroup,
  NotificationType,
  NotificationTypeConfig,
} from "../types/notifications";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface NotificationCenterProps {
  notifications: Notification[];
  groupedNotifications?: NotificationGroup[];
  unreadCount: number;
  onNotificationClick: (notification: Notification) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  onSettingsClick?: () => void;
  /** 그룹화 모드 */
  groupMode?: boolean;
}

/**
 * 알림 센터 - Sheet 버전
 */
export function NotificationCenter({
  notifications,
  groupedNotifications = [],
  unreadCount,
  onNotificationClick,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
  onSettingsClick,
  groupMode = false,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationType | "all">("all");

  const filteredNotifications = useMemo(() => {
    if (filter === "all") return notifications;
    return notifications.filter((n) => n.type === filter);
  }, [notifications, filter]);

  const unreadFiltered = useMemo(() => {
    return filteredNotifications.filter((n) => !n.read);
  }, [filteredNotifications]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative touch-target nav-button"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs font-semibold">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col"
      >
        <SheetHeader className="p-4 pb-0">
          <div className="flex items-center justify-between mb-2">
            <SheetTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              알림
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {unreadCount}
                </Badge>
              )}
            </SheetTitle>

            <div className="flex items-center gap-1">
              {onSettingsClick && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onSettingsClick}
                  className="h-8 w-8"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <SheetDescription className="sr-only">
            알림 목록을 확인하세요
          </SheetDescription>
        </SheetHeader>

        {/* 필터 & 액션 */}
        <div className="px-4 pb-3 space-y-3">
          {/* 필터 */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
              className="whitespace-nowrap"
            >
              전체
            </Button>
            {(Object.keys(NotificationTypeConfig) as NotificationType[]).map(
              (type) => {
                const config = NotificationTypeConfig[type];
                const count = notifications.filter((n) => n.type === type)
                  .length;
                if (count === 0) return null;

                return (
                  <Button
                    key={type}
                    variant={filter === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter(type)}
                    className="whitespace-nowrap gap-1.5"
                  >
                    <span>{config.icon}</span>
                    <span>{config.label}</span>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      {count}
                    </Badge>
                  </Button>
                );
              }
            )}
          </div>

          {/* 액션 버튼 */}
          {filteredNotifications.length > 0 && (
            <div className="flex items-center gap-2">
              {unreadFiltered.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onMarkAllAsRead}
                  className="gap-2"
                >
                  <CheckCheck className="w-4 h-4" />
                  모두 읽음
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAll}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                전체 삭제
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* 알림 목록 */}
        <ScrollArea className="flex-1 px-4">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">알림이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2 py-4">
              <AnimatePresence mode="popLayout">
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => {
                      onNotificationClick(notification);
                      if (!notification.read) {
                        onMarkAsRead(notification.id);
                      }
                      setOpen(false);
                    }}
                    onMarkAsRead={() => onMarkAsRead(notification.id)}
                    onDelete={() => onDelete(notification.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

/**
 * 알림 아이템
 */
interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
}

function NotificationItem({
  notification,
  onClick,
  onMarkAsRead,
  onDelete,
}: NotificationItemProps) {
  const [showActions, setShowActions] = useState(false);
  const config = NotificationTypeConfig[notification.type];

  const getIcon = () => {
    if (notification.type === "lantern") {
      return <LanternIcon className="w-5 h-5 text-primary" />;
    }
    return <span className="text-xl">{config.icon}</span>;
  };

  const timeAgo = useMemo(() => {
    return formatDistanceToNow(notification.timestamp, {
      addSuffix: true,
      locale: ko,
    });
  }, [notification.timestamp]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-md group",
          !notification.read && "bg-primary/5 border-primary/20"
        )}
        onClick={onClick}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* 아이콘 또는 아바타 */}
            {notification.data?.userAvatar || notification.data?.userName ? (
              <OptimizedAvatar
                src={notification.data?.userAvatar}
                alt={notification.data?.userName || "알림 사용자"}
                nickname={notification.data?.userName}
                fallbackText={notification.data?.userName?.charAt(0).toUpperCase() || "?"}
                className="w-10 h-10 flex-shrink-0"
                size={40}
                loading="lazy"
              />
            ) : (
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  !notification.read ? "bg-primary/10" : "bg-muted"
                )}
              >
                {getIcon()}
              </div>
            )}

            {/* 내용 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p
                  className={cn(
                    "text-sm",
                    !notification.read && "font-semibold"
                  )}
                >
                  {notification.title}
                </p>

                {/* 읽지 않음 표시 */}
                {!notification.read && (
                  <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                )}
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {notification.message}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{timeAgo}</span>

                {/* 우선순위 뱃지 */}
                {(notification.priority === "high" ||
                  notification.priority === "urgent") && (
                    <Badge
                      variant={
                        notification.priority === "urgent"
                          ? "destructive"
                          : "default"
                      }
                      className="text-xs px-1.5 py-0"
                    >
                      {notification.priority === "urgent" ? "긴급" : "중요"}
                    </Badge>
                  )}
              </div>
            </div>

            {/* 액션 버튼 */}
            {showActions && (
              <div className="flex flex-col gap-1">
                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsRead();
                    }}
                    className="h-8 w-8"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/**
 * 그룹화된 알림 아이템
 */
function GroupedNotificationItem({
  group,
  onClick,
}: {
  group: NotificationGroup;
  onClick: () => void;
}) {
  const config = NotificationTypeConfig[group.type];
  const latest = group.notifications[0];

  const timeAgo = useMemo(() => {
    return formatDistanceToNow(group.latestTimestamp, {
      addSuffix: true,
      locale: ko,
    });
  }, [group.latestTimestamp]);

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        !group.read && "bg-primary/5 border-primary/20"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
              !group.read ? "bg-primary/10" : "bg-muted"
            )}
          >
            <span className="text-xl">{config.icon}</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className={cn("text-sm", !group.read && "font-semibold")}>
                {config.label}
              </p>
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {group.count}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
              {latest.message}
              {group.count > 1 && ` 외 ${group.count - 1}건`}
            </p>

            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>

          {!group.read && (
            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
