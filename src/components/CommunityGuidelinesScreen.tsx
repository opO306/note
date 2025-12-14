import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { ArrowLeft, Users, AlertCircle, ThumbsUp, Ban, Flag, Moon, Sun } from "lucide-react";
import { useState, useCallback, useMemo } from "react";

// 아이콘 스타일 상수
const ICON_STYLE = {
  stroke: "currentColor",
  fill: "none",
  display: "block",
} as const;

interface CommunityGuidelinesScreenProps {
  onBack: () => void;
  onContinue?: () => void;      // 온보딩 플로우에서만 사용
  isAlreadyAgreed?: boolean;    // 이미 동의했는지 여부
  hideBackButton?: boolean;
  disableBack?: boolean;      // 온보딩 중에는 뒤로가기 숨기기
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

export function CommunityGuidelinesScreen({
  onBack,
  onContinue,
  isAlreadyAgreed = false,
  hideBackButton = false,
  disableBack: _disableBack = false,
  isDarkMode,
  onToggleDarkMode,
}: CommunityGuidelinesScreenProps) {
  // 체크박스 state (이미 동의했으면 모두 true로 시작)
  const [agreement1, setAgreement1] = useState(isAlreadyAgreed);
  const [agreement2, setAgreement2] = useState(isAlreadyAgreed);
  const [agreement3, setAgreement3] = useState(isAlreadyAgreed);

  // 모두 동의했는지 확인
  const allAgreed = useMemo(
    () => agreement1 && agreement2 && agreement3,
    [agreement1, agreement2, agreement3]
  );
  // 버튼 클릭 핸들러
  const handleContinue = useCallback(() => {
    if (onContinue && allAgreed) {
      onContinue();
    } else {
      onBack();
    }
  }, [onContinue, allAgreed, onBack]);

  // ✅ 체크박스 변경 핸들러들 (JSX 안에서 화살표 함수 안 쓰기 위해 분리)
  const handleAgreement1Change = useCallback(
    (checked: boolean | "indeterminate") => {
      if (isAlreadyAgreed) return;
      setAgreement1(checked === true);
    },
    [isAlreadyAgreed]
  );

  const handleAgreement2Change = useCallback(
    (checked: boolean | "indeterminate") => {
      if (isAlreadyAgreed) return;
      setAgreement2(checked === true);
    },
    [isAlreadyAgreed]
  );

  const handleAgreement3Change = useCallback(
    (checked: boolean | "indeterminate") => {
      if (isAlreadyAgreed) return;
      setAgreement3(checked === true);
    },
    [isAlreadyAgreed]
  );


  return (
    // 전체 레이아웃: 위(헤더) / 가운데(스크롤) / 아래(버튼)
    <div className="w-full h-full bg-background text-foreground flex flex-col">
      {/* 헤더 - 상태바를 피해 고정 */}
      <header className="bg-card/95 backdrop-blur-xl border-b border-border flex-shrink-0 safe-top">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {!hideBackButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  className="touch-target transition-transform active:scale-95"
                >
                  <ArrowLeft className="w-5 h-5" style={ICON_STYLE} />
                </Button>
              )}
              <h1 className="flex items-center gap-2 font-semibold">
                <Users className="w-5 h-5" style={ICON_STYLE} />
                비유노트 커뮤니티 가이드라인
              </h1>
            </div>
            {/* 🔹 다크모드 토글 버튼 (헤더 우측) */}
            {onToggleDarkMode && (
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
            )}
          </div>
        </div>
      </header>

      {/* 가운데: 가이드 카드들만 스크롤 */}
      <div className="flex-1 scroll-container no-scrollbar">
        <div className="p-4 space-y-6 pb-24">
          {/* 철학 */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" style={ICON_STYLE} />
                비유노트의 철학
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 leading-relaxed">
              <p className="text-lg font-medium">
                비유노트는 이런 곳이에요
              </p>
              <p className="text-sm text-muted-foreground">
                비유노트는 정답을 자랑하는 곳이 아니라,
                나만의 비유와 예시로 서로의 이해를 돕는 공부방이에요.
                아래 약속만 지키면 누구나 편하게 질문하고 설명할 수 있어요.
              </p>
            </CardContent>
          </Card>

          {/* 1. 존중과 배려 */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ThumbsUp
                  className="w-5 h-5 text-green-600 dark:text-green-400"
                  style={ICON_STYLE}
                />
                1. 서로 존중하기
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed">
              <p className="font-medium">
                비유노트는 모두가 편안하게 학습할 수 있는 공간입니다.
              </p>
              <ul className="space-y-2 list-disc pl-5 text-muted-foreground">
                <li>모든 질문은 소중합니다. 기초적인 질문도 환영합니다.</li>
                <li>답변은 친절하고 이해하기 쉽게 작성해 주세요.</li>
                <li>비판할 때는 내용에 집중하고, 개인을 공격하지 마세요.</li>
                <li>서로 다른 생각도 존중하면서 이야기해요.</li>
              </ul>
            </CardContent>
          </Card>

          {/* 2. 이해 중심의 설명 */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle
                  className="w-5 h-5 text-blue-600 dark:text-blue-400"
                  style={ICON_STYLE}
                />
                2. 이해하기 쉽게 설명하기
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed">
              <p className="font-medium">
                단순히 정답을 알려주는 것이 아닌, 이해를 돕는 설명을 지향합니다.
              </p>
              <ul className="space-y-2 list-disc pl-5 text-muted-foreground">
                <li>개념의 본질을 쉬운 말로 풀어서 설명해 주세요.</li>
                <li>적절한 비유와 예시를 활용해 주세요.</li>
                <li>단계별로 차근차근 설명하면 더 좋습니다.</li>
                <li>“왜 그런지” 이유도 같이 써 주세요.</li>
              </ul>
            </CardContent>
          </Card>

          {/* 3. 커뮤니티 문화 */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users
                  className="w-5 h-5 text-purple-600 dark:text-purple-400"
                  style={ICON_STYLE}
                />
                3. 함께 지키는 분위기
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed">
              <p className="font-medium">
                함께 성장하는 학습 커뮤니티를 만들어갑니다.
              </p>
              <ul className="space-y-2 list-disc pl-5 text-muted-foreground">
                <li>도움을 받았다면 감사 표현을 해주세요.</li>
                <li>좋은 답변에는 등불을 켜주세요.</li>
                <li>가장 도움이 된 답변을 길잡이로 선택해 주세요.</li>
                <li>여러분의 지식을 나누는 것도 학습의 일부입니다.</li>
              </ul>
            </CardContent>
          </Card>

          {/* 4. 금지 사항 */}
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Ban className="w-5 h-5" style={ICON_STYLE} />
                4. 금지 사항
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed">
              <p className="font-medium text-destructive">
                다음 행위는 엄격히 금지됩니다.
              </p>
              <ul className="space-y-2 list-disc pl-5 text-muted-foreground">
                <li>욕설, 비하, 혐오 표현</li>
                <li>개인정보 무단 공유</li>
                <li>스팸, 홍보성 게시물</li>
                <li>저작권 침해 콘텐츠</li>
                <li>부정행위 조장 (시험 부정행위 등)</li>
                <li>허위 정보 유포</li>
              </ul>
            </CardContent>
          </Card>

          {/* 5. 신고 및 제재 */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag
                  className="w-5 h-5 text-orange-600 dark:text-orange-400"
                  style={ICON_STYLE}
                />
                5. 신고 및 제재
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed">
              <p className="font-medium">
                가이드라인 위반 시 다음과 같은 조치가 이루어집니다.
              </p>
              <ul className="space-y-2 list-disc pl-5 text-muted-foreground">
                <li>부적절한 게시물은 삭제됩니다.</li>
                <li>반복적인 위반 시 계정이 정지될 수 있습니다.</li>
                <li>위반 콘텐츠를 발견하시면 신고 기능을 이용해 주세요.</li>
                <li>신고는 익명으로 처리되며, 신중하게 검토됩니다.</li>
              </ul>
            </CardContent>
          </Card>

          {/* 마무리 메시지 */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6 space-y-2 text-center">
              <p className="text-base font-medium">
                함께 만들어가는 학습 커뮤니티
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                비유노트는 여러분이 함께 만들어가는 공간입니다.<br />
                서로 존중하고 배려하며, 즐겁게 학습해요!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 온보딩 플로우일 때: 체크박스 + 확인하고 계속하기 */}
      {onContinue && (
        <div className="bg-background/95 backdrop-blur-xl border-t border-border p-4 space-y-4 safe-nav-bottom flex-shrink-0 mb-4">
          {/* 체크박스 3개 */}
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:border-primary/30 active:border-primary/40 active:bg-primary/5 transition-colors transition-transform active:scale-[0.99]">
              <Checkbox
                id="agreement1"
                checked={agreement1}
                onCheckedChange={handleAgreement1Change}
                disabled={isAlreadyAgreed}
                className="mt-0.5"
              />
              <Label
                htmlFor="agreement1"
                className="flex-1 cursor-pointer leading-relaxed"
              >
                <span className="font-medium">이해 중심으로 질문하고 설명하겠습니다</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  정답만 말하는 것이 아니라, 이해를 돕는 설명을 약속해요.
                </p>
              </Label>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:border-primary/30 active:border-primary/40 active:bg-primary/5 transition-colors transition-transform active:scale-[0.99]">
              <Checkbox
                id="agreement2"
                checked={agreement2}
                onCheckedChange={handleAgreement2Change}
                disabled={isAlreadyAgreed}
                className="mt-0.5"
              />
              <Label
                htmlFor="agreement2"
                className="flex-1 cursor-pointer leading-relaxed"
              >
                <span className="font-medium">비유와 예시를 사용해 설명하겠습니다</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  복잡한 개념도 비유와 예시로 쉽게 풀어낼게요.
                </p>
              </Label>
            </div>

            <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:border-primary/30 active:border-primary/40 active:bg-primary/5 transition-colors transition-transform active:scale-[0.99]">
              <Checkbox
                id="agreement3"
                checked={agreement3}
                onCheckedChange={handleAgreement3Change}
                disabled={isAlreadyAgreed}
                className="mt-0.5"
              />
              <Label
                htmlFor="agreement3"
                className="flex-1 cursor-pointer leading-relaxed"
              >
                <span className="font-medium">서로를 존중하며 소통하겠습니다</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  모든 사람을 배려하고 존중하는 태도를 지키겠습니다.
                </p>
              </Label>
            </div>
          </div>

          {/* 경고 메시지 */}
          {!allAgreed && !isAlreadyAgreed && (
            <div className="text-center text-sm text-destructive">
              모든 항목에 동의해주세요
            </div>
          )}

          {/* 계속하기 버튼 */}
          <Button
            onClick={handleContinue}
            disabled={!allAgreed && !isAlreadyAgreed}
            className="w-full transition-transform active:scale-95 disabled:active:scale-100"
            size="lg"
          >
            확인하고 계속하기
          </Button>
        </div>
      )}

      {/* 다시보기 모드일 때: 확인 버튼만 */}
      {!onContinue && (
        <div className="bg-background/95 backdrop-blur-xl border-t border-border p-6 pb-8 safe-nav-bottom flex-shrink-0 mb-4">
          <Button
            onClick={onBack}
            className="w-full transition-transform active:scale-95"
            size="lg"
          >
            확인
          </Button>
        </div>
      )}
    </div>
  );
}