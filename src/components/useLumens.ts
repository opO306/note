// useLumens.ts - 루멘(Lumen) 관리 시스템
// 루멘은 앱 안에서 사용하는 "돈"이에요!
// 업적을 달성하면 루멘을 받고, 칭호를 살 때 루멘을 써요.

import { useState, useEffect, useCallback } from 'react';
import app, { auth, db } from '../firebase';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    increment,
    arrayUnion,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * 루멘 거래 내역
 * 언제, 왜, 얼마나 루멘이 변했는지 기록해요
 */
export interface LumenTransaction {
    id: string;              // 거래 고유 번호
    amount: number;          // 변화한 루멘 개수 (+는 획득, -는 사용)
    reason: string;          // 이유 (예: "업적 달성", "칭호 구매")
    timestamp: number;       // 언제 (시간)
    achievementId?: string | null;  // 어떤 업적? (업적으로 받았을 때만)
    titleId?: string | null;       // 어떤 칭호? (칭호 샀을 때만)
}

/**
 * 루멘 데이터
 */
export interface LumenData {
    balance: number;                    // 현재 루멘 개수
    totalEarned: number;                // 총 획득한 루멘
    totalSpent: number;                 // 총 사용한 루멘
    transactions: LumenTransaction[];   // 거래 내역
}

// 🔹 Cloud Functions - awardLumens 호출 타입 정의
interface AwardLumensRequest {
    amount: number;
    reason: string;
    achievementId?: string;
}

interface AwardLumensResponse {
    success: boolean;
}

// 🔹 Cloud Functions 인스턴스 & callable 함수 준비
const functions = getFunctions(app, 'asia-northeast3');
const awardLumensFn = httpsCallable<AwardLumensRequest, AwardLumensResponse>(
    functions,
    'awardLumens',
);

// 🔹 Cloud Functions - purchaseTitle 호출 타입 정의 (칭호 구매 전용)
interface PurchaseTitleRequest {
    titleId: string;
}

interface PurchaseTitleResponse {
    success: boolean;
}

const purchaseTitleFn = httpsCallable<PurchaseTitleRequest, PurchaseTitleResponse>(
    functions,
    'purchaseTitle',
);

// Firestore에 보낼 때 undefined 필드를 제거한 안전한 형태로 변환
function toFirestoreTransaction(t: LumenTransaction): any {
    const base: any = {
        id: t.id,
        amount: t.amount,
        reason: t.reason,
        timestamp: t.timestamp,
    };

    if (t.achievementId != null) {
        base.achievementId = t.achievementId;
    }

    if (t.titleId != null) {
        base.titleId = t.titleId;
    }

    return base;
}

// 🔹 Firestore에 저장할 때, 클라이언트에서 유지할 최대 거래 내역 개수
const MAX_TRANSACTION_HISTORY = 100;

// 🔹 예전 localStorage 키 (마이그레이션용으로만 사용)
const STORAGE_KEY = 'app_lumens';

// 🔹 기본(초기) 루멘 상태
const INITIAL_LUMEN_DATA: LumenData = {
    balance: 0,
    totalEarned: 0,
    totalSpent: 0,
    transactions: [],
};

/**
 * 예전 localStorage(app_lumens)에 있던 루멘 데이터를
 * 한 번만 Firestore로 마이그레이션하기 위한 헬퍼
 */
function loadLegacyLumenDataFromLocalStorage(): LumenData | null {
    // SSR/비브라우저 환경 대비
    if (typeof window === 'undefined') return null;

    try {
        if (!('localStorage' in window)) return null;
    } catch {
        return null;
    }

    try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (!saved) return null;

        const parsed = JSON.parse(saved);

        if (!parsed || typeof parsed !== 'object') return null;

        const balance =
            typeof parsed.balance === 'number' && !Number.isNaN(parsed.balance)
                ? parsed.balance
                : 0;
        const totalEarned =
            typeof parsed.totalEarned === 'number' && !Number.isNaN(parsed.totalEarned)
                ? parsed.totalEarned
                : 0;
        const totalSpent =
            typeof parsed.totalSpent === 'number' && !Number.isNaN(parsed.totalSpent)
                ? parsed.totalSpent
                : 0;

        const transactions: LumenTransaction[] = Array.isArray(parsed.transactions)
            ? parsed.transactions
                .map((t: any): LumenTransaction | null => {
                    if (!t) return null;
                    const id = String(t.id ?? '');
                    const amount = Number(t.amount ?? 0);
                    const reason = String(t.reason ?? '');
                    const timestamp = Number(t.timestamp ?? 0);

                    if (!id || !reason || Number.isNaN(amount) || Number.isNaN(timestamp)) {
                        return null;
                    }

                    return {
                        id,
                        amount,
                        reason,
                        timestamp,
                        achievementId: t.achievementId,
                        titleId: t.titleId,
                    };
                })
                .filter((t: LumenTransaction | null): t is LumenTransaction => t !== null)
                .sort((a: any, b: any) => b.timestamp - a.timestamp)
            : [];

        return {
            balance,
            totalEarned,
            totalSpent,
            transactions,
        };
    } catch (error) {
        console.error('기존 localStorage 루멘 데이터 마이그레이션 실패:', error);
        return null;
    }
}

/**
 * 루멘 관리 훅
 * 이 훅을 사용하면 루멘을 쉽게 관리할 수 있어요!
 * - Firestore(users/{uid})를 단일 진실 소스로 사용
 * - Firestore의 persistentLocalCache를 통해 오프라인 지원
 */
export function useLumens() {
    // 루멘 데이터를 저장하는 곳 (초기값은 0/빈 배열)
    const [lumenData, setLumenData] = useState<LumenData>(INITIAL_LUMEN_DATA);

    // 🔹 Firestore(users/{uid})와 동기화: 마운트 시 한 번 실행
    useEffect(() => {
        const uid = auth.currentUser?.uid;
        if (!uid) return; // 로그인 안 되어 있으면 그냥 패스

        let cancelled = false;

        const syncFromFirestore = async () => {
            try {
                const userRef = doc(db, 'users', uid);
                const snap = await getDoc(userRef);

                // 1) 유저 문서가 이미 있는 경우 → Firestore 값으로 상태를 세팅
                if (snap.exists()) {
                    const data = snap.data() as any;

                    const fromServer: LumenData = {
                        balance:
                            typeof data.lumenBalance === 'number'
                                ? data.lumenBalance
                                : INITIAL_LUMEN_DATA.balance,
                        totalEarned:
                            typeof data.lumenTotalEarned === 'number'
                                ? data.lumenTotalEarned
                                : INITIAL_LUMEN_DATA.totalEarned,
                        totalSpent:
                            typeof data.lumenTotalSpent === 'number'
                                ? data.lumenTotalSpent
                                : INITIAL_LUMEN_DATA.totalSpent,
                        transactions: Array.isArray(data.lumenTransactions)
                            ? (data.lumenTransactions as any[])
                                .map((t): LumenTransaction | null => {
                                    if (!t) return null;
                                    const id = String(t.id ?? '');
                                    const amount = Number(t.amount ?? 0);
                                    const reason = String(t.reason ?? '');
                                    const timestamp = Number(t.timestamp ?? 0);

                                    if (!id || !reason || Number.isNaN(amount) || Number.isNaN(timestamp)) {
                                        return null;
                                    }

                                    return {
                                        id,
                                        amount,
                                        reason,
                                        timestamp,
                                        achievementId: t.achievementId,
                                        titleId: t.titleId,
                                    };
                                })
                                .filter((t: LumenTransaction | null): t is LumenTransaction => t !== null)
                                .sort((a, b) => b.timestamp - a.timestamp)
                                .slice(0, MAX_TRANSACTION_HISTORY)
                            : [],
                    };

                    if (!cancelled) {
                        setLumenData(fromServer);
                    }
                    return;
                }

                // 2) 유저 문서가 없는 경우 → (한 번만) localStorage → Firestore 마이그레이션 시도
                const legacy = loadLegacyLumenDataFromLocalStorage();
                const base = legacy ?? INITIAL_LUMEN_DATA;

                if (!cancelled) {
                    setLumenData({
                        ...base,
                        transactions: base.transactions.slice(0, MAX_TRANSACTION_HISTORY),
                    });
                }

                await setDoc(
                    userRef,
                    {
                        lumenBalance: base.balance,
                        lumenTotalEarned: base.totalEarned,
                        lumenTotalSpent: base.totalSpent,
                        lumenTransactions: base.transactions
                            .slice(0, MAX_TRANSACTION_HISTORY)
                            .map(toFirestoreTransaction),
                    },
                    { merge: true },
                );

                // 마이그레이션이 성공하면 localStorage 데이터는 더 이상 사용하지 않으므로 제거
                if (legacy) {
                    try {
                        window.localStorage.removeItem(STORAGE_KEY);
                    } catch {
                        // 무시
                    }
                }
            } catch (error) {
                console.error('루멘 Firestore 동기화 실패:', error);
            }
        };

        syncFromFirestore();

        return () => {
            cancelled = true;
        };
    }, []);

    /**
     * 루멘 추가하기 (업적 달성, 랭킹 보상 등)
     */
    const addLumens = useCallback(
        (amount: number, reason: string, achievementId?: string): boolean => {
            // 음수는 안 돼요!
            if (amount <= 0) {
                console.error('루멘은 0보다 많이 추가해야 해요');
                return false;
            }
    
            const uid = auth.currentUser?.uid ?? null;
            if (!uid) {
                console.error('로그인된 사용자만 루멘을 받을 수 있어요');
                return false;
            }
    
            // 새 거래 내역 만들기 (로컬용)
            const transaction: LumenTransaction = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                amount,
                reason,
                timestamp: Date.now(),
                achievementId,
            };
    
            // 1) 로컬 상태 먼저 업데이트 (화면 반응 빠르게)
            setLumenData((prev) => {
                const nextTransactions = [
                    transaction,
                    ...prev.transactions,
                ].slice(0, MAX_TRANSACTION_HISTORY);
    
                return {
                    balance: prev.balance + amount,
                    totalEarned: prev.totalEarned + amount,
                    totalSpent: prev.totalSpent,
                    transactions: nextTransactions,
                };
            });
    
            // 2) 🔹 이전에는 여기서 Firestore를 직접 updateDoc 했는데,
            //    이제는 서버 Cloud Function(awardLumens)을 호출해서
            //    서버에서 트랜잭션으로 처리하게 만든다.
            awardLumensFn({
                amount,
                reason,
                achievementId,
            })
                .then((result) => {
                    const data = result.data as AwardLumensResponse;
                    if (!data.success) {
                        console.warn(
                            '[lumens] awardLumens 응답이 success=false 입니다.',
                            data,
                        );
                        // TODO: 필요하다면 여기서 로컬 상태 롤백 처리 가능
                    }
                })
                .catch((error) => {
                    console.error(
                        '[lumens] awardLumens Cloud Function 호출 실패',
                        error,
                    );
                    // TODO: 사용자에게 "서버 저장 실패" 안내 토스트를 띄우는 것도 가능
                });
    
            return true;
        },
        [],
    );
 
    /**
     * 루멘 사용하기 (칭호 구매 등)
     */
    const spendLumens = useCallback(
        (amount: number, reason: string, titleId?: string): boolean => {
            // 음수는 안 돼요!
            if (amount <= 0) {
                console.error('루멘은 0보다 많이 사용해야 해요');
                return false;
            }

            // 현재 클라이언트 기준으로도 잔액 체크
            if (lumenData.balance < amount) {
                console.error(`루멘이 부족해요! 필요: ${amount}, 보유: ${lumenData.balance}`);
                return false;
            }

            const uid = auth.currentUser?.uid ?? null;
            if (!uid) {
                console.error('로그인된 사용자만 루멘을 사용할 수 있어요');
                return false;
            }

            const transaction: LumenTransaction = {
                id: `${Date.now()}-${Math.random()}`,
                amount: -amount, // 사용이니까 음수
                reason,
                timestamp: Date.now(),
                titleId,
            };

            setLumenData((prev) => {
                // prev 기준으로도 한 번 더 방어적 체크
                if (prev.balance < amount) {
                    console.error(`루멘이 부족해요! 필요: ${amount}, 보유: ${prev.balance}`);
                    return prev;
                }

                const nextTransactions = [
                    transaction,
                    ...prev.transactions,
                ].slice(0, MAX_TRANSACTION_HISTORY);

                return {
                    balance: prev.balance - amount,
                    totalEarned: prev.totalEarned,
                    totalSpent: prev.totalSpent + amount,
                    transactions: nextTransactions,
                };
            });

            // 🔹 여기부터 분기: titleId가 있으면 Cloud Function 사용
            if (titleId) {
                // 🧠 1) 칭호 구매인 경우 → 서버 Cloud Function으로 루멘 차감 & 기록
                purchaseTitleFn({ titleId })
                    .then((result) => {
                        const data = result.data as PurchaseTitleResponse;
                        if (!data.success) {
                            console.warn(
                                '[lumens] purchaseTitle 응답이 success=false 입니다.',
                                data,
                            );
                            // TODO: 필요하다면 여기서 Firestore에서 다시 읽어와서
                            //       로컬 상태를 재동기화하는 식으로 보완 가능
                        }
                    })
                    .catch((error) => {
                        console.error(
                            '[lumens] purchaseTitle Cloud Function 호출 실패',
                            error,
                        );
                        // TODO: 사용자에게 "서버 저장 실패" 안내 토스트를 띄우는 것도 가능
                    });
    
                // ✅ 이 경우에는 lumenBalance 실제 차감은 서버(Cloud Function)가 담당
                //    위에서 setLumenData로 화면은 이미 줄어든 상태라, UX는 그대로 유지돼요.
                return true;
            }
    
            // 🔹 일반 루멘 사용(칭호 구매가 아닌 경우) → 기존처럼 Firestore에 직접 반영
            const userRef = doc(db, 'users', uid);
            updateDoc(userRef, {
                lumenBalance: increment(-amount),
                lumenTotalSpent: increment(amount),
                lumenTransactions: arrayUnion(toFirestoreTransaction(transaction)),
            })
                .catch((error) => {
                    console.error('루멘 Firestore 업데이트 실패(사용):', error);
                });
    
            return true;
        },
        [lumenData.balance],
    );
    
    /**
     * 특정 업적으로 루멘을 받았는지 확인
     */
    const hasReceivedRewardForAchievement = useCallback(
        (achievementId: string): boolean => {
            return lumenData.transactions.some(
                (t) => t.achievementId === achievementId && t.amount > 0,
            );
        },
        [lumenData.transactions],
    );

    /**
     * 최근 거래 내역 가져오기
     */
    const getRecentTransactions = useCallback(
        (count: number = 10): LumenTransaction[] => {
            return lumenData.transactions.slice(0, count);
        },
        [lumenData.transactions],
    );

    /**
     * 루멘 초기화 (테스트용)
     */
    const resetLumens = useCallback(() => {
        const uid = auth.currentUser?.uid ?? null;

        setLumenData(INITIAL_LUMEN_DATA);

        if (uid) {
            const userRef = doc(db, 'users', uid);
            updateDoc(userRef, {
                lumenBalance: 0,
                lumenTotalEarned: 0,
                lumenTotalSpent: 0,
                lumenTransactions: [],
            }).catch((error) => {
                console.error('루멘 Firestore 초기화 실패:', error);
            });
        }
    }, []);

    return {
        // 현재 상태
        balance: lumenData.balance,           // 현재 루멘 개수
        totalEarned: lumenData.totalEarned,   // 총 획득한 루멘
        totalSpent: lumenData.totalSpent,     // 총 사용한 루멘
        transactions: lumenData.transactions, // 모든 거래 내역 (최대 MAX_TRANSACTION_HISTORY 개)

        // 기능
        addLumens,                             // 루멘 추가
        spendLumens,                           // 루멘 사용
        hasReceivedRewardForAchievement,       // 업적 보상 받았는지 확인
        getRecentTransactions,                 // 최근 거래 내역
        resetLumens,                           // 초기화 (테스트용)
    };
}
