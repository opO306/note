import { useState, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { ArrowLeft, Palette, Moon, Sun, Sparkles, Check, Lock } from "lucide-react";
import { toast } from "@/toastHelper";
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase";
import {
  initializeInAppPurchase,
  purchaseProduct,
  THEME_PRODUCT_IDS,
} from "../utils/inAppPurchase";
import { Capacitor } from "@capacitor/core";

interface ThemeScreenProps {
  onBack: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  lumenBalance: number;
  onThemePurchase?: (themeId: string, cost: number) => Promise<boolean>; // 옵셔널로 변경
}

interface Theme {
  id: string;
  name: string;
  description: string;
  price: string; // 가격 표시용 (예: "₩1,000")
  preview: string;
  productId?: string; // 인앱 구매 상품 ID
}

const THEMES: Theme[] = [
  {
    id: "e-ink",
    name: "전자 종이",
    description: "눈이 편안한 저대비 테마로 깊이 있는 사색에 몰입하세요.",
    price: "₩1,000", // 실제 가격은 Google Play / App Store에서 설정
    preview: "📜",
    productId: THEME_PRODUCT_IDS["e-ink"],
  },
  {
    id: "midnight",
    name: "심야 도서관",
    description: "깊은 암청색과 황금 포인트로 고풍스러운 학술 분위기를 연출합니다.",
    price: "₩1,000",
    preview: "🏛",
    productId: THEME_PRODUCT_IDS["midnight"],
  },
  {
    id: "golden-library",
    name: "황금빛 서재",
    description: "고급스러운 금색과 기하학적 문양으로 프리미엄 학술 분위기를 완성합니다.",
    price: "₩10,000",
    preview: "✨",
    productId: THEME_PRODUCT_IDS["golden-library"],
  },
];

export function ThemeScreen({
  onBack,
  isDarkMode,
  onToggleDarkMode,
  lumenBalance,
  onThemePurchase,
}: ThemeScreenProps) {
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("app-theme") || "default";
    }
    return "default";
  });
  const [purchasedThemes, setPurchasedThemes] = useState<string[]>([]);
  const [isIAPAvailable, setIsIAPAvailable] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // 인앱 구매 초기화 및 구매한 테마 목록 불러오기
  useEffect(() => {
    const loadData = async () => {
      // 인앱 구매 초기화
      const iapAvailable = await initializeInAppPurchase();
      setIsIAPAvailable(iapAvailable);

      // Firestore에서 구매한 테마 목록 불러오기
      const uid = auth.currentUser?.uid;
      if (!uid) {
        return;
      }

      try {
        const userRef = doc(db, "users", uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setPurchasedThemes(data.purchasedThemes || []);
        }
      } catch (error) {
        console.error("구매한 테마 불러오기 실패:", error);
      }
    };

    loadData();
  }, []);

  // 테마 초기화 및 적용
  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme") || "default";
    setCurrentTheme(savedTheme);
    const htmlElement = document.documentElement;
    htmlElement.setAttribute("data-theme", savedTheme);
    // 테마가 적용되면 다크 모드 클래스 제거 (테마가 자체 색상을 가지고 있으므로)
    if (savedTheme !== "default") {
      htmlElement.classList.remove("dark");
    }
  }, []);

  const handleThemeChange = useCallback(
    async (themeId: string) => {
      // 기본 테마는 무료로 바로 적용
      if (themeId === "default") {
        setCurrentTheme("default");
        localStorage.setItem("app-theme", "default");
        const htmlElement = document.documentElement;
        htmlElement.setAttribute("data-theme", "default");
        // 기본 테마는 다크 모드 설정 복원
        const savedDarkMode = localStorage.getItem("darkMode");
        const isDark = savedDarkMode !== null ? savedDarkMode === "true" : true;
        if (isDark) {
          htmlElement.classList.add("dark");
        } else {
          htmlElement.classList.remove("dark");
        }

        // Firestore에 기본 테마 저장
        const uid = auth.currentUser?.uid;
        if (uid) {
          try {
            await setDoc(
              doc(db, "users", uid),
              {
                currentTheme: "default",
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          } catch (error) {
            console.error("테마 저장 실패:", error);
          }
        }

        // App.tsx에 테마 변경 알림
        window.dispatchEvent(new CustomEvent("theme-changed"));

        toast.success("기본 테마가 적용되었습니다.");
        return;
      }

      // 유료 테마는 구매 여부 확인
      if (!purchasedThemes.includes(themeId)) {
        const theme = THEMES.find((t) => t.id === themeId);
        if (!theme) return;

        // 인앱 구매 진행
        if (isIAPAvailable && theme.productId) {
          setIsPurchasing(true);
          try {
            const purchaseResult = await purchaseProduct(theme.productId);

            if (purchaseResult.success && purchaseResult.transactionId) {
              // 서버에서 구매 검증
              const functions = getFunctions(app, "asia-northeast3");
              const verifyPurchaseFn = httpsCallable(functions, "verifyThemePurchase");

              const platform = Capacitor.getPlatform() === "ios" ? "ios" : "android";

              await verifyPurchaseFn({
                themeId,
                transactionId: purchaseResult.transactionId,
                receipt: purchaseResult.receipt || "",
                platform,
              });

              // 구매 성공 시 로컬 상태 업데이트
              setPurchasedThemes((prev) => [...prev, themeId]);
              toast.success(`${theme.name} 테마를 구매했습니다!`);
            } else {
              return;
            }
          } catch (error: any) {
            console.error("테마 구매 실패:", error);
            toast.error(error.message || "테마 구매에 실패했습니다.");
            return;
          } finally {
            setIsPurchasing(false);
          }
        } else {
          // 웹 환경이거나 인앱 구매가 불가능한 경우 (기존 루멘 구매 로직)
          const THEME_COST = 0; // 🧪 테스트용: 무료

          if (onThemePurchase && THEME_COST > 0) {
            // 루멘으로 구매하는 로직 (개발/테스트용)
            const success = await onThemePurchase(themeId, THEME_COST);
            if (!success) {
              return;
            }
          } else if (!onThemePurchase && THEME_COST > 0) {
            toast.error("인앱 구매는 모바일 앱에서만 사용할 수 있습니다.");
            return;
          }

          // 비용이 0이면 바로 구매 완료 처리
          setPurchasedThemes((prev) => [...prev, themeId]);
        }
      }

      // 테마 적용
      setCurrentTheme(themeId);
      localStorage.setItem("app-theme", themeId);

      // Firestore에 현재 테마 저장 (프로필에 표시하기 위해)
      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          await setDoc(
            doc(db, "users", uid),
            {
              currentTheme: themeId,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (error) {
          console.error("테마 저장 실패:", error);
          // 실패해도 테마는 적용되므로 계속 진행
        }
      }

      // data-theme 속성 설정
      const htmlElement = document.documentElement;
      htmlElement.setAttribute("data-theme", themeId);

      // 테마가 적용되면 다크 모드 클래스 제거 (테마가 자체 색상을 가지고 있으므로)
      if (themeId !== "default") {
        htmlElement.classList.remove("dark");
      } else {
        // 기본 테마로 돌아갈 때는 다크 모드 설정 복원
        const savedDarkMode = localStorage.getItem("darkMode");
        const isDark = savedDarkMode !== null ? savedDarkMode === "true" : true;
        if (isDark) {
          htmlElement.classList.add("dark");
        } else {
          htmlElement.classList.remove("dark");
        }
      }

      // CSS 재계산 강제 (getComputedStyle 호출로 브라우저에 재계산 요청)
      void htmlElement.offsetHeight;

      // App.tsx에 테마 변경 알림 (같은 탭에서 변경된 경우)
      window.dispatchEvent(new CustomEvent("theme-changed"));

      const theme = THEMES.find((t) => t.id === themeId);
      if (!isPurchasing) {
        toast.success(`${theme?.name || themeId} 테마가 적용되었습니다.`);
      }
    },
    [purchasedThemes, isIAPAvailable, isPurchasing, onThemePurchase]
  );

  const isThemePurchased = (themeId: string) => {
    return themeId === "default" || purchasedThemes.includes(themeId);
  };

  const isThemeAffordable = (themeId: string) => {
    if (themeId === "default") return true;
    // 🧪 테스트용: 모든 테마 무료
    const THEME_COST = 0;
    if (THEME_COST === 0) return true;
    // 인앱 구매가 가능한 경우 항상 구매 가능
    if (isIAPAvailable) return true;
    // 웹 환경에서는 루멘으로 구매 가능한지 확인
    const theme = THEMES.find((t) => t.id === themeId);
    return theme ? lumenBalance >= THEME_COST : false;
  };

  return (
    <div className="w-full h-full bg-background text-foreground flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-card/95 backdrop-blur-xl border-b border-border flex-shrink-0 safe-top z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 min-w-0">
              <Button variant="ghost" size="icon" onClick={onBack} className="-ml-2 flex-shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="font-medium text-lg truncate">테마 설정</h1>
            </div>
            {!isIAPAvailable && (
              <div className="flex items-center space-x-2 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20 flex-shrink-0">
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
                <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums whitespace-nowrap">
                  {lumenBalance.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">루멘</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 pb-24 space-y-4">
        {/* 다크 모드 설정 */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Palette className="w-5 h-5" />
              <span>기본 모드</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                <Label className="text-foreground">다크 모드</Label>
              </div>
              <div className="-m-2 p-2 inline-flex items-center">
                <Switch
                  className="!min-w-0 !min-h-0 h-4 w-8 md:h-6 md:w-11
                  [&>span]:h-3.5 [&>span]:w-3.5 md:[&>span]:h-5 md:[&>span]:w-5
                  [&[data-state=checked]>span]:translate-x-3.5 md:[&[data-state=checked]>span]:translate-x-5"
                  checked={isDarkMode}
                  onCheckedChange={onToggleDarkMode}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              기본 라이트 모드와 다크 모드는 무료로 사용할 수 있습니다.
            </p>
          </CardContent>
        </Card>

        {/* 몰입 테마 설정 */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Palette className="w-5 h-5" />
              <span>몰입 테마</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* 기본 테마 */}
            <Card
              className={`cursor-pointer transition-all ${currentTheme === "default"
                ? "border-primary ring-1 ring-primary"
                : "border-border hover:border-primary/50"
                }`}
              onClick={() => handleThemeChange("default")}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🎨</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">기본</h3>
                        {currentTheme === "default" && (
                          <Badge className="text-[10px] px-1.5 h-5">적용 중</Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] px-1.5 h-5 text-green-600">
                          무료
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        기본 라이트/다크 모드 테마
                      </p>
                    </div>
                  </div>
                  {currentTheme === "default" && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 유료 테마들 */}
            {THEMES.map((theme) => {
              const isPurchased = isThemePurchased(theme.id);
              const isAffordable = isThemeAffordable(theme.id);
              const isActive = currentTheme === theme.id;

              return (
                <Card
                  key={theme.id}
                  className={`cursor-pointer transition-all ${isActive
                    ? "border-primary ring-1 ring-primary"
                    : !isPurchased && !isAffordable
                      ? "opacity-70 border-dashed"
                      : "border-border hover:border-primary/50"
                    } ${isPurchasing ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => !isPurchasing && handleThemeChange(theme.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="text-2xl flex-shrink-0">{theme.preview}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold truncate">{theme.name}</h3>
                            {isActive && (
                              <Badge className="text-[10px] px-1.5 h-5">적용 중</Badge>
                            )}
                            {isPurchased ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 h-5 text-green-600"
                              >
                                보유 중
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 h-5 text-amber-600"
                              >
                                <Lock className="w-3 h-3 mr-1" />
                                {isIAPAvailable ? theme.price : "무료 (테스트)"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {theme.description}
                          </p>
                        </div>
                      </div>
                      {isActive && <Check className="w-5 h-5 text-primary flex-shrink-0" />}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

