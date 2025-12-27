import { useState, useEffect, useCallback, useMemo } from "react";
import { auth } from "@/firebase";
import { safeLocalStorage } from "@/components/utils/storageUtils";
import { getUserDataFromFirestore } from "@/utils/userDataLoader";

interface UseTrustScoreParams {
  // ✨ [해결 1] addLumens가 Promise를 반환하도록 타입을 변경합니다.
  addLumens: (amount: number, reason: string, achievementId?: string) => Promise<void>;
}

export function useTrustScore({ addLumens }: UseTrustScoreParams) {
  const [trustScore, setTrustScore] = useState<number>(30);

  // ✅ 로컬 스토리지에서 초기값 로드
  useEffect(() => {
    const savedTrust = safeLocalStorage.getNumber("trustScore", 30);
    setTrustScore(savedTrust);
  }, []);

  // ✅ Firebase에서 신뢰도 점수 가져오기 (통합 로더 사용으로 중복 요청 제거)
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const fetchTrustScore = async () => {
      try {
        // ✅ 통합 로더를 사용하여 한 번의 요청으로 모든 데이터 가져오기
        const userData = await getUserDataFromFirestore(uid);
        setTrustScore(userData.trustScore);
        safeLocalStorage.setItem("trustScore", String(userData.trustScore));
      } catch (error) {
        console.error("신뢰도 불러오기 실패:", error);
      }
    };

    fetchTrustScore();
  }, []);

  const clampedTrust = useMemo(() => Math.max(0, Math.min(100, trustScore)), [trustScore]);
  const lumenMultiplier = useMemo(() => (clampedTrust <= 10 ? 0.5 : 1), [clampedTrust]);
  const canWrite = clampedTrust > 0;

  const updateTrust = useCallback((_delta: number) => { /* ... 기존과 동일 ... */ }, []);

  // ✨ [해결 2] addLumensWithTrust 함수를 async로 만들고, addLumens를 await로 호출합니다.
  const addLumensWithTrust = useCallback(
    async (amount: number, reason?: string, meta?: any) => {
      if (clampedTrust <= 0) return;
      const adjusted = Math.floor(amount * lumenMultiplier);
      if (adjusted <= 0) return;

      // addLumens는 이제 비동기이므로 await를 사용합니다.
      await addLumens(adjusted, reason ?? "", meta);
    },
    [addLumens, clampedTrust, lumenMultiplier]
  );

  return { trustScore, clampedTrust, lumenMultiplier, updateTrust, addLumensWithTrust, canWrite };
}