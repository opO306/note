# --- 구글 로그인 및 Firebase 필수 규칙 시작 ---

# 구글 플레이 서비스 (로그인 관련)
-keep class com.google.android.gms.auth.** { *; }
-keep class com.google.android.gms.common.** { *; }
-keep class com.google.android.gms.tasks.** { *; }
-keep class com.google.android.gms.signin.** { *; }

# Firebase (사용 중이라면 필수)
-keep class com.google.firebase.auth.** { *; }
-keep class com.google.firebase.** { *; }

# 안드로이드 컴포넌트 보호
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod

# (선택사항) 만약 Retrofit이나 OkHttp 같은 통신 라이브러리를 쓴다면 추가
-keep class retrofit2.** { *; }
-keep class okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn retrofit2.**

# --- 규칙 끝 ---