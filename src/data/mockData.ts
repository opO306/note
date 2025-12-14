// src/data/mockData.ts

export const mockPosts = [
    {
        id: 1,
        author: "김영준",
        title: "React 상태 관리는 어떻게?",
        content: "useState랑 useReducer 중 뭘 써야 하나요?",
        likes: 5,
        comments: 3,
        tags: ["React", "상태관리"],
    },
    {
        id: 2,
        author: "강민서",
        title: "Vite + Tailwind 설정 팁",
        content: "PostCSS 에러 날 때 해결 방법 정리해봤어요.",
        likes: 12,
        comments: 4,
        tags: ["Vite", "Tailwind"],
    },
    {
        id: 3,
        author: "에레보스",
        title: "Redux 퇴물인가요?",
        content: "최근엔 recoil이나 jotai도 많이 쓰던데요.",
        likes: 7,
        comments: 2,
        tags: ["Redux", "recoil", "jotai"],
    },
    {
        id: 4,
        author: "추적자",
        title: "Next.js App Router 후기",
        content: "기존 Pages Router보다 어떤 점이 더 좋은가요?",
        likes: 9,
        comments: 5,
        tags: ["Next.js", "AppRouter"],
    },
    {
        id: 5,
        author: "화객",
        title: "AI와 함께 코딩하기",
        content: "copilot이랑 chatGPT 같이 써보신 분?",
        likes: 14,
        comments: 6,
        tags: ["AI", "Copilot", "ChatGPT"],
    },
];

export const mockCategories = [
    {
        id: "qna",
        name: "질문",
        subCategories: [
            { id: "frontend", name: "프론트엔드" },
            { id: "backend", name: "백엔드" },
            { id: "mobile", name: "모바일" },
        ],
    },
    {
        id: "guide",
        name: "가이드",
        subCategories: [
            { id: "typescript", name: "타입스크립트" },
            { id: "vite", name: "Vite" },
            { id: "zustand", name: "Zustand" },
        ],
    },
    {
        id: "discussion",
        name: "자유 토론",
        subCategories: [
            { id: "devlife", name: "개발자 일상" },
            { id: "ai", name: "AI 이야기" },
        ],
    },
    {
        id: "전체",
        name: "전체",
        subCategories: [],
    },
];

export const mockReplies = [
    {
        id: 101,
        author: "강태수",
        content: "이 글 덕분에 useEffect 정리됐습니다. 감사합니다.",
        lanterns: 4,
    },
    {
        id: 102,
        author: "김영준",
        content: "Redux는 진짜 구조만 잘 잡으면 아직 쓸만한 듯요.",
        lanterns: 6,
    },
    {
        id: 103,
        author: "화객",
        content: "AI 추천이랑 실제 경험 비교해보면 또 다르죠.",
        lanterns: 3,
    },
    {
        id: 104,
        author: "에레보스",
        content: "이런 글이 많아졌으면 좋겠네요.",
        lanterns: 7,
    },
    {
        id: 105,
        author: "추적자",
        content: "Vite 최적화 글 중에 제일 잘 정리된 듯.",
        lanterns: 5,
    },
];

export const mockRankingUsers = [
    { author: "김영준", count: 38 },
    { author: "에레보스", count: 31 },
    { author: "화객", count: 29 },
    { author: "강민서", count: 24 },
    { author: "추적자", count: 21 },
];
