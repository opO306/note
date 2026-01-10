import { WebPlugin } from "@capacitor/core";

import type {
    InAppPurchaseGetProductsOptions,
    InAppPurchaseGetProductsResult,
    InAppPurchaseInitializeResult,
    InAppPurchasePurchaseOptions,
    InAppPurchasePurchaseResult,
    InAppPurchaseRestorePurchasesResult,
    InAppPurchasesPlugin,
} from "./definitions";

export class InAppPurchasesWeb extends WebPlugin implements InAppPurchasesPlugin {
    async initialize(): Promise<InAppPurchaseInitializeResult> {
        return { success: false };
    }

    async getProducts(_options: InAppPurchaseGetProductsOptions): Promise<InAppPurchaseGetProductsResult> {
        return { products: [] };
    }

    async purchase(_options: InAppPurchasePurchaseOptions): Promise<InAppPurchasePurchaseResult> {
        throw new Error("In-app purchases are only available on native platforms.");
    }

    async restorePurchases(): Promise<InAppPurchaseRestorePurchasesResult> {
        return { products: [] };
    }
}
