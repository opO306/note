package com.bivunote.app;

import android.app.Activity;
import android.content.Context;
import android.util.Log;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.ConsumeResponseListener;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.ProductDetailsResponseListener;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesResponseListener;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "InAppPurchases")
public class InAppPurchasesPlugin extends Plugin implements PurchasesUpdatedListener {

    private static final String TAG = "InAppPurchasesPlugin";
    private BillingClient billingClient;
    private PluginCall purchaseCall;
    private boolean isServiceConnected = false;

    @Override
    public void load() {
        super.load();
        initializeBillingClient();
    }

    private void initializeBillingClient() {
        Activity activity = getActivity();
        if (activity == null) {
            Log.e(TAG, "Activity is null, cannot initialize billing client");
            return;
        }

        billingClient = BillingClient.newBuilder(activity)
                .setListener(this)
                .enablePendingPurchases()
                .build();

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    isServiceConnected = true;
                    Log.d(TAG, "Billing client connected");
                } else {
                    Log.e(TAG, "Billing client connection failed: " + billingResult.getResponseCode());
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                isServiceConnected = false;
                Log.d(TAG, "Billing client disconnected");
                // 재연결 시도
                billingClient.startConnection(this);
            }
        });
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        if (isServiceConnected) {
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } else {
            JSObject result = new JSObject();
            result.put("success", false);
            call.resolve(result);
        }
    }

    @PluginMethod
    public void getProducts(PluginCall call) {
        if (!isServiceConnected) {
            call.reject("Billing client is not connected");
            return;
        }

        JSObject data = call.getData();
        if (data == null) {
            call.reject("productIds is required");
            return;
        }

        try {
            // TypeScript에서 getProducts({ productIds: [...] })로 호출하면
            // data는 { productIds: [...] } 형태입니다
            JSONArray productIdsArray = data.getJSONArray("productIds");
            if (productIdsArray == null) {
                call.reject("productIds is required");
                return;
            }

            List<String> productIds = new ArrayList<>();
            for (int i = 0; i < productIdsArray.length(); i++) {
                productIds.add(productIdsArray.getString(i));
            }

            List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
            for (String productId : productIds) {
                productList.add(QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(productId)
                        .setProductType(BillingClient.ProductType.INAPP)
                        .build());
            }

            QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                    .setProductList(productList)
                    .build();

            billingClient.queryProductDetailsAsync(params, new ProductDetailsResponseListener() {
                @Override
                public void onProductDetailsResponse(@NonNull BillingResult billingResult,
                                                      @NonNull List<ProductDetails> productDetailsList) {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        try {
                            JSONArray products = new JSONArray();
                            for (ProductDetails productDetails : productDetailsList) {
                                JSONObject product = new JSONObject();
                                product.put("productId", productDetails.getProductId());
                                product.put("title", productDetails.getTitle());
                                product.put("description", productDetails.getDescription());
                                
                                ProductDetails.OneTimePurchaseOfferDetails offerDetails = 
                                    productDetails.getOneTimePurchaseOfferDetails();
                                if (offerDetails != null) {
                                    product.put("price", offerDetails.getFormattedPrice());
                                    product.put("priceAmountMicros", offerDetails.getPriceAmountMicros());
                                    product.put("priceCurrencyCode", offerDetails.getPriceCurrencyCode());
                                } else {
                                    product.put("price", "");
                                    product.put("priceAmountMicros", 0);
                                    product.put("priceCurrencyCode", "");
                                }
                                
                                products.put(product);
                            }

                            JSObject result = new JSObject();
                            result.put("products", products);
                            call.resolve(result);
                        } catch (JSONException e) {
                            call.reject("Failed to parse product details", e);
                        }
                    } else {
                        call.reject("Failed to query products: " + billingResult.getResponseCode());
                    }
                }
            });
        } catch (JSONException e) {
            call.reject("Invalid productIds format", e);
        }
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        if (!isServiceConnected) {
            call.reject("Billing client is not connected");
            return;
        }

        JSObject data = call.getData();
        if (data == null) {
            call.reject("productId is required");
            return;
        }

        // TypeScript에서 purchase({ productId: "..." })로 호출하면
        // data는 { productId: "..." } 형태입니다
        String productId = data.getString("productId");
        if (productId == null) {
            call.reject("productId is required");
            return;
        }

        purchaseCall = call;

        List<QueryProductDetailsParams.Product> productList = new ArrayList<>();
        productList.add(QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.INAPP)
                .build());

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
                .setProductList(productList)
                .build();

        billingClient.queryProductDetailsAsync(params, new ProductDetailsResponseListener() {
            @Override
            public void onProductDetailsResponse(@NonNull BillingResult billingResult,
                                                  @NonNull List<ProductDetails> productDetailsList) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK 
                        && !productDetailsList.isEmpty()) {
                    ProductDetails productDetails = productDetailsList.get(0);
                    ProductDetails.OneTimePurchaseOfferDetails offerDetails = 
                        productDetails.getOneTimePurchaseOfferDetails();
                    
                    if (offerDetails != null) {
                        List<BillingFlowParams.ProductDetailsParams> productDetailsParamsList = new ArrayList<>();
                        productDetailsParamsList.add(
                            BillingFlowParams.ProductDetailsParams.newBuilder()
                                .setProductDetails(productDetails)
                                .build()
                        );
                        
                        BillingFlowParams flowParams = BillingFlowParams.newBuilder()
                                .setProductDetailsParamsList(productDetailsParamsList)
                                .build();

                        BillingResult result = billingClient.launchBillingFlow(getActivity(), flowParams);
                        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                            purchaseCall.reject("Failed to launch billing flow: " + result.getResponseCode());
                            purchaseCall = null;
                        }
                    } else {
                        purchaseCall.reject("Product does not have purchase offer details");
                        purchaseCall = null;
                    }
                } else {
                    purchaseCall.reject("Product not found or query failed");
                    purchaseCall = null;
                }
            }
        });
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult billingResult, 
                                   List<Purchase> purchases) {
        if (purchaseCall == null) {
            return;
        }

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
            for (Purchase purchase : purchases) {
                if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                    try {
                        JSONObject transaction = new JSONObject();
                        transaction.put("transactionId", purchase.getOrderId());
                        transaction.put("productId", purchase.getProducts().get(0));
                        transaction.put("purchaseTime", purchase.getPurchaseTime());
                        transaction.put("receipt", purchase.getOriginalJson());
                        transaction.put("purchaseToken", purchase.getPurchaseToken());

                        JSObject result = new JSObject();
                        result.put("transaction", transaction);
                        purchaseCall.resolve(result);

                        // 구매 완료 후 소비 처리 (소비 가능한 상품인 경우)
                        ConsumeParams consumeParams = ConsumeParams.newBuilder()
                                .setPurchaseToken(purchase.getPurchaseToken())
                                .build();

                        billingClient.consumeAsync(consumeParams, new ConsumeResponseListener() {
                            @Override
                            public void onConsumeResponse(@NonNull BillingResult billingResult,
                                                          @NonNull String purchaseToken) {
                                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                                    Log.d(TAG, "Purchase consumed successfully");
                                } else {
                                    Log.e(TAG, "Failed to consume purchase: " + billingResult.getResponseCode());
                                }
                            }
                        });
                    } catch (JSONException e) {
                        purchaseCall.reject("Failed to create transaction object", e);
                    }
                } else if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) {
                    purchaseCall.reject("Purchase is pending");
                } else {
                    purchaseCall.reject("Purchase failed");
                }
            }
        } else if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            purchaseCall.reject("User canceled the purchase");
        } else {
            purchaseCall.reject("Purchase failed: " + billingResult.getResponseCode());
        }

        purchaseCall = null;
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        if (!isServiceConnected) {
            call.reject("Billing client is not connected");
            return;
        }

        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build();

        billingClient.queryPurchasesAsync(params, new PurchasesResponseListener() {
            @Override
            public void onQueryPurchasesResponse(@NonNull BillingResult billingResult,
                                                 @NonNull List<Purchase> purchases) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    try {
                        JSONArray products = new JSONArray();
                        for (Purchase purchase : purchases) {
                            JSONObject product = new JSONObject();
                            product.put("productId", purchase.getProducts().get(0));
                            product.put("transactionId", purchase.getOrderId());
                            product.put("purchaseTime", purchase.getPurchaseTime());
                            products.put(product);
                        }

                        JSObject result = new JSObject();
                        result.put("products", products);
                        call.resolve(result);
                    } catch (JSONException e) {
                        call.reject("Failed to parse purchases", e);
                    }
                } else {
                    call.reject("Failed to query purchases: " + billingResult.getResponseCode());
                }
            }
        });
    }
}

