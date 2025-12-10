import { renderHook, act } from '@testing-library/react';
import { useLumens } from './useLumens';

const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        clear: () => { store = {}; },
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useLumens', () => {
    beforeEach(() => {
        localStorageMock.clear();
        jest.clearAllMocks();
    });

    test('초기화', () => {
        const { result } = renderHook(() => useLumens());

        expect(result.current.balance).toBe(0);
        expect(result.current.totalEarned).toBe(0);
        expect(result.current.totalSpent).toBe(0);
        expect(result.current.transactions).toEqual([]);
    });

    test('루멘 추가', () => {
        const { result } = renderHook(() => useLumens());

        act(() => {
            result.current.addLumens(10, '업적 달성', 'achievement_1');
        });

        expect(result.current.balance).toBe(10);
        expect(result.current.totalEarned).toBe(10);
        expect(result.current.totalSpent).toBe(0);
        expect(result.current.transactions.length).toBe(1);
        expect(result.current.transactions[0].amount).toBe(10);
    });

    test('루멘 여러 번 추가', () => {
        const { result } = renderHook(() => useLumens());

        act(() => {
            result.current.addLumens(5, '첫 업적');
            result.current.addLumens(10, '두번째 업적');
            result.current.addLumens(3, '세번째 업적');
        });

        expect(result.current.balance).toBe(18);
        expect(result.current.totalEarned).toBe(18);
        expect(result.current.transactions.length).toBe(3);
    });

    test('루멘 사용', () => {
        const { result } = renderHook(() => useLumens());

        act(() => {
            result.current.addLumens(10, '업적');
        });

        act(() => {
            result.current.spendLumens(5, '칭호 구매', 'title_1');
        });
        expect(result.current.balance).toBe(5);
        expect(result.current.totalEarned).toBe(10);
        expect(result.current.totalSpent).toBe(5);
        expect(result.current.transactions.length).toBe(2);
        expect(result.current.transactions[0].amount).toBe(-5);
    });

    test('루멘 부족 시 사용 실패', () => {
        const { result } = renderHook(() => useLumens());

        act(() => {
            result.current.addLumens(5, '업적');
        });

        let spendResult = false;
        act(() => {
            spendResult = result.current.spendLumens(10, '칭호 구매');
        });

        expect(spendResult).toBe(false);
        expect(result.current.balance).toBe(5);
        expect(result.current.totalSpent).toBe(0);
    });

    test('음수 추가 방지', () => {
        const { result } = renderHook(() => useLumens());

        let addResult = false;
        act(() => {
            addResult = result.current.addLumens(-5, '잘못된 추가');
        });

        expect(addResult).toBe(false);
        expect(result.current.balance).toBe(0);
    });

    test('0 추가 방지', () => {
        const { result } = renderHook(() => useLumens());

        let addResult = false;
        act(() => {
            addResult = result.current.addLumens(0, '0 추가');
        });

        expect(addResult).toBe(false);
        expect(result.current.balance).toBe(0);
    });

    test('업적 보상 중복 확인', () => {
        const { result } = renderHook(() => useLumens());

        act(() => {
            result.current.addLumens(10, '업적', 'achievement_1');
        });

        expect(result.current.hasReceivedRewardForAchievement('achievement_1')).toBe(true);
        expect(result.current.hasReceivedRewardForAchievement('achievement_2')).toBe(false);
    });

    test('최근 거래 내역', () => {
        const { result } = renderHook(() => useLumens());

        act(() => {
            result.current.addLumens(10, '업적1');
        });

        act(() => {
            result.current.addLumens(5, '업적2');
        });

        act(() => {
            result.current.spendLumens(3, '칭호');
        });

        const recent = result.current.getRecentTransactions(2);
        expect(recent.length).toBe(2);
        expect(recent[0].amount).toBe(-3);
        expect(recent[1].amount).toBe(5);
    });

    test('localStorage 저장', () => {
        const { result } = renderHook(() => useLumens());

        act(() => {
            result.current.addLumens(10, '테스트');
        });

        const saved = localStorageMock.getItem('app_lumens');
        expect(saved).toBeTruthy();

        const parsed = JSON.parse(saved!);
        expect(parsed.balance).toBe(10);
        expect(parsed.totalEarned).toBe(10);
    });

    test('localStorage 로드', () => {
        const data = {
            balance: 50,
            totalEarned: 100,
            totalSpent: 50,
            transactions: [
                { id: '1', amount: 10, reason: '테스트', timestamp: Date.now() }
            ]
        };
        localStorageMock.setItem('app_lumens', JSON.stringify(data));

        const { result } = renderHook(() => useLumens());

        expect(result.current.balance).toBe(50);
        expect(result.current.totalEarned).toBe(100);
        expect(result.current.totalSpent).toBe(50);
        expect(result.current.transactions.length).toBe(1);
    });

    test('루멘 초기화', () => {
        const { result } = renderHook(() => useLumens());

        act(() => {
            result.current.addLumens(10, '테스트');
            result.current.resetLumens();
        });

        expect(result.current.balance).toBe(0);
        expect(result.current.totalEarned).toBe(0);
        expect(result.current.totalSpent).toBe(0);
        expect(result.current.transactions.length).toBe(0);
    });
});