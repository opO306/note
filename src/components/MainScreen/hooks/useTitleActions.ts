import { useState, useEffect, useCallback } from "react";
import { auth, db } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { toast } from "@/toastHelper";
import { safeLocalStorage } from "@/components/utils/storageUtils";
import { getUserDataFromFirestore, invalidateUserDataCache } from "@/utils/userDataLoader";

// #region agent log helper
const debugLog = (location: string, message: string, data: any, hypothesisId: string) => {
  const logEntry = {
    location,
    message,
    data,
    timestamp: Date.now(),
    sessionId: 'debug-session',
    runId: 'run1',
    hypothesisId
  };
  console.log(`[DEBUG ${hypothesisId}] ${location}: ${message}`, data);
  try {
    const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]');
    logs.push(logEntry);
    if (logs.length > 100) logs.shift(); // 최대 100개만 유지
    localStorage.setItem('debug_logs', JSON.stringify(logs));
  } catch (_e) {}
};
// #endregion

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
  const [isInitialLoad, setIsInitialLoad] = useState(true); // 🔹 초기 로드 플래그
  const [authReady, setAuthReady] = useState(false); // 🔹 인증 준비 상태

  // ✅ 인증 상태 확인 (항상 실행되어야 함 - Hook 순서 유지)
  useEffect(() => {
    // 즉시 확인
    if (auth.currentUser) {
      setAuthReady(true);
      // #region agent log
      debugLog('useTitleActions.ts:auth', '인증 상태 즉시 확인', { uid: auth.currentUser.uid }, 'A');
      // #endregion
    }
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthReady(true);
      // #region agent log
      debugLog('useTitleActions.ts:auth', '인증 상태 변경', { uid: user?.uid || 'null', hasUser: !!user }, 'A');
      // #endregion
    });
    return () => unsubscribe();
  }, []);

  // ✅ 로컬 스토리지에서 초기값 로드 (인증 준비 후에만)
  useEffect(() => {
    if (!authReady) return; // 🔹 인증이 준비될 때까지 대기
    
    const uid = auth.currentUser?.uid;
    // #region agent log
    debugLog('useTitleActions.ts:27', '로컬 스토리지 읽기 시작', { uid: uid || 'null' }, 'A');
    // #endregion
    if (!uid) return; // 🔹 uid가 없으면 로컬 스토리지에서 읽지 않음
    
    const ownedTitlesKey = getUserScopedStorageKey("ownedTitles");
    const currentTitleKey = getUserScopedStorageKey("currentTitle");
    // #region agent log
    debugLog('useTitleActions.ts:32', '로컬 스토리지 키 생성', { ownedTitlesKey, currentTitleKey, uid }, 'E');
    // #endregion
    const savedOwnedTitles = safeLocalStorage.getJSON(ownedTitlesKey, []);
    if (Array.isArray(savedOwnedTitles)) {
      setOwnedTitles(savedOwnedTitles);
    }
    const savedCurrentTitle = safeLocalStorage.getItem(currentTitleKey);
    // #region agent log
    // 🔹 로컬 스토리지의 모든 키 확인 (디버깅용)
    const allKeys: string[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('currentTitle') || key.includes('ownedTitles'))) {
          allKeys.push(key);
        }
      }
    } catch (_e) {}
    debugLog('useTitleActions.ts:38', '로컬 스토리지에서 읽은 값', { 
      savedCurrentTitle: savedCurrentTitle || 'null', 
      savedCurrentTitleType: typeof savedCurrentTitle,
      savedCurrentTitleLength: savedCurrentTitle?.length || 0,
      currentTitleKey,
      allRelevantKeys: allKeys
    }, 'A');
    // #endregion
    if (savedCurrentTitle && savedCurrentTitle.trim() !== "") {
      setCurrentTitle(savedCurrentTitle);
      // #region agent log
      debugLog('useTitleActions.ts:41', '로컬 스토리지 값으로 currentTitle 설정', { savedCurrentTitle }, 'A');
      // #endregion
    } else {
      // #region agent log
      debugLog('useTitleActions.ts:else', '로컬 스토리지 값이 없거나 빈 값', { 
        savedCurrentTitle, 
        isNull: savedCurrentTitle === null,
        isEmpty: savedCurrentTitle === '',
        trimmed: savedCurrentTitle?.trim() === ''
      }, 'A');
      // #endregion
    }
  }, [authReady]);

  // ✅ Firebase에서 칭호 정보 가져오기 (통합 로더 사용으로 중복 요청 제거)
  useEffect(() => {
    if (!authReady) return; // 🔹 인증이 준비될 때까지 대기
    
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const fetchTitlesFromFirestore = async () => {
      try {
        // ✅ 통합 로더를 사용하여 한 번의 요청으로 모든 데이터 가져오기
        const userData = await getUserDataFromFirestore(uid);
        // #region agent log
        debugLog('useTitleActions.ts:50', 'Firestore에서 가져온 값', { 
          firestoreCurrentTitle: userData.currentTitle, 
          firestoreCurrentTitleType: typeof userData.currentTitle,
          firestoreCurrentTitleIsNull: userData.currentTitle === null,
          firestoreOwnedTitles: userData.ownedTitles,
          uid 
        }, 'B');
        // #endregion

        // 서버에서 가져온 데이터로 상태 업데이트
        if (userData.ownedTitles.length > 0) {
          setOwnedTitles((prev) => {
            const merged = Array.from(new Set([...prev, ...userData.ownedTitles]));
            const ownedTitlesKey = getUserScopedStorageKey("ownedTitles");
            safeLocalStorage.setJSON(ownedTitlesKey, merged);
            return merged;
          });
        }

        // 🔹 currentTitle 처리: Firestore 값이 우선, 없으면 로컬 스토리지 값 유지
        const currentTitleKey = getUserScopedStorageKey("currentTitle");
        // 🔹 현재 상태에서 currentTitle 값도 확인 (이미 로컬 스토리지에서 로드했을 수 있음)
        const currentStateTitle = currentTitle; // 이미 설정된 값
        const savedCurrentTitle = safeLocalStorage.getItem(currentTitleKey) || "";
        // #region agent log
        debugLog('useTitleActions.ts:64', 'Firestore 처리 전 상태', { 
          firestoreValue: userData.currentTitle, 
          savedValue: savedCurrentTitle, 
          currentStateValue: currentStateTitle,
          currentTitleKey 
        }, 'B');
        // #endregion
        
        // 🔹 우선순위: Firestore > 현재 상태 > 로컬 스토리지
        const finalTitle = userData.currentTitle !== null 
          ? userData.currentTitle 
          : (currentStateTitle && currentStateTitle.trim() !== "" 
              ? currentStateTitle 
              : (savedCurrentTitle && savedCurrentTitle.trim() !== "" ? savedCurrentTitle : ""));
        
        if (finalTitle) {
          setCurrentTitle(finalTitle);
          safeLocalStorage.setItem(currentTitleKey, finalTitle);
          // #region agent log
          debugLog('useTitleActions.ts:final', '최종 값 설정', { 
            finalValue: finalTitle, 
            source: userData.currentTitle !== null ? 'firestore' : (currentStateTitle ? 'state' : 'localStorage')
          }, 'B');
          // #endregion
          
          // Firestore에 값이 없고 로컬/상태에 값이 있으면 Firestore에 동기화
          if (userData.currentTitle === null && finalTitle !== userData.currentTitle) {
            try {
              const userRef = doc(db, "users", uid);
              await updateDoc(userRef, {
                currentTitle: finalTitle,
              });
              invalidateUserDataCache(uid);
              // #region agent log
              debugLog('useTitleActions.ts:sync', '로컬 값 Firestore 동기화 완료', { finalTitle }, 'B');
              // #endregion
            } catch (syncError) {
              console.error("로컬 칭호 Firestore 동기화 실패:", syncError);
              // 동기화 실패해도 로컬 값은 유지
            }
          }
        } else {
          // 둘 다 없으면 빈 문자열
          setCurrentTitle("");
          safeLocalStorage.setItem(currentTitleKey, "");
          // #region agent log
          debugLog('useTitleActions.ts:85', '빈 값으로 설정', { reason: '모든 소스에 값 없음' }, 'B');
          // #endregion
        }
      } catch (error) {
        console.error("칭호 정보 불러오기 실패:", error);
      } finally {
        setTitlesSyncReady(true);
        setIsInitialLoad(false); // 🔹 초기 로드 완료
        // #region agent log
        debugLog('useTitleActions.ts:92', '초기 로드 완료', { titlesSyncReady: true, isInitialLoad: false }, 'D');
        // #endregion
      }
    };

    fetchTitlesFromFirestore();
  }, [authReady, currentTitle]);
  // ✅ Firestore에 칭호 정보 동기화 (업데이트 시 캐시 무효화)
  // 🔹 초기 로드 중에는 실행하지 않음 (Firestore에서 가져온 값이 우선)
  useEffect(() => {
    if (!titlesSyncReady || isInitialLoad) return; // 🔹 초기 로드 중에는 실행 안 함
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const syncToFirestore = async () => {
      // #region agent log
      debugLog('useTitleActions.ts:105', 'syncToFirestore 실행', { currentTitle, isInitialLoad, titlesSyncReady }, 'C');
      // #endregion
      try {
        const userRef = doc(db, "users", uid);
        const valueToSave = currentTitle || null;
        // #region agent log
        debugLog('useTitleActions.ts:110', 'Firestore에 저장할 값', { valueToSave, originalCurrentTitle: currentTitle }, 'C');
        // #endregion
        await updateDoc(userRef, {
          ownedTitles,
          currentTitle: valueToSave,
        });
        
        // ✅ 데이터 업데이트 후 캐시 무효화
        invalidateUserDataCache(uid);
      } catch (error) {
        console.error("칭호 정보 동기화 실패:", error);
      }
    };

    syncToFirestore();
  }, [ownedTitles, currentTitle, titlesSyncReady, isInitialLoad]);

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

  // ✅ 칭호 장착/해제 로직
  const handleTitleEquip = useCallback(
    async (titleId: string): Promise<boolean> => {
      if (!titlesSyncReady) {
        toast.error("잠시만요! 칭호 정보를 불러오는 중입니다.");
        return false;
      }
      if (!ownedTitles.includes(titleId)) {
        toast.error("소유하지 않은 칭호는 장착할 수 없습니다.");
        return false;
      }

      const uid = auth.currentUser?.uid;
      if (!uid) {
        toast.error("로그인이 필요합니다.");
        return false;
      }

      const previous = currentTitle;
      setCurrentTitle(titleId);
      const currentTitleKey = getUserScopedStorageKey("currentTitle");
      safeLocalStorage.setItem(currentTitleKey, titleId);
      // #region agent log
      // 🔹 저장 후 즉시 확인
      const verifySaved = safeLocalStorage.getItem(currentTitleKey);
      debugLog('useTitleActions.ts:175', '칭호 장착 - 로컬 스토리지 저장', { 
        titleId, 
        currentTitleKey,
        previous,
        verifySaved,
        verifySavedMatch: verifySaved === titleId
      }, 'A');
      // #endregion

      try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
          currentTitle: titleId,
        });
        invalidateUserDataCache(uid);
        return true;
      } catch {
        // 서버 저장 실패하면 화면도 원래 상태로 되돌림
        setCurrentTitle(previous);
        safeLocalStorage.setItem(currentTitleKey, previous);
        toast.error("칭호 장착에 실패했습니다.");
        return false;
      }
    },
    [ownedTitles, currentTitle, titlesSyncReady]
  );

  const handleTitleUnequip = useCallback(
    async (): Promise<boolean> => {
      if (!titlesSyncReady) {
        toast.error("잠시만요! 칭호 정보를 불러오는 중입니다.");
        return false;
      }

      const uid = auth.currentUser?.uid;
      if (!uid) {
        toast.error("로그인이 필요합니다.");
        return false;
      }

      const previous = currentTitle;
      setCurrentTitle("");
      const currentTitleKey = getUserScopedStorageKey("currentTitle");
      safeLocalStorage.setItem(currentTitleKey, "");

      try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
          currentTitle: "",
        });
        invalidateUserDataCache(uid);
        return true;
      } catch {
        // 서버 저장 실패하면 화면도 원래 상태로 되돌림
        setCurrentTitle(previous);
        safeLocalStorage.setItem(currentTitleKey, previous);
        toast.error("칭호 해제에 실패했습니다.");
        return false;
      }
    },
    [currentTitle, titlesSyncReady]
  );
  const addSpecialTitle = useCallback(
    async (titleId: string, titleName: string): Promise<void> => {
      if (!titlesSyncReady) {
        console.warn("칭호 정보가 아직 준비되지 않았습니다.");
        return;
      }

      // 이미 보유한 칭호인지 확인
      if (ownedTitles.includes(titleId)) {
        console.log(`이미 보유한 칭호입니다: ${titleName}`);
        return;
      }

      const uid = auth.currentUser?.uid;
      if (!uid) {
        console.warn("로그인이 필요합니다.");
        return;
      }

      // 로컬 상태에 칭호 추가
      setOwnedTitles((prev) => {
        if (prev.includes(titleId)) return prev;
        const updated = [...prev, titleId];
        const ownedTitlesKey = getUserScopedStorageKey("ownedTitles");
        safeLocalStorage.setJSON(ownedTitlesKey, updated);
        return updated;
      });

      // Firestore에 칭호 추가
      try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
          ownedTitles: arrayUnion(titleId),
        });
        invalidateUserDataCache(uid);
        toast.success(`칭호 "${titleName}" 획득! 🎉`);
      } catch (error) {
        console.error("칭호 추가 실패:", error);
        // 실패 시 로컬 상태도 되돌림
        setOwnedTitles((prev) => {
          const filtered = prev.filter((id) => id !== titleId);
          const ownedTitlesKey = getUserScopedStorageKey("ownedTitles");
          safeLocalStorage.setJSON(ownedTitlesKey, filtered);
          return filtered;
        });
      }
    },
    [ownedTitles, titlesSyncReady]
  );
  const hasTitle = useCallback((titleId: string) => ownedTitles.includes(titleId), [ownedTitles]);

  return { ownedTitles, currentTitle, titlesSyncReady, handleTitlePurchase, handleTitleEquip, handleTitleUnequip, addSpecialTitle, hasTitle, setOwnedTitles, setCurrentTitle };
}