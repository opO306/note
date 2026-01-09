
export interface CachedTokenData {
  idToken: string;
  refreshToken?: string;
  expiresAt: number; // 타임스탬프 (ms)
  userId: string;
  email?: string | null;
}

const TOKEN_STORAGE_KEY = 'biyunote-cached-tokens';
const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000; // 5분 버퍼

/**
 * 토큰 데이터를 안전하게 로컬 스토리지에 저장
 */
export async function saveTokenData(tokenData: CachedTokenData): Promise<void> {
  try {
    // 민감한 데이터 암호화 고려 (현재는 JSON stringify 사용)
    const encryptedData = JSON.stringify(tokenData);
    localStorage.setItem(TOKEN_STORAGE_KEY, encryptedData);
    console.log('✅ 토큰 데이터 저장됨');
  } catch (error) {
    console.error('❌ 토큰 저장 실패:', error);
    throw error;
  }
}

/**
 * 로컬 스토리지에서 토큰 데이터 로드
 */
export function loadTokenData(): CachedTokenData | null {
  try {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) return null;

    const tokenData: CachedTokenData = JSON.parse(stored);
    return tokenData;
  } catch (error) {
    console.error('❌ 토큰 로드 실패:', error);
    clearTokenData(); // 손상된 데이터 제거
    return null;
  }
}

/**
 * 저장된 토큰 데이터 제거
 */
export function clearTokenData(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    console.log('🗑️ 토큰 데이터 제거됨');
  } catch (error) {
    console.error('❌ 토큰 제거 실패:', error);
  }
}

/**
 * 토큰이 유효한지 확인 (만료 시간 체크)
 */
export function isTokenValid(tokenData: CachedTokenData): boolean {
  const now = Date.now();
  const expiresAt = tokenData.expiresAt;

  // 버퍼 시간을 고려한 만료 체크
  return now < (expiresAt - TOKEN_EXPIRY_BUFFER);
}

/**
 * 토큰이 곧 만료될 예정인지 확인 (예: 10분 이내)
 */
export function isTokenExpiringSoon(tokenData: CachedTokenData, thresholdMinutes: number = 10): boolean {
  const now = Date.now();
  const expiresAt = tokenData.expiresAt;
  const thresholdMs = thresholdMinutes * 60 * 1000;

  return (expiresAt - now) < thresholdMs;
}

/**
 * 캐시된 토큰으로 Firebase 인증 시도 (단순한 세션 유지용)
 */
export async function authenticateWithCachedToken(tokenData: CachedTokenData): Promise<boolean> {
  try {
    console.log('🔄 캐시된 토큰으로 인증 상태 확인 중...');

    // 토큰 유효성 검증
    if (!isTokenValid(tokenData)) {
      console.log('⏰ 캐시된 토큰이 만료됨');
      clearTokenData();
      return false;
    }

    // 현재 로그인 상태 확인 (Firebase JS SDK 사용)
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (currentUser && currentUser.uid === tokenData.userId) {
      console.log('✅ 캐시된 토큰으로 인증 상태 유지됨');
      return true;
    }

    console.log('❌ 캐시된 토큰으로 인증 실패, 새로운 로그인 필요');
    return false;
  } catch (error) {
    console.error('❌ 캐시된 토큰 인증 실패:', error);
    clearTokenData(); // 실패한 토큰 제거
    return false;
  }
}

/**
 * 현재 로그인 상태에서 토큰 데이터 업데이트
 */
export async function updateTokenData(): Promise<void> {
  try {
    // Firebase JS SDK에서 현재 사용자 정보 가져오기
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('로그인된 사용자가 없음');
    }

    // 현재 시간을 기준으로 1시간 후 만료로 설정 (실제로는 Firebase가 관리)
    const expiresAt = Date.now() + (60 * 60 * 1000); // 1시간

    const tokenData: CachedTokenData = {
      idToken: '', // 실제 토큰은 Firebase가 내부적으로 관리하므로 빈 값
      refreshToken: '',
      expiresAt,
      userId: currentUser.uid,
      email: currentUser.email || undefined,
    };

    await saveTokenData(tokenData);
    console.log('🔄 토큰 데이터 업데이트됨');
  } catch (error) {
    console.error('❌ 토큰 데이터 업데이트 실패:', error);
  }
}