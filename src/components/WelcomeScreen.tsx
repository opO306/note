import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Check, LogOut } from "lucide-react";
import { LanternIcon } from "./icons/Lantern";
import { useMemo, useCallback } from "react";

interface WelcomeScreenProps {
  nickname: string;
  onRestart: () => void;
  onStartApp: () => void;
}

// 학문을 대표하는 문자들 (LoginScreen과 동일)
const academicSymbols = [
  // 수학
  "∫", "∑", "π", "√", "∞", "∂", "Δ", "θ", "φ", "λ", "∇", "≈", "±", "÷", "×",
  // 물리
  "ℏ", "ε", "μ", "ω", "Ω", "ν", "σ", "τ", "ρ", "Ψ",
  // 화학
  "⚛", "⇌", "→", "⟶",
  // 철학/논리
  "∃", "∀", "⊃", "¬", "∧", "∨",
  // 언어
  "α", "β", "γ", "δ", "ζ", "η", "κ",
  // 기타 학술 기호
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
  const animationName = item.opacity < 0.2 ? 'fadeInOut1' : item.opacity < 0.25 ? 'fadeInOut2' : 'fadeInOut3';

  const setSymbolStyles = useCallback((el: HTMLDivElement | null) => {
    if (el) {
      el.style.setProperty('--symbol-x', `${item.x}%`);
      el.style.setProperty('--symbol-y', `${item.y}%`);
      el.style.setProperty('--symbol-size', `${item.size}px`);
      el.style.setProperty('--symbol-animation', `${animationName} ${item.duration}s ease-in-out ${item.delay}s infinite both`);
    }
  }, [item.x, item.y, item.size, animationName, item.duration, item.delay]);

  return (
    <div
      className="floating-symbol text-slate-600"
      ref={setSymbolStyles}
    >
      {item.symbol}
    </div>
  );
}

export function WelcomeScreen({ nickname, onRestart, onStartApp }: WelcomeScreenProps) {
  // ✨ useMemo를 사용해서 한 번만 만들고 재사용
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
  }, []); // 빈 배열 = 딱 한 번만 실행!

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 via-gray-100 to-slate-200 flex items-center justify-center relative overflow-hidden force-light-mode">
      {/* 떠다니는 학문 기호들 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {floatingSymbols.map((item) => (
          <FloatingSymbolItem key={item.id} item={item} />
        ))}
      </div>

      {/* Enhanced Geometric Background Pattern */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="welcomeComplexGrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#64748b" strokeWidth="1" />
              <circle cx="20" cy="20" r="2" fill="#64748b" opacity="0.4" />
            </pattern>
            <pattern id="welcomeDiagonalLines" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 0 60 L 60 0" stroke="#64748b" strokeWidth="1" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#welcomeComplexGrid)" />
          <rect width="100%" height="100%" fill="url(#welcomeDiagonalLines)" />
        </svg>
      </div>

      {/* Enhanced Floating geometric shapes */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-3 h-3 bg-slate-700 opacity-20 animate-pulse transform rotate-45"></div>
        <div className="absolute top-40 right-20 w-2 h-2 bg-slate-800 opacity-25 animate-bounce"></div>
        <div className="absolute bottom-32 left-20 w-4 h-4 bg-slate-900 opacity-15 rotate-45 animate-spin custom-spin-8s"></div>
        <div className="absolute bottom-20 right-10 w-2 h-2 bg-slate-800 opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-60 left-6 w-1 h-8 bg-slate-600 opacity-20 animate-pulse delay-500"></div>
        <div className="absolute bottom-60 right-6 w-8 h-1 bg-slate-600 opacity-20 animate-pulse delay-700"></div>

        {/* Orbiting elements */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-32 h-32 relative">
            <div className="absolute top-0 left-1/2 w-1 h-1 bg-slate-700 opacity-30 animate-spin geometric-orbit-1"></div>
            <div className="absolute top-0 left-1/2 w-1 h-1 bg-slate-600 opacity-25 animate-spin geometric-orbit-2"></div>
          </div>
        </div>
      </div>

      <Card className="w-full bg-white/95 backdrop-blur-xl border border-slate-300 shadow-2xl shadow-slate-500/20 relative overflow-hidden">
        {/* Card glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-slate-100/30 pointer-events-none"></div>

        <CardContent className="p-8 relative">
          <div className="text-center space-y-6">
            {/* Success Icon with Lantern */}
            <div className="relative mx-auto w-20 h-20">
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-full flex items-center justify-center shadow-lg shadow-amber-400/30">
                <LanternIcon className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center border-2 border-white shadow-md">
                <Check className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Welcome Message */}
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-slate-900 font-mono">
                비유노트에 오신 것을<br />환영합니다!
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed px-2">
                이곳은 단순한 질문과 답변 앱이 아닙니다.<br />
                <span className="font-semibold text-slate-800">"이해"</span>를 중심으로,
                비유와 예시로 서로 배우는 공부 친구 공간이에요.
              </p>
            </div>

            {/* Core Values - 간결하고 감성적으로 */}
            <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-xl p-4 space-y-2.5">
              <p className="text-xs text-slate-700 leading-relaxed">
                모르면 편하게 물어보고,<br />
                내가 아는 건 비유와 예시로 설명해 주세요.
              </p>
              <p className="text-xs text-gray-600 font-semibold leading-relaxed">
                <span className="inline-block">✨</span> 당신의 설명이 누군가의 이해를 밝히는 등불이 됩니다.
              </p>
              <p className="text-xs text-amber-700 font-semibold italic leading-relaxed">
                등불을 켜주고, 길잡이가 되어주는 경험을 함께 만들어봐요.
              </p>
            </div>

            {/* User Profile */}
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 space-y-3">
              <Avatar className="w-16 h-16 mx-auto ring-2 ring-slate-200">
                <AvatarFallback className="text-xl bg-gradient-to-br from-slate-700 to-black text-white font-mono">
                  {nickname.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-slate-900 font-mono">{nickname}</h3>
                <p className="text-sm text-slate-600">비유노트의 새로운 멤버</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4.5">
              <Button
                className="w-full h-12 bg-gradient-to-r from-slate-800 via-slate-900 to-black hover:from-slate-700 hover:via-slate-800 hover:to-slate-900 border border-slate-400 text-white transition-all duration-500 hover:shadow-lg hover:shadow-slate-500/30 font-mono relative overflow-hidden group"
                onClick={onStartApp}
              >
                {/* Button glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                <span className="relative">앱 시작하기</span>
              </Button>

              <Button
                variant="outline"
                className="w-full h-10 border-slate-400 hover:bg-slate-100 font-mono"
                onClick={onRestart}
              >
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </Button>
            </div>

            {/* Tips */}
            <div className="bg-slate-100 border border-slate-300 rounded-xl p-3">
              <p className="text-xs text-slate-700 leading-relaxed">
                ⚙️ 프로필 사진은 언제든지 바꿀 수 있어요.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}