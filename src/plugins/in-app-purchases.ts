import { registerPlugin } from "@capacitor/core";

import type { InAppPurchasesPlugin } from "./definitions";

export const InAppPurchases = registerPlugin<InAppPurchasesPlugin>("InAppPurchases", {
    web: () => import("./in-app-purchases.web").then((m) => new m.InAppPurchasesWeb()),
});
