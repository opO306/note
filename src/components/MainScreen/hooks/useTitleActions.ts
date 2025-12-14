// MainScreen/hooks/useTitleActions.ts
// 칭호 구매/장착/해제 관련 로직을 관리하는 훅

import { useState, useEffect, useCallback } from "react";
import { auth, db } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { toast } from "@/toastHelper";
import { safeLocalStorage } from "@/components/utils/storageUtils";

// 계정별 localStorage 키 생성 함수
const getUserScopedStorageKey = (baseKey: string): string => {
  const uid = auth.currentUser?.uid;
  if (!uid) return baseKey;
  return `${baseKey}_${uid}`;
};

interface UseTitleActionsParams {
  lumenBalance: number;
  spendLumens: (amount: number, reason: string, titleId?: string) => boolean;
}

export function useTitleActions({
  lumenBalance,
  spendLumens,
}: UseTitleActionsParams) {
  // 보유한 칭호 목록
  const [ownedTitles, setOwnedTitles] = useState<string[]>([]);

  // 현재 장착한 칭호
  const [currentTitle, setCurrentTitle] = useState<string>("");

  // Firestore 동기화 준비 완료 여부
  const [titlesSyncReady, setTitlesSyncReady] = useState(false);

  // localStorage에서 상태 복원
  useEffect(() => {
    const ownedTitlesKey = getUserScopedStorageKey("ownedTitles");
    const currentTitleKey = getUserScopedStorageKey("currentTitle");

    const savedOwnedTitles = safeLocalStorage.getJSON(ownedTitlesKey, []);
    if (Array.isArray(savedOwnedTitles)) {
      setOwnedTitles(savedOwnedTitles);
    }

    const savedCurrentTitle = safeLocalStorage.getItem(currentTitleKey);

    // 🔹 더 이상 guide_sprout 를 특별 취급하지 않고 그대로 복원
    if (savedCurrentTitle) {
      setCurrentTitle(savedCurrentTitle);
    }
  }, []);

  // Firestore에서 칭호 정보 불러오기
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const fetchTitlesFromFirestore = async () => {
      try {
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          setTitlesSyncReady(true);
          return;
        }

        const data = snap.data() as any;

        // Firestore에 저장된 칭호 정보 병합
        if (Array.isArray(data.ownedTitles)) {
          const serverOwnedTitles = data.ownedTitles.filter(
            (id: unknown): id is string => typeof id === "string"
          );

          if (serverOwnedTitles.length > 0) {
            setOwnedTitles((prev) => {
              const merged = Array.from(new Set([...prev, ...serverOwnedTitles]));
              const ownedTitlesKey = getUserScopedStorageKey("ownedTitles");
              safeLocalStorage.setJSON(ownedTitlesKey, merged);
              return merged;
            });
          }
        }

        if (typeof data.currentTitle === "string") {
          const currentTitleKey = getUserScopedStorageKey("currentTitle");

          if (data.currentTitle) {
            // 🔹 guide_sprout 포함, 모든 문자열 칭호를 그대로 복원
            setCurrentTitle(data.currentTitle);
            safeLocalStorage.setItem(currentTitleKey, data.currentTitle);
          } else {
            // 비어 있으면 해제 상태로 맞춤
            setCurrentTitle("");
            safeLocalStorage.setItem(currentTitleKey, "");
          }
        }

      } catch (error) {
        console.error("칭호 정보 불러오기 실패:", error);
      } finally {
        setTitlesSyncReady(true);
      }
    };

    fetchTitlesFromFirestore();
  }, []);

  // Firestore 동기화 (ownedTitles, currentTitle 변경 시)
  useEffect(() => {
    if (!titlesSyncReady) return;

    const uid = auth.currentUser?.uid ?? null;
    if (!uid) return;

    const syncToFirestore = async () => {
      try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
          ownedTitles,
          currentTitle: currentTitle || null,
        });
      } catch (error) {
        console.error("칭호 정보 동기화 실패:", error);
      }
    };

    syncToFirestore();
  }, [ownedTitles, currentTitle, titlesSyncReady]);

  // 칭호 구매
  const handleTitlePurchase = useCallback(
    (titleId: string, cost: number) => {
      // 0. Firestore 동기화가 아직 안 끝났으면, 잠깐 막아두기
      if (!titlesSyncReady) {
        toast.error("잠시만요! 칭호 정보를 불러오는 중입니다.");
        return false;
      }

      // 0-1. 잘못된 가격 값 방어 (혹시라도 음수가 들어오는 경우)
      if (cost < 0) {
        console.error("[titles] cost는 음수가 될 수 없습니다.", { titleId, cost });
        toast.error("잘못된 가격 정보입니다. 다시 시도해 주세요.");
        return false;
      }

      // 1. 이미 가지고 있는지 확인
      if (ownedTitles.includes(titleId)) {
        toast.error("이미 보유한 칭호입니다.");
        return false;
      }

      // 2. 루멘이 충분한지 확인 (0루멘 칭호는 그냥 통과)
      if (cost > 0 && lumenBalance < cost) {
        toast.error("루멘이 부족합니다.");
        return false;
      }

      // 3. 루멘 차감 (0루멘 칭호는 차감 없이 패스)
      if (cost > 0) {
        const success = spendLumens(cost, "칭호 구매", titleId);
        if (!success) {
          toast.error("구매에 실패했습니다.");
          return false;
        }
      }

      // 4. 칭호 추가 (setState 안에서도 한 번 더 중복 방지)
      setOwnedTitles((prev) => {
        // 혹시라도 타이밍 이슈로 이미 추가된 경우 방어
        if (prev.includes(titleId)) {
          return prev;
        }

        const updated = [...prev, titleId];
        const ownedTitlesKey = getUserScopedStorageKey("ownedTitles");
        safeLocalStorage.setJSON(ownedTitlesKey, updated);
        return updated;
      });

      toast.success("칭호를 구매했습니다! 🎉");
      return true;
    },
    [ownedTitles, lumenBalance, spendLumens, titlesSyncReady] // 🔹 titlesSyncReady를 의존성에 추가
  );

  // 칭호 장착
  const handleTitleEquip = useCallback(
    (titleId: string) => {
      // 보유 중인 칭호인지 확인
      if (!ownedTitles.includes(titleId)) {
        toast.error("보유하지 않은 칭호입니다.");
        return false;
      }

      // 이미 장착 중인지 확인
      if (currentTitle === titleId) {
        toast.info("이미 장착 중인 칭호입니다.");
        return false;
      }

      setCurrentTitle(titleId);
      const currentTitleKey = getUserScopedStorageKey("currentTitle");
      safeLocalStorage.setItem(currentTitleKey, titleId);

      toast.success("칭호를 장착했습니다! ✨");
      return true;
    },
    [ownedTitles, currentTitle]
  );

  // 칭호 해제
  const handleTitleUnequip = useCallback(() => {
    if (!currentTitle) {
      toast.info("장착 중인 칭호가 없습니다.");
      return false;
    }

    setCurrentTitle("");
    const currentTitleKey = getUserScopedStorageKey("currentTitle");
    safeLocalStorage.setItem(currentTitleKey, "");

    toast.success("칭호를 해제했습니다.");
    return true;
  }, [currentTitle]);

  // 업적으로 획득한 특별 칭호 추가
  const addSpecialTitle = useCallback(
    (titleId: string, titleName: string) => {
      setOwnedTitles((prev) => {
        if (prev.includes(titleId)) {
          return prev;
        }

        const updated = [...prev, titleId];
        const ownedTitlesKey = getUserScopedStorageKey("ownedTitles");
        safeLocalStorage.setJSON(ownedTitlesKey, updated);

        console.log(`특별 칭호 '${titleName}' 획득!`);
        return updated;
      });
    },
    []
  );

  // 특정 칭호를 보유 중인지 확인
  const hasTitle = useCallback(
    (titleId: string) => {
      return ownedTitles.includes(titleId);
    },
    [ownedTitles]
  );

  return {
    ownedTitles,
    currentTitle,
    titlesSyncReady,
    handleTitlePurchase,
    handleTitleEquip,
    handleTitleUnequip,
    addSpecialTitle,
    hasTitle,
    setOwnedTitles,
    setCurrentTitle,
  };
}
