import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase";

export async function logoutEverywhere() {
    // 네이티브(플러그인) 세션 정리: 웹에서는 실패할 수 있으니 무시
    try {
        await FirebaseAuthentication.signOut();
    } catch {
        // ignore
    }

    // 웹 SDK 세션 정리
    try {
        await signOut(auth);
    } catch {
        // ignore
    }
}
