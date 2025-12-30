# Firebase 비용 절감 계획

## 목표
- **현재 비용의 50-70% 절감**
- 실시간 리스너(`onSnapshot`) 비용 최소화
- Firestore 읽기/쓰기 최적화
- Functions 실행 시간 최적화

---

## 1. 실시간 리스너 최적화 (최우선 - 비용의 70% 차지)

### 1.1 알림 리스너 최적화

**현재 문제점:**
- `useNotifications.ts`에서 `onSnapshot` 사용
- 알림이 업데이트될 때마다 읽기 발생
- 사용자가 앱을 사용하는 동안 지속적 구독

**해결 방안: 폴링 방식으로 변경**

#### 구현 계획

**파일**: `src/components/hooks/useNotifications.ts`

```typescript
// 변경 전: onSnapshot (실시간)
const unsubNotifications = onSnapshot(q, (snapshot) => {
  // ...
});

// 변경 후: 폴링 (30초 간격)
const POLLING_INTERVAL = 30000; // 30초

useEffect(() => {
  let intervalId: NodeJS.Timeout;
  let isMounted = true;

  const fetchNotifications = async () => {
    if (!isMounted) return;
    
    try {
      const snapshot = await getDocs(q);
      // 알림 목록 업데이트
      const list: AppNotification[] = snapshot.docs.map(...);
      setNotifications(list);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  };

  // 즉시 한 번 실행
  fetchNotifications();
  
  // 이후 30초마다 폴링
  intervalId = setInterval(fetchNotifications, POLLING_INTERVAL);

  return () => {
    isMounted = false;
    if (intervalId) clearInterval(intervalId);
  };
}, [uid, maxNotifications]);
```

**예상 절감 효과:**
- 읽기 비용: 70-90% 감소
- 사용자 100명: 월 $10-15 → $1-2
- 사용자 500명: 월 $50-70 → $5-10
- 사용자 2,000명: 월 $200-280 → $20-40

---

### 1.2 프로필 리스너 최적화

**현재 문제점:**
- `useUserProfiles.ts`에서 여러 사용자 프로필에 대해 `onSnapshot` 사용
- 프로필이 업데이트될 때마다 읽기 발생
- 캐싱은 있으나 실시간 구독으로 인한 비용 발생

**해결 방안: 필요 시에만 구독 + 자동 해제 강화**

#### 구현 계획

**파일**: `src/components/MainScreen/hooks/useUserProfiles.ts`

```typescript
// 변경 전: 항상 구독
function subscribeToFirestore(uid: string) {
  const userRef = doc(db, "users", uid);
  const unsubscribe = onSnapshot(userRef, (snap) => {
    // ...
  });
}

// 변경 후: 폴링 + 필요 시에만 구독
const PROFILE_CACHE_TTL = 60000; // 1분 캐시

function subscribeToFirestore(uid: string) {
  if (firestoreUnsubscribers.has(uid)) return;
  
  // 캐시된 데이터가 최신이면 구독하지 않음
  const cached = userProfileCache.get(uid);
  if (cached && Date.now() - cached.lastUpdated < PROFILE_CACHE_TTL) {
    return;
  }

  // 폴링 방식으로 변경
  const fetchProfile = async () => {
    try {
      const userSnap = await getDoc(doc(db, "users", uid));
      if (userSnap.exists()) {
        // 프로필 업데이트
        const profile = parseProfile(userSnap.data());
        userProfileCache.set(uid, { ...profile, lastUpdated: Date.now() });
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    }
  };

  // 즉시 한 번 실행
  fetchProfile();
  
  // 1분마다 폴링 (프로필은 자주 변경되지 않음)
  const intervalId = setInterval(fetchProfile, 60000);
  
  firestoreUnsubscribers.set(uid, () => {
    clearInterval(intervalId);
  });
}
```

**예상 절감 효과:**
- 읽기 비용: 80-95% 감소
- 사용자 100명: 월 $5-10 → $0.5-1
- 사용자 500명: 월 $25-50 → $2-5
- 사용자 2,000명: 월 $100-200 → $10-20

---

### 1.3 게시물 리스너 최적화

**현재 상태:**
- `usePosts.ts`에서 이미 `getDocs` 사용 (최적화됨)
- ✅ 실시간 리스너 미사용

**추가 최적화:**
- 페이지네이션 강화: 초기 24개 → 10개로 감소
- 무한 스크롤 구현으로 필요 시에만 로드

---

## 2. Firestore 읽기/쓰기 최적화

### 2.1 페이지네이션 강화

**현재**: 초기 로드 24개
**변경**: 초기 로드 10개

**파일**: `src/components/hooks/usePosts.ts`

```typescript
// 변경 전
const INITIAL_POST_LIMIT = 24;

// 변경 후
const INITIAL_POST_LIMIT = 10;
const LOAD_MORE_LIMIT = 10;
```

**예상 절감 효과:**
- 초기 로드 읽기: 58% 감소 (24 → 10)
- 사용자 100명: 월 $0.5-1 절감
- 사용자 500명: 월 $2-5 절감
- 사용자 2,000명: 월 $10-20 절감

---

### 2.2 조회 로그 최적화

**현재 문제점:**
- 게시물 조회 시마다 `user_activity/{uid}/viewLogs`에 문서 추가
- 사용자가 많이 조회할수록 쓰기 비용 증가

**해결 방안: 배치 처리**

**파일**: `src/components/hooks/usePostNavigation.ts`

```typescript
// 변경 전: 즉시 저장
addDoc(logRef, {
  postId: post.id,
  category: post.category ?? null,
  // ...
});

// 변경 후: 로컬에 저장 후 배치 처리
const VIEW_LOG_BUFFER: Array<{ postId: string; category: string | null }> = [];
const BATCH_SIZE = 10;
const BATCH_INTERVAL = 30000; // 30초

const flushViewLogs = async () => {
  if (VIEW_LOG_BUFFER.length === 0) return;
  
  const batch = writeBatch(db);
  const logsToSave = VIEW_LOG_BUFFER.splice(0, BATCH_SIZE);
  
  logsToSave.forEach((log) => {
    const logRef = doc(collection(db, "user_activity", uid, "viewLogs"));
    batch.set(logRef, {
      ...log,
      createdAt: serverTimestamp(),
    });
  });
  
  await batch.commit();
};

// 조회 시 버퍼에 추가
VIEW_LOG_BUFFER.push({ postId: post.id, category: post.category });
if (VIEW_LOG_BUFFER.length >= BATCH_SIZE) {
  flushViewLogs();
}

// 30초마다 자동 플러시
setInterval(flushViewLogs, BATCH_INTERVAL);
```

**예상 절감 효과:**
- 쓰기 비용: 30-50% 감소 (배치 처리로 오버헤드 감소)
- 사용자 100명: 월 $0.5-1 절감
- 사용자 500명: 월 $2-5 절감
- 사용자 2,000명: 월 $10-20 절감

---

### 2.3 불필요한 읽기 제거

**현재 문제점:**
- 답글 작성 시 사용자 정보를 매번 조회
- 멘션 알림 생성 시 닉네임으로 사용자 조회

**해결 방안: 캐싱 강화**

**파일**: `src/components/MainScreen/hooks/useReplyActions.tsx`

```typescript
// 닉네임 → UID 캐시
const nicknameToUidCache = new Map<string, { uid: string; expiresAt: number }>();
const CACHE_TTL = 300000; // 5분

async function findUserUidByNickname(nickname: string): Promise<string | null> {
  // 캐시 확인
  const cached = nicknameToUidCache.get(nickname);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.uid;
  }

  // 캐시 미스 시 조회
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("nickname", "==", nickname), limit(1));
  const snap = await getDocs(q);
  
  if (!snap.empty) {
    const uid = snap.docs[0].id;
    nicknameToUidCache.set(nickname, {
      uid,
      expiresAt: Date.now() + CACHE_TTL,
    });
    return uid;
  }
  
  return null;
}
```

**예상 절감 효과:**
- 읽기 비용: 20-30% 감소
- 사용자 100명: 월 $0.5-1 절감
- 사용자 500명: 월 $2-5 절감
- 사용자 2,000명: 월 $10-20 절감

---

## 3. Functions 최적화

### 3.1 일일 추천 시스템 최적화

**현재 문제점:**
- 매일 최대 500명 처리
- 사용자당 ~1,000회 읽기 발생

**해결 방안: 배치 크기 조정 + 캐싱**

**파일**: `functions/src/dailyRecommendations.ts`

```typescript
// 변경 전
const MAX_USERS_PER_RUN = 500;

// 변경 후: 배치 크기 감소 + 점진적 처리
const MAX_USERS_PER_RUN = 200; // 한 번에 200명만 처리
const BATCH_DELAY_MS = 1000; // 배치 간 1초 대기

// 또는 사용자당 읽기 최적화
// - 최근 7일 데이터만 조회 (현재 14일)
const WINDOW_DAYS = 7; // 14 → 7로 감소
```

**예상 절감 효과:**
- 읽기 비용: 30-50% 감소
- 월간 비용: $15-30 → $8-15

---

### 3.2 트리거 함수 최적화

**현재 상태:**
- 게시물 생성 시 모더레이션 검사
- 답글 생성 시 모더레이션 검사

**추가 최적화:**
- 중복 검사 방지
- 배치 처리 가능한 경우 배치로 변경

**파일**: `functions/src/triggers.ts`

```typescript
// 스팸 감지 최적화: 최근 콘텐츠 조회 최소화
async function getRecentUserContent(
    userId: string,
    type: "post" | "reply",
    timeWindowMs: number,
    limit: number = 5 // 10 → 5로 감소
): Promise<Array<{ content: string; createdAt: any }>> {
    // 최근 5개만 조회 (유사도 검사에 충분)
}
```

**예상 절감 효과:**
- 읽기 비용: 20-30% 감소
- 사용자 100명: 월 $0.5-1 절감
- 사용자 500명: 월 $2-5 절감
- 사용자 2,000명: 월 $10-20 절감

---

## 4. Vertex AI 비용 절감

### 4.1 주간 퀴즈 최적화

**현재 상태:**
- 매주 월요일 실행
- 서브카테고리당 10-20회 호출

**추가 최적화:**
- 서브카테고리 수 감소: 3개 → 2개
- 문제 수 감소: 10개 → 5개

**파일**: `functions/src/weeklyQuiz.ts`

```typescript
// 변경 전
const subCategories = await getRecentSubCategories(3);

// 변경 후
const subCategories = await getRecentSubCategories(2); // 3 → 2
```

**예상 절감 효과:**
- Vertex AI 비용: 30-40% 감소
- 월간 비용: $2-5 → $1-3

---

### 4.2 AI 모더레이션 제한

**현재 상태:**
- 관리자 수동 호출만 사용
- ✅ 이미 최적화됨

**추가 권장사항:**
- 자동 AI 모더레이션은 위험도 높은 경우만 사용
- 비용 대비 효과가 낮은 경우 키워드 기반 필터 우선 사용

---

## 5. Storage 최적화

### 5.1 이미지 압축

**현재 문제점:**
- 프로필 이미지 원본 저장
- 다운로드 비용 증가

**해결 방안:**
- 업로드 시 자동 압축
- 썸네일 생성

**예상 절감 효과:**
- Storage 비용: 50-70% 감소
- 다운로드 비용: 60-80% 감소

---

## 6. 구현 우선순위

### Phase 1: 즉시 구현 (최대 효과)
1. ✅ **알림 리스너 폴링 변경** (비용의 40-50% 절감)
2. ✅ **프로필 리스너 폴링 변경** (비용의 20-30% 절감)
3. ✅ **페이지네이션 강화** (비용의 5-10% 절감)

**예상 총 절감 효과: 65-90%**

### Phase 2: 단기 구현 (1-2주)
4. ✅ 조회 로그 배치 처리
5. ✅ 닉네임 → UID 캐싱
6. ✅ 일일 추천 시스템 최적화

**예상 추가 절감 효과: 10-15%**

### Phase 3: 중기 구현 (1개월)
7. ✅ 이미지 압축
8. ✅ 트리거 함수 최적화
9. ✅ 주간 퀴즈 최적화

**예상 추가 절감 효과: 5-10%**

---

## 7. 예상 비용 절감 효과

### 시나리오별 비교

| 사용자 규모 | 현재 월간 비용 | 최적화 후 | 절감율 | 180만원 지속 기간 |
|------------|--------------|----------|--------|------------------|
| **소규모 (100명)** | $17-20 | $3-5 | **75-80%** | 6-8개월 → **20-30개월** |
| **중규모 (500명)** | $29-35 | $8-12 | **65-70%** | 3.5-4.5개월 → **10-15개월** |
| **대규모 (2,000명)** | $54-65 | $15-25 | **60-70%** | 2-2.5개월 → **5-8개월** |

---

## 8. 구현 체크리스트

### Phase 1 (즉시 구현) ✅ 완료
- [x] `useNotifications.ts`: `onSnapshot` → 폴링 방식 변경 (30초 간격)
- [x] `useUserProfiles.ts`: `onSnapshot` → 폴링 방식 변경 (1분 간격)
- [x] `usePosts.ts`: 초기 로드 24개 → 10개로 감소

### Phase 2 (단기 구현) ✅ 완료
- [x] `usePostNavigation.ts`: 조회 로그 배치 처리 (`viewLogBatcher.ts` 생성)
- [x] `useReplyActions.tsx`: 닉네임 → UID 캐싱 (5분 TTL 캐시 추가)
- [x] `dailyRecommendations.ts`: 배치 크기 조정 (WINDOW_DAYS 14→7, MAX_USERS_PER_RUN 500→200, limit 값 감소)

### Phase 3 (중기 구현) ✅ 완료
- [x] 이미지 업로드 시 압축 기능 강화 (`profileImageService.ts`: 품질 0.82→0.75, 기준 1MB→500KB)
- [x] `core.ts`: 스팸 감지 최적화 (limit 20→5, 비교 개수 5→3, 답글 조회 50→30)
- [x] `weeklyQuiz.ts`: 서브카테고리 수 감소 (3→2, limit 200→100)

---

## 9. 모니터링

### 비용 추적
1. Firebase Console에서 일일 사용량 모니터링
2. Firestore 읽기/쓰기 추이 확인
3. Functions 호출 횟수 추적
4. Vertex AI 사용량 추적

### 성능 모니터링
1. 사용자 경험 영향 최소화
2. 알림 지연 시간 측정 (폴링 간격 조정)
3. 페이지 로딩 시간 측정

---

## 10. 주의사항

1. **사용자 경험**: 폴링 간격이 너무 길면 실시간성이 떨어질 수 있음
   - 알림: 30초 간격 권장
   - 프로필: 1분 간격 권장

2. **점진적 적용**: 한 번에 모든 변경을 적용하지 말고 단계적으로 적용
   - 각 변경 후 비용 모니터링
   - 문제 발생 시 롤백 가능하도록

3. **테스트**: 프로덕션 배포 전 충분한 테스트
   - 알림 지연 시간 확인
   - 프로필 업데이트 지연 확인

---

## 결론

**Phase 1만 구현해도 비용의 65-90%를 절감할 수 있습니다.**

가장 큰 효과를 보려면:
1. **알림 리스너 폴링 변경** (최우선)
2. **프로필 리스너 폴링 변경** (최우선)
3. **페이지네이션 강화** (간단하고 효과적)

이 세 가지만 구현해도 **180만원으로 2-3배 더 오래 버틸 수 있습니다.**

