import { render, screen, fireEvent } from '@testing-library/react';
import { TitleShop } from './TitleShop';

jest.mock('sonner', () => ({
    toast: {
        error: jest.fn(),
        success: jest.fn(),
    },
}));

describe('TitleShop', () => {
    const mockProps = {
        onBack: jest.fn(),
        userPostLanterns: 0,
        userReplyLanterns: 0,
        userGuideCount: 0,
        userLumens: 10,
        ownedTitles: [],
        currentTitle: '',
        onTitlePurchase: jest.fn(),
        onTitleEquip: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('렌더링', () => {
        render(<TitleShop {...mockProps} />);
        expect(screen.getByText('칭호 상점')).toBeInTheDocument();
    });

    test('루멘 표시', () => {
        render(<TitleShop {...mockProps} />);
        expect(screen.getByText('10')).toBeInTheDocument();
    });

    test('칭호 구매 성공', () => {
        const props = { ...mockProps, userLumens: 5 };
        render(<TitleShop {...props} />);

        const buyButtons = screen.getAllByText('구매');
        fireEvent.click(buyButtons[0]);

        expect(props.onTitlePurchase).toHaveBeenCalled();
    });

    test('루멘 부족 시 구매 실패', () => {
        const props = { ...mockProps, userLumens: 0 };
        render(<TitleShop {...props} />);

        const buyButtons = screen.getAllByText('구매');
        if (buyButtons.length > 2) {
            fireEvent.click(buyButtons[2]);
            expect(props.onTitlePurchase).not.toHaveBeenCalled();
        }
    });
});