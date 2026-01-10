import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ArrowLeft, Check, AlertCircle, Moon, Sun } from "lucide-react";
import { auth, db, ensureUserDocument } from "../firebase";
import { collection, doc, getDocs, limit, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { NicknameConfirmModal } from "./modals/NicknameConfirmModal";
import { FloatingSymbolItem } from "@/components/FloatingSymbolItem";
import { containsProfanity } from "./utils/profanityFilter";

// ✅ CommunityGuidelinesScreen 프리로드 (다음 화면 빠른 전환용)
const preloadNextScreen = () => {
  import("./CommunityGuidelinesScreen");
};

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
  const [nickname, setNickname] = useState("");
  const [avatarSeed, setAvatarSeed] = useState("user");
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
      opacity: 10 + Math.random() * 15,
    }));
  }, []);

  // ✅ 컴포넌트 마운트 시 다음 화면 프리로드
  useEffect(() => {
    const timer = setTimeout(preloadNextScreen, 500);
    return () => clearTimeout(timer);
  }, []);

  // ✅ Dicebear avatar 요청을 디바운스해서 입력 지연/네트워크 낭비를 줄임
  useEffect(() => {
    const trimmed = nickname.trim();
    const handle = window.setTimeout(() => {
      setAvatarSeed(trimmed || "user");
    }, 250);
    return () => window.clearTimeout(handle);
  }, [nickname]);

  const handleNicknameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNickname(e.target.value);
    setErrorMsg("");
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = nickname.trim();
    if (isChecking) return;

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

  const handleCancelModal = useCallback(() => {
    setShowConfirmPopup(false);
  }, []);

  const handleConfirmNickname = useCallback(async () => {
    setShowConfirmPopup(false);
    setIsChecking(true);

    const user = auth.currentUser;
    if (!user) {
      onBack();
      return;
    }

    try {
      const trimmed = nickname.trim();
      const nicknameLower = trimmed.toLowerCase();

      // ✅ users/{uid} 문서가 아직 없으면 먼저 생성 (Rules의 create 조건 대응)
      await ensureUserDocument(user);

      // 1) 로컬 검증 (서버 호출 전에 빠르게 컷)
      if (!/^[가-힣a-zA-Z0-9]{2,12}$/.test(trimmed)) {
        setErrorMsg("닉네임은 2~12자의 한글, 영문, 숫자만 사용할 수 있습니다.");
        return;
      }
      if (containsProfanity(trimmed)) {
        setErrorMsg("부적절한 단어가 포함된 닉네임은 사용할 수 없습니다.");
        return;
      }

      // 2) 중복 검사 (users.nicknameLower)
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("nicknameLower", "==", nicknameLower), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty && snap.docs[0].id !== user.uid) {
        setErrorMsg("이미 사용 중인 닉네임입니다.");
        return;
      }

      // 3) 저장
      await setDoc(
        doc(db, "users", user.uid),
        {
          nickname: trimmed,
          nicknameLower,
          email: user.email ?? userEmail ?? undefined,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      onComplete(trimmed);
    } catch (error: any) {
      const code = String(error?.code ?? "");
      if (code.includes("permission-denied")) {
        setErrorMsg("권한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      } else if (code.includes("unauthenticated")) {
        setErrorMsg("로그인이 풀렸어요. 다시 로그인해주세요.");
      } else {
        setErrorMsg("오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setIsChecking(false);
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
      <div className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-background text-foreground transition-colors duration-300">
        {onToggleDarkMode && (
          <div className="absolute top-4 right-4 z-50">
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

        {/* 배경 레이어만 클리핑 (카드 shadow가 잘리지 않도록) */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
          {/* 배경 애니메이션 (Floating Symbols) */}
          {floatingSymbols.map(item => <FloatingSymbolItem key={item.id} item={item} />)}

          {/*  [수정됨] 배경 패턴: 점(circle)을 제거하고 선만 남김 */}
        </div>

        {/* 🔹 메인 카드 영역 */}
        <div className="relative z-10 w-full max-w-sm animate-in fade-in zoom-in duration-500">
          <Card className="w-full border-border/60 shadow-2xl">
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
                      src={`https://api.dicebear.com/7.x/notionists/svg?seed=${avatarSeed}&backgroundColor=transparent`}
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
                  {isChecking ? "저장 중..." : "계속하기"}
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