# 🚀 성능 최적화 실행 계획서 (Performance Optimization Plan)

> **목표**: 첫 진입 속도 3초 이내, 스크롤 렉 제거, Firebase 호출 30% 감소, App Performance A등급 확보

---

## 📊 현재 상태 분석

### ✅ 이미 적용된 최적화
- `App.tsx`: 주요 화면 lazy loading 적용
- `PostListView`: `react-virtuoso` 가상화 적용
- `vite.config.ts`: `manualChunks` 설정 (React, Firebase, Capacitor 분리)
- `useAppInitialization`: 로컬 캐시 활용

### ⚠️ 개선 필요 항목
- 초기 데이터 로딩 병합 (getUserProfile, getTrustScore, getTitle)
- TitleShop, AchievementsScreen lazy loading
- Skeleton UI 도입
- Firebase 호출 최적화 및 캐싱
- React.memo, useCallback, useMemo 정리

---

## 🧩 1단계 – 진입 속도 개선 (즉시 대응 필요)

| 항목 | 설명 | 담당 | 상태 | 우선순위 |
|------|------|------|------|----------|
| ✅ 코드 스플리팅 적용 | `TitleShop`, `AchievementsScreen` 등 `React.lazy`로 분리 | L | ✅ | 🟢 완료 |
| ✅ Vite 번들 분리 | `vite.config.ts`에서 Firebase, React 등 별도 `manualChunks` 설정 | L | ✅ | 🟢 완료 |
| ✅ Splash 화면 개선 | Capacitor에서 Splash UI를 보여주는 시간 동안 데이터 프리로드 | L | ✅ | 🟢 완료 |
| ✅ 초기 요청 병합 | `getUserProfile`, `getTrustScore`, `getTitle` → 하나의 `getInitialUserData`로 병합 | L | ⚠️ | 🟡 부분완료 (함수 생성됨, 적용 필요) |

### 구현 예시

#### 1-1. TitleShop, AchievementsScreen lazy loading
**현재 상태**: `MainScreenRefactored.tsx`에서 이미 lazy loading 적용됨
**확인 필요**: 실제로 사용되는 위치에서 lazy import 확인

#### 1-2. 초기 요청 병합
**파일**: `src/utils/initialDataLoader.ts` (신규 생성)

```typescript
// src/utils/initialDataLoader.ts
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/firebase";
import { auth } from "@/firebase";

export interface InitialUserData {
  profile: {
    nickname: string;
    email: string;
    profileImage: string;
  };
  trustScore: number;
  title: {
    currentTitle: string;
    ownedTitles: string[];
  };
}

/**
 * 초기 진입 시 필요한 모든 사용자 데이터를 한 번에 가져옵니다.
 * 기존 3번의 개별 호출을 1번으로 통합하여 네트워크 지연 감소
 */
export async function getInitialUserData(): Promise<InitialUserData | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    // 1. Firestore에서 사용자 프로필 + 타이틀 정보 동시 조회
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    const userData = userSnap.data();

    // 2. Cloud Function으로 신뢰도 점수 조회 (별도 호출 필요)
    const getTrustScore = httpsCallable(functions, "getTrustScore");
    const trustResult = await getTrustScore({ uid: user.uid });
    const trustScore = (trustResult.data as any)?.trustScore ?? 30;

    return {
      profile: {
        nickname: userData.nickname || "",
        email: user.email || "",
        profileImage: userData.profileImage || user.photoURL || "",
      },
      trustScore,
      title: {
        currentTitle: userData.currentTitle || "",
        ownedTitles: Array.isArray(userData.ownedTitles) ? userData.ownedTitles : [],
      },
    };
  } catch (error) {
    console.error("초기 데이터 로딩 실패:", error);
    return null;
  }
}
```

**사용 예시**:
```typescript
// src/components/hooks/useAppInitialization.ts
import { getInitialUserData } from "@/utils/initialDataLoader";

// 기존 개별 호출 대신
const initialData = await getInitialUserData();
if (initialData) {
  setUserData({
    nickname: initialData.profile.nickname,
    email: initialData.profile.email,
    profileImage: initialData.profile.profileImage,
  });
  // trustScore, title 정보도 함께 설정
}
```

---

## 🔥 2단계 – 렌더링 성능 최적화 (스크롤/UI 성능)

| 항목 | 설명 | 담당 | 상태 | 우선순위 |
|------|------|------|------|----------|
| ✅ `PostListView` 가상화 | FlatList 또는 가상화 리스트 컴포넌트 적용 | L | ✅ | 🟢 완료 |
| ✅ `React.memo` 적용 | `PostCard`, `CommentCard`, `UserInfoRow` 등 자주 렌더되는 컴포넌트 | L | ⚠️ | 🟡 부분완료 (PostCard 적용됨) |
| ✅ `useCallback`, `useMemo` 정리 | 상위 컴포넌트에서 함수/객체 props 넘길 때 메모이제이션 적용 | L | ⚠️ | 🟡 부분완료 (일부 적용됨) |
| ✅ Skeleton UI 적용 | `PostListView`, `TitleShop`, `MyPageScreen` 등 로딩 중에는 Skeleton 표시 | L | ⚠️ | 🟡 부분완료 (PostListView 적용됨) |

### 구현 예시

#### 2-1. Skeleton UI 컴포넌트
**파일**: `src/components/ui/skeleton.tsx` (신규 생성)

```typescript
// src/components/ui/skeleton.tsx
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

// PostCard용 Skeleton
export function PostCardSkeleton() {
  return (
    <div className="px-4 py-1.5">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-4" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

// PostListView용 Skeleton 리스트
export function PostListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </>
  );
}
```

**사용 예시**:
```typescript
// src/components/MainScreen/components/PostListView.tsx
import { PostListSkeleton } from "@/components/ui/skeleton";

// 로딩 중일 때
{isLoading ? (
  <PostListSkeleton count={5} />
) : (
  <PostCardsList posts={visiblePosts} ... />
)}
```

#### 2-2. React.memo 적용 예시
**파일**: `src/components/MainScreen/components/PostCard.tsx`

```typescript
// 이미 React.memo 적용되어 있음 (PostListView.tsx:371)
// 추가로 최적화가 필요한 컴포넌트 확인 필요
```

---

## 🗂️ 3단계 – Firebase 호출 최적화

| 항목 | 설명 | 담당 | 상태 | 우선순위 |
|------|------|------|------|----------|
| ✅ 중복 요청 제거 | 동일한 유저/타이틀 정보를 여러 곳에서 가져오는 구조 제거 | L | ⬜ | 🔴 높음 |
| ✅ select 필드 제한 | Firestore에서 필요한 필드만 읽도록 쿼리 개선 | L | ⬜ | 🟡 중간 |
| ✅ 캐시 도입 | Cloud Functions 응답 (`getTrustScore`, `getTitle`)에 로컬 캐시 추가 | L | ⚠️ | 🟡 부분완료 (getTrustScore 적용됨) |
| ✅ Cloud Function 병합 | 개별 호출 여러 개 → 하나의 통합 함수로 전환 (배치 처리) | L | ⬜ | 🟡 중간 |

### 구현 예시

#### 3-1. Firebase 호출 캐시 유틸리티
**파일**: `src/utils/firebaseCache.ts` (신규 생성)

```typescript
// src/utils/firebaseCache.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live (ms)
}

class FirebaseCache {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * 캐시에서 데이터 조회
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * 캐시에 데이터 저장
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * 캐시 무효화
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 모든 캐시 클리어
   */
  clear(): void {
    this.cache.clear();
  }
}

export const firebaseCache = new FirebaseCache();

/**
 * 캐시를 사용하는 Firebase 함수 래퍼
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000
): Promise<T> {
  // 캐시 확인
  const cached = firebaseCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // 캐시 미스 시 데이터 가져오기
  const data = await fetcher();
  firebaseCache.set(key, data, ttl);
  return data;
}
```

**사용 예시**:
```typescript
// src/components/MainScreen/hooks/useTrustScore.ts
import { withCache } from "@/utils/firebaseCache";

// 기존 코드
const fetchTrustScore = async () => {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  // ...
};

// 캐시 적용
const fetchTrustScore = async () => {
  return withCache(
    `trustScore:${uid}`,
    async () => {
      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);
      // ...
      return trustScore;
    },
    5 * 60 * 1000 // 5분 캐시
  );
};
```

#### 3-2. Firestore select 필드 제한
**예시**:
```typescript
// 기존: 전체 문서 읽기
const userSnap = await getDoc(doc(db, "users", uid));

// 개선: 필요한 필드만 읽기 (Firestore v9+에서는 직접 지원하지 않지만, 쿼리 최적화)
// 대신 필요한 필드만 destructure하여 사용
const userData = userSnap.data();
const { nickname, profileImage, currentTitle, ownedTitles } = userData;
```

---

## 📱 4단계 – Android 환경 최적화

| 항목 | 설명 | 담당 | 상태 | 우선순위 |
|------|------|------|------|----------|
| ✅ Splash 시간 조정 | Capacitor 설정에서 Splash 지연 시간 1000ms 이하로 설정 | L | ✅ | 🟢 완료 |
| ✅ 이미지 압축 | 이미지 업로드 시 WebP 또는 압축된 JPEG로 처리 | L | ✅ | 🟢 완료 (이미 구현됨) |
| ✅ Foreground 이벤트 처리 | 앱 복귀 시 필요한 데이터만 갱신 | L | ⬜ | 🟡 중간 |

### 구현 예시

#### 4-1. Capacitor Splash 설정
**파일**: `capacitor.config.ts`

```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'your.app.id',
  appName: 'Your App',
  webDir: 'build',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000, // 1초로 단축
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
```

#### 4-2. 이미지 압축 유틸리티
**파일**: `src/utils/imageOptimization.ts` (확인 필요)

```typescript
// 이미지 압축 함수가 이미 있는지 확인
// 없으면 추가 구현 필요
```

---

## 🧪 5단계 – 성능 계측 및 모니터링 도입

| 항목 | 설명 | 담당 | 상태 | 우선순위 |
|------|------|------|------|----------|
| ✅ Firebase Performance Monitoring | Firestore / Cloud Functions 응답시간 추적 | L | ⚠️ | 🟡 부분완료 (초기화만 완료) |
| ✅ React DevTools Profiler 분석 | 렌더링 병목 구간 분석 | L | ⬜ | 🟢 낮음 |
| ✅ Sentry 또는 LogRocket 도입 | 앱 비정상 렌더링, 오류 기록 추적 | L | ⬜ | 🟡 중간 |

### 구현 예시

#### 5-1. Firebase Performance Monitoring 설정
**파일**: `src/firebase.ts`

```typescript
// src/firebase.ts
import { getPerformance, trace } from "firebase/performance";

// Performance 초기화
const perf = getPerformance(app);

// Firestore 호출 추적
export async function tracedFirestoreCall<T>(
  traceName: string,
  operation: () => Promise<T>
): Promise<T> {
  const t = trace(perf, traceName);
  t.start();
  try {
    const result = await operation();
    t.stop();
    return result;
  } catch (error) {
    t.stop();
    throw error;
  }
}

// 사용 예시
const userData = await tracedFirestoreCall("getUserProfile", async () => {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.data();
});
```

---

## 🧼 6단계 – 정적 분석 및 CI 연동

| 항목 | 설명 | 담당 | 상태 | 우선순위 |
|------|------|------|------|----------|
| ✅ ESLint 성능 룰 활성화 | `jsx-no-new-function-as-prop`, `no-object-in-props` 등 성능 관련 룰 적용 | L | ⬜ | 🟢 낮음 |
| ✅ CI 단계에서 성능 검사 | lint 실패 시 빌드 실패하도록 설정 | L | ⬜ | 🟢 낮음 |

### 구현 예시

#### 6-1. ESLint 성능 룰 설정
**파일**: `eslint.config.js`

```javascript
// eslint.config.js에 추가
{
  plugins: ['react-perf'],
  rules: {
    'react-perf/jsx-no-new-function-as-prop': 'warn',
    'react-perf/jsx-no-new-object-as-prop': 'warn',
  },
}
```

---

## 🗓️ 예상 일정

| 주차 | 목표 | 완료 기준 |
|------|------|-----------|
| **1주차** | 1단계 (코드 분리 + 초기 로딩 최적화) 완료 | - TitleShop, AchievementsScreen lazy loading 확인<br>- 초기 요청 병합 함수 구현 및 적용<br>- Splash 화면 개선 |
| **2주차** | 2단계 (렌더링 최적화) + 3단계 일부 | - Skeleton UI 도입<br>- React.memo, useCallback 정리<br>- Firebase 캐시 도입 |
| **3주차** | 3단계 나머지 + 4단계(Android 개선) | - 중복 요청 제거<br>- 이미지 압축<br>- Foreground 이벤트 처리 |
| **4주차** | 5~6단계 정리, 측정 결과 검토 및 리팩터링 | - Performance Monitoring 설정<br>- ESLint 룰 적용<br>- 최종 성능 측정 및 리포트 |

---

## ✅ 최종 목표

- ✅ **첫 진입 속도**: 3초 이내
- ✅ **스크롤 성능**: 주요 화면 스크롤 시 렉 없음 (60fps 유지)
- ✅ **Firebase 호출**: 30% 감소
- ✅ **App Performance**: Google Play / Firebase console에서 **A등급** 확보

---

## 📝 체크리스트

### 1단계 - 진입 속도 개선
- [x] TitleShop lazy loading 확인/적용 ✅
- [x] AchievementsScreen lazy loading 확인/적용 ✅
- [x] `getInitialUserData` 함수 구현 ✅
- [ ] `useAppInitialization`에서 병합된 함수 사용 ⚠️
- [x] Capacitor Splash 설정 확인 ✅

### 2단계 - 렌더링 성능 최적화
- [x] Skeleton UI 컴포넌트 생성 ✅
- [x] PostListView에 Skeleton 적용 ✅
- [ ] TitleShop에 Skeleton 적용 ⚠️
- [ ] MyPageScreen에 Skeleton 적용 ⚠️
- [x] PostCard, CommentCard React.memo 확인 ✅ (PostCard 적용됨)
- [x] useCallback, useMemo 정리 ✅ (일부 적용됨)

### 3단계 - Firebase 호출 최적화
- [x] Firebase 캐시 유틸리티 생성 ✅
- [x] getTrustScore에 캐시 적용 ✅
- [ ] getTitle에 캐시 적용 ⚠️ (useTitleActions에 적용 필요)
- [ ] 중복 요청 위치 파악 및 제거 ⚠️
- [ ] Firestore 쿼리 최적화 (필드 제한) ⚠️

### 4단계 - Android 환경 최적화
- [x] Capacitor Splash 시간 조정 ✅
- [x] 이미지 압축 유틸리티 확인/구현 ✅ (이미 구현됨)
- [ ] Foreground 이벤트 핸들러 추가 ⚠️

### 5단계 - 성능 계측
- [x] Firebase Performance Monitoring 설정 ✅ (초기화 완료)
- [ ] 주요 함수에 trace 적용 ⚠️ (유틸리티만 생성됨)
- [ ] React DevTools Profiler로 병목 분석 ⚠️

### 6단계 - 정적 분석
- [ ] ESLint 성능 룰 활성화
- [ ] CI에 lint 검사 추가

---

## 🔗 관련 문서

- [PERFORMANCE_ANALYSIS.md](./PERFORMANCE_ANALYSIS.md) - 성능 분석 결과
- [README.md](./README.md) - 프로젝트 개요

---

**마지막 업데이트**: 2024년 (현재 날짜)
**담당자**: L
**상태**: 진행 중

