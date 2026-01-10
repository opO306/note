import { fetchSignInMethodsForEmail, type Auth } from "firebase/auth";

export type AuthUxContext = "login" | "signup" | "passwordReset" | "link";

function normalizeAuthCode(code: unknown): string {
    return typeof code === "string" ? code : "";
}

export function isInvalidLoginCredentialCode(code: string): boolean {
    return (
        code === "auth/invalid-credential" ||
        code === "INVALID_LOGIN_CREDENTIALS" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found"
    );
}

export function authErrorMessage(e: unknown, context: AuthUxContext = "login"): string {
    const anyErr = e as any;
    const code = normalizeAuthCode(anyErr?.code);

    // 입력/형식
    if (code === "auth/invalid-email") return "이메일 형식이 올바르지 않습니다.";
    if (code === "auth/missing-password") return "비밀번호를 입력해 주세요.";

    // 계정 상태/트래픽/네트워크
    if (code === "auth/user-disabled") return "이 계정은 비활성화되어 있습니다.";
    if (code === "auth/too-many-requests") return "시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    if (code === "auth/network-request-failed") return "네트워크 상태를 확인해 주세요.";

    // 프로젝트 설정/제한
    if (code === "auth/operation-not-allowed") {
        return "이메일/비밀번호 로그인이 비활성화되어 있습니다. 관리자에게 문의해 주세요.";
    }

    // 회원가입
    if (context === "signup") {
        if (code === "auth/email-already-in-use") return "이미 가입된 이메일입니다. 로그인해 주세요.";
        if (code === "auth/weak-password") return "비밀번호가 너무 약합니다. (6자 이상 권장)";
    }

    // 계정 연결
    if (context === "link") {
        if (code === "auth/weak-password") return "비밀번호가 너무 약합니다. (6자 이상 권장)";
        if (code === "auth/requires-recent-login") return "보안을 위해 다시 로그인한 뒤 시도해 주세요.";
        if (code === "auth/provider-already-linked") return "이미 연결된 로그인 방식입니다.";
        if (code === "auth/credential-already-in-use" || code === "auth/email-already-in-use") {
            return "이미 다른 계정에 사용 중인 이메일입니다.";
        }
    }

    // 비밀번호 재설정
    if (context === "passwordReset") {
        // Firebase는 일부 설정에서 "성공"처럼 처리하거나 에러 코드가 제한될 수 있음
        return "메일 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.";
    }

    // 로그인 실패 (SDK/설정에 따라 여기로 뭉쳐올 수 있음)
    if (isInvalidLoginCredentialCode(code)) {
        return "이메일 또는 비밀번호가 올바르지 않습니다.";
    }

    return "로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}

/**
 * 선택 UX: 입력 이메일로 로그인 방법을 사전 판별.
 * Email Enumeration Protection 등으로 실패할 수 있으므로 실패 시 null 반환.
 */
export async function safeFetchSignInMethodsForEmail(auth: Auth, email: string): Promise<string[] | null> {
    const trimmed = email.trim();
    if (!trimmed) return null;

    try {
        const methods = await fetchSignInMethodsForEmail(auth, trimmed);
        return Array.isArray(methods) ? methods : [];
    } catch {
        return null;
    }
}

export function isGoogleOnlyAccount(methods: string[] | null): boolean {
    if (!methods || methods.length === 0) return false;
    return methods.includes("google.com") && !methods.includes("password");
}
