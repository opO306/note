import React, { useCallback } from "react";
import { Button } from "../ui/button";
import {
  Home,
  Bookmark,
  User,
  Plus,
  Trophy,
} from "lucide-react";

// 아이콘 스타일 상수 (매번 새로 만들지 않도록)
const ICON_STYLE = {
  stroke: 'currentColor',
  fill: 'none',
  display: 'block',
  width: '20px',
  height: '20px'
} as const;

const WRITE_ICON_STYLE = {
  stroke: '#ffffff',
  fill: 'none',
  display: 'block',
  width: '24px',
  height: '24px'
} as const;

interface BottomNavigationProps {
  onHomeClick: () => void;
  onRankingClick: () => void;
  onBookmarksClick: () => void;
  onMyPageClick: () => void;
  onWriteClick?: () => void;
  activeTab?: string;
}

function BottomNavigationComponent({
  onHomeClick,
  onRankingClick,
  onBookmarksClick,
  onMyPageClick,
  onWriteClick,
  activeTab = "home"
}: BottomNavigationProps) {

  const handleClick = useCallback((callback: () => void, event: React.MouseEvent<HTMLButtonElement>) => {
    const target = event.currentTarget;
    target.blur();
    setTimeout(() => {
      target.style.backgroundColor = 'transparent';
      target.classList.remove('focus:bg-accent', 'focus-visible:bg-accent');
    }, 0);
    callback();
  }, []);

  // 각 버튼의 클릭 핸들러 (매번 새로 만들지 않도록)
  const handleHomeClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    handleClick(onHomeClick, e);
  }, [handleClick, onHomeClick]);

  const handleRankingClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    handleClick(onRankingClick, e);
  }, [handleClick, onRankingClick]);

  const handleWriteClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (onWriteClick) {
      handleClick(onWriteClick, e);
    }
  }, [handleClick, onWriteClick]);

  const handleBookmarksClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    handleClick(onBookmarksClick, e);
  }, [handleClick, onBookmarksClick]);

  const handleMyPageClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    handleClick(onMyPageClick, e);
  }, [handleClick, onMyPageClick]);

  return (
    <nav className="bg-card/98 glass-effect border-t border-border flex-shrink-0 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_-2px_8px_rgba(0,0,0,0.2)] safe-nav-bottom relative">
      {/* 중앙 글 작성 버튼 - 절대 위치로 정중앙 */}
      {onWriteClick && (
        <Button
          className="write-button absolute left-1/2 -translate-x-1/2 -top-5 rounded-full w-14 h-14 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl overflow-hidden z-10"
          onClick={handleWriteClick}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary rounded-full" />
          <Plus
            size={24}
            strokeWidth={2.5}
            style={WRITE_ICON_STYLE}
            className="relative z-10"
          />
        </Button>
      )}

      <div className="px-2 py-2">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* 왼쪽 2개 버튼 */}
          <div className="flex items-center justify-around flex-1">
            <Button
              variant="ghost"
              size="sm"
              className={`nav-button nav-button-override flex flex-col items-center gap-1 touch-target px-3 py-2 rounded-xl ${activeTab === "home"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              onClick={handleHomeClick}
            >
              <Home
                size={20}
                strokeWidth={2}
                style={ICON_STYLE}
                className={`transition-transform duration-200 ${activeTab === "home" ? "scale-110" : ""
                  }`}
              />
              <span className="text-xs font-medium">홈</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={`nav-button nav-button-override flex flex-col items-center gap-1 touch-target px-3 py-2 rounded-xl ${activeTab === "ranking"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              onClick={handleRankingClick}
            >
              <Trophy
                size={20}
                strokeWidth={2}
                style={ICON_STYLE}
                className={`transition-transform duration-200 ${activeTab === "ranking" ? "scale-110" : ""
                  }`}
              />
              <span className="text-xs font-medium">랭킹</span>
            </Button>
          </div>

          {/* 가운데 빈 공간 (+ 버튼 자리) */}
          <div className="w-16" />

          {/* 오른쪽 2개 버튼 */}
          <div className="flex items-center justify-around flex-1">
            <Button
              variant="ghost"
              size="sm"
              className={`nav-button nav-button-override flex flex-col items-center gap-1 touch-target px-3 py-2 rounded-xl ${activeTab === "bookmarks"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              onClick={handleBookmarksClick}
            >
              <Bookmark
                size={20}
                strokeWidth={2}
                style={ICON_STYLE}
                className={`transition-transform duration-200 ${activeTab === "bookmarks" ? "scale-110" : ""
                  }`}
              />
              <span className="text-xs font-medium">북마크</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className={`nav-button nav-button-override flex flex-col items-center gap-1 touch-target px-3 py-2 rounded-xl ${activeTab === "profile"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                }`}
              onClick={handleMyPageClick}
            >
              <User
                size={20}
                strokeWidth={2}
                style={ICON_STYLE}
                className={`transition-transform duration-200 ${activeTab === "profile" ? "scale-110" : ""
                  }`}
              />
              <span className="text-xs font-medium">내 정보</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export const BottomNavigation = React.memo(BottomNavigationComponent);
