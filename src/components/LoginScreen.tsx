import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { Moon, Sun, Loader2 } from "lucide-react";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth, initFirebaseAppCheck, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "../toastHelper";
import {
  trackLoginScreenView,
  trackLoginStarted,
  trackLoginSuccess,
  trackLoginFailure,
  trackLoginCancelled,
  trackTermsAgreed,
} from "@/utils/analytics";

// ✅ 다음 화면들 프리로드 (로그인 성공 시 빠른 전환을 위해)
const preloadNextScreens = () => {
  // Lazy 컴포넌트들을 미리 로드
  import("./WelcomeScreen");
  import("./NicknameScreen");
  import("./CommunityGuidelinesScreen");
  import("./VerifyEmailScreen");
};

// ✅ App Check 사전 초기화 (로그인 버튼 클릭 전에 미리 시작)
let appCheckWarmedUp = false;
const warmupAppCheck = () => {
  if (appCheckWarmedUp) return;
  appCheckWarmedUp = true;
  // 백그라운드에서 App Check 초기화 (권한 검증에 필요)
  void initFirebaseAppCheck();
};

// ✅ Firestore 연결 워밍 (cold start 줄이기)
let firestoreWarmedUp = false;
const warmupFirestore = () => {
  if (firestoreWarmedUp) return;
  firestoreWarmedUp = true;
  // 더미 쿼리로 Firestore 연결 사전 수립 (결과는 무시)
  void getDoc(doc(db, "_warmup", "ping")).catch(() => { });
};

import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";

// ... (기존 FloatingSymbolData, CURSIVE_SYMBOLS, FloatingSymbolItem 코드는 그대로 두거나 복사해오세요. UI 관련이라 생략하지 않고 유지하시면 됩니다.)
// 편의를 위해 UI 관련 부분은 기존 코드를 그대로 유지한다고 가정합니다.

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
  onShowEmailLogin?: () => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onLoginStart?: () => void; // ✅ 로그인 시작 시 호출 (Optimistic UI용)
  onLoginEnd?: () => void; // ✅ 로그인 완료/실패 시 호출 (로딩 상태 리셋용)
}

export function LoginScreen({
  onShowTerms,
  onShowPrivacy,
  onShowEmailLogin,
  isDarkMode,
  onToggleDarkMode,
  onLoginStart,
  onLoginEnd,
}: LoginScreenProps) {
  // ✅ 컴포넌트 마운트 시 사전 준비 작업
  useEffect(() => {
    // 0) 로그인 화면 조회 추적
    trackLoginScreenView();

    // 1) App Check 사전 초기화 (500ms 후 - 가장 중요)
    const appCheckTimer = setTimeout(warmupAppCheck, 500);

    // 2) Firestore 연결 워밍 (700ms 후)
    const firestoreTimer = setTimeout(warmupFirestore, 700);

    // 3) 다음 화면 프리로드 (1000ms 후)
    const preloadTimer = setTimeout(preloadNextScreens, 1000);

    return () => {
      clearTimeout(appCheckTimer);
      clearTimeout(firestoreTimer);
      clearTimeout(preloadTimer);
    };
  }, []);

  // ✅ 약관 체크박스 클릭 시에도 워밍업 실행 (사용자가 로그인 의도 표현)
  const hasWarmedUpOnAgree = useRef(false);

  const floatingSymbols = useMemo<FloatingSymbolData[]>(() => {
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
  // ✅ 12번: 약관 동의 상태 복원 (재방문 시 다시 체크하지 않아도 됨)
  const [agreedToTerms, setAgreedToTerms] = useState(() => {
    try {
      return localStorage.getItem("tosAccepted") === "true";
    } catch {
      return false;
    }
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGoogleLogin = useCallback(async () => {
    if (!agreedToTerms) return toast.error("약관에 동의해주세요.");
    if (isLoggingIn) return;
    setIsLoggingIn(true);

    // ✅ 로그인 시작 시간 기록
    const loginStartTime = Date.now();
    trackLoginStarted("google");

    // ✅ Optimistic UI: 로그인 시작 즉시 부모에게 알림 (로딩 상태 전환)
    onLoginStart?.();

    try {
      // 1) 네이티브 구글 로그인
      const result = await FirebaseAuthentication.signInWithGoogle({
        // Android에서 Credential Manager를 우회 (플러그인 7.2.0+)
        useCredentialManager: false,
      });

      // 2) 네이티브 로그인 결과를 설치본에서도 바로 확인
      const idToken = result.credential?.idToken ?? "";
      const accessToken = result.credential?.accessToken ?? "";

      // 3) 토큰이 없으면 에러 처리 (사용자 취소)
      if (!idToken && !accessToken) {
        trackLoginCancelled("google");
        return undefined;
      }

      // ✅ 다음 화면 프리로드 시작 (로그인 성공 직후 병렬 실행)
      preloadNextScreens();

      // 4) Web SDK credential 생성 + 로그인 시도
      const credential = GoogleAuthProvider.credential(
        idToken || undefined,
        accessToken || undefined
      );

      await signInWithCredential(auth, credential);

      // ✅ 로그인 성공 추적
      const loginDuration = Date.now() - loginStartTime;
      trackLoginSuccess("google", loginDuration);
    } catch (err: any) {
      // ✅ 로그인 실패 추적
      const loginDuration = Date.now() - loginStartTime;
      const errorMessage = err?.code || err?.message || "unknown_error";
      trackLoginFailure("google", errorMessage, loginDuration);

      toast.error("로그인에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoggingIn(false);
      onLoginEnd?.(); // ✅ 로그인 완료/실패 시 부모에게 알림
    }
    return undefined;
  }, [agreedToTerms, isLoggingIn, onLoginStart, onLoginEnd]);

  const handleTermsChange = useCallback((checked: boolean | string) => {
    const value = Boolean(checked);
    setAgreedToTerms(value);

    // ✅ 약관 동의 시 워밍업 즉시 실행 (로그인 의도 표현)
    if (value && !hasWarmedUpOnAgree.current) {
      hasWarmedUpOnAgree.current = true;
      trackTermsAgreed();
      warmupAppCheck();
      warmupFirestore();
      preloadNextScreens();
    }

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
    } catch (e) {
      // LocalStorage 접근 실패는 무시 (선택적 기능)
    }
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-6 pt-safe pb-safe overflow-hidden bg-background text-foreground transition-colors duration-300">
      {onToggleDarkMode && (
        <div className="absolute top-4 right-4 z-50">
          <Button variant="ghost" size="icon" onClick={onToggleDarkMode} className="rounded-full hover:bg-accent transition-colors">
            {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-slate-700 dark:text-slate-300" />}
          </Button>
        </div>
      )}

      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none opacity-60" aria-hidden="true">
        {floatingSymbols.map((item) => (
          <FloatingSymbolItem key={item.id} item={item} />
        ))}
      </div>

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

      <div className="relative z-10 w-full max-w-sm animate-in fade-in zoom-in duration-500">
        <Card className="w-full border-border/60 shadow-2xl bg-background/95 backdrop-blur-sm">
          <CardContent className="pt-6 pb-7 px-4 sm:px-6 space-y-8">
            <div className="flex flex-col items-center space-y-3 mt-6">
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-400">
                  비유노트
                </h1>
                <p className="text-sm text-muted-foreground">
                  세상의 모든 지식을 비유로 연결하다
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div
                className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => handleTermsChange(!agreedToTerms)}
              >
                <Checkbox
                  id="terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => handleTermsChange(checked as boolean)}
                  className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <div className="grid gap-1.5 leading-none">
                  <Label
                    htmlFor="terms"
                    className="text-sm font-medium leading-snug cursor-pointer select-none group-hover:text-foreground/80"
                  >
                    서비스 이용약관 동의 (필수)
                  </Label>
                  <p className="text-xs text-muted-foreground whitespace-nowrap -ml-1 sm:ml-0">
                    <button
                      type="button"
                      className="underline decoration-muted-foreground/50 hover:text-primary hover:decoration-primary underline-offset-2 transition-all mr-0.5 sm:mr-1"
                      onClick={(e) => { e.stopPropagation(); onShowTerms(); }}
                    >
                      이용약관
                    </button>
                    과
                    <button
                      type="button"
                      className="underline decoration-muted-foreground/50 hover:text-primary hover:decoration-primary underline-offset-2 transition-all mx-0.5 sm:mx-1"
                      onClick={(e) => { e.stopPropagation(); onShowPrivacy(); }}
                    >
                      개인정보처리방침
                    </button>
                    을 읽고 동의합니다.
                  </p>
                </div>
              </div>
            </div>

            <Button
              className="w-full h-12 text-base font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
              variant={agreedToTerms ? "default" : "secondary"}
              disabled={!agreedToTerms || isLoggingIn}
              onClick={handleGoogleLogin}
            >
              {isLoggingIn ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>로그인 확인 중...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Google 계정으로 시작하기</span>
                </div>
              )}
            </Button>

            {onShowEmailLogin && (
              <Button
                variant="outline"
                className="w-full"
                disabled={!agreedToTerms || isLoggingIn}
                onClick={onShowEmailLogin}
              >
                이메일로 로그인
              </Button>
            )}
            <p className="text-xs text-muted-foreground/60 text-center">
              © 2024 BiyuNote. All rights reserved.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}