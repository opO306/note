# --- Capacitor 필수 규칙 시작 ---
# Capacitor 플러그인 및 코어 클래스 보호
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }
-keepclassmembers class com.getcapacitor.** { *; }

# WebView 관련
-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
    public boolean *(android.webkit.WebView, java.lang.String);
}

# JavaScript 인터페이스
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# --- 구글 로그인 및 Firebase 필수 규칙 시작 ---

# 구글 플레이 서비스 (로그인 관련)
-keep class com.google.android.gms.auth.** { *; }
-keep class com.google.android.gms.common.** { *; }
    -keep class com.google.android.gms.tasks.** { *; }
    -keep class com.google.android.gms.signin.** { *; }

# Credential Manager
-keep class androidx.credentials.** { *; }
-keep class com.google.android.libraries.identity.googleid.** { *; }

# Firebase (사용 중이라면 필수)
-keep class com.google.firebase.auth.** { *; }
-keep class com.google.firebase.** { *; }
-keep class com.google.firebase.messaging.** { *; }

# 안드로이드 컴포넌트 보호
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes EnclosingMethod
-keepattributes InnerClasses
-keepattributes SourceFile,LineNumberTable
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Application
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver
-keep public class * extends android.content.ContentProvider

# 리플렉션 사용 클래스 보호
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# (선택사항) 만약 Retrofit이나 OkHttp 같은 통신 라이브러리를 쓴다면 추가
-keep class retrofit2.** { *; }
-keep class okhttp3.** { *; }
-dontwarn okhttp3.**
-dontwarn retrofit2.**

# --- 선택적 의존성 경고 무시 (R8이 생성한 규칙) ---
# Facebook 로그인 관련 (사용하지 않는 경우)
-dontwarn com.facebook.CallbackManager$Factory
-dontwarn com.facebook.CallbackManager
-dontwarn com.facebook.FacebookCallback
-dontwarn com.facebook.login.LoginManager
-dontwarn com.facebook.login.widget.LoginButton

# Firebase KTX 관련 (Kotlin 확장 함수, 선택적)
-dontwarn com.google.firebase.ktx.Firebase

# --- 규칙 끝 ---