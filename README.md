# Android App Login Screens

This is a Vite-based React application implementing Android-style app login and community features. The original design is available at [Figma](https://www.figma.com/design/kDRiVhbI8lJ4lMk1CYObqU/Android-App-Login-Screens).

## 🚀 기술 스택

- **Frontend**: React 18.3.1, TypeScript, Vite
- **UI**: Radix UI, Tailwind CSS
- **Backend**: Firebase (Firestore, Authentication, Functions, Storage)
- **Mobile**: Capacitor (Android)
- **State Management**: React Hooks, Context API

## 📋 사전 요구사항

- Node.js 18+ 
- npm 또는 yarn
- Firebase 프로젝트 설정 (환경 변수 필요)

## 🛠️ 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 Firebase 설정을 추가하세요:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_RECAPTCHA_ENTERPRISE_SITE_KEY=your_recaptcha_key
VITE_APPCHECK_DEBUG_TOKEN=your_debug_token  # 개발 환경용
```

### 3. 개발 서버 실행

```bash
npm run dev
```

개발 서버는 `http://localhost:3000`에서 실행됩니다.

## 📜 사용 가능한 스크립트

- `npm run dev` - 개발 서버 시작
- `npm run build` - 프로덕션 빌드
- `npm run preview` - 빌드된 앱 미리보기
- `npm run lint` - ESLint로 코드 검사
- `npm run test` - Jest로 테스트 실행
- `npm run prune` - 사용하지 않는 코드 검색 (ts-prune)

## 📁 프로젝트 구조

```
src/
├── components/          # React 컴포넌트
│   ├── MainScreen/     # 메인 화면 (리팩토링됨)
│   ├── ui/             # 공유 UI 컴포넌트 (Radix UI 기반)
│   └── hooks/          # 커스텀 훅
├── firebase.ts         # Firebase 초기화
├── styles/             # 전역 스타일
└── utils/              # 유틸리티 함수
```

## 🔧 주요 기능

- 사용자 인증 (Firebase Authentication)
- 게시물 작성/조회/댓글
- 팔로우/언팔로우
- 북마크
- 칭호 시스템
- 오프라인 지원
- 푸시 알림

## 📱 Android 빌드

```bash
# Capacitor Android 프로젝트 동기화
npx cap sync android

# Android Studio에서 빌드
npx cap open android
```

## ⚙️ 설정

### TypeScript
- 엄격한 타입 체크 활성화
- 사용하지 않는 변수/매개변수 검사
- 모든 코드 경로 반환값 검사

### Vite
- 프로덕션 빌드에서만 console 제거
- SWC를 사용한 빠른 빌드
- 경로 별칭: `@/` → `src/`

## 📝 참고사항

- React 18.3.1 사용 (React 19는 보안 이슈로 인해 사용하지 않음)
- Firebase Functions는 `asia-northeast3` 리전 사용
- 개발 환경에서는 App Check 디버그 토큰 사용 가능

## 🚀 성능 최적화

프로젝트의 성능 최적화 계획 및 구현 가이드는 다음 문서를 참고하세요:

- [성능 최적화 계획서](./PERFORMANCE_OPTIMIZATION_PLAN.md) - 단계별 최적화 계획
- [성능 최적화 구현 예시](./PERFORMANCE_OPTIMIZATION_EXAMPLES.md) - 실제 코드 예시 및 사용법
- [성능 분석 결과](./PERFORMANCE_ANALYSIS.md) - 성능 분석 및 측정 결과

## 🔗 관련 링크

- [Figma 디자인](https://www.figma.com/design/kDRiVhbI8lJ4lMk1CYObqU/Android-App-Login-Screens)
- [Firebase 문서](https://firebase.google.com/docs)
- [Capacitor 문서](https://capacitorjs.com/docs)