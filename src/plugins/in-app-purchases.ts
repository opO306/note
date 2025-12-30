// src/plugins/in-app-purchases.ts
// Capacitor 인앱 구매 플러그인 TypeScript 인터페이스

import { registerPlugin } from '@capacitor/core';

export interface InAppPurchasesPlugin {
  /**
   * 인앱 구매 초기화
   */
  initialize(): Promise<{ success: boolean }>;

  /**
   * 상품 정보 조회
   */
  getProducts(options: { productIds: string[] }): Promise<{
    products: Product[];
  }>;

  /**
   * 상품 구매
   */
  purchase(options: { productId: string }): Promise<{
    transaction: Transaction | null;
  }>;

  /**
   * 구매 복원
   */
  restorePurchases(): Promise<{
    products: Product[];
  }>;
}

export interface Product {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
}

export interface Transaction {
  transactionId: string;
  productId: string;
  purchaseTime: number;
  receipt: string;
  purchaseToken?: string; // Android
  originalTransactionIdentifier?: string; // iOS
}

const InAppPurchases = registerPlugin<InAppPurchasesPlugin>('InAppPurchases', {
  web: () => import('./in-app-purchases.web').then(m => new m.InAppPurchasesWeb()),
});

export * from './definitions';
export { InAppPurchases };

