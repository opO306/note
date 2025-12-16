import { useState, useEffect, useCallback, useMemo } from "react";
import { auth, db, functions } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { toast } from "@/toastHelper";
import { safeLocalStorage } from "@/components/utils/storageUtils";

interface UseTrustScoreParams {
  // ✨ [해결 1] addLumens가 Promise를 반환하도록 타입을 변경합니다.
  addLumens: (amount: number, reason: string, achievementId?: string) => Promise<void>;
}

export function useTrustScore({ addLumens }: UseTrustScoreParams) {
  const [trustScore, setTrustScore] = useState<number>(30);

  // ... (useEffect 로직들은 그대로 유지)
  useEffect(() => { const savedTrust = safeLocalStorage.getNumber("trustScore", 30); setTrustScore(savedTrust); }, []);
  useEffect(() => { const uid = auth.currentUser?.uid; if (!uid) return; const fetchTrustScore = async () => { try { const userRef = doc(db, "users", uid); const snap = await getDoc(userRef); if (snap.exists()) { const data = snap.data(); if (typeof data.trustScore === "number") { setTrustScore(data.trustScore); safeLocalStorage.setItem("trustScore", String(data.trustScore)); } } } catch (error) { console.error("신뢰도 불러오기 실패:", error); } }; fetchTrustScore(); }, []);

  const clampedTrust = useMemo(() => Math.max(0, Math.min(100, trustScore)), [trustScore]);
  const lumenMultiplier = useMemo(() => (clampedTrust <= 10 ? 0.5 : 1), [clampedTrust]);
  const canWrite = clampedTrust > 0;

  const updateTrust = useCallback((delta: number) => { /* ... 기존과 동일 ... */ }, []);

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