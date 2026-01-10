import { useCallback, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { auth } from "@/firebase";
import { toast } from "@/toastHelper";
import { authErrorMessage } from "@/auth/authUx";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmailSignupScreenProps {
    onBack: () => void;
}

export function EmailSignupScreen({ onBack }: EmailSignupScreenProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canSubmit = useMemo(() => {
        if (isSubmitting) return false;
        if (!email.trim()) return false;
        if (!password) return false;
        if (password !== confirm) return false;
        return true;
    }, [email, password, confirm, isSubmitting]);

    const handleSignup = useCallback(async () => {
        const trimmedEmail = email.trim();

        if (!trimmedEmail) {
            toast.error("이메일을 입력해 주세요.");
            return;
        }
        if (!password) {
            toast.error("비밀번호를 입력해 주세요.");
            return;
        }
        if (password !== confirm) {
            toast.error("비밀번호 확인이 일치하지 않습니다.");
            return;
        }

        setIsSubmitting(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
            await sendEmailVerification(userCredential.user);
            toast.success("가입이 완료되었습니다. 이메일 인증 메일을 확인해 주세요.");
        } catch (e) {
            toast.error(authErrorMessage(e, "signup"));
        } finally {
            setIsSubmitting(false);
        }
    }, [email, password, confirm]);

    return (
        <div className="w-full h-full bg-background text-foreground overflow-y-auto">
            <div className="p-4">
                <Button variant="ghost" onClick={onBack} className="px-0">
                    ← 뒤로
                </Button>
            </div>

            <div className="px-4 pb-8 flex justify-center">
                <Card className="w-full max-w-sm border-border/60 shadow-xl bg-background/95">
                    <CardContent className="pt-6 pb-7 px-4 sm:px-6 space-y-6">
                        <div className="space-y-1">
                            <h1 className="text-xl font-semibold">이메일로 회원가입</h1>
                            <p className="text-sm text-muted-foreground">이메일과 비밀번호로 계정을 생성합니다.</p>
                        </div>

                        <form
                            className="space-y-6"
                            onSubmit={(e) => {
                                e.preventDefault();
                                void handleSignup();
                            }}
                        >
                            <div className="space-y-2">
                                <Label htmlFor="email">이메일</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password">비밀번호</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm">비밀번호 확인</Label>
                                <Input
                                    id="confirm"
                                    type="password"
                                    autoComplete="new-password"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    disabled={isSubmitting}
                                />
                            </div>

                            <Button className="w-full" type="submit" disabled={!canSubmit}>
                                {isSubmitting ? (
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        처리 중...
                                    </span>
                                ) : (
                                    "가입하기"
                                )}
                            </Button>
                        </form>

                        <p className="text-xs text-muted-foreground">
                            이미 가입된 이메일이면 로그인으로 안내됩니다.
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
