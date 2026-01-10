import { auth } from "@/firebase";
import { EmailAuthProvider, linkWithCredential, type User } from "firebase/auth";

export function getProviderIds(user: User | null | undefined): string[] {
    return (user?.providerData ?? [])
        .map((p) => p?.providerId)
        .filter((p): p is string => typeof p === "string" && p.length > 0);
}

export function userHasProvider(user: User | null | undefined, providerId: string): boolean {
    return getProviderIds(user).includes(providerId);
}

export async function linkPasswordToCurrentUser(newPassword: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
        const err: any = new Error("NO_SIGNED_IN_USER");
        err.code = "NO_SIGNED_IN_USER";
        throw err;
    }
    if (!user.email) {
        const err: any = new Error("NO_EMAIL_ON_ACCOUNT");
        err.code = "NO_EMAIL_ON_ACCOUNT";
        throw err;
    }

    // 이메일은 현재 계정 이메일로 고정
    const credential = EmailAuthProvider.credential(user.email, newPassword);
    await linkWithCredential(user, credential);
}
