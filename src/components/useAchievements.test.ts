import { renderHook, act } from '@testing-library/react';
import { useAchievements } from './useAchievements';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

jest.mock('sonner', () => ({
  toast: { success: jest.fn() },
}));

describe('useAchievements', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  test('초기화', () => {
    const { result } = renderHook(() => useAchievements());
    expect(result.current.achievedAchievements).toEqual([]);
  });

  test('활동 업데이트', () => {
    const { result } = renderHook(() => useAchievements());
    act(() => {
      result.current.updateActivity({ explorePosts: 5 });
    });
    expect(result.current.userActivity.explorePosts).toBe(5);
  });

  test('업적 확인', () => {
    const saved = [{ achievementId: 'first_explore', achievedAt: '2024-01-01', rewardClaimed: true }];
    localStorageMock.setItem('app_achieved_achievements', JSON.stringify(saved));
    const { result } = renderHook(() => useAchievements());
    expect(result.current.isAchievementUnlocked('first_explore')).toBe(true);
  });
});