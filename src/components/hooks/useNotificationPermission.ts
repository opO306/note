import { useState, useEffect, useCallback } from "react";

export type PermissionState = "default" | "granted" | "denied";

interface UseNotificationPermissionOptions {
  /** 권한 요청 성공 콜백 */
  onGranted?: () => void;
  /** 권한 거부 콜백 */
  onDenied?: () => void;
  /** 에러 콜백 */
  onError?: (error: Error) => void;
}

/**
 * 푸시 알림 권한 관리 훅
 */
export function useNotificationPermission(
  options: UseNotificationPermissionOptions = {}
) {
  const { onGranted, onDenied, onError } = options;

  const [permission, setPermission] = useState<PermissionState>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  // Notification API 지원 확인
  useEffect(() => {
    const supported = "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission as PermissionState);
    }
  }, []);

  // 권한 상태 변경 감지
  useEffect(() => {
    if (!isSupported) return;

    const checkPermission = () => {
      const currentPermission = Notification.permission as PermissionState;
      if (currentPermission !== permission) {
        setPermission(currentPermission);

        if (currentPermission === "granted") {
          onGranted?.();
        } else if (currentPermission === "denied") {
          onDenied?.();
        }
      }
    };

    // 주기적으로 권한 상태 확인 (일부 브라우저에서 필요)
    const interval = setInterval(checkPermission, 1000);

    return () => clearInterval(interval);
  }, [isSupported, permission, onGranted, onDenied]);

  // 권한 요청
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      const error = new Error("Notification API not supported");
      onError?.(error);
      return "denied" as PermissionState;
    }

    if (permission === "granted") {
      return "granted" as PermissionState;
    }

    if (permission === "denied") {
      return "denied" as PermissionState;
    }

    setIsRequesting(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);

      if (result === "granted") {
        onGranted?.();
      } else if (result === "denied") {
        onDenied?.();
      }

      return result as PermissionState;
    } catch (error) {
      const err = error as Error;
      onError?.(err);
      return "denied" as PermissionState;
    } finally {
      setIsRequesting(false);
    }
  }, [isSupported, permission, onGranted, onDenied, onError]);

  return {
    permission,
    isSupported,
    isRequesting,
    isGranted: permission === "granted",
    isDenied: permission === "denied",
    isDefault: permission === "default",
    requestPermission,
  };
}

/**
 * Service Worker 등록 (PWA 푸시 알림용)
 */
export function useServiceWorker() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const supported = "serviceWorker" in navigator;
    setIsSupported(supported);

    if (!supported) return;

    // 기존 등록 확인
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) {
        setRegistration(reg);
        setIsRegistered(true);
      }
    });
  }, []);

  const register = useCallback(async (scriptUrl: string = "/sw.js") => {
    if (!isSupported) {
      const error = new Error("Service Worker not supported");
      setError(error);
      return null;
    }

    try {
      const reg = await navigator.serviceWorker.register(scriptUrl);
      setRegistration(reg);
      setIsRegistered(true);
      return reg;
    } catch (err) {
      const error = err as Error;
      setError(error);
      return null;
    }
  }, [isSupported]);

  const unregister = useCallback(async () => {
    if (!registration) return false;

    try {
      const success = await registration.unregister();
      if (success) {
        setRegistration(null);
        setIsRegistered(false);
      }
      return success;
    } catch (err) {
      const error = err as Error;
      setError(error);
      return false;
    }
  }, [registration]);

  return {
    registration,
    isSupported,
    isRegistered,
    error,
    register,
    unregister,
  };
}

/**
 * 푸시 구독 관리 (Web Push)
 */
export function usePushSubscription(registration: ServiceWorkerRegistration | null) {
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if (!registration) return;

    // 기존 구독 확인
    registration.pushManager.getSubscription().then((sub) => {
      setSubscription(sub);
      setIsSubscribed(!!sub);
    });
  }, [registration]);

  const subscribe = useCallback(async (vapidPublicKey: string) => {
    if (!registration) {
      throw new Error("Service Worker not registered");
    }

    setIsSubscribing(true);

    try {
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
      });

      setSubscription(sub);
      setIsSubscribed(true);
      return sub;
    } catch (error) {
      console.error("Push subscription failed:", error);
      throw error;
    } finally {
      setIsSubscribing(false);
    }
  }, [registration]);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return false;

    try {
      const success = await subscription.unsubscribe();
      if (success) {
        setSubscription(null);
        setIsSubscribed(false);
      }
      return success;
    } catch (error) {
      console.error("Push unsubscribe failed:", error);
      return false;
    }
  }, [subscription]);

  return {
    subscription,
    isSubscribed,
    isSubscribing,
    subscribe,
    unsubscribe,
  };
}

/**
 * VAPID 키 변환 유틸리티
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
