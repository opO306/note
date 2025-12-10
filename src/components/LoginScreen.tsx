import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import appLogo from "figma:asset/c33b5ffb86c8f42db8f0cdf6145f21abd5c6153f.png";
// 🔥 Firebase Auth에서 필요한 함수들
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
// 🔥 우리가 만든 firebase.ts에서 auth 불러오기
import { auth } from "../firebase";
import type { User } from "firebase/auth";  // 🔹 이 줄을 상단 import 들 옆에 추가

interface LoginScreenProps {
  onGoogleLogin: (user: User) => void;  // 🔹 user를 넘겨주도록 타입 변경
  onShowTerms: () => void;
  onShowPrivacy: () => void;
}


// 학문을 대표하는 문자들
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

export function LoginScreen({ onGoogleLogin, onShowTerms, onShowPrivacy }: LoginScreenProps) {
  // ✨ useMemo를 사용해서 한 번만 만들고 재사용해요!
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

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);  // 🔹 로그인 중인지 표시

  useEffect(() => {
    console.log("[LoginScreen] isLoggingIn 변경:", isLoggingIn);
  }, [isLoggingIn]);

  const handleGoogleLogin = useCallback(async () => {
    // 약관에 동의 안 했으면 그냥 리턴
    if (!agreedToTerms) {
      return;
    }

    // 이미 로그인 시도 중이면 또 요청 안 보냄 (중복 클릭 방지)
    if (isLoggingIn) {
      return;
    }

    setIsLoggingIn(true);  // 🔹 이제부터 "로그인 중" 상태

    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      console.log("구글 로그인 성공:", result.user.uid, result.user.email);

      // ✅ 로그인 성공 시: 상위(App)로 user 전달
      onGoogleLogin(result.user);

      // ✅ 여기서는 setIsLoggingIn(false)를 호출하지 않는다.
      //    - 어차피 App에서 화면을 nickname/main으로 바꾸면서
      //      LoginScreen 컴포넌트는 곧 언마운트됨
      //    - 언마운트되면 state도 함께 사라지기 때문에
      //      "로그인 중..." 이 잠깐 다시 풀리는 현상이 안 보임
    } catch (error) {
      console.error("구글 로그인 실패:", error);
      alert("로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");

      // ❌ 로그인 실패한 경우에만 다시 로그인 가능 상태로
      setIsLoggingIn(false);
    }
  }, [agreedToTerms, isLoggingIn, onGoogleLogin]);

  // 체크박스 변경 함수
  const handleTermsChange = useCallback((checked: boolean | string) => {
    const value = Boolean(checked);
    setAgreedToTerms(value);

    // 🔹 온보딩에서 재사용하는 로컬 스토리지 키와 맞춰서 기록
    //    - OnboardingFlow.tsx: KEY_TOS = "tosAccepted", KEY_PRIVACY = "privacyAccepted"
    try {
      if (typeof window !== "undefined" && "localStorage" in window) {
        if (value) {
          // 약관/개인정보에 동의한 경우 → 둘 다 true 기록
          window.localStorage.setItem("tosAccepted", "true");
          window.localStorage.setItem("privacyAccepted", "true");
        } else {
          // 체크 해제 시에는 깔끔하게 제거 (선택 사항)
          window.localStorage.removeItem("tosAccepted");
          window.localStorage.removeItem("privacyAccepted");
        }
      }
    } catch {
      // localStorage 사용 불가 환경은 그냥 무시
    }
  }, []);

  // 이용약관 버튼 클릭 함수
  const handleShowTerms = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onShowTerms();
  }, [onShowTerms]);

  // 개인정보 처리방침 버튼 클릭 함수
  const handleShowPrivacy = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onShowPrivacy();
  }, [onShowPrivacy]);

  // 로그인 화면을 라이트 모드로 고정
  useEffect(() => {
    const rootElement = document.documentElement;

    // 다크 모드 클래스 임시 제거
    const hadDarkClass = rootElement.classList.contains('dark');
    rootElement.classList.remove('dark');

    // cleanup 함수에서 원래 상태로 복원
    return () => {
      if (hadDarkClass) {
        rootElement.classList.add('dark');
      }
    };
  }, []);

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 via-gray-100 to-slate-200 flex items-center justify-center relative overflow-hidden force-light-mode">
      {/* 떠다니는 학문 기호들 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */}
        {floatingSymbols.map((item) => {
          const animationName = item.opacity < 0.2 ? 'fadeInOut1' : item.opacity < 0.25 ? 'fadeInOut2' : 'fadeInOut3';
          return (
            <div
              key={item.id}
              className="floating-symbol text-slate-600"
              ref={(el) => {
                if (el) {
                  el.style.setProperty('--symbol-x', `${item.x}%`);
                  el.style.setProperty('--symbol-y', `${item.y}%`);
                  el.style.setProperty('--symbol-size', `${item.size}px`);
                  el.style.setProperty('--symbol-animation', `${animationName} ${item.duration}s ease-in-out ${item.delay}s infinite both`);
                }
              }}
            >
              {item.symbol}
            </div>
          );
        })}
        {/* eslint-enable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */}
      </div>

      {/* Enhanced Geometric Background Pattern */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="loginComplexGrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#64748b" strokeWidth="1" />
              <circle cx="20" cy="20" r="2" fill="#64748b" opacity="0.4" />
            </pattern>
            <pattern id="loginDiagonalLines" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 0 60 L 60 0" stroke="#64748b" strokeWidth="1" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#loginComplexGrid)" />
          <rect width="100%" height="100%" fill="url(#loginDiagonalLines)" />
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
          <div className="text-center space-y-8">
            {/* Enhanced Mathematical/Engineering Logo */}
            <div className="space-y-6">
              {/* App Logo */}
              <div className="w-32 h-32 mx-auto relative">
                <img
                  src={appLogo}
                  alt="비유노트 로고"
                  className="w-full h-full rounded-3xl shadow-2xl shadow-slate-500/30 ring-4 ring-white/50"
                />
              </div>

              <div className="space-y-4">
                <h1 className="text-3xl font-mono text-slate-900 tracking-wider relative">
                  비유노트
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-16 h-0.5 bg-gradient-to-r from-transparent via-slate-400 to-transparent"></div>
                </h1>
              </div>
            </div>

            {/* 약관 동의 체크박스 */}
            <div className="border border-slate-300 rounded-xl p-4 bg-gradient-to-br from-slate-50 to-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
              <div className="flex items-center justify-center gap-2.5">
                <Checkbox
                  id="terms-agreement"
                  checked={agreedToTerms}
                  onCheckedChange={handleTermsChange}
                  className="flex-shrink-0"
                />
                <Label
                  htmlFor="terms-agreement"
                  className="text-sm text-slate-700 leading-relaxed cursor-pointer"
                >
                  <button
                    type="button"
                    onClick={handleShowTerms}
                    className="text-slate-900 hover:text-black transition-colors underline decoration-dotted underline-offset-2 font-medium"
                  >
                    이용약관
                  </button>
                  {" "}및{" "}
                  <button
                    type="button"
                    onClick={handleShowPrivacy}
                    className="text-slate-900 hover:text-black transition-colors underline decoration-dotted underline-offset-2 font-medium"
                  >
                    개인정보 처리방침
                  </button>
                </Label>
              </div>
            </div>

            {/* Enhanced Authentication Methods */}
            <div className="space-y-6">
              {/* Primary Login */}
              <Button
                onClick={handleGoogleLogin}
                disabled={!agreedToTerms || isLoggingIn}
                className="w-full h-16 bg-gradient-to-r from-slate-800 via-slate-900 to-black hover:from-slate-700 hover:via-slate-800 hover:to-slate-900 border border-slate-400 text-white transition-all duration-500 hover:shadow-lg hover:shadow-slate-500/30 relative overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
              >
                {/* Button glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

                <div className="flex items-center justify-center space-x-3 relative">
                  <span className="font-mono tracking-wide">
                    {isLoggingIn ? "로그인 중..." : "로그인"}
                  </span>
                  <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}