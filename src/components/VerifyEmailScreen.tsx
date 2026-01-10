import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { App as CapacitorApp } from "@capacitor/app";

import { sendEmailVerification } from "firebase/auth";

import { auth } from "@/firebase";
import { toast } from "@/toastHelper";
import { authErrorMessage } from "@/auth/authUx";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface VerifyEmailScreenProps {
    onVerified: () => void;
    onLogout: () => void;
}

export function VerifyEmailScreen({ onVerified, onLogout }: VerifyEmailScreenProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const isUnmountedRef = useRef(false);

    const email = useMemo(() => auth.currentUser?.email ?? "", []);

    const checkVerifiedOnce = useCallback(async () => {
        const user = auth.currentUser;
        if (!user) return;

        setIsChecking(true);
        try {
            await user.reload();
            if (user.emailVerified) {
                onVerified();
            }
        } finally {
            if (!isUnmountedRef.current) setIsChecking(false);
        }
    }, [onVerified]);

    const handleResend = useCallback(async () => {
        const user = auth.currentUser;
        if (!user) {
            toast.error("로그인이 필요합니다.");
            return;
        }

        setIsSubmitting(true);
        try {
            await sendEmailVerification(user);
            toast.success("인증 메일을 다시 보냈습니다. 메일함을 확인해 주세요.");
        } catch (e) {
            toast.error(authErrorMessage(e, "login"));
        } finally {
            if (!isUnmountedRef.current) setIsSubmitting(false);
        }
    }, []);

    useEffect(() => {
        isUnmountedRef.current = false;
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // 🔴 핵심: 이메일 인증은 외부에서 발생하므로 reload 폴링이 가장 확실함
    useEffect(() => {
        if (!auth.currentUser) return;

        // ✅ 폴링 간격을 5초로 늘려 배터리/데이터 소모 감소
        const interval = window.setInterval(() => {
            void checkVerifiedOnce();
        }, 5000);

        return () => window.clearInterval(interval);
    }, [checkVerifiedOnce]);

    // 앱으로 복귀(포그라운드) 시 즉시 1회 체크
    useEffect(() => {
        let handle: { remove: () => void } | null = null;

        (async () => {
            try {
                handle = await CapacitorApp.addListener("appStateChange", ({ isActive }) => {
                    if (isActive) void checkVerifiedOnce();
                });
            } catch {
                // 웹 환경 등에서는 무시
            }
        })();

        return () => {
            handle?.remove();
        };
    }, [checkVerifiedOnce]);

    if (!auth.currentUser) {
        return (
            <div className="w-full h-full flex items-center justify-center p-6 bg-background text-foreground">
                <Card className="w-full max-w-sm border-border/60 shadow-xl bg-background/95">
                    <CardContent className="pt-6 pb-7 px-4 sm:px-6 space-y-4">
                        <h1 className="text-xl font-semibold">이메일 인증</h1>
                        <p className="text-sm text-muted-foreground">로그인 정보가 없습니다. 다시 로그인해 주세요.</p>
                        <Button className="w-full" onClick={onLogout}>로그인으로</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex items-center justify-center p-6 pt-safe pb-safe bg-background text-foreground">
            <Card className="w-full max-w-sm border-border/60 shadow-xl bg-background/95">
                <CardContent className="pt-6 pb-7 px-4 sm:px-6 space-y-5">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold">이메일 인증이 필요합니다</h1>
                        <p className="text-sm text-muted-foreground">
                            {email ? (
                                <> <span className="font-medium text-foreground">{email}</span> 로 인증 메일을 보냈습니다.</>
                            ) : (
                                <>메일함에서 인증 링크를 클릭해 주세요.</>
                            )}
                        </p>
                        <p className="text-xs text-muted-foreground">인증 후 이 화면으로 돌아오면 자동으로 다음 단계로 이동합니다.</p>
                    </div>

                    <div className="space-y-2">
                        <Button className="w-full" onClick={() => void checkVerifiedOnce()} disabled={isChecking || isSubmitting}>
                            {isChecking ? "확인 중..." : "이미 인증했어요"}
                        </Button>
                        <Button
                            className="w-full"
                            variant="secondary"
                            onClick={() => void handleResend()}
                            disabled={isChecking || isSubmitting}
                        >
                            {isSubmitting ? "전송 중..." : "인증 메일 다시 보내기"}
                        </Button>
                        <Button className="w-full" variant="ghost" onClick={onLogout} disabled={isChecking || isSubmitting}>
                            로그아웃
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
