import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { auth } from "@/firebase";
import { toast } from "@/toastHelper";
import { authErrorMessage } from "@/auth/authUx";
import { linkPasswordToCurrentUser, userHasProvider } from "@/auth/accountLinking";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LinkPasswordDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const user = auth.currentUser;
    const email = user?.email ?? "";

    const alreadyLinked = useMemo(() => userHasProvider(user, "password"), [user]);
    const [newPassword, setNewPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!open) {
            setNewPassword("");
            setConfirm("");
            setIsSubmitting(false);
        }
    }, [open]);

    const canSubmit = useMemo(() => {
        if (!email) return false;
        if (alreadyLinked) return false;
        if (!newPassword || !confirm) return false;
        if (newPassword !== confirm) return false;
        return !isSubmitting;
    }, [email, alreadyLinked, newPassword, confirm, isSubmitting]);

    const handleSubmit = useCallback(async () => {
        if (!email) {
            toast.error("계정 이메일 정보를 확인할 수 없습니다.");
            return;
        }
        if (alreadyLinked) {
            toast.info("이미 이메일/비밀번호 로그인이 연결되어 있습니다.");
            return;
        }
        if (!newPassword) {
            toast.error("비밀번호를 입력해 주세요.");
            return;
        }
        if (newPassword !== confirm) {
            toast.error("비밀번호 확인이 일치하지 않습니다.");
            return;
        }

        setIsSubmitting(true);
        try {
            await linkPasswordToCurrentUser(newPassword);
            toast.success("이메일/비밀번호 로그인이 추가되었습니다.");
            onOpenChange(false);
        } catch (e: any) {
            const code = String(e?.code ?? "");
            if (code === "NO_SIGNED_IN_USER") toast.error("로그인이 필요합니다.");
            else if (code === "NO_EMAIL_ON_ACCOUNT") toast.error("계정 이메일 정보를 확인할 수 없습니다.");
            else toast.error(authErrorMessage(e, "link"));
        } finally {
            setIsSubmitting(false);
        }
    }, [email, alreadyLinked, newPassword, confirm, onOpenChange]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>이메일/비밀번호 로그인 추가</DialogTitle>
                    <DialogDescription>
                        현재 계정 이메일은 변경할 수 없습니다. 비밀번호만 설정하면 이메일 로그인도 사용할 수 있습니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label>이메일 (고정)</Label>
                        <Input value={email || ""} disabled />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="newPassword">새 비밀번호</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={isSubmitting || alreadyLinked}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            disabled={isSubmitting || alreadyLinked}
                        />
                    </div>

                    {alreadyLinked && (
                        <p className="text-sm text-muted-foreground">이미 이메일/비밀번호 로그인이 연결되어 있습니다.</p>
                    )}
                </div>

                <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                        취소
                    </Button>
                    <Button onClick={handleSubmit} disabled={!canSubmit}>
                        {isSubmitting ? (
                            <span className="inline-flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                처리 중...
                            </span>
                        ) : (
                            "추가"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
