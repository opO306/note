/* eslint-disable react/forbid-dom-props */
import * as React from "react";
import { Moon, Sun, Loader2 } from "lucide-react";
import { signInWithGoogle } from "../googleAuth";
import { toast } from "../toastHelper";

import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { useOnlineStatus } from "./hooks/useOnlineStatus";

/**
 * ENV 설정
 *  VITE_GOOGLE_WEB_CLIENT_ID
 *  ➜ Google Cloud Console / OAuth Web Client ID
 */

interface FloatingSymbolData {
  id: number;
  symbol: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

const CURSIVE_SYMBOLS = [
  "𝓐", "𝓑", "𝓒", "𝓓", "𝓔", "𝓕", "𝓖", "𝓗", "𝓘", "𝓙", "𝓚", "𝓛", "𝓜", "𝓝", "𝓞", "𝓟", "𝓠", "𝓡", "𝓢", "𝓣", "𝓤", "𝓥", "𝓦", "𝓧", "𝓨", "𝓩",
  "𝓪", "𝓫", "𝓬", "𝓭", "𝓮", "𝓯", "𝓰", "𝓱", "𝓲", "𝓳", "𝓴", "𝓵", "𝓶", "𝓷", "𝓸", "𝓹", "𝓺", "𝓻", "𝓼", "𝓽", "𝓾", "𝓿", "𝔀", "𝔁", "𝔂", "𝔃",
  "𝒜", "𝒞", "𝒟", "𝒢", "𝒥", "𝒦", "𝒩", "𝒪", "𝒬", "𝒮", "𝒯", "𝒳", "𝒴", "𝒵",
];

const FloatingSymbolItem = React.memo(({ item }: { item: FloatingSymbolData }) => {
  const animationName =
    item.opacity < 0.2 ? "fadeInOut1" :
      item.opacity < 0.25 ? "fadeInOut2" :
        "fadeInOut3";

  const styleProps = {
    "--symbol-x": `${item.x}%`,
    "--symbol-y": `${item.y}%`,
    "--symbol-size": `${item.size}px`,
    "--symbol-animation": `${animationName} ${item.duration}s ease-in-out ${item.delay}s infinite both`,
  } as React.CSSProperties;

  return (
    <div className="floating-symbol text-slate-600 dark:text-slate-400" style={styleProps}>
      {item.symbol}
    </div>
  );
});
FloatingSymbolItem.displayName = "FloatingSymbolItem";

interface LoginScreenProps {
  onShowTerms: () => void;
  onShowPrivacy: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onGuestLogin?: () => void;
}

export function LoginScreen({
  onShowTerms,
  onShowPrivacy,
  isDarkMode,
  onToggleDarkMode,
  onGuestLogin,
}: LoginScreenProps) {
  const { isOnline } = useOnlineStatus();
  const floatingSymbols = React.useMemo<FloatingSymbolData[]>(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      symbol: CURSIVE_SYMBOLS[Math.floor(Math.random() * CURSIVE_SYMBOLS.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 16 + Math.random() * 24,
      duration: 5 + Math.random() * 5,
      delay: Math.random() * 8,
      opacity: 0.15 + Math.random() * 0.2,
    }));
  }, []);

  const [agreedToTerms, setAgreedToTerms] = React.useState(false);
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  const handleGoogleLogin = React.useCallback(async (): Promise<void> => {
    if (!agreedToTerms) {
      toast.error("약관에 동의해주세요.");
      return;
    }
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("GOOGLE LOGIN FAILED:", err);
      toast.error("Google 로그인에 실패했습니다.");
    } finally {
      setIsLoggingIn(false);
    }
  }, [agreedToTerms, isLoggingIn]);

  const handleTermsChange = (checked: boolean | string): void => { // 명시적 반환 타입 void 추가
    const value = Boolean(checked);
    setAgreedToTerms(value);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        if (value) {
          window.localStorage.setItem("tosAccepted", "true");
          window.localStorage.setItem("privacyAccepted", "true");
        } else {
          window.localStorage.removeItem("tosAccepted");
          window.localStorage.removeItem("privacyAccepted");
        }
      }
    } catch {
      /* LocalStorage 접근 실패는 무시 */
    }
    return; // 함수 마지막에 명시적 반환 추가
  };

  /* --------- 이하 UI 렌더 --------- */
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-6 overflow-hidden bg-background text-foreground transition-colors duration-300">
      {onToggleDarkMode && (
        <div className="absolute safe-top-button right-4 z-50">
          <Button variant="ghost" size="icon" onClick={onToggleDarkMode} className="rounded-full hover:bg-accent transition-colors">
            {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-slate-700 dark:text-slate-300" />}
          </Button>
        </div>
      )}

      {/* 배경 심볼 */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none opacity-60" aria-hidden="true">
        {floatingSymbols.map((item) => (
          <FloatingSymbolItem key={item.id} item={item} />
        ))}
      </div>

      {/* 그리드 + 대각선 패턴 */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" aria-hidden="true">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="loginComplexGrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/20" />
              <circle cx="20" cy="20" r="2" fill="currentColor" className="text-muted-foreground/20" />
            </pattern>
            <pattern id="loginDiagonalLines" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 0 60 L 60 0" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/10" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#loginComplexGrid)" />
          <rect width="100%" height="100%" fill="url(#loginDiagonalLines)" />
        </svg>
      </div>

      {/* 카드 */}
      <div className="relative z-10 w-full max-w-sm animate-in fade-in zoom-in duration-500">
        <Card className="w-full border-border/60 shadow-2xl bg-background/95 backdrop-blur-sm">
          <CardContent className="pt-6 pb-7 px-4 sm:px-6 space-y-8">
            <div className="flex flex-col items-center space-y-3 mt-6">
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-400">
                  비유노트
                </h1>
                <p className="text-sm text-muted-foreground">세상의 모든 지식을 비유로 연결하다</p>
              </div>
            </div>

            {/* 약관 체크박스 */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors cursor-pointer group" onClick={() => handleTermsChange(!agreedToTerms)}>
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked: boolean) => handleTermsChange(checked)}
                  className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="terms" className="text-sm font-medium leading-snug cursor-pointer select-none group-hover:text-foreground/80">서비스 이용약관 동의 (필수)</Label>
                  <p className="text-xs text-muted-foreground whitespace-nowrap -ml-1 sm:ml-0">
                    <button type="button" className="underline decoration-muted-foreground/50 hover:text-primary hover:decoration-primary underline-offset-2 transition-all mr-0.5 sm:mr-1" onClick={(e) => { e.stopPropagation(); onShowTerms(); }}>이용약관</button>
                    과
                    <button type="button" className="underline decoration-muted-foreground/50 hover:text-primary hover:decoration-primary underline-offset-2 transition-all mx-0.5 sm:mx-1" onClick={(e) => { e.stopPropagation(); onShowPrivacy(); }}>개인정보처리방침</button>
                    을 읽고 동의합니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 구글 로그인 버튼 */}
            <Button className="w-full h-12 text-base font-medium transition-all hover:scale-[1.02] active:scale-[0.98]" variant={agreedToTerms ? "default" : "secondary"} disabled={!agreedToTerms || isLoggingIn || !isOnline} onClick={handleGoogleLogin}>
              {isLoggingIn ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>로그인 확인 중...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Google 계정으로 시작하기</span>
                </div>
              )}
            </Button>

            {/* 게스트 로그인 */}
            {onGuestLogin && (
              <Button className="w-full h-12 text-base font-medium transition-all hover:scale-[1.02] active:scale-[0.98] mt-2" variant="outline" onClick={onGuestLogin} disabled={isLoggingIn || !isOnline}>
                게스트 모드
              </Button>
            )}

            <p className="text-xs text-muted-foreground/60 text-center">© 2024 BiyuNote. All rights reserved.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}