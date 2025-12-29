# Android 빌드 가이드

## R8/ProGuard 활성화

이제 R8/ProGuard가 활성화되어 있습니다. 릴리스 빌드 시 자동으로 코드 최적화 및 난독화가 수행됩니다.

## Google Play Console에 업로드할 파일

### 1. ProGuard 매핑 파일 (필수)

릴리스 빌드 후 다음 위치에 생성됩니다:
```
android/app/build/outputs/mapping/release/mapping.txt
```

**업로드 방법:**
1. Google Play Console → 앱 → 릴리스 → 프로덕션 (또는 테스트 트랙)
2. 각 버전의 "자세히 보기" 클릭
3. "가독화 파일" 섹션에서 "매핑 파일 업로드" 클릭
4. `mapping.txt` 파일 업로드

### 2. 네이티브 디버그 기호 (선택사항)

Capacitor 앱의 경우 대부분 네이티브 라이브러리가 없으므로 이 단계는 필요하지 않을 수 있습니다. 하지만 Firebase 등의 일부 플러그인이 네이티브 코드를 포함하는 경우:

**확인 방법:**
```
android/app/build/intermediates/merged_native_libs/release/out/lib/
```

이 디렉토리에 `.so` 파일이 있다면 디버그 기호 파일을 업로드해야 합니다.

## 빌드 명령어

### 릴리스 AAB 빌드
```bash
cd android
./gradlew bundleRelease
```

빌드된 파일 위치:
```
android/app/build/outputs/bundle/release/app-release.aab
```

### 릴리스 APK 빌드 (테스트용)
```bash
cd android
./gradlew assembleRelease
```

빌드된 파일 위치:
```
android/app/build/outputs/apk/release/app-release.apk
```

## 문제 해결

### 빌드 에러 발생 시

1. ProGuard 규칙 확인: `android/app/proguard-rules.pro`
2. 에러 로그에서 누락된 클래스를 찾아 `-keep` 규칙 추가
3. 다시 빌드

### 앱이 실행되지 않는 경우

1. `mapping.txt` 파일을 사용해 스택 트레이스 디코딩
2. Google Play Console의 "크래시 및 ANR" 페이지에서 확인
3. 필요한 경우 추가 ProGuard 규칙 적용
