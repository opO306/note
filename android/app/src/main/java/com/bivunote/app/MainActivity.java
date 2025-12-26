package com.bivunote.app;

import android.Manifest;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.preference.PreferenceManager;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Bridge;

import android.webkit.WebSettings;
import android.webkit.WebView;

// Firebase 인증 플러그인 수동 등록을 위한 import
import io.capawesome.capacitorjs.plugins.firebase.authentication.FirebaseAuthenticationPlugin;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final String PREF_IS_FIRST_RUN = "isFirstRun";
    private static final int PERMISSION_REQUEST_CODE = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Bridge가 초기화되기 전에 플러그인을 등록합니다.
        registerPlugin(FirebaseAuthenticationPlugin.class);
        super.onCreate(savedInstanceState);

        // 첫 실행 시 권한 요청
        if (isFirstRun()) {
            requestAllPermissions();
        }
    }

    @Override
    public void onStart() {
        super.onStart();

        // WebView 설정
        Bridge bridge = getBridge();
        if (bridge == null)
            return;

        WebView webView = bridge.getWebView();
        if (webView == null)
            return;

        WebSettings settings = webView.getSettings();

        // localStorage 등
        settings.setDomStorageEnabled(true);

        // 캐시 정책:
        // - LOAD_DEFAULT: HTTP 캐시 헤더를 존중 (대부분의 앱에서 안전/정상)
        // - LOAD_CACHE_ELSE_NETWORK: 네트워크가 되어도 캐시 우선(구버전 콘텐츠 노출 위험)
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        // AppCache 관련 API는 SDK에서 제거되어 컴파일 에러를 유발하므로 사용하지 않음.
        // settings.setAppCacheEnabled(...) // 제거
    }

    /**
     * 앱이 첫 실행인지 확인
     */
    private boolean isFirstRun() {
        SharedPreferences prefs = PreferenceManager.getDefaultSharedPreferences(this);
        boolean isFirstRun = prefs.getBoolean(PREF_IS_FIRST_RUN, true);
        if (isFirstRun) {
            prefs.edit().putBoolean(PREF_IS_FIRST_RUN, false).apply();
        }
        return isFirstRun;
    }

    /**
     * 필요한 모든 권한 요청
     */
    private void requestAllPermissions() {
        List<String> permissionsToRequest = new ArrayList<>();

        // 카메라 권한 (Android 6.0+)
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.CAMERA);
        }

        // 저장소 권한 (Android 버전에 따라 다름)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Android 13 (API 33) 이상: READ_MEDIA_IMAGES
            if (ContextCompat.checkSelfPermission(this,
                    Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.READ_MEDIA_IMAGES);
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            // Android 6.0 ~ 12 (API 23-32): READ_EXTERNAL_STORAGE
            if (ContextCompat.checkSelfPermission(this,
                    Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                permissionsToRequest.add(Manifest.permission.READ_EXTERNAL_STORAGE);
            }
        }

        // 권한이 필요한 경우에만 요청
        if (!permissionsToRequest.isEmpty()) {
            ActivityCompat.requestPermissions(
                    this,
                    permissionsToRequest.toArray(new String[0]),
                    PERMISSION_REQUEST_CODE);
        }
    }

    /**
     * 권한 요청 결과 처리
     */
    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            @NonNull String[] permissions,
            @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == PERMISSION_REQUEST_CODE) {
            // 필요 시 처리 (현재는 로직 없음)
            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }
        }
    }
}
