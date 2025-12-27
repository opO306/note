# 🚀 성능 최적화 구현 예시 가이드

이 문서는 `PERFORMANCE_OPTIMIZATION_PLAN.md`에 명시된 최적화 항목들의 실제 구현 예시를 제공합니다.

---

## 📦 생성된 유틸리티 파일

### 1. `src/utils/initialDataLoader.ts`
초기 진입 시 필요한 모든 사용자 데이터를 한 번에 가져오는 통합 함수

### 2. `src/utils/firebaseCache.ts`
Firebase 호출 결과를 메모리 캐시에 저장하여 중복 요청 방지

### 3. `src/utils/performanceMonitoring.ts`
Firebase Performance Monitoring을 사용한 성능 추적 유틸리티

### 4. `src/components/ui/skeleton.tsx` (확장)
PostCard 및 PostList용 Skeleton 컴포넌트 추가

---

## 🔧 사용 예시

### 1. 초기 데이터 로딩 병합

**기존 방식** (3번의 네트워크 요청):
```typescript
// useAppInitialization.ts에서
const userProfile = await getUserProfile();
const trustScore = await getTrustScore();
const title = await getTitle();
```

**개선 방식** (2번의 네트워크 요청):
```typescript
// src/components/hooks/useAppInitialization.ts
import { getInitialUserData } from "@/utils/initialDataLoader";

// 기존 코드를 다음과 같이 변경
const initialData = await getInitialUserData();
if (initialData) {
  setUserData({
    nickname: initialData.profile.nickname,
    email: initialData.profile.email,
    profileImage: initialData.profile.profileImage,
  });
  // trustScore, title 정보도 함께 사용 가능
  setTrustScore(initialData.trustScore);
  setCurrentTitle(initialData.title.currentTitle);
}
```

---

### 2. Firebase 호출 캐싱

**기존 방식** (매번 네트워크 요청):
```typescript
// useTrustScore.ts에서
const fetchTrustScore = async () => {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  const trustScore = snap.data()?.trustScore ?? 30;
  return trustScore;
};
```

**개선 방식** (캐시 활용):
```typescript
// src/components/MainScreen/hooks/useTrustScore.ts
import { withCache, getUserCacheKey } from "@/utils/firebaseCache";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";

const fetchTrustScore = async (uid: string) => {
  return withCache(
    getUserCacheKey("trustScore", uid),
    async () => {
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);
      return snap.data()?.trustScore ?? 30;
    },
    5 * 60 * 1000 // 5분 캐시
  );
};
```

**캐시 무효화** (데이터 업데이트 시):
```typescript
import { firebaseCache, getUserCacheKey } from "@/utils/firebaseCache";

// 신뢰도 점수가 변경되었을 때
function updateTrustScore(uid: string, newScore: number) {
  // Firestore 업데이트
  await updateDoc(doc(db, "users", uid), { trustScore: newScore });
  
  // 캐시 무효화
  firebaseCache.invalidate(getUserCacheKey("trustScore", uid));
}
```

---

### 3. Skeleton UI 적용

**PostListView에 적용**:
```typescript
// src/components/MainScreen/components/PostListView.tsx
import { PostListSkeleton } from "@/components/ui/skeleton";

function PostListViewComponent({ posts, isLoading, ... }) {
  return (
    <div className="h-full flex flex-col">
      {/* ... 서브카테고리 바 ... */}
      
      <div className="flex-1 overflow-hidden bg-background">
        {isLoading ? (
          <div className="h-full overflow-y-auto scrollbar-hide">
            <PostListSkeleton count={5} />
          </div>
        ) : visiblePosts.length === 0 ? (
          <EmptyState onStartWriting={onStartWriting} />
        ) : (
          <PostCardsList posts={visiblePosts} ... />
        )}
      </div>
    </div>
  );
}
```

**TitleShop에 적용**:
```typescript
// src/components/TitleShop.tsx
import { Skeleton } from "@/components/ui/skeleton";

function TitleShop({ isLoading, titles, ... }) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }
  
  // ... 실제 컨텐츠 렌더링 ...
}
```

---

### 4. Performance Monitoring 적용

**Firebase 초기화 시**:
```typescript
// src/firebase.ts 또는 src/main.tsx
import { initPerformanceMonitoring } from "@/utils/performanceMonitoring";

// 앱 시작 시 한 번만 호출
initPerformanceMonitoring();
```

**Firestore 호출 추적**:
```typescript
// src/components/MainScreen/hooks/useUserProfiles.ts
import { tracedFirestoreCall } from "@/utils/performanceMonitoring";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";

const fetchUserProfile = async (uid: string) => {
  return tracedFirestoreCall("getUserProfile", async () => {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    return snap.data();
  });
};
```

**Cloud Function 호출 추적**:
```typescript
// src/components/MainScreen/hooks/useTrustScore.ts
import { tracedFunctionCall } from "@/utils/performanceMonitoring";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase";

const fetchTrustScore = async (uid: string) => {
  return tracedFunctionCall("getTrustScore", async () => {
    const getTrustScore = httpsCallable(functions, "getTrustScore");
    const result = await getTrustScore({ uid });
    return (result.data as any)?.trustScore ?? 30;
  });
};
```

---

### 5. React.memo 및 useCallback 정리

**PostCard 최적화** (이미 적용됨):
```typescript
// src/components/MainScreen/components/PostListView.tsx
// 이미 React.memo 적용되어 있음 (371번째 줄)
export const PostCard = React.memo(
  ({ post, ... }: PostCardProps) => {
    // ...
  },
  (prevProps, nextProps) => {
    // 커스텀 비교 함수로 불필요한 리렌더링 방지
    return (
      prevProps.post.id === nextProps.post.id &&
      prevProps.isLanterned === nextProps.isLanterned &&
      prevProps.isBookmarked === nextProps.isBookmarked
    );
  }
);
```

**useCallback 정리 예시**:
```typescript
// 기존: 매번 새로운 함수 생성
function MyComponent({ onAction }) {
  const handleClick = () => {
    onAction();
  };
  return <Button onClick={handleClick}>Click</Button>;
}

// 개선: useCallback으로 메모이제이션
function MyComponent({ onAction }) {
  const handleClick = useCallback(() => {
    onAction();
  }, [onAction]);
  return <Button onClick={handleClick}>Click</Button>;
}
```

---

## 📋 적용 체크리스트

### 1단계 - 진입 속도 개선
- [ ] `getInitialUserData` 함수를 `useAppInitialization`에 적용
- [ ] TitleShop, AchievementsScreen lazy loading 확인
- [ ] Capacitor Splash 설정 확인 (이미 적용됨)

### 2단계 - 렌더링 성능 최적화
- [ ] PostListView에 `PostListSkeleton` 적용
- [ ] TitleShop에 Skeleton UI 적용
- [ ] MyPageScreen에 Skeleton UI 적용
- [ ] React.memo, useCallback 정리 (코드 리뷰)

### 3단계 - Firebase 호출 최적화
- [ ] `useTrustScore`에 캐시 적용
- [ ] `useTitleActions`에 캐시 적용
- [ ] 중복 요청 위치 파악 및 제거

### 4단계 - Android 환경 최적화
- [ ] Capacitor Splash 시간 확인 (이미 적용됨)
- [ ] 이미지 압축 유틸리티 확인 (이미 존재함)

### 5단계 - 성능 계측
- [ ] `initPerformanceMonitoring` 호출 추가
- [ ] 주요 Firestore 호출에 `tracedFirestoreCall` 적용
- [ ] 주요 Cloud Function 호출에 `tracedFunctionCall` 적용

---

## 🔍 성능 측정 방법

### 1. Chrome DevTools Performance 탭
1. Chrome DevTools 열기 (F12)
2. Performance 탭 선택
3. Record 버튼 클릭
4. 앱 사용 (로그인, 게시물 조회 등)
5. Stop 클릭 후 분석

### 2. React DevTools Profiler
1. React DevTools 확장 프로그램 설치
2. Profiler 탭 선택
3. Record 버튼 클릭
4. 앱 사용
5. Stop 클릭 후 컴포넌트별 렌더링 시간 확인

### 3. Firebase Performance Monitoring
1. Firebase Console → Performance Monitoring 이동
2. 자동 수집된 메트릭 확인
3. 커스텀 추적 결과 확인

---

## 📚 참고 자료

- [PERFORMANCE_OPTIMIZATION_PLAN.md](./PERFORMANCE_OPTIMIZATION_PLAN.md) - 전체 계획서
- [PERFORMANCE_ANALYSIS.md](./PERFORMANCE_ANALYSIS.md) - 성능 분석 결과
- [React Performance 최적화 가이드](https://react.dev/learn/render-and-commit)
- [Firebase Performance Monitoring 문서](https://firebase.google.com/docs/perf-mon)

---

**마지막 업데이트**: 2024년 (현재 날짜)

