import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';

export function initGoogleAuth() {
  GoogleAuth.initialize({
    clientId: '852428184810-eh4ojd3kj5ssvia7o54iteamk2sub31o.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    grantOfflineAccess: true, // Capacitor 설정과 일치하도록 true로 변경
    forceWebView: true, // 🔥 핵심: 앱 죽지 않게 함
  } as any);
}

export async function signInWithGoogle(): Promise<void> {
  try {
    console.log('🚀 GoogleAuth.signIn() 호출 시작');
    const googleUser = await GoogleAuth.signIn();
    console.log('✅ Google 로그인 성공:', {
      id: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      hasIdToken: !!googleUser.authentication.idToken,
      hasAccessToken: !!googleUser.authentication.accessToken
    });

    const idToken = googleUser.authentication.idToken;
    const accessToken = googleUser.authentication.accessToken;

    console.log('🔄 Firebase 인증 진행 중...');
    const credential = GoogleAuthProvider.credential(idToken, accessToken);

    const auth = getAuth();
    const userCredential = await signInWithCredential(auth, credential);
    console.log('✅ Firebase 로그인 성공:', {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: userCredential.user.displayName
    });

    // 👉 로그인 성공 후 다음 화면으로 이동 등 처리
    // 예: router.push("/nickname")
    console.log('✅ signInWithGoogle() 함수 완료 - AuthContext가 상태 변경을 감지할 예정');
  } catch (error) {
    console.error('❌ 로그인 실패:', error);
    // 에러 알림 띄우기 등 처리
  }
}