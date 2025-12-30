// src/plugins/in-app-purchases.web.ts
// 웹 환경용 인앱 구매 플러그인 (모바일 앱에서만 작동)

import { WebPlugin } from '@capacitor/core';
import type { InAppPurchasesPlugin, Product, Transaction } from './definitions';

export class InAppPurchasesWeb extends WebPlugin implements InAppPurchasesPlugin {
  async initialize(): Promise<{ success: boolean }> {
    console.warn('인앱 구매는 웹 환경에서 지원되지 않습니다.');
    return { success: false };
  }

  async getProducts(_options: { productIds: string[] }): Promise<{ products: Product[] }> {
    console.warn('인앱 구매는 웹 환경에서 지원되지 않습니다.');
    return { products: [] };
  }

  async purchase(_options: { productId: string }): Promise<{ transaction: Transaction | null }> {
    console.warn('인앱 구매는 웹 환경에서 지원되지 않습니다.');
    return { transaction: null };
  }

  async restorePurchases(): Promise<{ products: Product[] }> {
    console.warn('인앱 구매는 웹 환경에서 지원되지 않습니다.');
    return { products: [] };
  }
}

