import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';

export async function signInWithGoogle(): Promise<void> {
  try {
    console.log('🚀 FirebaseAuthentication.signInWithGoogle() 호출 시작');

    // 네이티브 Google 로그인 수행
    const result = await FirebaseAuthentication.signInWithGoogle();
    console.log('✅ 네이티브 Google 로그인 성공');

    // idToken 확인
    const idToken = result.credential?.idToken;
    if (!idToken) {
      throw new Error('No idToken received from native Google login');
    }

    console.log('🔄 Firebase 인증 진행 중...');

    // Firebase 자격 증명 생성 및 인증
    const credential = GoogleAuthProvider.credential(idToken);
    const auth = getAuth();
    const userCredential = await signInWithCredential(auth, credential);

    console.log('✅ Firebase 로그인 성공:', {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: userCredential.user.displayName
    });

    console.log('✅ signInWithGoogle() 함수 완료 - AuthContext가 상태 변경을 감지할 예정');
  } catch (error) {
    console.error('❌ Google 로그인 실패:', error);
    throw error; // LoginScreen에서 에러 처리를 위해 다시 throw
  }
}

// 기존 initGoogleAuth 함수는 더 이상 필요하지 않음 (Firebase Authentication 플러그인이 자동으로 처리)