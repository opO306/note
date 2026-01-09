import { render, screen } from '@testing-library/react';
import { TitlesCollection } from './TitlesCollection';

describe('칭호 도감 테스트', () => {
  test('칭호 도감이 렌더링됨', () => {
    const mockProps = {
      userTitles: [],
      equippedTitle: '',
      onTitleEquip: jest.fn(),
      onTitleUnequip: jest.fn(),
      onBack: jest.fn(),
    };

    render(<TitlesCollection {...mockProps} />);
    expect(screen.getByText('칭호 도감')).toBeInTheDocument();
  });

  test('보유 칭호 개수가 표시됨', () => {
    const mockProps = {
      userTitles: ['truth_seeker', 'knowledge_sage'],
      equippedTitle: '',
      onTitleEquip: jest.fn(),
      onTitleUnequip: jest.fn(),
      onBack: jest.fn(),
    };

    render(<TitlesCollection {...mockProps} />);
    expect(screen.getByText(/수집 진행도:/)).toBeInTheDocument();
  });
});