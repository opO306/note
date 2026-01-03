// src/components/FollowListScreen.tsx
import { useCallback, memo } from "react";
import { Card, CardContent } from "./ui/card";
import { Users, UserCheck } from "lucide-react";
import { AppHeader } from "./layout/AppHeader";
import { getTitleLabelById } from "@/data/titleData";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";

// 팔로우 목록에서 쓸 유저 정보 타입 (FollowListScreen과 동일하게 사용 가능)
export interface FollowUserInfo {
  nickname: string;
  avatarUrl?: string;
  bio?: string;
  title?: string;   // ★ 추가: 현재 장착한 칭호
}

// 🔹 props 에는 문자열이든 객체든 둘 다 받아도 되게 처리 (예전 코드 호환)
interface FollowListScreenProps {
  mode: "followers" | "following"; // followers = 선원, following = 승선한 배
  users: Array<FollowUserInfo | string | null | undefined>;
  onBack: () => void;
  onUserClick?: (nickname: string) => void;
  currentTheme?: string | null;
}

// 🔹 개별 유저 카드
interface UserCardProps {
  nickname: string;
  mode: "followers" | "following";
  avatarUrl?: string;
  bio?: string;
  title?: string;                      // ★ 추가: 칭호
  onUserClick?: (nickname: string) => void;
  currentTheme?: string | null;
}

const UserCard = memo(function UserCard({
  nickname,
  mode,
  avatarUrl,
  bio,
  title,           // ★ 추가
  onUserClick,
  currentTheme: _currentTheme,
}: UserCardProps) {
  const handleClick = useCallback(() => {
    if (!nickname) return;
    onUserClick?.(nickname);
  }, [onUserClick, nickname]);

  const displayName = nickname || "";
  const initial = displayName.slice(0, 2);
  const displayTitle = getTitleLabelById(title);   // ★ 공통 칭호 함수 사용

  return (
    <Card
      className="cursor-pointer rounded-xl"
      onClick={handleClick}
    >
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* 프로필 이미지가 있으면 이미지, 없으면 이니셜 아바타 */}
          <OptimizedAvatar
            src={avatarUrl || undefined}
            alt={displayName}
            nickname={nickname}
            fallbackText={initial}
            size={40}
            loading="lazy"
            decoding="async"
          />
          <div className="flex flex-col min-w-0">
            {/* 닉네임 + 칭호 한 줄 */}
            <div className="flex items-center gap-1 max-w-[180px]">
              <span className="text-base font-medium truncate">
                {displayName}
              </span>
              {displayTitle && (
                <span
                  className="
                    text-[10px] px-1.5 py-0.5 rounded-full
                    bg-amber-50 text-amber-700 border border-amber-200
                    truncate
                    "
                >
                  {displayTitle}
                </span>
              )}
            </div>

            {/* 한 줄 소개 */}
            {bio && (
              <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                {bio}
              </span>
            )}
          </div>
        </div>

        {mode === "following" ? (
          <UserCheck className="w-4 h-4 text-amber-500" />
        ) : (
          <Users className="w-4 h-4 text-amber-500" />
        )}
      </CardContent>
    </Card>
  );
});

export function FollowListScreen({
  mode,
  users,
  onBack,
  onUserClick,
  currentTheme,
}: FollowListScreenProps) {
  const title = mode === "followers" ? "내 선원들" : "승선한 배들";
  const emptyText =
    mode === "followers" ? "아직 선원이 없어요." : "아직 승선한 배가 없어요.";

  // 🔹 users 배열을 안전하게 정규화
  const normalizedUsers: FollowUserInfo[] = (users || [])
    .filter((u) => u != null)
    .map((u) => {
      if (typeof u === "string") {
        return { nickname: u };
      }
      // 객체인데 nickname 이 없으면 버린다
      if (!u.nickname) {
        return { nickname: "" };
      }
      return u as FollowUserInfo;
    })
    .filter((u) => u.nickname); // nickname 없는 항목 최종 제거

  return (
    <div className="w-full h-full bg-background text-foreground flex flex-col scrollbar-hide">
      {/* 상단 헤더 */}
      <AppHeader title={title} onBack={onBack} />

      {/* 목록 영역 */}
      <main className="flex-1 overflow-y-auto px-4 py-3">
        {normalizedUsers.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground text-center px-6">
              {emptyText}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {normalizedUsers.map((user, index) => (
              <UserCard
                key={user.nickname || `user-${index}`} // 🔹 key 보장
                nickname={user.nickname}
                avatarUrl={user.avatarUrl}
                bio={user.bio}
                title={user.title}        // ★ 추가: 칭호 전달
                mode={mode}
                onUserClick={onUserClick}
                currentTheme={currentTheme}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
