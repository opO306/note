/**
 * ===================================================================
 * Firebase Functions Entry Point
 * ===================================================================
 * 이 파일은 각 기능별로 분리된 파일들에서 함수를 가져와
 * Firebase에 배포될 수 있도록 최종적으로 export하는 역할을 합니다.
 *
 * 새로운 함수를 추가할 때는, 역할에 맞는 파일(triggers.ts, callable.ts 등)에
 * 작성한 뒤, 해당 파일에서 export하면 이곳에서 자동으로 포함됩니다.
 */

// 1. Genkit 텔레메트리 활성화 (반드시 최상단에 위치해야 함)
import { enableFirebaseTelemetry } from "@genkit-ai/firebase";
enableFirebaseTelemetry();

// 2. 각 모듈에서 모든 함수를 가져와 그대로 다시 내보내기
// selectGuide는 callable.ts에 정의되어 있으므로 여기서 별도로 export하지 않음

// Firestore, Auth 등 이벤트 기반 트리거
export * from "./triggers";

// 클라이언트에서 직접 호출하는 함수
export * from "./callable";

// Genkit 및 AI 관련 함수
export * from "./ai";

// 3. (선택적) 별도 파일로 관리되던 기존 함수들
//    - 이 함수들도 동일한 패턴으로 관리할 수 있습니다.
export * from "./aiModeration";
export * from "./aiAutoReply";
export * from "./dailyRecommendations";
export * from "./weeklyQuiz";
export * from "./weeklyStats";
export * from "./aiScheduler";