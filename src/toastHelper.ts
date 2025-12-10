import { toast as originalToast } from "sonner";

/**
 * 화면 알림 표시 여부를 localStorage에서 가져오기
 */
export function isToastEnabled(): boolean {
    try {
        const enabled = localStorage.getItem("toastEnabled");
        // 기본값은 true (알림 켜짐)
        return enabled === null ? true : enabled === "true";
    } catch (error) {
        console.error("Failed to get toast setting:", error);
        return true; // 오류 시 기본값으로 알림 켜짐
    }
}

/**
 * 화면 알림 표시 여부를 localStorage에 저장하기
 */
export function setToastEnabled(enabled: boolean): void {
    try {
        localStorage.setItem("toastEnabled", enabled.toString());
    } catch (error) {
        console.error("Failed to save toast setting:", error);
    }
}

/**
 * 래핑된 toast 객체 - 모든 함수가 설정을 자동으로 확인
 * 기존 코드 수정 없이 사용 가능
 */
export const toast = {
    success: (message: string, options?: any) => {
        if (isToastEnabled()) {
            return originalToast.success(message, options);
        }
    },

    error: (message: string, options?: any) => {
        // 에러는 항상 표시 (중요!)
        return originalToast.error(message, options);
    },

    info: (message: string, options?: any) => {
        if (isToastEnabled()) {
            return originalToast.info(message, options);
        }
    },

    warning: (message: string, options?: any) => {
        // 경고는 항상 표시 (중요!)
        return originalToast.warning(message, options);
    },

    // 기타 메서드들도 원본 그대로 전달
    promise: originalToast.promise,
    loading: originalToast.loading,
    custom: originalToast.custom,
    message: originalToast.message,
    dismiss: originalToast.dismiss,
};

// 개별 함수들도 export (하위 호환성)
export function showSuccessToast(message: string): void {
    toast.success(message);
}

export function showErrorToast(message: string): void {
    toast.error(message);
}

export function showInfoToast(message: string): void {
    toast.info(message);
}

export function showWarningToast(message: string): void {
    toast.warning(message);
}