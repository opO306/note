import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { loadTokenData, authenticateWithCachedToken, saveTokenData, isTokenValid } from './tokenStorage';

// Firebase에서 완전한 로그아웃을 위한 헬퍼 함수
export async function forceSignOut(): Promise<void> {
  try {
    // Firebase Authentication에서 로그아웃
    await FirebaseAuthentication.signOut();
    console.log('✅ Firebase Authentication에서 로그아웃 완료');
  } catch (error) {
    console.warn('⚠️ Firebase Authentication 로그아웃 실패:', error);
  }
}

export async function signInWithGoogle(): Promise<void> {
  try {
    console.log('🚀 Google 로그인 시도 시작');

    // ✅ 1. 캐시된 토큰 우선 확인
    const cachedToken = loadTokenData();
    if (cachedToken && isTokenValid(cachedToken)) {
      console.log('🔄 캐시된 토큰 발견, 유효성 확인 중...');
      const cachedAuthSuccess = await authenticateWithCachedToken(cachedToken);
      if (cachedAuthSuccess) {
        console.log('✅ 캐시된 토큰으로 로그인 성공 - 불필요한 재로그인 방지');
        return;
      }
      console.log('⏰ 캐시된 토큰이 유효하지 않음, 새로운 로그인 진행');
    } else {
      console.log('📝 캐시된 토큰 없음 또는 만료됨, 새로운 로그인 진행');
    }

    // ✅ 2. 새로운 Google 로그인 수행
    console.log('🚀 FirebaseAuthentication.signInWithGoogle() 호출 시작');

    // 계정 선택창 강제 표시를 위한 customParameters 설정
    // Firebase의 기본 제한(최대 5개 계정 표시)을 우회하기 위해 prompt: select_account 사용
    const result = await FirebaseAuthentication.signInWithGoogle({
      customParameters: [
        { key: 'prompt', value: 'select_account' }
      ]
    });
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

    // ✅ 3. 새로운 토큰 정보 캐싱
    try {
      const expiresAt = Date.now() + (60 * 60 * 1000); // 1시간 후 만료로 설정
      const tokenData = {
        idToken: '', // Firebase가 내부적으로 관리하므로 빈 값
        refreshToken: '',
        expiresAt,
        userId: userCredential.user.uid,
        email: userCredential.user.email || undefined,
      };
      await saveTokenData(tokenData);
      console.log('💾 새로운 토큰 정보 캐싱됨');
    } catch (cacheError) {
      console.warn('⚠️ 토큰 캐싱 실패 (기능에는 영향 없음):', cacheError);
    }

    console.log('✅ signInWithGoogle() 함수 완료 - AuthContext가 상태 변경을 감지할 예정');
  } catch (error) {
    console.error('❌ Google 로그인 실패:', error);
    throw error; // LoginScreen에서 에러 처리를 위해 다시 throw
  }
}

// 기존 initGoogleAuth 함수는 더 이상 필요하지 않음 (Firebase Authentication 플러그인이 자동으로 처리)