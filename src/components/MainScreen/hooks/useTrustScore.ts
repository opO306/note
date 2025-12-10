// MainScreen/hooks/useTrustScore.ts
// 신뢰도(Trust Score) 관련 로직을 관리하는 훅

import { useState, useEffect, useCallback, useMemo } from "react";
import { auth, db } from "@/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { safeLocalStorage } from "@/components/utils/storageUtils";

interface UseTrustScoreParams {
  // useLumens의 실제 시그니처: (amount: number, reason: string, achievementId?: string) => boolean
  addLumens: (amount: number, reason: string, achievementId?: string) => boolean;
}

export function useTrustScore({ addLumens }: UseTrustScoreParams) {
  // 신뢰도 (0~100, 기본 30)
  const [trustScore, setTrustScore] = useState<number>(30);

  // localStorage에서 초기값 복원
  useEffect(() => {
    const savedTrust = safeLocalStorage.getNumber("trustScore", 30);
    setTrustScore(savedTrust);
  }, []);

  // Firestore에서 신뢰도 불러오기
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const fetchTrustScore = async () => {
      try {
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          if (typeof data.trustScore === "number") {
            setTrustScore(data.trustScore);
            safeLocalStorage.setItem("trustScore", String(data.trustScore));
          }
        }
      } catch (error) {
        console.error("신뢰도 불러오기 실패:", error);
      }
    };

    fetchTrustScore();
  }, []);

  // 신뢰도 보정 (0~100로 고정)
  const clampedTrust = useMemo(
    () => Math.max(0, Math.min(100, trustScore)),
    [trustScore]
  );

  // 루멘 획득 배율 (신뢰도 10 이하면 절반, 0이면 0)
  const lumenMultiplier = useMemo(
    () => (clampedTrust <= 10 ? 0.5 : 1),
    [clampedTrust]
  );

  // 신뢰도 변경 함수 (localStorage + Firestore 동기화)
  const updateTrust = useCallback((delta: number) => {
    setTrustScore((prev) => {
      const next = Math.max(0, Math.min(100, prev + delta));

      // 1) 로컬 저장
      safeLocalStorage.setItem("trustScore", next.toString());

      // 2) Firestore에도 저장
      const uid = auth.currentUser?.uid ?? null;
      if (uid) {
        const userRef = doc(db, "users", uid);
        updateDoc(userRef, { trustScore: next }).catch((error) => {
          console.error("신뢰도 Firestore 업데이트 실패:", error);
        });
      }

      return next;
    });
  }, []);

  // 신뢰도 적용된 루멘 추가 함수
  const addLumensWithTrust = useCallback(
    (amount: number, reason?: string, meta?: any) => {
      // 신뢰도 0이면 루멘 획득 불가
      if (clampedTrust <= 0) return;

      const adjusted = Math.floor(amount * lumenMultiplier);
      if (adjusted <= 0) return;

      addLumens(adjusted, reason ?? "", meta);
    },
    [addLumens, clampedTrust, lumenMultiplier]
  );

  // 글 작성 가능 여부 (신뢰도 0 이하면 불가)
  const canWrite = clampedTrust > 0;

  return {
    trustScore,
    clampedTrust,
    lumenMultiplier,
    updateTrust,
    addLumensWithTrust,
    canWrite,
  };
}
