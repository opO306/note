// src/utils/initialDataLoader.ts
// 초기 진입 시 필요한 모든 사용자 데이터를 한 번에 가져오는 통합 함수
// 기존 3번의 개별 호출을 1번으로 통합하여 네트워크 지연 감소

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
 * 
 * 기존 방식:
 * - getUserProfile() → Firestore 호출 1
 * - getTrustScore() → Cloud Function 호출 1
 * - getTitle() → Firestore 호출 1
 * 총 3번의 네트워크 요청
 * 
 * 개선 방식:
 * - Firestore에서 프로필 + 타이틀 정보 동시 조회 (1번)
 * - Cloud Function으로 신뢰도 점수 조회 (1번)
 * 총 2번의 네트워크 요청 (33% 감소)
 * 
 * @returns 초기 사용자 데이터 또는 null (로그인되지 않은 경우)
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
    // TODO: 향후 Cloud Function을 통합하여 1번의 호출로 줄일 수 있음
    let trustScore = 30; // 기본값
    try {
      const getTrustScore = httpsCallable(functions, "getTrustScore");
      const trustResult = await getTrustScore({ uid: user.uid });
      trustScore = (trustResult.data as any)?.trustScore ?? 30;
    } catch {
      // 신뢰도 점수 조회 실패 시 Firestore에서 직접 읽기 시도
      if (typeof userData.trustScore === "number") {
        trustScore = userData.trustScore;
      }
    }

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

