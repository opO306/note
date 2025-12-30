# 인앱 구매 설정 가이드

테마 구매 기능을 실제 현금 결제로 전환하기 위한 설정 가이드입니다.

## ⚠️ 인앱 상품 등록을 위한 필수 조건

### 1. 앱 번들(AAB) 업로드
Google Play Console에서 '인앱 상품' 메뉴를 정상적으로 사용하려면, 우선 **결제 권한(`com.android.vending.BILLING`)**이 포함된 앱 번들을 최소 한 번은 업로드해야 합니다.

✅ **결제 권한은 이미 `AndroidManifest.xml`에 추가되어 있습니다.**

### 2. 테스트 트랙 활용
굳이 '프로덕션'이 아니더라도 **'내부 테스트'**나 **'비공개 테스트'** 트랙에 앱을 올리면 상품 등록 메뉴가 활성화되며, 실제 결제가 일어나는지 테스트해 볼 수 있습니다.

### 3. 판매자 계정 설정
현재 진행 중이신 결제 프로필 작성이 완료되어야 상품을 만들고 가격을 책정할 수 있습니다.

## ✅ 플러그인 구현 완료

인앱 구매 플러그인이 이미 구현되어 있습니다:
- **TypeScript 인터페이스**: `src/plugins/in-app-purchases.ts`
- **웹 구현**: `src/plugins/in-app-purchases.web.ts`
- **Android 구현**: `android/app/src/main/java/com/bivunote/app/InAppPurchasesPlugin.java`

## 1. Android 빌드 설정

플러그인은 이미 `MainActivity.java`에 등록되어 있고, Google Play Billing Library도 `build.gradle`에 추가되어 있습니다.

다음 명령어로 Android 프로젝트를 동기화하세요:

```bash
npx cap sync android
```

## 2. Google Play Console 설정 (Android)

1. Google Play Console에 로그인
2. 앱 선택 → 수익 창출 → 인앱 상품
3. 다음 상품들을 생성:
   - **상품 ID**: `theme_e_ink`
     - 이름: 전자 종이 테마
     - 설명: 눈이 편안한 저대비 테마
     - 가격: 원하는 가격 설정 (예: ₩1,000)
   - **상품 ID**: `theme_midnight`
     - 이름: 심야 도서관 테마
     - 설명: 깊은 암청색과 황금 포인트 테마
     - 가격: 원하는 가격 설정 (예: ₩1,000)

## 3. App Store Connect 설정 (iOS)

1. App Store Connect에 로그인
2. 앱 선택 → 기능 → 인앱 구매
3. 다음 상품들을 생성:
   - **상품 ID**: `theme_e_ink`
     - 표시 이름: 전자 종이 테마
     - 설명: 눈이 편안한 저대비 테마
     - 가격: 원하는 가격 설정
   - **상품 ID**: `theme_midnight`
     - 표시 이름: 심야 도서관 테마
     - 설명: 깊은 암청색과 황금 포인트 테마
     - 가격: 원하는 가격 설정

## 4. 서버 측 구매 검증 (선택사항)

현재 `verifyThemePurchase` 함수는 기본적인 검증만 수행합니다. 실제 프로덕션 환경에서는 다음을 추가해야 합니다:

### Android (Google Play Billing)
- Google Play Developer API를 사용하여 영수증 검증
- `purchaseToken`을 사용하여 구매 상태 확인

### iOS (App Store)
- App Store Server API를 사용하여 영수증 검증
- `receipt-data`를 사용하여 구매 상태 확인

## 5. 테스트

### Android
- Google Play Console에서 테스트 계정 추가
- 테스트 빌드로 인앱 구매 테스트

### iOS
- App Store Connect에서 샌드박스 테스터 추가
- TestFlight 또는 개발 빌드로 인앱 구매 테스트

## 6. 주의사항

- 인앱 구매는 **모바일 앱에서만 작동**합니다 (웹에서는 작동하지 않음)
- 웹 환경에서는 기존 루멘 구매 로직이 대체로 사용됩니다 (개발/테스트용)
- 실제 가격은 Google Play Console / App Store Connect에서 설정한 가격이 표시됩니다

