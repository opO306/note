package com.bivunote.app

import android.util.Log
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialException
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.android.libraries.identity.googleid.GetGoogleIdTokenOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

@CapacitorPlugin(name = "GoogleCredentialAuth")
class GoogleCredentialAuthPlugin : Plugin() {

    private val TAG = "GoogleCredentialAuthPlugin"
    private lateinit var credentialManager: CredentialManager
    private var currentCall: PluginCall? = null
    // Main Dispatcher와 Job을 결합하여 Scope 생성
    private val pluginScope = CoroutineScope(Dispatchers.Main + Job())

    override fun load() {
        super.load()
        // Capacitor Plugin에서는 context를 바로 사용할 수 있습니다.
        credentialManager = CredentialManager.create(context)
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        pluginScope.cancel() // 플러그인 파괴 시 코루틴 취소
    }

    @PluginMethod
    fun signIn(call: PluginCall) {
        currentCall = call

        val webClientId = call.getString("webClientId")
        if (webClientId.isNullOrEmpty()) {
            call.reject("webClientId is required.")
            return
        }

        // [수정] Google Identity 라이브러리의 옵션 사용
        val googleIdTokenOption = GetGoogleIdTokenOption.Builder()
            .setServerClientId(webClientId)
            .setFilterByAuthorizedAccounts(false) // false: 모든 계정 선택 가능
            .setAutoSelectEnabled(false)          // 자동 선택 비활성화 (필요에 따라 변경)
            .build()

        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdTokenOption)
            .build()

        pluginScope.launch {
            try {
                // Activity가 null인지 확인 (앱 종료 등 예외 상황 방지)
                val currentActivity = activity
                if (currentActivity == null) {
                    currentCall?.reject("Activity is null")
                    return@launch
                }

                val result = credentialManager.getCredential(
                    context = currentActivity,
                    request = request
                )
                handleSignInResult(result)
            } catch (e: GetCredentialException) {
                Log.e(TAG, "Credential Manager sign in failed", e)
                // e.type 등을 통해 더 상세한 에러 처리가 가능합니다.
                currentCall?.reject(e.message ?: "Sign in failed", e)
            } catch (e: Exception) {
                Log.e(TAG, "Unknown error", e)
                currentCall?.reject(e.message)
            } finally {
                currentCall = null
            }
        }
    }

    private fun handleSignInResult(result: GetCredentialResponse) {
        val credential = result.credential

        // [수정] Google Credential은 CustomCredential 타입으로 반환됩니다.
        if (credential is CustomCredential &&
            credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
            
            try {
                // 데이터를 GoogleIdTokenCredential 객체로 변환
                val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                val idToken = googleIdTokenCredential.idToken

                val ret = JSObject()
                ret.put("idToken", idToken)
                // 필요한 경우 이메일 등 추가 정보도 반환 가능
                ret.put("email", googleIdTokenCredential.id) 
                
                currentCall?.resolve(ret)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to parse Google ID Token", e)
                currentCall?.reject("Failed to parse credential data")
            }
        } else {
            Log.e(TAG, "Unexpected credential type: ${credential.type}")
            currentCall?.reject("Unexpected credential type")
        }
    }

    @PluginMethod
    fun signOut(call: PluginCall) {
        // Credential Manager는 세션 상태를 OS가 관리하므로 명시적인 로그아웃 개념이 조금 다릅니다.
        // 하지만 clearCredentialState를 통해 '다음 로그인 시 계정을 다시 선택하게' 만들 수 있습니다.
        pluginScope.launch {
             try {
                 credentialManager.clearCredentialState(ClearCredentialStateRequest())
                 call.resolve()
             } catch (e: Exception) {
                 // 로그아웃 실패는 크리티컬하지 않으므로 로그만 남기고 성공 처리할 수도 있음
                 Log.e(TAG, "Sign out failed", e)
                 call.reject("Sign out failed", e)
             }
        }
    }
}