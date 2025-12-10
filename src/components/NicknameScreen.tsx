// NicknameScreen.tsx (정확도 우선 / Firestore 중복 검사 버전)
/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */
import { useState, useMemo, useCallback } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { ArrowLeft, Check, AlertCircle } from "lucide-react";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { containsProfanity } from "./utils/profanityFilter";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth } from "../firebase";

async function _testWrite() {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await setDoc(
      doc(db, "users", user.uid),
      { test: true, at: serverTimestamp() },
      { merge: true }
    );
    console.log("🔥 Firestore test write 성공");
  } catch (e) {
    console.error("❌ Firestore test write 실패:", e);
  }
}


const academicSymbols = [
  "∫", "∑", "π", "√", "∞", "∂", "Δ", "θ", "φ", "λ", "∇", "≈", "±", "÷", "×",
  "ℏ", "ε", "μ", "ω", "Ω", "ν", "σ", "τ", "ρ", "Ψ",
  "⚛", "⇌", "→", "⟶",
  "∃", "∀", "⊃", "¬", "∧", "∨",
  "α", "β", "γ", "δ", "ζ", "η", "κ",
  "∴", "∵", "⊕", "⊗", "⊥", "∥", "∠", "°", "′", "″"
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

function FloatingSymbolItem({ item }: FloatingSymbolItemProps) {
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
      key={item.id}
      className="floating-symbol text-slate-600"
      ref={setSymbolStyles}
    >
      {item.symbol}
    </div>
  );
}

interface NicknameScreenProps {
  onBack: () => void;
  onComplete: (nickname: string) => void;
  userEmail?: string;
}

export function NicknameScreen({ onBack, onComplete, userEmail }: NicknameScreenProps) {
  const [nickname, setNickname] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  const floatingSymbols = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      symbol: academicSymbols[Math.floor(Math.random() * academicSymbols.length)],
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

  const handleSubmit = useCallback(async () => {
    if (isChecking) return;

    const trimmed = nickname.trim();

    // 1. 형식 검사 (로컬)
    if (trimmed.length < 2 || trimmed.length > 12) {
      setErrorMsg("닉네임은 2~12글자로 입력해주세요.");
      return;
    }
    if (!/^[가-힣a-zA-Z0-9]+$/.test(trimmed)) {
      setErrorMsg("한글, 영문, 숫자만 사용할 수 있어요.");
      return;
    }
    if (containsProfanity(trimmed)) {
      setErrorMsg("사용할 수 없는 닉네임입니다.");
      return;
    }

    setIsChecking(true);

    try {
      // 2. Firestore 중복 검사
      const q = query(
        collection(db, "users"),
        where("nickname", "==", trimmed),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // 이미 다른 유저가 사용 중
        setErrorMsg("이미 사용 중인 닉네임입니다.");
        setIsChecking(false);
        return;
      }

      // 3. 중복 없음 → 다음 단계로
      // 3. 중복 없음 → 닉네임 확정 전 최종 안내
      setIsChecking(false);

      // 🔵 닉네임 변경 불가 안내
      const confirmed = window.confirm(
        "닉네임은 한 번 설정하면 이후에 변경할 수 없습니다.\n이 닉네임으로 계속하시겠습니까?"
      );

      if (!confirmed) {
        // 사용자가 취소를 눌렀으면 그냥 여기서 종료 (화면 유지)
        console.log("[NicknameScreen] 닉네임 확정 취소");
        return;
      }

      console.log("[NicknameScreen] 닉네임 최종 확정:", trimmed);
      onComplete(trimmed);

    } catch (err) {
      console.error("닉네임 중복 검사 오류:", err);
      setErrorMsg("닉네임 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setIsChecking(false);
    }
  }, [nickname, isChecking, onComplete]);

  const handleRandomNickname = useCallback(() => {
    const randomNames = ["지식탐구자", "사색가", "질문러", "탐험가", "학습자", "사유자", "연구자"];
    const generated =
      randomNames[Math.floor(Math.random() * randomNames.length)] +
      (Math.floor(Math.random() * 9000) + 1000);
    setNickname(generated);
    setErrorMsg("");
  }, []);

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 via-gray-100 to-slate-200 flex items-center justify-center relative overflow-hidden force-light-mode">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {floatingSymbols.map((item) => (
          <FloatingSymbolItem key={item.id} item={item} />
        ))}
      </div>

      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="nicknameComplexGrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#64748b" strokeWidth="1" />
              <circle cx="20" cy="20" r="2" fill="#64748b" opacity="0.4" />
            </pattern>
            <pattern id="nicknameDiagonalLines" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 0 60 L 60 0" stroke="#64748b" strokeWidth="1" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#nicknameComplexGrid)" />
          <rect width="100%" height="100%" fill="url(#nicknameDiagonalLines)" />
        </svg>
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-3 h-3 bg-slate-700 opacity-20 animate-pulse transform rotate-45"></div>
        <div className="absolute top-40 right-20 w-2 h-2 bg-slate-800 opacity-25 animate-bounce"></div>
        <div className="absolute bottom-32 left-20 w-4 h-4 bg-slate-900 opacity-15 rotate-45 animate-spin custom-spin-8s"></div>
        <div className="absolute bottom-20 right-10 w-2 h-2 bg-slate-800 opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-60 left-6 w-1 h-8 bg-slate-600 opacity-20 animate-pulse delay-500"></div>
        <div className="absolute bottom-60 right-6 w-8 h-1 bg-slate-600 opacity-20 animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-32 h-32 relative">
            <div className="absolute top-0 left-1/2 w-1 h-1 bg-slate-700 opacity-30 animate-spin geometric-orbit-1"></div>
            <div className="absolute top-0 left-1/2 w-1 h-1 bg-slate-600 opacity-25 animate-spin geometric-orbit-2"></div>
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="absolute top-4 left-4 z-10 hover:bg-slate-200/50"
      >
        <ArrowLeft className="w-5 h-5 text-slate-700" />
      </Button>

      <Card className="w-full max-w-md bg-white/95 backdrop-blur-xl border border-slate-300 shadow-2xl relative">
        <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-slate-100/30 pointer-events-none"></div>
        <CardHeader className="text-center pb-4 relative">
          <div className="space-y-4">
            <Avatar className="w-24 h-24 mx-auto ring-2 ring-slate-200">
              <AvatarImage src="" />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-black text-white">
                {nickname ? nickname.charAt(0).toUpperCase() : "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-mono text-slate-900 tracking-wider">닉네임 설정</h1>
              <p className="text-sm text-slate-600 mt-1">다른 사용자들에게 보여질 이름입니다</p>
              {userEmail && (
                <p className="text-xs text-slate-500 mt-2 font-mono">{userEmail}</p>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 relative">
          <div className="space-y-2">
            <Label htmlFor="nickname">닉네임</Label>
            <div className="relative">
              <Input
                id="nickname"
                value={nickname}
                onChange={handleNicknameChange}
                placeholder="닉네임을 입력하세요"
                className={`pr-10 ${errorMsg ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                maxLength={12}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
              />
              {!errorMsg && nickname.length >= 2 && (
                <Check className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-600" />
              )}
            </div>

            <div className="h-4 text-xs">
              {errorMsg ? (
                <span className="text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errorMsg}
                </span>
              ) : (
                <span className="text-slate-400">
                  {isChecking ? "닉네임 확인 중..." : "2~12자 한글, 영문, 숫자"}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleSubmit}
              disabled={nickname.length < 2 || isChecking}
              className="w-full h-12 bg-gradient-to-r from-slate-800 via-slate-900 to-black hover:from-slate-700 hover:via-slate-800 hover:to-slate-900 text-white transition-all relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              <span className="relative">{isChecking ? "확인 중..." : "계속하기"}</span>
            </Button>

            <Button
              variant="ghost"
              className="w-full hover:bg-slate-100 text-slate-700 font-mono"
              onClick={handleRandomNickname}
            >
              랜덤 닉네임 생성
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
