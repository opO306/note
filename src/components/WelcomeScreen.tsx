import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { LogOut, Sun, Moon, Sparkles } from "lucide-react";

interface WelcomeScreenProps {
  nickname: string;
  onRestart: () => void;
  onStartApp: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

// 배경에 은은하게 깔릴 장식용 기호들 (스크린샷처럼 점 패턴과 조화되도록 아주 연하게 처리)
Array.from({ length: 20 }).map((_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 1, // 아주 작은 점들
  opacity: Math.random() * 0.3 + 0.1,
}));

export function WelcomeScreen({ nickname, onRestart, onStartApp, isDarkMode, onToggleDarkMode }: WelcomeScreenProps) {

  return (
    <div className="w-full h-full bg-background text-foreground flex items-center justify-center relative overflow-hidden">

      {/* 🔹 다크모드 토글 (우측 상단) */}
      {onToggleDarkMode && (
        <div className="absolute safe-top-button right-4 z-50">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleDarkMode}
            className="rounded-full hover:bg-accent/50 transition-colors"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-slate-400" />
            )}
          </Button>
        </div>
      )}

      {/* 🔹 배경: 스크린샷과 동일한 Dot Pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dotGrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="currentColor" className="text-muted-foreground" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dotGrid)" />
        </svg>
      </div>

      {/* 🔹 메인 카드: 로그인 화면과 동일한 스타일 유지 */}
      {/* 테두리와 배경색을 로그인 화면의 Card 컴포넌트와 맞춤 */}
      <div className="relative z-10 w-full max-w-lg px-6">
        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
          {/* 카드 영역 (테두리 있는 박스) - 크기 확대 */}
          <Card className="w-full bg-card border-border/40 shadow-xl">
            <CardContent className="pt-8 pb-8 px-8 flex flex-col items-center text-center">

              {/* 1. 로고/타이틀 영역 - 카드 안으로 이동 */}
              <div className="text-center space-y-2 mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  비유노트
                </h1>
                <p className="text-sm text-muted-foreground">
                  세상의 모든 지식을 비유로 연결하다
                </p>
              </div>

              {/* 2. 프로필 아바타: 깔끔한 정원형 */}
              <div className="relative mb-6">
                <Avatar className="w-24 h-24 border-2 border-border ring-4 ring-background">
                  {/* 이미지가 없으면 닉네임 첫 글자 */}
                  <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${nickname}`} />
                  <AvatarFallback className="text-3xl font-bold bg-muted text-foreground">
                    {nickname ? nickname.charAt(0).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
                {/* 로그인 상태 표시 점 (선택 사항) */}
                <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-card rounded-full"></div>
              </div>

              {/* 3. 환영 메시지 */}
              <div className="space-y-1 mb-8">
                <h2 className="text-xl font-semibold text-foreground">
                  환영합니다, <span className="text-primary">{nickname}</span>님!
                </h2>
                <p className="text-sm text-muted-foreground">
                  탐험을 시작할 준비가 되었습니다.
                </p>
              </div>

              {/* 4. 버튼 영역 */}
              <div className="w-full space-y-3">
                {/* 메인 액션 버튼: 로그인 화면의 그 '금색' 버튼 */}
                {/* bg-primary가 테마의 금색으로 설정되어 있다고 가정 */}
                {/* 만약 색이 다르면 bg-[#BFA15F] 같은 하드코딩 색상으로 변경 가능 */}
                <Button
                  className="w-full h-11 text-base font-medium rounded-md shadow-sm transition-all active:scale-[0.98]"
                  onClick={onStartApp}
                >
                  <Sparkles className="w-4 h-4 mr-2 opacity-80" />
                  탐험 시작하기
                </Button>

                {/* 로그아웃 버튼: 심플하게 */}
                <Button
                  variant="ghost"
                  className="w-full h-10 text-sm text-muted-foreground hover:text-foreground"
                  onClick={onRestart}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  로그아웃
                </Button>
              </div>

            </CardContent>
          </Card>

          {/* 하단 카피라이트 */}
          <p className="text-[10px] text-muted-foreground/40 mt-4">
            © 2024 BiyuNote. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}