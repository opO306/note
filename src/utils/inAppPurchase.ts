// inAppPurchase.ts - 인앱 구매 유틸리티

import { Capacitor } from "@capacitor/core";
import { toast } from "@/toastHelper";
import { InAppPurchases } from "../plugins/in-app-purchases";

// 테마 ID와 인앱 구매 상품 ID 매핑
export const THEME_PRODUCT_IDS: Record<string, string> = {
  "e-ink": "theme_e_ink", // Google Play / App Store에 등록할 상품 ID
  "midnight": "theme_midnight",
};

// 인앱 구매가 가능한 플랫폼인지 확인
export function isInAppPurchaseAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

// 인앱 구매 초기화 (플러그인 로드)
export async function initializeInAppPurchase(): Promise<boolean> {
  if (!isInAppPurchaseAvailable()) {
    return false;
  }

  try {
    const result = await InAppPurchases.initialize();
    return result.success;
  } catch (error) {
    console.warn("인앱 구매 초기화 실패:", error);
    return false;
  }
}

// 상품 정보 조회
export async function getProducts(productIds: string[]): Promise<any[]> {
  if (!isInAppPurchaseAvailable()) {
    return [];
  }

  try {
    // TypeScript 인터페이스에 맞게 options 객체로 전달
    const result = await InAppPurchases.getProducts({ productIds });
    return result.products || [];
  } catch (error) {
    console.warn("상품 정보 조회 실패:", error);
    return [];
  }
}

// 구매 요청
export async function purchaseProduct(productId: string): Promise<{
  success: boolean;
  transactionId?: string;
  receipt?: string;
}> {
  if (!isInAppPurchaseAvailable()) {
    toast.error("인앱 구매는 모바일 앱에서만 사용할 수 있습니다.");
    return { success: false };
  }

  try {
    const result = await InAppPurchases.purchase({ productId });
    
    if (result.transaction?.transactionId) {
      return {
        success: true,
        transactionId: result.transaction.transactionId,
        receipt: result.transaction.receipt,
      };
    }
    
    return { success: false };
  } catch (error: any) {
    console.error("구매 실패:", error);
    
    // 사용자가 구매를 취소한 경우
    if (error.message?.includes("cancel") || error.message?.includes("Cancel")) {
      toast.info("구매가 취소되었습니다.");
    } else {
      toast.error("구매 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
    
    return { success: false };
  }
}

// 구매 복원 (이전에 구매한 상품 복원)
export async function restorePurchases(): Promise<any[]> {
  if (!isInAppPurchaseAvailable()) {
    return [];
  }

  try {
    const result = await InAppPurchases.restorePurchases();
    return result.products || [];
  } catch (error) {
    console.warn("구매 복원 실패:", error);
    return [];
  }
}

