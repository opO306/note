// src/plugins/definitions.ts
// 인앱 구매 플러그인 타입 정의

export interface InAppPurchasesPlugin {
  initialize(): Promise<{ success: boolean }>;
  getProducts(options: { productIds: string[] }): Promise<{ products: Product[] }>;
  purchase(options: { productId: string }): Promise<{ transaction: Transaction | null }>;
  restorePurchases(): Promise<{ products: Product[] }>;
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
  purchaseToken?: string;
  originalTransactionIdentifier?: string;
}

