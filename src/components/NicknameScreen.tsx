// src/components/NicknameScreen.tsx

import React, { useState, useMemo, useCallback } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ArrowLeft, Check, AlertCircle, Moon, Sun } from "lucide-react";
import { auth, functions } from "../firebase";
import { httpsCallable } from "firebase/functions";

const cursiveSymbols = [
  "𝓐", "𝓑", "𝓒", "𝓓", "𝓔", "𝓕", "𝓖", "𝓗", "𝓘", "𝓙", "𝓚", "𝓛", "𝓜", "𝓝", "𝓞", "𝓟", "𝓠", "𝓡", "𝓢", "𝓣", "𝓤", "𝓥", "𝓦", "𝓧", "𝓨", "𝓩",
  "𝓪", "𝓫", "𝓬", "𝓭", "𝓮", "𝓯", "𝓰", "𝓱", "𝓲", "𝓳", "𝓴", "𝓵", "𝓶", "𝓷", "𝓸", "𝓹", "𝓺", "𝓻", "𝓼", "𝓽", "𝓾", "𝓿", "𝔀", "𝔁", "𝔂", "𝔃",
  "𝒜", "𝒞", "𝒟", "𝒢", "𝒥", "𝒦", "𝒩", "𝒪", "𝒬", "𝒮", "𝒯", "𝒳", "𝒴", "𝒵",
];

interface FloatingSymbolItemProps {
  item: {
    id: number;
    symbol: string;
    x: number;
    y: number;
    size: number;
    duration: number;
    delay: number;
    opacity: number;
  };
}

const FloatingSymbolItem = React.memo(({ item }: FloatingSymbolItemProps) => {
  const animationName =
    item.opacity < 0.2 ? "fadeInOut1" :
      item.opacity < 0.25 ? "fadeInOut2" :
        "fadeInOut3";

  const setSymbolStyles = useCallback((el: HTMLDivElement | null) => {
    if (el) {
      el.style.setProperty("--symbol-x", `${item.x}%`);
      el.style.setProperty("--symbol-y", `${item.y}%`);
      el.style.setProperty("--symbol-size", `${item.size}px`);
      el.style.setProperty(
        "--symbol-animation",
        `${animationName} ${item.duration}s ease-in-out ${item.delay}s infinite both`
      );
    }
  }, [item.x, item.y, item.size, animationName, item.duration, item.delay]);

  return (
    <div
      className="floating-symbol text-slate-600 dark:text-slate-400"
      ref={setSymbolStyles}
    >
      {item.symbol}
    </div>
  );
});
FloatingSymbolItem.displayName = "FloatingSymbolItem";

interface NicknameScreenProps {
  onBack: () => void;
  onComplete: (nickname: string) => void;
  userEmail?: string;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export function NicknameScreen({
  onBack,
  onComplete,
  userEmail,
  isDarkMode,
  onToggleDarkMode,
}: NicknameScreenProps) {
  const [nickname, setNickname] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);

  const floatingSymbols = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      symbol: cursiveSymbols[Math.floor(Math.random() * cursiveSymbols.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 16 + Math.random() * 24,
      duration: 5 + Math.random() * 5,
      delay: Math.random() * 8,
      opacity: 0.15 + Math.random() * 0.2,
    }));
  }, []);

  const handleNicknameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value);
    setErrorMsg("");
  }, []);

  const handleSubmit = useCallback(() => {
    if (isChecking) return;

    const trimmed = nickname.trim();

    if (trimmed.length < 2 || trimmed.length > 12) {
      setErrorMsg("닉네임은 2~12글자로 입력해주세요.");
      return;
    }
    if (!/^[가-힣a-zA-Z0-9]+$/.test(trimmed)) {
      setErrorMsg("한글, 영문, 숫자만 사용할 수 있어요.");
      return;
    }

    setShowConfirmPopup(true);
  }, [nickname, isChecking]);

  const handleConfirmNickname = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      onBack();
      return;
    }

    setIsChecking(true);
    setShowConfirmPopup(false);

    try {
      const finalNickname = nickname.trim();
      const finalizeFn = httpsCallable(functions, "finalizeOnboarding");
      await finalizeFn({ nickname: finalNickname });
      onComplete(finalNickname);
    } catch (error: any) {
      const rawCode = String(error?.code ?? "");
      const code = rawCode.replace(/^functions\//, ""); // "functions/xxx" → "xxx"

      console.error("가입 처리 실패:", {
        rawCode,
        code,
        message: error?.message,
        details: error?.details,
      });

      if (code === "already-exists") {
        setErrorMsg("이미 사용 중인 닉네임입니다.");
      } else if (code === "invalid-argument") {
        setErrorMsg("사용할 수 없는 닉네임입니다.");
      } else if (code === "unauthenticated") {
        setErrorMsg("로그인이 풀렸어요. 다시 로그인해주세요.");
      } else if (code === "failed-precondition") {
        // 서버가 현재 상태에서 불가라고 막은 케이스(예: 재가입 제한 등)
        setErrorMsg(error?.message || "현재 상태에서 진행할 수 없어요.");
      } else if (code === "not-found" || code === "unimplemented") {
        setErrorMsg("서버 함수가 없어요. 에뮬레이터/배포 상태를 확인해주세요.");
      } else {
        setErrorMsg("오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    }
    finally {
      setIsChecking(false);
    }
  }, [nickname, onBack, onComplete]);

  const handleRandomNickname = useCallback(() => {
    const randomNames = ["지식탐구자", "사색가", "질문러", "탐험가", "학습자", "사유자", "연구자"];
    const generated =
      randomNames[Math.floor(Math.random() * randomNames.length)] +
      (Math.floor(Math.random() * 9000) + 1000);
    setNickname(generated);
    setErrorMsg("");
  }, []);

  return (
    <>
      <div className="relative w-full h-full flex flex-col items-center justify-center p-6 overflow-hidden bg-background text-foreground transition-colors duration-300">
        {/* 🔹 다크모드 토글 버튼 */}
        {onToggleDarkMode && (
          <div className="absolute top-4 right-4 z-50">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleDarkMode}
              className="rounded-full hover:bg-accent transition-colors"
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-yellow-500" />
              ) : (
                <Moon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              )}
            </Button>
          </div>
        )}

        {/* 배경 애니메이션 */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none opacity-60">
          {floatingSymbols.map((item) => (
            <FloatingSymbolItem key={item.id} item={item} />
          ))}
        </div>

        {/* 배경 패턴 */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="nicknameComplexGrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/20" />
                <circle cx="20" cy="20" r="2" fill="currentColor" className="text-muted-foreground/20" />
              </pattern>
              <pattern id="nicknameDiagonalLines" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 0 60 L 60 0" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/10" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#nicknameComplexGrid)" />
            <rect width="100%" height="100%" fill="url(#nicknameDiagonalLines)" />
          </svg>
        </div>

        {/* 🔹 메인 카드 영역 */}
        <div className="relative z-10 w-full max-w-sm animate-in fade-in zoom-in duration-500">
          <Card className="w-full border-border/60 shadow-2xl bg-background">
            <CardHeader className="pb-4">
              <div className="w-full relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-0 top-0 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent -ml-2"
                  onClick={onBack}
                >
                  <ArrowLeft className="w-6 h-6" />
                </Button>

                <div className="flex flex-col items-center text-center space-y-4 pt-2">
                  <div className="relative group cursor-default">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full blur opacity-40 group-hover:opacity-60 transition duration-500"></div>
                    <Avatar className="w-24 h-24 border-4 border-background shadow-xl relative ring-2 ring-primary/20">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/notionists/svg?seed=${nickname || "user"}&backgroundColor=transparent`}
                      />
                      <AvatarFallback className="text-3xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 text-primary-foreground font-bold">
                        {nickname ? nickname.charAt(0).toUpperCase() : "?"}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-400">
                      닉네임 설정
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      다른 사용자들에게 보여질 이름입니다
                      {userEmail && (
                        <span className="block mt-1 text-xs opacity-70 font-mono">
                          ({userEmail})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-2 pb-6 px-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-sm font-medium leading-snug">닉네임</Label>
                <div className="relative">
                  <Input
                    id="nickname"
                    value={nickname}
                    onChange={handleNicknameChange}
                    placeholder="닉네임을 입력하세요"
                    className={`pr-10 ${errorMsg ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    maxLength={12}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSubmit();
                    }}
                  />
                  {!errorMsg && nickname.length >= 2 && (
                    <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                </div>

                <div className="h-4 text-xs">
                  {errorMsg ? (
                    <span className="text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errorMsg}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {isChecking ? "닉네임 저장 중..." : "2~12자 한글, 영문, 숫자"}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleSubmit}
                  disabled={nickname.length < 2 || isChecking}
                  className="w-full h-12 text-base font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isChecking ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>저장 중...</span>
                    </div>
                  ) : (
                    <span>계속하기</span>
                  )}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-foreground hover:bg-accent"
                  onClick={handleRandomNickname}
                >
                  랜덤 닉네임 생성
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 닉네임 확정 팝업 */}
      {showConfirmPopup && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-[360px] max-w-full rounded-2xl border border-border/60 bg-card shadow-2xl shadow-black/20 p-6 space-y-5">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mb-1">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-semibold text-foreground">
                  <span className="text-primary">"{nickname.trim()}"</span>(으)로<br />
                  시작하시겠어요?
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed break-keep">
                  한 번 설정한 닉네임은 변경할 수 없습니다.<br />
                  신중하게 결정해주세요.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                className="flex-1 h-11 rounded-xl border border-input bg-background hover:bg-accent hover:text-accent-foreground text-foreground font-medium transition-colors text-sm"
                onClick={() => setShowConfirmPopup(false)}
              >
                취소
              </button>
              <button
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-lg shadow-primary/20 transition-colors text-sm"
                onClick={handleConfirmNickname}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}