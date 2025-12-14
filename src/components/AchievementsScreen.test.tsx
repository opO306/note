import { render, screen } from '@testing-library/react';
import { AchievementsScreen } from './AchievementsScreen';

jest.mock('./useAchievements', () => ({
    useAchievements: jest.fn(() => ({
        isAchievementUnlocked: jest.fn((id: string) => id === 'first_explore'),
    })),
}));

jest.mock('./achievements', () => ({
    allAchievements: [
        {
            id: 'first_explore',
            name: '첫 탐구',
            description: '첫 번째 질문 글을 작성했습니다',
            category: 'explore',
            hidden: false,
            condition: { type: 'explore_post_count', target: 1 },
            reward: { lumens: 0 }
        },
        {
            id: 'first_share',
            name: '첫 공유',
            description: '첫 번째 정보 공유 글을 작성했습니다',
            category: 'share',
            hidden: false,
            condition: { type: 'share_post_count', target: 1 },
            reward: { lumens: 0 }
        },
    ],
    getCategoryName: jest.fn((category: string) => category === 'explore' ? '탐구' : '공유'),
}));

jest.mock('./hooks/useScrollRestoration', () => ({
    useScrollRestoration: jest.fn(() => ({ current: null })),
}));

describe('AchievementsScreen', () => {
    const mockOnBack = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('화면 렌더링', () => {
        render(<AchievementsScreen onBack={mockOnBack} />);
        expect(screen.getByText('업적')).toBeInTheDocument();
    });

    test('진행도 표시', () => {
        render(<AchievementsScreen onBack={mockOnBack} />);
        expect(screen.getByText('1 / 2')).toBeInTheDocument();
        expect(screen.getByText('업적 달성')).toBeInTheDocument();
    });

    test('달성한 업적 표시', () => {
        render(<AchievementsScreen onBack={mockOnBack} />);
        expect(screen.getByText('첫 탐구')).toBeInTheDocument();
        expect(screen.getByText('첫 번째 질문 글을 작성했습니다')).toBeInTheDocument();
    });

    test('미달성 업적 숨김 처리', () => {
        render(<AchievementsScreen onBack={mockOnBack} />);
        const hiddenItems = screen.getAllByText('???');
        expect(hiddenItems.length).toBeGreaterThan(0);
    });
});