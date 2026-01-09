import { Capacitor } from "@capacitor/core";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
} from "firebase/auth";
import { auth } from "./firebase";
import { pushLoginDebug } from "./auth/loginDebug";

let initialized = false;

export async function initGoogleAuthOnce(): Promise<void> {
  if (initialized) return;
  initialized = true;

  pushLoginDebug("init.start", { platform: Capacitor.getPlatform() });

  if (Capacitor.getPlatform() === "web") {
    await GoogleAuth.initialize({
      clientId: "852428184810-eh4ojd3kj5ssvia7o54iteamk2sub31o.apps.googleusercontent.com",
      scopes: ["profile", "email"],
      grantOfflineAccess: true,
    });
  } else {
    // v6 계열에서 initialize clientId 우선순위 이슈가 있어 모바일은 initialize만 호출하는 편이 안전
    await GoogleAuth.initialize();
  }

  pushLoginDebug("init.done");
}


function redactToken(token: string) {
  if (token.length <= 12) return "***";
  return `${token.slice(0, 6)}...${token.slice(-6)}`;
}

export async function loginWithGoogle() {
  await initGoogleAuthOnce();

  pushLoginDebug("google.signIn.start");
  const googleUser = await GoogleAuth.signIn();

  const idToken = googleUser.authentication?.idToken;
  pushLoginDebug("google.signIn.done", {
    hasIdToken: !!idToken,
    idTokenPreview: idToken ? redactToken(idToken) : null,
  });
  if (!idToken) throw new Error("No Google idToken");

  const cred = GoogleAuthProvider.credential(idToken);
  pushLoginDebug("firebase.credential.created");

  try {
    pushLoginDebug("firebase.signIn.start", { type: "signInWithCredential" });
    const res = await signInWithCredential(auth, cred);
    pushLoginDebug("firebase.signIn.done", {
      uid: res.user.uid,
      isAnonymous: res.user.isAnonymous,
      providers: res.user.providerData.map((p) => p?.providerId),
    });
    return res;
  } catch (error: any) {
    pushLoginDebug("error", {
      where: "loginWithGoogle",
      code: error?.code,
      message: error?.message,
    });
    throw error;
  }
}

export async function logout() {
  await signOut(auth);
  try {
    await GoogleAuth.signOut();
  } catch {
    // best-effort
  }
}
