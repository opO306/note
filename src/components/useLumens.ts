// useLumens.ts - 루멘(Lumen) 관리 시스템

import { useState, useEffect, useCallback } from 'react';
// 🚨 [수정 1] firebase.ts에서 default export가 없으므로, 필요한 모든 것을 이름으로 직접 import합니다.
import { app, auth, db } from '../firebase';
import {
    doc,
    getDoc,
    setDoc,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from '../toastHelper'; // 👈 토스트 헬퍼 import 추가

export interface LumenTransaction {
    id: string;
    amount: number;
    reason: string;
    timestamp: number;
    achievementId?: string | null;
    titleId?: string | null;
}

export interface LumenData {
    balance: number;
    totalEarned: number;
    totalSpent: number;
    transactions: LumenTransaction[];
}

// Cloud Functions 인스턴스 (리전 지정)
const functions = getFunctions(app, 'asia-northeast3');

// Callable 함수 정의
const awardLumensFn = httpsCallable<any, { success: boolean }>(functions, 'awardLumens');
const purchaseTitleFn = httpsCallable<any, { success: boolean }>(functions, 'purchaseTitle');

const INITIAL_LUMEN_DATA: LumenData = {
    balance: 0,
    totalEarned: 0,
    totalSpent: 0,
    transactions: [],
};

/**
 * 루멘(재화) 상태를 관리하고 서버와 동기화하는 React 훅.
 * - Firestore를 단일 진실 소스로 사용합니다.
 * - Cloud Functions를 통해 안전하게 재화를 증감시킵니다.
 * - 낙관적 업데이트와 롤백 로직으로 사용자 경험과 데이터 정합성을 모두 확보합니다.
 */
export function useLumens() {
    const [lumenData, setLumenData] = useState<LumenData>(INITIAL_LUMEN_DATA);
    const [isLoading, setIsLoading] = useState(true);

    // Firestore에서 데이터를 불러와 상태를 동기화하는 로직
    useEffect(() => {
        const uid = auth.currentUser?.uid;
        if (!uid) {
            setIsLoading(false);
            return;
        }

        const userRef = doc(db, 'users', uid);
        let isCancelled = false;

        const syncFromFirestore = async () => {
            try {
                const snap = await getDoc(userRef);
                if (isCancelled) return;

                if (snap.exists()) {
                    const data = snap.data();
                    const fromServer: LumenData = {
                        balance: data.lumenBalance || 0,
                        totalEarned: data.lumenTotalEarned || 0,
                        totalSpent: data.lumenTotalSpent || 0,
                        transactions: (data.lumenTransactions || []).sort((a: any, b: any) => b.timestamp - a.timestamp),
                    };
                    setLumenData(fromServer);
                } else {
                    // 신규 유저의 경우 초기 데이터로 Firestore 문서 생성
                    await setDoc(userRef, {
                        lumenBalance: 0,
                        lumenTotalEarned: 0,
                        lumenTotalSpent: 0,
                        lumenTransactions: [],
                    }, { merge: true });
                    setLumenData(INITIAL_LUMEN_DATA);
                }
            } catch (error) {
                console.error('루멘 Firestore 동기화 실패:', error);
                toast.error("재화 정보를 불러오는 데 실패했습니다.");
            } finally {
                if (!isCancelled) setIsLoading(false);
            }
        };

        syncFromFirestore();

        return () => { isCancelled = true; };
    }, []); // 이 useEffect는 마운트 시 한 번만 실행되는 것이 올바릅니다.

    /**
     * 루멘 추가 (업적 달성 등)
     */
    const addLumens = useCallback(async (amount: number, reason: string, achievementId?: string) => {
        if (amount <= 0) return;

        const prevData = { ...lumenData }; // 롤백을 위해 이전 상태 저장

        // 1. 낙관적 업데이트: UI를 즉시 갱신
        const newTransaction: LumenTransaction = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            amount, reason, achievementId, timestamp: Date.now(),
        };
        setLumenData(prev => ({
            balance: prev.balance + amount,
            totalEarned: prev.totalEarned + amount,
            totalSpent: prev.totalSpent,
            transactions: [newTransaction, ...prev.transactions],
        }));

        // 2. 서버에 요청 전송
        try {
            const result = await awardLumensFn({ amount, reason, achievementId });
            if (!result.data.success) throw new Error("서버에서 루멘 추가를 거부했습니다.");
            // 루멘 추가 성공 (로그 제거)
        } catch (error) {
            // ✨ [개선 1] 롤백 로직: 서버 요청 실패 시 로컬 상태를 원래대로 되돌림
            // addLumens Cloud Function 호출 실패 (로그 제거)
            toast.error(`"${reason}" 보상 획득에 실패했습니다. 다시 시도해주세요.`);
            setLumenData(prevData); // 상태를 이전으로 복원
        }
    }, [lumenData]); // lumenData가 변경될 때마다 함수를 새로 생성하도록 의존성 추가

    /**
     * 루멘 사용 (칭호 구매 등)
     */
    const spendLumens = useCallback(async (amount: number, reason: string, titleId?: string): Promise<boolean> => {
        if (amount <= 0) return false;

        // 클라이언트에서 1차 잔액 확인
        if (lumenData.balance < amount) {
            toast.error("루멘이 부족합니다!");
            return false;
        }

        const prevData = { ...lumenData }; // 롤백을 위해 이전 상태 저장

        // 1. 낙관적 업데이트
        const newTransaction: LumenTransaction = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            amount: -amount, reason, titleId, timestamp: Date.now(),
        };
        setLumenData(prev => ({
            balance: prev.balance - amount,
            totalEarned: prev.totalEarned,
            totalSpent: prev.totalSpent + amount,
            transactions: [newTransaction, ...prev.transactions],
        }));

        // 2. 서버에 요청 전송
        try {
            // 칭호 구매는 전용 함수를, 그 외에는 일반 지출 함수를 호출 (만약 있다면)
            if (titleId) {
                const result = await purchaseTitleFn({ titleId });
                if (!result.data.success) throw new Error("서버에서 칭호 구매를 거부했습니다.");
                // 루멘 사용 성공 (로그 제거)
                toast.success("칭호를 성공적으로 구매했습니다!");
            } else {
                // TODO: 일반 루멘 사용 Cloud Function이 있다면 여기에 호출 로직 추가
                // 예: const result = await spendGeneralLumensFn({ amount, reason });
                // 현재는 칭호 구매만 서버 함수를 사용한다고 가정
                // 칭호 구매 외의 루멘 사용은 현재 클라이언트에서만 처리됩니다 (로그 제거)
            }
            return true;
        } catch (error: any) {
            // ✨ [개선 2] 롤백 로직
            // spendLumens Cloud Function 호출 실패 (로그 제거)
            // HttpsError의 경우 서버에서 보낸 메시지를 표시
            const message = error.details?.message || "아이템 구매에 실패했습니다. 잠시 후 다시 시도해주세요.";
            toast.error(message);
            setLumenData(prevData); // 상태를 이전으로 복원
            return false;
        }
    }, [lumenData]);

    const hasReceivedRewardForAchievement = useCallback(
        (achievementId: string): boolean => {
            return lumenData.transactions.some(
                (t) => t.achievementId === achievementId && t.amount > 0,
            );
        },
        [lumenData.transactions],
    );

    return {
        isLoading,
        balance: lumenData.balance,
        totalEarned: lumenData.totalEarned,
        totalSpent: lumenData.totalSpent,
        transactions: lumenData.transactions,
        addLumens,
        spendLumens,
        hasReceivedRewardForAchievement,
    };
}