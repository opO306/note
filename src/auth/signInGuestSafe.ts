import { signInAnonymously } from "firebase/auth";
import { auth } from "../firebase";
import { withTimeout } from "../withTimeout";
import { AuthError } from "../authErrors";

export async function signInGuestSafe(): Promise<void> {
  try {
    await withTimeout(signInAnonymously(auth), 8000);
  } catch (e: any) {
    if (e instanceof AuthError && e.reason === "TIMEOUT") {
      throw new AuthError(
        "APPCHECK_BLOCKED",
        "보안 검증(App Check)에 의해 게스트 로그인이 차단되었습니다."
      );
    }
    // Firebase Auth 오류 코드 처리 추가
    if (e?.code === "auth/operation-not-allowed") {
      throw new AuthError("AUTH_DISABLED", "게스트 로그인이 비활성화되어 있습니다.");
    }
    if (e?.code === "auth/network-request-failed") {
      throw new AuthError("NETWORK_ERROR", "네트워크 오류");
    }
    throw new AuthError("UNKNOWN", e?.message);
  }
}