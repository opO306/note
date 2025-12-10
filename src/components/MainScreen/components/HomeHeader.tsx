// MainScreen/components/HomeHeader.tsx
// 홈 화면 상단 헤더 컴포넌트 - 원본 MainScreen.tsx와 동일
/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */
import React from "react";
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
  BookOpen,
  ShoppingBag,
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

  // 카테고리
  activeCategory: string;
  activeSubCategory: string;
  onCategoryClick: () => void;

  // 기타
  onGuidelinesClick: () => void;
  onTitleShopClick: () => void;

  // 🔹 운영자용: 신고 관리 화면 열기
  isAdmin?: boolean;
  onOpenAdminReports?: () => void;
}


export function HomeHeader({
  isDarkMode,
  onToggleDarkMode,
  hasNotifications,
  showNotifications,
  onNotificationsToggle,
  notifications,
  onNotificationClick,
  onMarkAllNotificationsRead,
  onNotificationSettingsClick,
  activeCategory,
  activeSubCategory,
  onCategoryClick,
  onGuidelinesClick,
  onTitleShopClick,
  isAdmin,
  onOpenAdminReports,
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
              onClick={onGuidelinesClick}
              aria-label="커뮤니티 가이드라인"
            >
              <BookOpen className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="touch-target rounded-xl hover:bg-accent/80 transition-all duration-200 text-foreground"
              onClick={onTitleShopClick}
            >
              <ShoppingBag className="w-5 h-5" />
            </Button>

            {/* 🔹 운영자 전용 신고 관리 버튼 */}
            {isAdmin && onOpenAdminReports && (
              <Button
                variant="ghost"
                size="icon"
                className="touch-target rounded-xl hover:bg-accent/80 transition-all duration-200 text-foreground"
                onClick={onOpenAdminReports}
                aria-label="신고 관리"
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
                      {notifications.some((n) => !n.isRead) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onMarkAllNotificationsRead}
                          className="text-xs h-7 px-2"
                        >
                          모두 읽음
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onNotificationSettingsClick}
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
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-border hover:bg-muted/50 transition-colors cursor-pointer ${!notification.isRead ? "bg-muted/30" : ""
                            }`}
                          onClick={() => onNotificationClick(notification)}
                        >
                          <div className="flex items-start space-x-3">
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
