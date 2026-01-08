// src/toastHelper.ts

import { toast as originalToast, type ExternalToast } from "sonner";

// 토스트 중복 방지용 변수
let lastToastTime = 0;
let lastToastMessage = "";

/**
 * 화면 알림 표시 여부를 localStorage에서 가져오기
 */
export function isToastEnabled(): boolean {
    try {
        if (typeof window === "undefined") return true;
        const enabled = localStorage.getItem("toastEnabled");
        return enabled === null ? true : enabled === "true";
    } catch {
        return true;
    }
}

export function setToastEnabled(enabled: boolean): void {
    try {
        if (typeof window === "undefined") return;
        localStorage.setItem("toastEnabled", enabled.toString());
    } catch (error) {
        console.error("Failed to save toast setting:", error);
    }
}

/**
 * 래핑된 toast 객체
 * ✨ [수정] 모든 메서드를 함수로 감싸서(Lazy), React 초기화 전에 호출되는 것을 방지함
 */
// 토스트 중복 방지 헬퍼 함수
function shouldShowToast(message: string | React.ReactNode): boolean {
    const now = Date.now();
    const messageStr = typeof message === 'string' ? message : 'custom-message';

    // 같은 메시지라면 2초 쿨다운 적용
    if (messageStr === lastToastMessage && now - lastToastTime < 2000) {
        return false;
    }

    lastToastTime = now;
    lastToastMessage = messageStr;
    return true;
}

export const toast = {
    success: (message: string | React.ReactNode, options?: ExternalToast) => {
        if (isToastEnabled() && shouldShowToast(message)) {
            return originalToast.success(message, options);
        }
        return undefined;
    },

    error: (message: string | React.ReactNode, options?: ExternalToast) => {
        // 에러는 설정 무시하고 항상 표시, 중복 방지 적용
        if (shouldShowToast(message)) {
            return originalToast.error(message, options);
        }
        return undefined;
    },

    info: (message: string | React.ReactNode, options?: ExternalToast) => {
        if (isToastEnabled() && shouldShowToast(message)) {
            return originalToast.info(message, options);
        }
        return undefined;
    },

    warning: (message: string | React.ReactNode, options?: ExternalToast) => {
        // 경고는 설정 무시하고 항상 표시, 중복 방지 적용
        if (shouldShowToast(message)) {
            return originalToast.warning(message, options);
        }
        return undefined;
    },

    message: (message: string | React.ReactNode, options?: ExternalToast) => {
        if (isToastEnabled() && shouldShowToast(message)) {
            return originalToast.message(message, options);
        }
        return undefined;
    },

    // ✨ [수정] 직접 할당 대신 래퍼 함수 사용 (초기화 에러 방지 핵심)
    promise: <T>(promise: Promise<T> | (() => Promise<T>), data?: any) => {
        return originalToast.promise(promise, data);
    },

    loading: (message: string | React.ReactNode, options?: ExternalToast) => {
        return originalToast.loading(message, options);
    },

    custom: (jsx: (id: number | string) => React.ReactNode, options?: ExternalToast) => {
        if (isToastEnabled()) {
            return originalToast.custom(jsx as any, options);
        }
        return undefined;
    },

    dismiss: (id?: number | string) => {
        return originalToast.dismiss(id);
    },
};

// 하위 호환성 함수들
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