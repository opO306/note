// MainScreen/components/HomeHeader.tsx
// 홈 화면 상단 헤더 컴포넌트 - 원본 MainScreen.tsx와 동일
/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */
import React, { useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LanternFilledIcon } from "@/components/icons/Lantern";
import {
  MessageCircle,
  Settings,
  Moon,
  Sun,
  Bell,
  Menu,
  Star,
  ShoppingBag,
  HelpCircle,
} from "lucide-react";
import type { Notification } from "../types";

interface HomeHeaderProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;

  // 알림
  hasNotifications: boolean;
  showNotifications: boolean;
  onNotificationsToggle: (open: boolean) => void;
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onMarkAllNotificationsRead: () => void;
  onNotificationSettingsClick: () => void;
  onNotificationDelete?: (notificationId: string) => void;

  // 카테고리
  activeCategory: string;
  activeSubCategory: string;
  onCategoryClick: () => void;

  // 기타
  onQuizClick: () => void;
  onTitleShopClick: () => void;

  // 🔹 운영자용: 신고 관리 화면 열기
  isAdmin?: boolean;
  onOpenAdminReports?: () => void;
  isGuest: boolean; // 게스트 모드 여부 추가
}


function HomeHeaderComponent({
  isDarkMode,
  onToggleDarkMode,
  hasNotifications,
  showNotifications,
  onNotificationsToggle,
  notifications,
  onNotificationClick,
  onMarkAllNotificationsRead,
  onNotificationSettingsClick,
  onNotificationDelete,
  activeCategory,
  activeSubCategory,
  onCategoryClick,
  onQuizClick,
  onTitleShopClick,
  isAdmin,
  onOpenAdminReports,
  isGuest, // 게스트 모드 여부 추가
}: HomeHeaderProps) {
  return (
    <header className="bg-card/98 glass-effect border-b border-border/60 flex-shrink-0 z-40 safe-top">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              className="touch-target rounded-xl hover:bg-accent/80 transition-all duration-200"
              onClick={onCategoryClick}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">
                {activeCategory}
                {activeSubCategory !== "전체" && ` • ${activeSubCategory}`}
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className="touch-target rounded-xl hover:bg-accent/80 transition-all duration-200 text-foreground"
              onClick={onQuizClick}
              aria-label="주간 퀴즈"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="touch-target rounded-xl hover:bg-accent/80 transition-all duration-200 text-foreground"
              onClick={isGuest ? () => console.log("로그인 후 이용 가능합니다.") : onTitleShopClick}
              disabled={isGuest} // 게스트 모드 시 비활성화
            >
              <ShoppingBag className="w-5 h-5" />
            </Button>

            {/* 🔹 운영자 전용 신고 관리 버튼 */}
            {isAdmin && !isGuest && onOpenAdminReports && ( // 게스트 모드 시 비활성화
              <Button
                variant="ghost"
                size="icon"
                className="touch-target rounded-xl hover:bg-accent/80 transition-all duration-200 text-foreground"
                onClick={isGuest ? () => console.log("로그인 후 이용 가능합니다.") : onOpenAdminReports} // 게스트 모드 시 토스트 메시지
                disabled={isGuest} // 게스트 모드 시 비활성화
              >
                {/* 이미 import된 아이콘 중에서 적당한 것 사용 (예: Star) */}
                <Star className="w-5 h-5" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="touch-target rounded-xl hover:bg-accent/80 transition-all duration-200"
              onClick={onToggleDarkMode}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
            <Popover

              open={showNotifications}
              onOpenChange={onNotificationsToggle}
            >
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-4 h-4" />
                  {hasNotifications && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-80 p-0"
                align="end"
                side="bottom"
                sideOffset={5}
              >
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">알림</h3>
                    <div className="flex items-center space-x-2">
                      {notifications.some((n) => !n.isRead) && !isGuest && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onMarkAllNotificationsRead}
                          className="text-xs h-7 px-2"
                          disabled={isGuest} // 게스트 모드 시 비활성화
                        >
                          모두 읽음
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={isGuest ? () => console.log("로그인 후 이용 가능합니다.") : onNotificationSettingsClick} // 게스트 모드 시 토스트 메시지
                        disabled={isGuest} // 게스트 모드 시 비활성화
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="max-h-80 scroll-optimized">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      새로운 알림이 없습니다
                    </div>
                  ) : (
                    <>
                      {notifications.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onNotificationClick={onNotificationClick}
                          onDelete={onNotificationDelete ? () => onNotificationDelete(notification.id) : undefined}
                        />
                      ))}
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
    </header>
  );
}

export const HomeHeader = React.memo(HomeHeaderComponent);

interface NotificationItemProps {
  notification: Notification;
  onNotificationClick: (notification: Notification) => void;
  onDelete?: () => void;
}

const NotificationItem = React.memo(function NotificationItem({
  notification,
  onNotificationClick,
  onDelete,
}: NotificationItemProps) {
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const swipeOffsetRef = useRef<number>(0);
  const [swipeOffset, setSwipeOffset] = React.useState(0);
  const isSwipingRef = useRef(false);

  const SWIPE_THRESHOLD = 80;
  const MIN_SWIPE_DISTANCE = 10;

  const resetSwipe = useCallback(() => {
    swipeOffsetRef.current = 0;
    setSwipeOffset(0);
    startXRef.current = null;
    startYRef.current = null;
    isSwipingRef.current = false;
  }, []);

  const handleStart = useCallback((x: number, y: number) => {
    startXRef.current = x;
    startYRef.current = y;
    swipeOffsetRef.current = 0;
    isSwipingRef.current = false;
    setSwipeOffset(0);
  }, []);

  const handleMove = useCallback((x: number, y: number) => {
    if (startXRef.current === null || startYRef.current === null) return;

    const deltaX = x - startXRef.current;
    const deltaY = Math.abs(y - startYRef.current);

    // 수평 스와이프가 수직 스크롤보다 크면 스와이프로 판단
    if (Math.abs(deltaX) > MIN_SWIPE_DISTANCE && Math.abs(deltaX) > deltaY * 1.5) {
      isSwipingRef.current = true;
      swipeOffsetRef.current = deltaX;
      setSwipeOffset(deltaX);
    } else if (isSwipingRef.current && Math.abs(deltaX) > 0) {
      // 이미 스와이프 중이면 계속 업데이트
      swipeOffsetRef.current = deltaX;
      setSwipeOffset(deltaX);
    }
  }, []);

  const handleEnd = useCallback(() => {
    if (startXRef.current === null) return;

    const absOffset = Math.abs(swipeOffsetRef.current);
    if (absOffset > SWIPE_THRESHOLD && onDelete) {
      onDelete();
    }

    resetSwipe();
  }, [onDelete, resetSwipe]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  }, [handleStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startXRef.current === null || startYRef.current === null) return;
    const touch = e.touches[0];

    const deltaX = touch.clientX - startXRef.current;
    const deltaY = Math.abs(touch.clientY - startYRef.current);

    // 수평 스와이프가 수직 스크롤보다 크면 스와이프로 판단
    if (Math.abs(deltaX) > MIN_SWIPE_DISTANCE && Math.abs(deltaX) > deltaY * 1.5) {
      isSwipingRef.current = true;
      swipeOffsetRef.current = deltaX;
      setSwipeOffset(deltaX);
      e.preventDefault();
      e.stopPropagation();
    } else if (isSwipingRef.current) {
      // 스와이프가 시작된 상태면 계속 preventDefault
      e.preventDefault();
      e.stopPropagation();
    }
    // 스와이프가 아니면 스크롤 허용 (preventDefault 하지 않음)
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // 스와이프 중이었을 때만 preventDefault
    if (isSwipingRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
    handleEnd();
  }, [handleEnd]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY);
    const handleMouseMoveGlobal = (e: MouseEvent) => {
      if (startXRef.current !== null) {
        handleMove(e.clientX, e.clientY);
      }
    };
    const handleMouseUpGlobal = () => {
      handleEnd();
      document.removeEventListener("mousemove", handleMouseMoveGlobal);
      document.removeEventListener("mouseup", handleMouseUpGlobal);
    };
    document.addEventListener("mousemove", handleMouseMoveGlobal);
    document.addEventListener("mouseup", handleMouseUpGlobal);
  }, [handleStart, handleMove, handleEnd]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (isSwipingRef.current || Math.abs(swipeOffsetRef.current) > MIN_SWIPE_DISTANCE) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onNotificationClick(notification);
  }, [notification, onNotificationClick]);

  const opacity = Math.abs(swipeOffset) > SWIPE_THRESHOLD ? 0.4 : 1;
  const showDeleteBackground = Math.abs(swipeOffset) > 20;

  return (
    <div
      className={`p-4 border-b border-border hover:bg-muted/50 transition-all cursor-pointer relative overflow-hidden select-none ${!notification.isRead ? "bg-muted/30" : ""
        }`}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      // eslint-disable-next-line react/forbid-dom-props
      style={{
        transform: `translateX(${swipeOffset}px)`,
        opacity,
        transition: swipeOffset === 0 ? "transform 0.2s ease-out, opacity 0.2s ease-out" : "none",
        touchAction: Math.abs(swipeOffset) > 0 ? "pan-x" : "pan-y",
      }}
    >
      {showDeleteBackground && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-end px-4 bg-destructive text-destructive-foreground pointer-events-none"
          // eslint-disable-next-line react/forbid-dom-props
          style={{
            width: `${Math.min(Math.abs(swipeOffset) + 20, 120)}px`,
          }}
        >
          <span className="text-xs font-medium whitespace-nowrap">삭제</span>
        </div>
      )}
      <div className="flex items-start space-x-3 relative z-10">
        <div className="flex-shrink-0 mt-1">
          {notification.type === "reply" && (
            <MessageCircle className="w-4 h-4 text-blue-500" />
          )}
          {notification.type === "lantern" && (
            <LanternFilledIcon className="w-4 h-4 text-amber-500" />
          )}
          {notification.type === "popular" && (
            <Star className="w-4 h-4 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm">{notification.message}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {notification.postTitle} • {notification.time}
          </p>
        </div>
        {!notification.isRead && (
          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
        )}
      </div>
    </div>
  );
});
