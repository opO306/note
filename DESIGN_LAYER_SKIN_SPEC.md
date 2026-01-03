# 디자인 레이어 스킨 명세서

> **원칙**: 차별 0 / 페이투윈 0 / 기능 영향 0  
> **목표**: 오직 "보이는 재질과 분위기"만 변경

---

## 1. 레이어 스킨 정의

**UI 구조·텍스트·기능 위에 얹히는 "표현 전용 시각 레이어"**

### ❌ 변경 금지 항목
- 버튼 위치
- 글자 크기·행간
- 정보량
- 기능
- 레이아웃 토큰 (spacing, typography, layout)

### ✅ 변경 허용 항목
- 표면 재질 (질감, 텍스처)
- 그림자 표현 (스타일만, 위치/크기 동일)
- 경계선 스타일 (표현만, 두께/위치 동일)
- 광원 표현 (하이라이트, 그라데이션)
- 미세 모션 감성 (이징만, 시간/단계 동일)

---

## 2. 현재 코드베이스 분석

### 2-1. 기존 CSS 변수 구조

```4786:4848:src/index.css
:root {
  --safe-area-inset-top: env(safe-area-inset-top, 0px);
  --safe-area-inset-right: env(safe-area-inset-right, 0px);
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-inset-left: env(safe-area-inset-left, 0px);
  --font-size: 16px;
  --focus-ring-width: 2px;
  --focus-ring-offset: 2px;
  --text-xs: .75rem;
  --text-sm: .875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
  --background: #fafbfc;
  --foreground: #1a1d23;
  --card: #fff;
  --card-foreground: #1a1d23;
  --popover: #fff;
  --popover-foreground: #1a1d23;
  --primary: #2c3137;
  --primary-foreground: #fff;
  --secondary: #f1f3f5;
  --secondary-foreground: #4a5059;
  --muted: #f5f6f8;
  --muted-foreground: #6b7280;
  --accent: #f0f1f3;
  --accent-foreground: #2c3137;
  --destructive: #dc2626;
  --destructive-foreground: #fff;
  --border: #3741513d;
  --input: transparent;
  --input-background: #f9fafb;
  --switch-background: #d1d5db;
  --font-weight-medium: 500;
  --font-weight-normal: 400;
  --ring: #2c313733;
  --chart-1: #f59e0b;
  --chart-2: #10b981;
  --chart-3: #3b82f6;
  --chart-4: #ef4444;
  --chart-5: #8b5cf6;
  --radius: .75rem;
  --success: #16a34a;
  --warning: #eab308;
  --info: #3b82f6;
  --shadow-sm: 0 1px 2px 0 #0000000d;
  --shadow-md: 0 4px 6px -1px #0000001a, 0 2px 4px -1px #0000000f;
  --shadow-lg: 0 10px 15px -3px #0000001a, 0 4px 6px -2px #0000000d;
  --transition-fast: .15s ease-out;
  --transition-medium: .25s ease-out;
  --transition-slow: .35s ease-out;
  --sidebar: #f8fafc;
  --sidebar-foreground: #1a1d23;
  --sidebar-primary: #2c3137;
  --sidebar-primary-foreground: #fff;
  --sidebar-accent: #f1f3f5;
  --sidebar-accent-foreground: #4a5059;
  --sidebar-border: #3741511f;
  --sidebar-ring: #2c313733;
}
```

### 2-2. 레이어 스킨으로 분리 가능한 요소

#### ✅ 분리 가능 (표현 전용)

1. **표면 재질 (Surface Material)**
   - 현재: 단색 배경 (`--card`, `--background`)
   - 스킨 적용: 질감 이미지/패턴 오버레이
   - CSS 변수: `--skin-surface-texture`, `--skin-surface-blend-mode`

2. **그림자 표현 (Shadow Style)**
   - 현재: `--shadow-sm`, `--shadow-md`, `--shadow-lg`
   - 스킨 적용: 소프트/하드/앰비언트 스타일만 변경
   - CSS 변수: `--skin-shadow-style-sm`, `--skin-shadow-style-md`, `--skin-shadow-style-lg`

3. **경계선 스타일 (Border Style)**
   - 현재: `--border` (색상만)
   - 스킨 적용: 실선/점선/흐릿/질감 라인
   - CSS 변수: `--skin-border-style`, `--skin-border-pattern`

4. **광원 표현 (Highlight)**
   - 현재: 없음
   - 스킨 적용: 카드 상단 하이라이트, 가장자리 광택
   - CSS 변수: `--skin-highlight-gradient`, `--skin-highlight-opacity`

5. **백드롭 블러 (Backdrop Blur)**
   - 현재: `backdrop-blur-xl`, `backdrop-blur-sm` (하드코딩)
   - 스킨 적용: 블러 강도/스타일만 변경
   - CSS 변수: `--skin-backdrop-blur`, `--skin-backdrop-brightness`

6. **미세 모션 감성 (Motion Easing)**
   - 현재: `--transition-fast`, `--transition-medium`, `--transition-slow` (시간 + 이징)
   - 스킨 적용: 이징 커브만 변경 (시간 고정)
   - CSS 변수: `--skin-easing-fast`, `--skin-easing-medium`, `--skin-easing-slow`

#### ❌ 분리 불가 (레이아웃/기능)

- `--radius` (레이아웃)
- `--text-*` (타이포그래피)
- `--spacing` (레이아웃)
- 색상 값 자체 (접근성 영향)
- 투명도 값 자체 (대비 영향)

---

## 3. 스킨 토큰 설계 (실제 구현)

### 3-1. 기본 스킨 토큰 구조

```css
/* 기본 스킨: 플랫 (현재 상태) */
:root {
  /* 표면 재질 */
  --skin-surface-texture: none;
  --skin-surface-blend-mode: normal;
  --skin-surface-opacity: 1;
  
  /* 그림자 표현 */
  --skin-shadow-style-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --skin-shadow-style-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --skin-shadow-style-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --skin-shadow-blur: 0px; /* 추가 블러 효과 (선택) */
  
  /* 경계선 스타일 */
  --skin-border-style: solid;
  --skin-border-pattern: none;
  --skin-border-dash-array: none;
  
  /* 광원 표현 */
  --skin-highlight-gradient: none;
  --skin-highlight-opacity: 0;
  --skin-highlight-position: top;
  
  /* 백드롭 블러 */
  --skin-backdrop-blur: 16px; /* 기본값 (glass-effect와 동일) */
  --skin-backdrop-brightness: 1;
  --skin-backdrop-saturate: 1;
  
  /* 미세 모션 감성 */
  --skin-easing-fast: ease-out;
  --skin-easing-medium: ease-out;
  --skin-easing-slow: ease-out;
}
```

### 3-2. 스킨 패키지 예시: 종이 (Paper)

```css
:root[data-skin='paper'] {
  /* 표면 재질: 종이 질감 */
  --skin-surface-texture: url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence baseFrequency='0.04' numOctaves='5'/%3E%3CfeColorMatrix values='0 0 0 0 0.9 0 0 0 0 0.9 0 0 0 0 0.9 0 0 0 0.02 0'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23paper)' opacity='0.3'/%3E%3C/svg%3E");
  --skin-surface-blend-mode: overlay;
  --skin-surface-opacity: 0.4;
  
  /* 그림자 표현: 잉크 번짐 느낌 */
  --skin-shadow-style-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.12), 0 0 1px 0 rgba(0, 0, 0, 0.08);
  --skin-shadow-style-md: 0 3px 8px 0 rgba(0, 0, 0, 0.15), 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  --skin-shadow-style-lg: 0 8px 16px 0 rgba(0, 0, 0, 0.18), 0 2px 6px 0 rgba(0, 0, 0, 0.12);
  --skin-shadow-blur: 2px;
  
  /* 경계선 스타일: 연필 같은 구분선 */
  --skin-border-style: solid;
  --skin-border-pattern: none;
  --skin-border-dash-array: none;
  /* border 색상은 기존 --border 유지 (접근성) */
  
  /* 광원 표현: 없음 (종이는 광택 없음) */
  --skin-highlight-gradient: none;
  --skin-highlight-opacity: 0;
  
  /* 백드롭 블러: 약간만 (종이는 투명하지 않음) */
  --skin-backdrop-blur: 8px;
  --skin-backdrop-brightness: 1.05;
  --skin-backdrop-saturate: 0.95;
  
  /* 미세 모션 감성: 부드럽게 */
  --skin-easing-fast: cubic-bezier(0.4, 0, 0.2, 1);
  --skin-easing-medium: cubic-bezier(0.4, 0, 0.2, 1);
  --skin-easing-slow: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 3-3. 스킨 패키지 예시: 글래스 (Glass)

```css
:root[data-skin='glass'] {
  /* 표면 재질: 반투명 유리 */
  --skin-surface-texture: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  --skin-surface-blend-mode: overlay;
  --skin-surface-opacity: 0.6;
  
  /* 그림자 표현: 소프트 라이트 */
  --skin-shadow-style-sm: 0 2px 8px 0 rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  --skin-shadow-style-md: 0 4px 16px 0 rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.15) inset;
  --skin-shadow-style-lg: 0 8px 24px 0 rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.2) inset;
  --skin-shadow-blur: 0px;
  
  /* 경계선 스타일: 유리 가장자리 */
  --skin-border-style: solid;
  --skin-border-pattern: none;
  --skin-border-dash-array: none;
  
  /* 광원 표현: 상단 하이라이트 */
  --skin-highlight-gradient: linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%);
  --skin-highlight-opacity: 0.6;
  --skin-highlight-position: top;
  
  /* 백드롭 블러: 강하게 */
  --skin-backdrop-blur: 24px;
  --skin-backdrop-brightness: 1.1;
  --skin-backdrop-saturate: 1.2;
  
  /* 미세 모션 감성: 부드럽게 */
  --skin-easing-fast: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --skin-easing-medium: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --skin-easing-slow: cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

### 3-4. 스킨 패키지 예시: 메탈 (Metal)

```css
:root[data-skin='metal'] {
  /* 표면 재질: 무광 메탈 텍스처 */
  --skin-surface-texture: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.03) 2px, rgba(0, 0, 0, 0.03) 4px);
  --skin-surface-blend-mode: multiply;
  --skin-surface-opacity: 0.3;
  
  /* 그림자 표현: 날카로운 그림자 */
  --skin-shadow-style-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05);
  --skin-shadow-style-md: 0 2px 4px 0 rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08);
  --skin-shadow-style-lg: 0 4px 8px 0 rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.1);
  --skin-shadow-blur: 0px;
  
  /* 경계선 스타일: 정밀한 경계선 */
  --skin-border-style: solid;
  --skin-border-pattern: none;
  --skin-border-dash-array: none;
  
  /* 광원 표현: 가장자리 은은한 광택 */
  --skin-highlight-gradient: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 30%, transparent 70%, rgba(0, 0, 0, 0.05) 100%);
  --skin-highlight-opacity: 0.4;
  --skin-highlight-position: top-left;
  
  /* 백드롭 블러: 없음 (메탈은 불투명) */
  --skin-backdrop-blur: 0px;
  --skin-backdrop-brightness: 1;
  --skin-backdrop-saturate: 1;
  
  /* 미세 모션 감성: 묵직하게 */
  --skin-easing-fast: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --skin-easing-medium: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --skin-easing-slow: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

---

## 4. 컴포넌트 적용 방법

### 4-1. 카드 컴포넌트 수정

```10:10:src/components/ui/card.tsx
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border",
```

**수정 후:**

```tsx
// 스킨 토큰 적용
className={cn(
  "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border",
  // 스킨: 표면 재질
  "[background-image:var(--skin-surface-texture)]",
  "[background-blend-mode:var(--skin-surface-blend-mode)]",
  "[opacity:var(--skin-surface-opacity)]",
  // 스킨: 그림자
  "[box-shadow:var(--skin-shadow-style-sm)]",
  // 스킨: 광원
  "[position:relative]",
  "before:content-[''] before:absolute before:inset-0 before:pointer-events-none",
  "before:[background:var(--skin-highlight-gradient)]",
  "before:[opacity:var(--skin-highlight-opacity)]",
  className,
)}
```

### 4-2. 헤더 컴포넌트 수정

```461:461:src/components/WriteScreen.tsx
      <header className="bg-card/95 backdrop-blur-xl border-b border-border flex-shrink-0 safe-top">
```

**수정 후:**

```tsx
<header 
  className="bg-card/95 border-b border-border flex-shrink-0 safe-top"
  style={{
    backdropFilter: `blur(var(--skin-backdrop-blur)) brightness(var(--skin-backdrop-brightness)) saturate(var(--skin-backdrop-saturate))`,
    WebkitBackdropFilter: `blur(var(--skin-backdrop-blur)) brightness(var(--skin-backdrop-brightness)) saturate(var(--skin-backdrop-saturate))`,
  }}
>
```

### 4-3. 전환 애니메이션 수정

```4837:4839:src/index.css
  --transition-fast: .15s ease-out;
  --transition-medium: .25s ease-out;
  --transition-slow: .35s ease-out;
```

**수정 후:**

```css
--transition-fast: .15s var(--skin-easing-fast);
--transition-medium: .25s var(--skin-easing-medium);
--transition-slow: .35s var(--skin-easing-slow);
```

---

## 5. 접근성 검증 기준

### 5-1. 대비 비율 유지

- 스킨 적용 전후 **색상 대비 비율 동일** 유지
- `--card`, `--foreground` 등 색상 변수는 **절대 변경하지 않음**
- 텍스처 오버레이는 `opacity`로 제어하여 대비 영향 최소화

### 5-2. 시각적 계층 구조 유지

- 그림자 강도는 변경 가능하나, **계층 구조는 동일**
- `shadow-sm < shadow-md < shadow-lg` 관계 유지
- 스킨 제거 시 레이아웃 변화 0

### 5-3. 포커스 표시 유지

- `--ring` 색상은 변경하지 않음
- 포커스 링 가시성 유지

---

## 6. 구현 체크리스트

### 6-1. CSS 변수 추가
- [ ] 기본 스킨 토큰 정의 (`:root`)
- [ ] 종이 스킨 토큰 정의 (`:root[data-skin='paper']`)
- [ ] 글래스 스킨 토큰 정의 (`:root[data-skin='glass']`)
- [ ] 메탈 스킨 토큰 정의 (`:root[data-skin='metal']`)
- [ ] 다크모드 대응 (`.dark[data-skin='...']`)

### 6-2. 컴포넌트 수정
- [ ] Card 컴포넌트에 스킨 토큰 적용
- [ ] Header 컴포넌트에 백드롭 블러 토큰 적용
- [ ] 전환 애니메이션에 이징 토큰 적용
- [ ] 기존 하드코딩된 `backdrop-blur-*` 클래스 제거

### 6-3. 테스트
- [ ] 스킨 제거 시 레이아웃 변화 없음 확인
- [ ] 접근성 점수 변화 없음 확인 (Lighthouse)
- [ ] 다크/라이트 모드 모두 정상 작동 확인
- [ ] 성능 영향 없음 확인 (FPS 유지)

---

## 7. 가격 구조 (참고)

- 기본 스킨: 무료 (플랫)
- 스킨 1개: 1,000 ~ 2,000원
- 묶음 팩 (3개): 3,000 ~ 4,000원

**중요**: 기본 스킨도 완성도 높아야 함. 유료가 "더 좋아 보이는 것"이 아니라 "다른 취향"처럼 보여야 함.

---

## 8. 기술적 제약사항

### 8-1. CSS 변수만 사용
- JavaScript 로직 추가 없음
- 컴포넌트 수정 최소화
- `data-skin` 속성으로 전환

### 8-2. 성능 고려
- 텍스처 이미지는 인라인 SVG 또는 작은 파일
- 백드롭 필터는 GPU 가속 활용
- 애니메이션은 `will-change` 최소화

### 8-3. 브라우저 호환성
- CSS 변수: IE11 제외 지원
- 백드롭 필터: 최신 브라우저 지원
- 폴백: 스킨 미지원 시 기본 스킨으로 자동 전환

---

## 9. 다음 단계

1. ✅ **현재 문서**: 레이어 스킨으로 분리 가능한 요소 체크 완료
2. ⏭️ **다음**: 기본 스킨을 더 좋게 만드는 기준 잡기
3. ⏭️ **그 다음**: 스킨 하나를 실제 토큰 단위로 구현

---

**이 원칙은 끝까지 유지한다.**

