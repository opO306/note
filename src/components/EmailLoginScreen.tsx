import { useCallback, useMemo, useState } from "react";

import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

import { Loader2 } from "lucide-react";

import {

    GoogleAuthProvider,

    signInWithCredential,

    signInWithEmailAndPassword,

    sendPasswordResetEmail,

    sendEmailVerification,

    User,

} from "firebase/auth";

import { auth, ensureUserDocument } from "@/firebase";

import { toast } from "@/toastHelper";

import { authErrorMessage, isGoogleOnlyAccount, safeFetchSignInMethodsForEmail, isInvalidLoginCredentialCode } from "@/auth/authUx";



import { Button } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";



interface EmailLoginScreenProps {

    onBack: () => void;

    onShowSignup: () => void;

}



export function EmailLoginScreen({ onShowSignup }: EmailLoginScreenProps) {

    const [email, setEmail] = useState("");

    const [password, setPassword] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);



    const canSubmit = useMemo(() => email.trim().length > 0 && password.length > 0 && !isSubmitting, [email, password, isSubmitting]);



    const handleGoogleLogin = useCallback(async () => {

        if (isSubmitting) return;

        setIsSubmitting(true);

        try {

            const result = await FirebaseAuthentication.signInWithGoogle({

                // Android에서 Credential Manager를 우회 (플러그인 7.2.0+)

                useCredentialManager: false,

            });

            const idToken = result.credential?.idToken ?? "";

            const accessToken = result.credential?.accessToken ?? "";



            if (!idToken && !accessToken) {

                toast.error("로그인에 실패했습니다. 다시 시도해주세요.");

                return;

            }



            const credential = GoogleAuthProvider.credential(idToken || undefined, accessToken || undefined);

            const userCredential = await signInWithCredential(auth, credential);

            await ensureUserDocument(userCredential.user);

        } catch {

            toast.error("로그인에 실패했습니다. 다시 시도해주세요.");

        } finally {

            setIsSubmitting(false);

        }

    }, [isSubmitting]);



    const handleEmailLogin = useCallback(async () => {

        const trimmedEmail = email.trim();



        if (!trimmedEmail) {

            toast.error("이메일을 입력해 주세요.");

            return;

        }

        if (!password) {

            toast.error("비밀번호를 입력해 주세요.");

            return;

        }



        setIsSubmitting(true);

        try {

            const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, password);

            await ensureUserDocument(userCredential.user);
            await userCredential.user.reload();
            if (!userCredential.user.emailVerified) {
                toast.info("이메일 인증이 필요합니다. 메일을 확인해 주세요.", {
                    action: {
                        label: "인증 메일 재전송",
                        onClick: () => void handleSendVerificationEmail(userCredential.user),
                    },
                });
                return;
            }

        } catch (e: any) {

            const code = String(e?.code ?? "");

            toast.error(authErrorMessage(e, "login"));



            // 안(B) 선택 적용: 판별은 best-effort, 실패해도 UX는 안 깨지게

            if (isInvalidLoginCredentialCode(code)) {

                const methods = await safeFetchSignInMethodsForEmail(auth, trimmedEmail);

                if (isGoogleOnlyAccount(methods)) {

                    toast.info("이 이메일은 Google로 가입되어 있습니다. Google로 로그인해 주세요.");

                }

            }

        } finally {

            setIsSubmitting(false);

        }

    }, [email, password]);



    const handlePasswordReset = useCallback(async () => {

        const trimmedEmail = email.trim();

        if (!trimmedEmail) {

            toast.error("이메일을 입력해 주세요.");

            return;

        }



        setIsSubmitting(true);

        try {

            await sendPasswordResetEmail(auth, trimmedEmail);

            toast.success("비밀번호 재설정 메일을 전송했습니다.");

        } catch (e) {

            toast.error(authErrorMessage(e, "passwordReset"));

        }

        finally {

            setIsSubmitting(false);

        }

    }, [email]);

    const handleSendVerificationEmail = useCallback(async (user: User) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await sendEmailVerification(user);
            toast.success("인증 메일을 재전송했습니다. 메일함을 확인해 주세요.");
        } catch (e) {
            toast.error(authErrorMessage(e, "login"));
        } finally {
            setIsSubmitting(false);
        }
    }, [isSubmitting]);



    return (

        <div className="relative w-full h-full flex flex-col items-center justify-center p-6 pt-safe pb-safe overflow-hidden bg-background text-foreground transition-colors duration-300">

            <div className="relative z-10 w-full max-w-sm animate-in fade-in zoom-in duration-500">

                <Card className="w-full border-border/60 shadow-xl bg-background/95">

                    <CardContent className="pt-6 pb-7 px-4 sm:px-6 space-y-6">

                        <div className="space-y-1">

                            <h1 className="text-xl font-semibold">이메일로 로그인</h1>

                        </div>



                        <form

                            className="space-y-6"

                            onSubmit={(e) => {

                                e.preventDefault();

                                void handleEmailLogin();

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

                                    autoComplete="current-password"

                                    value={password}

                                    onChange={(e) => setPassword(e.target.value)}

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

                                    "로그인"

                                )}

                            </Button>

                        </form>



                        <div className="grid grid-cols-2 gap-2">

                            <Button variant="outline" onClick={handlePasswordReset} disabled={isSubmitting}>

                                비밀번호 재설정

                            </Button>

                            <Button variant="outline" onClick={handleGoogleLogin} disabled={isSubmitting}>

                                Google로 로그인

                            </Button>

                        </div>



                        <Button variant="outline" className="w-full" onClick={onShowSignup} disabled={isSubmitting}>

                            이메일로 회원가입

                        </Button>



                    </CardContent>

                </Card>

            </div>

        </div>

    );

}

