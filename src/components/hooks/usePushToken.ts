import { useEffect, useState, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications, Token, ActionPerformed, PushNotificationSchema } from "@capacitor/push-notifications";
import { doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { toast } from "@/toastHelper";

// 서버(Functions)에서 기대하는 설정 키 매핑
// notificationService.ts 참조:
// reply -> notifyOnReply
// mention -> notifyOnMention
// follow -> notifyOnFollow
// guide_selected -> notifyOnGuide
// daily_digest -> notifyOnDailyDigest
// marketing -> notifyOnMarketing

export interface PushSettings {
    notifyOnReply: boolean;
    notifyOnMention: boolean;
    notifyOnFollow: boolean;
    notifyOnGuide: boolean;
    notifyOnDailyDigest: boolean;
    notifyOnMarketing: boolean;
}

const DEFAULT_PUSH_SETTINGS: PushSettings = {
    notifyOnReply: true,
    notifyOnMention: true,
    notifyOnFollow: true,
    notifyOnGuide: true,
    notifyOnDailyDigest: true,
    notifyOnMarketing: false,
};

export function usePushToken() {
    const [fcmToken, setFcmToken] = useState<string | null>(null);
    const [isPermissionGranted, setIsPermissionGranted] = useState(false);
    const [settings, setSettings] = useState<PushSettings>(DEFAULT_PUSH_SETTINGS);
    const [isSettingsLoading, setIsSettingsLoading] = useState(true);

    // 리스너가 중복 등록되지 않도록 ref 사용
    const listenersRegistered = useRef(false);

    // 3. Firestore에 토큰 업데이트
    const updateTokenToFirestore = useCallback(async (uid: string, token: string) => {
        try {
            const userRef = doc(db, "users", uid);
            await setDoc(userRef, {
                fcmToken: token,
                updatedAt: new Date() // 서버 타임스탬프 대신 클라이언트 시간 사용 (간단히)
            }, { merge: true });
            console.log("FCM Token updated to Firestore");
        } catch (e) {
            console.error("Failed to update token to Firestore", e);
        }
    }, []);

    // 2. 리스너 등록 (한 번만 실행)
    const registerPushListeners = useCallback(async () => {
        if (listenersRegistered.current) return;

        try {
            await PushNotifications.addListener('registration', async (token: Token) => {
                console.log('Push registration success, token: ' + token.value);
                setFcmToken(token.value);

                // Firestore에 토큰 저장
                const user = auth.currentUser;
                if (user) {
                    await updateTokenToFirestore(user.uid, token.value);
                }
            });

            await PushNotifications.addListener('registrationError', (error: any) => {
                console.error('Error on registration: ' + JSON.stringify(error));
            });

            await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
                console.log('Push received: ' + JSON.stringify(notification));
                // 앱이 켜져 있을 때 알림이 오면 토스트 표시
                const title = notification.title || "알림";
                const body = notification.body || "";
                toast.success(`${title}: ${body}`);
            });

            await PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
                console.log('Push action performed: ' + JSON.stringify(notification));
                const data = notification.notification.data;
                if (data?.link) {
                    // 딥링크 이동 처리 (React Router 등으로 이동)
                    // 현재는 window.location으로 간단히 처리하거나, 전역 네비게이션 로직 필요
                    // 예: window.location.href = data.link; // SPA에서는 리로드 되므로 주의
                    // MainScreen 등에서 라우팅 처리 필요
                    // 임시로 해시 라우팅 사용 시:
                    if (data.link.startsWith('/')) {
                        window.location.hash = data.link;
                    }
                }
            });

            listenersRegistered.current = true;
        } catch (e) {
            console.error("Failed to register listeners", e);
        }
    }, [updateTokenToFirestore]);

    // 1. 초기화 및 권한 확인
    useEffect(() => {
        // 네이티브 플랫폼이 아니면 실행하지 않음 (웹에서는 @capacitor/push-notifications 작동 안함)
        if (!Capacitor.isNativePlatform()) {
            setIsSettingsLoading(false);
            return;
        }

        // 권한 확인 및 리스너 등록
        const initPush = async () => {
            try {
                const permStatus = await PushNotifications.checkPermissions();

                if (permStatus.receive === 'granted') {
                    setIsPermissionGranted(true);
                    await registerPushListeners();
                    // ✅ 리스너 등록 후 푸시 등록 호출
                    await PushNotifications.register();
                } else if (permStatus.receive === 'prompt') {
                    // ✅ 권한이 아직 요청되지 않은 경우 자동으로 요청
                    try {
                        const result = await PushNotifications.requestPermissions();
                        if (result.receive === 'granted') {
                            setIsPermissionGranted(true);
                            await registerPushListeners();
                            await PushNotifications.register();
                        }
                    } catch (e) {
                        console.error("Permission request error:", e);
                    }
                }
                // 'denied' 상태는 사용자가 거부한 것이므로 요청하지 않음
            } catch (e) {
                console.error("Push init error:", e);
            }
        };

        initPush();

        // 유저 설정 로드
        const loadSettings = async (uid: string) => {
            try {
                const userDoc = await getDoc(doc(db, "users", uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    const serverSettings = data.notificationSettings || {};
                    setSettings(prev => ({ ...prev, ...serverSettings }));
                }
            } catch (e) {
                console.error("Failed to load settings:", e);
            } finally {
                setIsSettingsLoading(false);
            }
        };

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                loadSettings(user.uid);
                // 이미 권한이 있다면 토큰 갱신 시도
                if (isPermissionGranted) {
                    try {
                        await PushNotifications.register();
                    } catch (e) {
                        console.error("Push register error:", e);
                    }
                }
            } else {
                setFcmToken(null);
                setSettings(DEFAULT_PUSH_SETTINGS);
                setIsSettingsLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, [isPermissionGranted, registerPushListeners]);

    // 4. 권한 요청 함수 (UI에서 호출)
    const requestPermission = useCallback(async () => {
        if (!Capacitor.isNativePlatform()) return false;

        try {
            const result = await PushNotifications.requestPermissions();
            if (result.receive === 'granted') {
                setIsPermissionGranted(true);
                registerPushListeners();
                await PushNotifications.register(); // 토큰 발급 요청
                return true;
            }
        } catch (e) {
            console.error("Permission request failed:", e);
        }
        return false;
    }, [registerPushListeners]);

    // 5. 설정 변경 함수
    const updateSetting = useCallback(async (key: keyof PushSettings, value: boolean) => {
        // 로컬 상태 즉시 업데이트 (낙관적 UI)
        setSettings(prev => ({ ...prev, [key]: value }));

        const user = auth.currentUser;
        if (!user) return;

        try {
            const userRef = doc(db, "users", user.uid);
            // 중첩 필드 업데이트: notificationSettings.notifyOnReply 형태
            await updateDoc(userRef, {
                [`notificationSettings.${key}`]: value
            });
        } catch (e) {
            console.error("Failed to update setting:", e);
            // 실패 시 롤백 로직이 필요할 수 있음
            toast.error("설정 저장에 실패했습니다.");
            setSettings(prev => ({ ...prev, [key]: !value })); // 롤백
        }
    }, []);

    return {
        fcmToken,
        isPermissionGranted,
        requestPermission,
        settings,
        updateSetting,
        isSettingsLoading
    };
}

