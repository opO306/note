# MainScreen.tsx 리팩토링 가이드

## 📊 분리 현황 요약

### 기존 상태
- **파일**: `MainScreen.tsx`
- **라인 수**: 3,472줄
- **상태 변수**: 50개 이상
- **핸들러**: 60개 이상

### 분리된 모듈

| 모듈 | 파일 | 라인 수 | 책임 |
|------|------|---------|------|
| **Types** | `types/index.ts` | ~160줄 | 모든 타입 정의 |
| **NavigationContext** | `contexts/NavigationContext.tsx` | ~450줄 | 화면 전환/뒤로가기 |
| **useLanternActions** | `hooks/useLanternActions.ts` | ~300줄 | 게시물/답글 등불 토글 |
| **useBookmarkActions** | `hooks/useBookmarkActions.ts` | ~120줄 | 북마크 토글 |
| **useGuideActions** | `hooks/useGuideActions.ts` | ~180줄 | 길잡이 채택 |
| **useFollowActions** | `hooks/useFollowActions.ts` | ~120줄 | 팔로우/언팔로우 |
| **useTitleActions** | `hooks/useTitleActions.ts` | ~200줄 | 칭호 구매/장착 |
| **useReplyActions** | `hooks/useReplyActions.ts` | ~220줄 | 답글 작성/삭제 |
| **PostDetailView** | `components/PostDetailView.tsx` | ~450줄 | 게시물 상세 화면 |
| **PostListView** | `components/PostListView.tsx` | ~220줄 | 게시물 목록 화면 |
| **HomeHeader** | `components/HomeHeader.tsx` | ~200줄 | 홈 헤더 |

**총 분리된 코드**: 약 2,620줄

---

## 📁 새 폴더 구조

```
src/components/MainScreen/
├── index.ts                    # 메인 진입점
├── types/
│   └── index.ts               # 모든 타입 정의
├── contexts/
│   ├── index.ts
│   └── NavigationContext.tsx  # 화면 전환 상태 관리
├── hooks/
│   ├── index.ts
│   ├── useLanternActions.ts   # 등불 로직
│   ├── useBookmarkActions.ts  # 북마크 로직
│   ├── useGuideActions.ts     # 길잡이 채택 로직
│   ├── useFollowActions.ts    # 팔로우 로직
│   ├── useTitleActions.ts     # 칭호 로직
│   └── useReplyActions.ts     # 답글 로직
├── components/
│   ├── index.ts
│   ├── HomeHeader.tsx         # 홈 헤더
│   ├── PostListView.tsx       # 게시물 목록
│   └── PostDetailView.tsx     # 게시물 상세
└── utils/                      # 유틸리티 (필요시)
```

---

## 🔄 마이그레이션 단계

### Phase 1: 준비 (현재 완료)
- [x] 타입 정의 분리
- [x] NavigationContext 생성
- [x] 핵심 훅 6개 분리
- [x] 컴포넌트 3개 분리

### Phase 2: 점진적 적용

#### Step 1: Import 경로 업데이트
기존 MainScreen.tsx에서 분리된 훅을 import합니다:

```typescript
// 기존 코드 유지하면서, 새 훅만 테스트
import { useLanternActions } from './MainScreen/hooks';
import { useBookmarkActions } from './MainScreen/hooks';
// ... 등등
```

#### Step 2: 기존 로직 대체
하나씩 기존 로직을 새 훅으로 대체합니다:

```typescript
// 기존
const [lanternedPosts, setLanternedPosts] = useState<Set<string>>(new Set());
// ... 관련 useEffect 및 핸들러들

// 새로 대체
const {
  lanternedPosts,
  handleLanternToggle,
  isPostLanterned,
} = useLanternActions({
  posts,
  setPosts,
  selectedPost,
  setSelectedPost,
  // ... 기타 필요한 props
});
```

#### Step 3: NavigationContext 적용
App 레벨에서 Provider 감싸기:

```tsx
// App.tsx
import { NavigationProvider } from './components/MainScreen/contexts';

function App() {
  return (
    <NavigationProvider
      onRequestExit={handleRequestExit}
      shouldOpenMyPageOnMain={shouldOpenMyPage}
      onMainScreenReady={handleMainScreenReady}
    >
      {/* ... */}
    </NavigationProvider>
  );
}
```

### Phase 3: 컴포넌트 조립

새로운 간결한 MainScreen 구성:

```tsx
// MainScreen/MainScreenRefactored.tsx
import { useNavigation } from './contexts';
import { 
  useLanternActions, 
  useBookmarkActions,
  useFollowActions,
  // ...
} from './hooks';
import { 
  HomeHeader, 
  PostListView, 
  PostDetailView 
} from './components';

export function MainScreenRefactored(props: MainScreenProps) {
  const navigation = useNavigation();
  const lanterns = useLanternActions({ /* ... */ });
  const bookmarks = useBookmarkActions({ /* ... */ });
  // ...

  // 조건부 렌더링
  if (navigation.showMyPage) {
    return <MyPageScreen /* ... */ />;
  }

  if (navigation.selectedPost) {
    return (
      <PostDetailView
        post={navigation.selectedPost}
        isPostLanterned={lanterns.isPostLanterned(navigation.selectedPost.id)}
        // ...
      />
    );
  }

  return (
    <>
      <HomeHeader /* ... */ />
      <PostListView /* ... */ />
      <BottomNavigation /* ... */ />
    </>
  );
}
```

---

## ⚠️ 주의사항

### 1. 순환 의존성 방지
- 훅들이 서로를 import하지 않도록 주의
- 공통 로직은 utils로 분리

### 2. 상태 동기화
- 훅 간에 상태를 공유해야 하는 경우 props로 전달
- 복잡한 경우 Context 사용 고려

### 3. 테스트
- 분리된 각 훅을 개별 테스트
- 통합 테스트로 전체 흐름 검증

### 4. 점진적 마이그레이션
- 한 번에 전체를 바꾸지 말고 단계별로 적용
- 각 단계마다 앱이 정상 작동하는지 확인

---

## 🎯 최종 목표

| 항목 | 기존 | 목표 |
|------|------|------|
| MainScreen.tsx 라인 수 | 3,472줄 | ~300줄 |
| 상태 변수 | 50개+ | 5개 미만 (훅에서 관리) |
| 핸들러 | 60개+ | 10개 미만 (훅에서 관리) |
| 테스트 가능성 | 낮음 | 높음 (각 훅 개별 테스트) |
| 재사용성 | 없음 | 높음 (훅/컴포넌트 재사용) |

---

## 📋 다음 작업 목록

1. [ ] 기존 MainScreen.tsx에 새 훅 import 테스트
2. [ ] 하나씩 기존 로직을 새 훅으로 대체
3. [ ] NavigationContext App 레벨 적용
4. [ ] PostDetailView 컴포넌트 통합
5. [ ] PostListView 컴포넌트 통합
6. [ ] HomeHeader 컴포넌트 통합
7. [ ] 전체 테스트 및 버그 수정
8. [ ] 기존 MainScreen.tsx 삭제 (백업 후)

---

*이 가이드는 점진적 마이그레이션을 위한 것입니다. 한 번에 모든 것을 바꾸려 하지 마세요!*
