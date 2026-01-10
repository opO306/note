export interface InAppPurchaseInitializeResult {
    success: boolean;
}

export interface InAppPurchaseProduct {
    productId: string;
    title?: string;
    description?: string;
    price?: string;
    priceAmountMicros?: number;
    priceCurrencyCode?: string;
}

export interface InAppPurchaseGetProductsOptions {
    productIds: string[];
}

export interface InAppPurchaseGetProductsResult {
    products: InAppPurchaseProduct[];
}

export interface InAppPurchasePurchaseOptions {
    productId: string;
}

export interface InAppPurchaseTransaction {
    transactionId: string;
    productId: string;
    purchaseTime?: number;
    receipt?: string;
    purchaseToken?: string;
}

export interface InAppPurchasePurchaseResult {
    transaction: InAppPurchaseTransaction;
}

export interface InAppPurchaseRestorePurchasesResult {
    products: Array<{
        productId: string;
        transactionId?: string;
        purchaseTime?: number;
    }>;
}

export interface InAppPurchasesPlugin {
    initialize(): Promise<InAppPurchaseInitializeResult>;
    getProducts(options: InAppPurchaseGetProductsOptions): Promise<InAppPurchaseGetProductsResult>;
    purchase(options: InAppPurchasePurchaseOptions): Promise<InAppPurchasePurchaseResult>;
    restorePurchases(): Promise<InAppPurchaseRestorePurchasesResult>;
}
