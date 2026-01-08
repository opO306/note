import { Capacitor } from "@capacitor/core";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";

let initialized = false;

export async function initGoogleAuthOnce(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (initialized) return;

  GoogleAuth.initialize({
    clientId: import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID, // ✅ Web Client ID ONLY
    scopes: ["profile", "email"],
    grantOfflineAccess: false,
  });

  initialized = true;
}

import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from "firebase/auth";
import { auth } from "./firebase";

export async function signInWithGoogle(): Promise<void> {
  // 🌐 WEB
  if (!Capacitor.isNativePlatform()) {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(auth, provider);
    return;
  }

  // 🤖 ANDROID (Native)
  const googleUser = await GoogleAuth.signIn();

  const idToken = googleUser?.authentication?.idToken;
  if (!idToken) {
    throw new Error("GOOGLE_ID_TOKEN_NULL");
  }

  const credential = GoogleAuthProvider.credential(idToken);
  await signInWithCredential(auth, credential);
}