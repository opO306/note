import { useState, useEffect, useCallback } from "react";
import { auth, db } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { toast } from "@/toastHelper";
import { safeLocalStorage } from "@/components/utils/storageUtils";

const getUserScopedStorageKey = (baseKey: string): string => {
  const uid = auth.currentUser?.uid;
  return uid ? `${baseKey}_${uid}` : baseKey;
};

interface UseTitleActionsParams {
  lumenBalance: number;
  // ✨ [해결 1] spendLumens가 Promise<boolean>을 반환하도록 타입을 변경합니다.
  spendLumens: (amount: number, reason: string, titleId?: string) => Promise<boolean>;
}

export function useTitleActions({ lumenBalance, spendLumens }: UseTitleActionsParams) {
  const [ownedTitles, setOwnedTitles] = useState<string[]>([]);
  const [currentTitle, setCurrentTitle] = useState<string>("");
  const [titlesSyncReady, setTitlesSyncReady] = useState(false);

  // ... (useEffect 로직들은 그대로 유지)
  useEffect(() => { const ownedTitlesKey = getUserScopedStorageKey("ownedTitles"); const currentTitleKey = getUserScopedStorageKey("currentTitle"); const savedOwnedTitles = safeLocalStorage.getJSON(ownedTitlesKey, []); if (Array.isArray(savedOwnedTitles)) { setOwnedTitles(savedOwnedTitles); } const savedCurrentTitle = safeLocalStorage.getItem(currentTitleKey); if (savedCurrentTitle) { setCurrentTitle(savedCurrentTitle); } }, []);
  useEffect(() => { const uid = auth.currentUser?.uid; if (!uid) return; const fetchTitlesFromFirestore = async () => { try { const userRef = doc(db, "users", uid); const snap = await getDoc(userRef); if (!snap.exists()) { setTitlesSyncReady(true); return; } const data = snap.data(); if (Array.isArray(data.ownedTitles)) { const serverOwnedTitles = data.ownedTitles.filter((id: unknown): id is string => typeof id === "string"); if (serverOwnedTitles.length > 0) { setOwnedTitles((prev) => { const merged = Array.from(new Set([...prev, ...serverOwnedTitles])); const ownedTitlesKey = getUserScopedStorageKey("ownedTitles"); safeLocalStorage.setJSON(ownedTitlesKey, merged); return merged; }); } } if (typeof data.currentTitle === "string") { const currentTitleKey = getUserScopedStorageKey("currentTitle"); if (data.currentTitle) { setCurrentTitle(data.currentTitle); safeLocalStorage.setItem(currentTitleKey, data.currentTitle); } else { setCurrentTitle(""); safeLocalStorage.setItem(currentTitleKey, ""); } } } catch (error) { console.error("칭호 정보 불러오기 실패:", error); } finally { setTitlesSyncReady(true); } }; fetchTitlesFromFirestore(); }, []);
  useEffect(() => { if (!titlesSyncReady) return; const uid = auth.currentUser?.uid; if (!uid) return; const syncToFirestore = async () => { try { const userRef = doc(db, "users", uid); await updateDoc(userRef, { ownedTitles, currentTitle: currentTitle || null }); } catch (error) { console.error("칭호 정보 동기화 실패:", error); } }; syncToFirestore(); }, [ownedTitles, currentTitle, titlesSyncReady]);

  // ✨ [해결 2] handleTitlePurchase 함수를 async로 만들고, spendLumens를 await로 호출합니다.
  const handleTitlePurchase = useCallback(
    async (titleId: string, cost: number): Promise<boolean> => {
      if (!titlesSyncReady) { toast.error("잠시만요! 칭호 정보를 불러오는 중입니다."); return false; }
      if (cost < 0) { toast.error("잘못된 가격 정보입니다."); return false; }
      if (ownedTitles.includes(titleId)) { toast.error("이미 보유한 칭호입니다."); return false; }
      if (cost > 0 && lumenBalance < cost) { toast.error("루멘이 부족합니다."); return false; }

      // 루멘 차감을 시도하고 성공 여부를 기다립니다.
      if (cost > 0) {
        const success = await spendLumens(cost, "칭호 구매", titleId);
        if (!success) {
          // spendLumens 내부에서 이미 토스트를 띄우므로 여기선 추가 메시지 불필요
          return false;
        }
      }

      // 성공 시에만 칭호를 추가합니다.
      setOwnedTitles((prev) => {
        if (prev.includes(titleId)) return prev;
        const updated = [...prev, titleId];
        safeLocalStorage.setJSON(getUserScopedStorageKey("ownedTitles"), updated);
        return updated;
      });

      toast.success("칭호를 구매했습니다! 🎉");
      return true;
    },
    [ownedTitles, lumenBalance, spendLumens, titlesSyncReady]
  );

  // ... (handleTitleEquip, handleTitleUnequip 등 나머지 함수는 그대로 유지)
  const handleTitleEquip = useCallback((titleId: string) => { /* ... */ return true; }, [ownedTitles, currentTitle]);
  const handleTitleUnequip = useCallback(() => { /* ... */ return true; }, [currentTitle]);
  const addSpecialTitle = useCallback((titleId: string, titleName: string) => { /* ... */ }, []);
  const hasTitle = useCallback((titleId: string) => ownedTitles.includes(titleId), [ownedTitles]);

  return { ownedTitles, currentTitle, titlesSyncReady, handleTitlePurchase, handleTitleEquip, handleTitleUnequip, addSpecialTitle, hasTitle, setOwnedTitles, setCurrentTitle };
}