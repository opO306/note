package com.bivunote.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
// Firebase 인증 플러그인 수동 등록을 위한 import
import io.capawesome.capacitorjs.plugins.firebase.authentication.FirebaseAuthenticationPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Bridge가 초기화되기 전에 플러그인을 등록합니다.
        registerPlugin(FirebaseAuthenticationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}