# 로그인 플로우 재구성 계획

## 📋 현재 문제점 요약

1. **verifyLogin 중복 호출**: LoginScreen과 useAppInitialization에서 동시 호출
2. **화면 전환 타이밍 문제**: onLoginSuccess가 initialScreen 업데이트 전에 호출됨
3. **경쟁 조건**: 두 verifyLogin 호출이 거의 동시에 발생
4. **쿨다운 메커니즘 부작용**: onAuthStateChanged가 쿨다운으로 인해 무시될 수 있음
5. **에러 처리 불일치**: LoginScreen과 useAppInitialization의 에러 처리 로직이 분리됨

---

## 🎯 재구성 목표

1. **단일 책임 원칙**: 각 컴포넌트가 명확한 역할을 가지도록 분리
2. **단일 검증 지점**: verifyLogin은 한 곳에서만 호출
3. **명확한 상태 관리**: 화면 전환 로직을 단순화하고 예측 가능하게 만들기
4. **에러 처리 통합**: 모든 에러를 일관되게 처리

---

## 🔄 새로운 플로우 설계

### Phase 1: 로그인 시도 (LoginScreen)

```
사용자 클릭
  ↓
약관 동의 확인
  ↓
네이티브 Google 로그인 (FirebaseAuthentication.signInWithGoogle)
  ↓
ID Token 획득
  ↓
Firebase Auth에 credential로 로그인 (signInWithCredential)
  ↓
[여기서 LoginScreen의 역할 종료]
```

**변경사항:**
- ❌ LoginScreen에서 verifyLogin 호출 제거
- ❌ LoginScreen에서 onLoginSuccess 호출 제거
- ✅ Firebase Auth 로그인만 수행하고 종료
- ✅ 에러 발생 시에만 처리 (재가입 제한 등)

### Phase 2: 인증 상태 감지 및 검증 (useAppInitialization)

```
onAuthStateChanged 트리거
  ↓
쿨다운 체크 (개선 필요)
  ↓
App Check 토큰 확인 (필요시)
  ↓
verifyLogin 호출 (단일 호출 지점)
  ↓
재가입 제한 확인
  ↓
isNewUser 판단
  ↓
화면 결정 로직 실행
  ↓
setInitialScreen 호출
```

**변경사항:**
- ✅ verifyLogin은 여기서만 호출
- ✅ 모든 검증 로직을 여기서 처리
- ✅ 화면 결정 로직 유지

### Phase 3: 화면 전환 (App.tsx)

```
useAppInitialization의 initialScreen 변경 감지
  ↓
isLoading이 false이고 조건 충족 시
  ↓
setCurrentScreen(initialScreen)
  ↓
화면 렌더링
```

**변경사항:**
- ❌ onLoginSuccess 콜백 제거
- ✅ useAppInitialization의 initialScreen 변경만 감지
- ✅ useEffect 조건 단순화

---

## 📝 상세 구현 계획

### 1. LoginScreen.tsx 수정

**제거할 코드:**
```typescript
// ❌ 제거
const verifyLoginFn = httpsCallable(functions, "verifyLogin");
await verifyLoginFn();

if (onLoginSuccess) onLoginSuccess();
```

**유지할 코드:**
```typescript
// ✅ 유지: Firebase Auth 로그인만
if (isNative) {
  const result = await FirebaseAuthentication.signInWithGoogle();
  const idToken = result.credential?.idToken;
  if (!idToken) throw new Error("Google ID Token not found");
  
  const credential = GoogleAuthProvider.credential(idToken);
  await signInWithCredential(auth, credential);
  // 여기서 종료 - onAuthStateChanged가 나머지 처리
}
```

**에러 처리 개선:**
```typescript
catch (err: any) {
  // 재가입 제한 에러는 여기서도 처리 (사용자에게 즉시 피드백)
  if (err.code === 'functions/failed-precondition' || 
      err.message?.includes("재가입할 수 없습니다")) {
    toast.error(err.message || "재가입 대기 기간이 남아있어 로그인할 수 없습니다.");
  } else if (!err.message?.includes("cancelled")) {
    toast.error("로그인 중 오류가 발생했습니다.");
  }
  await auth.signOut();
}
```

**Props 변경:**
```typescript
// ❌ 제거
onLoginSuccess?: () => void;

// ✅ 제거 후 LoginScreen은 더 이상 onLoginSuccess를 받지 않음
```

### 2. useAppInitialization.ts 개선

**쿨다운 메커니즘 개선:**
```typescript
// 현재: 2초 고정 쿨다운
// 문제: 빠른 연속 로그인 시 화면 전환이 누락될 수 있음

// 개선안 1: 쿨다운 제거 (단순화)
// - onAuthStateChanged는 Firebase가 자동으로 중복 호출을 방지함
// - 우리가 추가 쿨다운을 둘 필요가 없을 수 있음

// 개선안 2: 쿨다운 유지하되 로직 개선
// - 쿨다운 중이어도 중요한 상태 변경(로그인 → 로그아웃)은 처리
// - 같은 상태(로그인 → 로그인)만 스킵
```

**에러 처리 강화:**
```typescript
try {
  const { data } = await callVerifyLogin({ email: user.email });
  isNewUser = data.isNewUser;
} catch (e: any) {
  // 에러 타입별 상세 처리
  if (e.code === 'functions/failed-precondition') {
    // 재가입 제한
  } else if (e.code === 'functions/unauthenticated') {
    // 인증 실패
  } else if (e.code === 'functions/unavailable') {
    // 서버 오류
  }
  // ... 기타
}
```

### 3. App.tsx 수정

**onLoginSuccess 제거:**
```typescript
// ❌ 제거
onLoginSuccess={() => {
  setCurrentScreen(initialScreen as any);
}}

// ✅ 단순화
<LoginScreen
  onShowTerms={...}
  onShowPrivacy={...}
  isDarkMode={isDarkMode}
  onToggleDarkMode={toggleDarkMode}
  // onLoginSuccess 제거
/>
```

**useEffect 조건 개선:**
```typescript
// 현재 조건
if (!isLoading && (!isInitialized.current || currentScreen === "login"))

// 개선안: 더 명확한 조건
useEffect(() => {
  if (isLoading) return; // 로딩 중이면 아무것도 하지 않음
  
  // 초기화되지 않았거나, 로그인 화면에서 다른 화면으로 전환하는 경우
  if (!isInitialized.current || 
      (currentScreen === "login" && initialScreen !== "login")) {
    console.log(`[App] 화면 전환: '${currentScreen}' → '${initialScreen}'`);
    setCurrentScreen(initialScreen as AppScreen);
    setUserNickname(userData.nickname);
    setUserProfileImage(userData.profileImage);
    isInitialized.current = true;
  }
}, [isLoading, initialScreen, currentScreen, userData.nickname, userData.profileImage]);
```

---

## 🔍 쿨다운 메커니즘 재검토

### 현재 문제
- 2초 고정 쿨다운이 모든 상태 변경을 막음
- 빠른 연속 로그인 시 화면 전환이 누락될 수 있음

### 옵션 1: 쿨다운 완전 제거
**장점:**
- 단순함
- Firebase가 이미 중복 호출을 방지함

**단점:**
- onAuthStateChanged가 여러 번 트리거될 수 있음 (드물지만)

### 옵션 2: 스마트 쿨다운
**로직:**
```typescript
const lastProcessedUid = useRef<string | null>(null);

if (user && user.email) {
  // 같은 사용자의 연속 호출만 스킵
  if (authStateCooldown.current && lastProcessedUid.current === user.uid) {
    return;
  }
  
  lastProcessedUid.current = user.uid;
  authStateCooldown.current = true;
  setTimeout(() => { authStateCooldown.current = false; }, 1000);
  
  // ... 나머지 로직
} else {
  // 로그아웃은 항상 처리
  lastProcessedUid.current = null;
  // ... 로그아웃 로직
}
```

### 옵션 3: 쿨다운 유지하되 시간 단축
- 2초 → 500ms 또는 1초로 단축
- 빠른 피드백 유지하면서 중복 호출 방지

**권장: 옵션 1 (쿨다운 제거) 또는 옵션 3 (시간 단축)**

---

## 🧪 테스트 시나리오

### 시나리오 1: 정상 로그인 (신규 유저)
1. 사용자가 Google 로그인 클릭
2. Firebase Auth 로그인 성공
3. onAuthStateChanged 트리거
4. verifyLogin 호출 → isNewUser = true
5. initialScreen = "nickname" 설정
6. App.tsx가 화면을 "nickname"으로 전환
7. ✅ 성공

### 시나리오 2: 정상 로그인 (기존 유저)
1. 사용자가 Google 로그인 클릭
2. Firebase Auth 로그인 성공
3. onAuthStateChanged 트리거
4. verifyLogin 호출 → isNewUser = false
5. Firestore에서 사용자 데이터 조회
6. initialScreen = "main" (또는 "guidelines") 설정
7. App.tsx가 화면을 해당 화면으로 전환
8. ✅ 성공

### 시나리오 3: 재가입 제한
1. 사용자가 Google 로그인 클릭
2. Firebase Auth 로그인 성공
3. onAuthStateChanged 트리거
4. verifyLogin 호출 → failed-precondition 에러
5. 에러 처리 → signOut 호출
6. initialScreen = "login" 설정
7. 에러 메시지 표시
8. ✅ 성공 (에러 처리 확인)

### 시나리오 4: 빠른 연속 로그인
1. 사용자가 Google 로그인 클릭
2. 로그인 성공
3. 즉시 다시 로그인 시도
4. 쿨다운 메커니즘 확인
5. ✅ 중복 호출 방지 확인

---

## 📊 구현 우선순위

### Phase 1: 핵심 수정 (필수)
1. ✅ LoginScreen에서 verifyLogin 호출 제거
2. ✅ LoginScreen에서 onLoginSuccess 제거
3. ✅ App.tsx에서 onLoginSuccess prop 제거
4. ✅ 에러 처리 개선

### Phase 2: 개선 (권장)
5. ⚠️ 쿨다운 메커니즘 재검토 및 개선
6. ⚠️ App.tsx useEffect 조건 개선
7. ⚠️ 로깅 강화 (디버깅용)

### Phase 3: 최적화 (선택)
8. 💡 추가 에러 처리 세분화
9. 💡 로딩 상태 개선
10. 💡 사용자 피드백 개선

---

## ⚠️ 주의사항

1. **하위 호환성**: 기존 로그인된 사용자에게 영향 없어야 함
2. **에러 처리**: 모든 에러 케이스를 처리해야 함
3. **테스트**: 각 시나리오를 충분히 테스트해야 함
4. **로깅**: 디버깅을 위한 충분한 로그 유지

---

## 🎯 예상 효과

1. **단순화**: 코드 복잡도 감소
2. **안정성**: 경쟁 조건 제거
3. **예측 가능성**: 화면 전환 로직이 명확해짐
4. **유지보수성**: 각 컴포넌트의 역할이 명확해짐

---

## 📌 다음 단계

1. 이 계획 검토 및 승인
2. Phase 1 구현 시작
3. 테스트 및 검증
4. Phase 2 진행 (필요시)
5. 프로덕션 배포
