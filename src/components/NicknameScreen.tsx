import { useState, useCallback, useMemo } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ArrowLeft, Check, AlertCircle, Moon, Sun } from "lucide-react";
import { auth, functions } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { httpsCallable } from "firebase/functions";
import { NicknameConfirmModal } from "./modals/NicknameConfirmModal";
import { FloatingSymbolItem } from "@/components/FloatingSymbolItem";
import { containsProfanity } from "./utils/profanityFilter";

const cursiveSymbols = [
  "𝓐", "𝓑", "𝓒", "𝓓", "𝓔", "𝓕",
  "𝓖", "𝓗", "𝓘", "𝓙", "𝓚", "𝓛",
  "𝓜", "𝓝", "𝓞", "𝓟", "𝓠", "𝓡",
  "𝓢", "𝓣", "𝓤", "𝓥", "𝓦", "𝓧",
  "𝓨", "𝓩", "𝓪", "𝓫", "𝓬", "𝓭",
  "𝓮", "𝓯", "𝓰", "𝓱", "𝓲", "𝓳",
  "𝓴", "𝓵", "𝓶", "𝓷", "𝓸", "𝓹",
  "𝓺", "𝓻", "𝓼", "𝓽", "𝓾", "𝓿",
  "𝔀", "𝔁", "𝔂", "𝔃",
];

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
  const { refreshUserData } = useAuth();
  const [nickname, setNickname] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [saving, setSaving] = useState(false); // 🔒 중복 클릭 방지 상태 추가

  const floatingSymbols = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      symbol: cursiveSymbols[Math.floor(Math.random() * cursiveSymbols.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 16 + Math.random() * 24,
      duration: 5 + Math.random() * 5,
      delay: Math.random() * 8,
      opacity: 10 + Math.random() * 15,
    }));
  }, []);
  // showConfirmPopup 상태 변경 (로그 제거)

  const handleNicknameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value);
    setErrorMsg("");
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = nickname.trim();
    if (saving) return;

    if (trimmed.length < 2 || trimmed.length > 12) {
      setErrorMsg("닉네임은 2~12글자로 입력해주세요.");
      return;
    }
    if (!/^[가-힣a-zA-Z0-9]+$/.test(trimmed)) {
      setErrorMsg("한글, 영문, 숫자만 사용할 수 있어요.");
      return;
    }

    // ✅ 욕설 필터링 검사
    if (containsProfanity(trimmed)) {
      setErrorMsg("부적절한 단어가 포함되어 있습니다.");
      return;
    }

    setShowConfirmPopup(true);
  }, [nickname, saving]);

  const handleCancelModal = useCallback(() => {
    setShowConfirmPopup(false);
  }, []);

  const handleConfirmNickname = useCallback(async () => {
    setShowConfirmPopup(false);
    if (saving) return; // 🔒 중복 클릭 방지
    setSaving(true);

    const user = auth.currentUser;
    if (!user) {
      onBack();
      return;
    }

    try {
      const finalizeFn = httpsCallable(functions, "finalizeOnboarding");
      await finalizeFn({ nickname: nickname.trim() });

      // 닉네임 저장 및 사용자 데이터 새로고침 (finalizeOnboarding에서 처리되므로 닉네임 직접 업데이트는 제거)
      refreshUserData();

      onComplete(nickname.trim());
    } catch (error: any) {
      const rawCode = String(error?.code ?? "");
      const code = rawCode.replace(/^functions\//, "");

      if (code === "already-exists") {
        setErrorMsg("이미 사용 중인 닉네임입니다.");
      } else if (code === "invalid-argument") {
        setErrorMsg("사용할 수 없는 닉네임입니다.");
      } else if (code === "unauthenticated") {
        setErrorMsg("로그인이 풀렸어요. 다시 로그인해주세요.");
      } else {
        setErrorMsg("오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setSaving(false);
    }
  }, [nickname, onBack, onComplete]);

  const handleRandomNickname = useCallback(() => {
    const randomNames = ["지식탐구자", "사색가", "질문러", "탐험가", "학습자", "사유자", "연구자"];
    const generated = `${randomNames[Math.floor(Math.random() * randomNames.length)]}${Math.floor(Math.random() * 9000) + 1000}`;
    setNickname(generated);
    setErrorMsg("");
  }, []);

  return (
    <>
      <div className="relative w-full h-full flex flex-col items-center justify-center p-6 overflow-hidden bg-background text-foreground transition-colors duration-300">
        {onToggleDarkMode && (
          <div className="absolute safe-top-button right-4 z-50">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleDarkMode}
              className="rounded-full hover:bg-accent transition-colors"
            >
              {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-slate-700 dark:text-slate-300" />}
            </Button>
          </div>
        )}

        {/* 배경 애니메이션 (Floating Symbols) */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
          {floatingSymbols.map(item => <FloatingSymbolItem key={item.id} item={item} />)}
        </div>

        {/*  [수정됨] 배경 패턴: 점(circle)을 제거하고 선만 남김 */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="nicknameComplexGrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                {/*  수직/수평 격자선은 유지 */}
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground/20" />
                {/*  점을 그리는 <circle> 태그를 제거했습니다. */}
              </pattern>
              <pattern id="nicknameDiagonalLines" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                {/* 대각선은 유지 */}
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
                  <Avatar className="w-24 h-24 border-4 border-background shadow-xl relative ring-2 ring-primary/20">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/notionists/svg?seed=${nickname || "user"}&backgroundColor=transparent`}
                    />
                    <AvatarFallback className="text-3xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 text-primary-foreground font-bold">
                      {nickname ? nickname.charAt(0).toUpperCase() : "?"}
                    </AvatarFallback>
                  </Avatar>

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
                <Label htmlFor="nickname" className="text-sm font-medium leading-snug">
                  닉네임
                </Label>
                <div className="relative">
                  <Input
                    id="nickname"
                    value={nickname}
                    onChange={handleNicknameChange}
                    placeholder="닉네임을 입력하세요"
                    className={`${errorMsg ? "border-destructive focus-visible:ring-destructive" : ""}`}
                    maxLength={12}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        setTimeout(() => handleSubmit(), 10);
                      }
                    }}
                  />
                  {!errorMsg && nickname.length >= 2 && (
                    <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                  )}
                </div>

                <div className="h-4 text-xs">
                  {errorMsg ? (
                    <span className="text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errorMsg}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      2~12자 한글, 영문, 숫자
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleSubmit}
                  className="w-full h-12 text-base font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  {saving ? "저장 중..." : "계속하기"}
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

      {showConfirmPopup && (
        <NicknameConfirmModal
          nickname={nickname}
          onCancel={handleCancelModal}
          onConfirm={handleConfirmNickname}
        />
      )}
    </>
  );
}