import { render, screen, fireEvent } from '@testing-library/react';
import { BookmarkScreen } from './BookmarkScreen';

jest.mock('./hooks/useScrollRestoration', () => ({
    useScrollRestoration: jest.fn(() => ({ current: null })),
}));
const mockPosts = [
    {
        id: "1",
        title: "첫 번째 글",
        content: "테스트 내용 1",
        author: "작성자1",
        timeAgo: "1시간 전",
        category: "질문",
        lanterns: 10,
        comments: 5,
        type: "question" as const,
        tags: ["태그1"],
    },
    {
        id: "2",
        title: "두 번째 글",
        content: "테스트 내용 2",
        author: "작성자2",
        timeAgo: "2시간 전",
        category: "정보",
        lanterns: 20,
        comments: 10,
        type: "guide" as const,
    },
];

const mockProps = {
    onBack: jest.fn(),
    bookmarkedPosts: new Set<string>(["1", "2"]),
    posts: mockPosts,
    onPostSelect: jest.fn(),

    userNickname: "테스트유저",
    currentTitle: "guide_sprout",
};



beforeEach(() => {
    jest.clearAllMocks();
});

test('렌더링', () => {
    render(<BookmarkScreen {...mockProps} />);
    expect(screen.getByText('북마크')).toBeInTheDocument();
});

test('북마크 개수 표시', () => {
    render(<BookmarkScreen {...mockProps} />);
    expect(screen.getByText('2개')).toBeInTheDocument();
});

test('북마크 목록 표시', () => {
    render(<BookmarkScreen {...mockProps} />);
    expect(screen.getByText('첫 번째 글')).toBeInTheDocument();
    expect(screen.getByText('두 번째 글')).toBeInTheDocument();
});

test('검색 기능', () => {
    render(<BookmarkScreen {...mockProps} />);

    const searchInput = screen.getByPlaceholderText('북마크한 글 검색...');
    fireEvent.change(searchInput, { target: { value: '첫 번째' } });

    expect(screen.getByText('첫 번째 글')).toBeInTheDocument();
    expect(screen.queryByText('두 번째 글')).not.toBeInTheDocument();
});

test('빈 북마크 상태', () => {
   const emptyProps = {
    ...mockProps,
    bookmarkedPosts: new Set<string>(),
};


    render(<BookmarkScreen {...emptyProps} />);
    expect(screen.getByText('북마크한 글이 없습니다')).toBeInTheDocument();
});

test('검색 결과 없음', () => {
    render(<BookmarkScreen {...mockProps} />);

    const searchInput = screen.getByPlaceholderText('북마크한 글 검색...');
    fireEvent.change(searchInput, { target: { value: '존재하지않는검색어' } });

    expect(screen.getByText('검색 결과가 없습니다')).toBeInTheDocument();
});

test('게시물 클릭', () => {
    render(<BookmarkScreen {...mockProps} />);

    const firstPost = screen.getByText('첫 번째 글').closest('[data-post-id]');
    if (firstPost) {
        fireEvent.click(firstPost);
        expect(mockProps.onPostSelect).toHaveBeenCalledWith(mockPosts[0]);
    }
});