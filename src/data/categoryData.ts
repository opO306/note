import {
    Globe,
    Cog,
    Hash,
    BookOpen,
    Users,
    PenTool,
    DollarSign,
} from "lucide-react";

export interface SubCategory {
    id: string;
    name: string;
    count: number;
}

export interface Category {
    id: string;
    name: string;
    icon: any;
    count: number;
    subCategories: SubCategory[];
}

export const initialCategories: Category[] = [
    {
        id: "전체",
        name: "전체",
        icon: Globe,
        count: 0,
        subCategories: [{ id: "전체", name: "전체", count: 0 }],
    },
    {
        id: "공학",
        name: "공학",
        icon: Cog,
        count: 0,
        subCategories: [
            { id: "전체", name: "전체", count: 0 },
            { id: "소프트웨어", name: "소프트웨어", count: 0 },
            { id: "기계공학", name: "기계공학", count: 0 },
            { id: "전자공학", name: "전자공학", count: 0 },
            { id: "건축공학", name: "건축공학", count: 0 },
        ],
    },
    {
        id: "과학",
        name: "과학",
        icon: Hash,
        count: 0,
        subCategories: [
            { id: "전체", name: "전체", count: 0 },
            { id: "물리학", name: "물리학", count: 0 },
            { id: "화학", name: "화학", count: 0 },
            { id: "생물학", name: "생물학", count: 0 },
            { id: "지구과학", name: "지구과학", count: 0 },
            { id: "천문학", name: "천문학", count: 0 },
        ],
    },
    {
        id: "경제",
        name: "경제",
        icon: DollarSign,
        count: 0,
        subCategories: [
            { id: "전체", name: "전체", count: 0 },
            { id: "거시경제", name: "거시경제", count: 0 },
            { id: "미시경제", name: "미시경제", count: 0 },
            { id: "금융", name: "금융", count: 0 },
            { id: "국제경제", name: "국제경제", count: 0 },
            { id: "계량경제", name: "계량경제", count: 0 },
        ],
    },
    {
        id: "수학",
        name: "수학",
        icon: BookOpen,
        count: 0,
        subCategories: [
            { id: "전체", name: "전체", count: 0 },
            { id: "대수학", name: "대수학", count: 0 },
            { id: "기하학", name: "기하학", count: 0 },
            { id: "해석학", name: "해석학", count: 0 },
            { id: "통계학", name: "통계학", count: 0 },
            { id: "이산수학", name: "이산수학", count: 0 },
        ],
    },
    {
        id: "예술",
        name: "예술",
        icon: Users,
        count: 0,
        subCategories: [
            { id: "전체", name: "전체", count: 0 },
            { id: "미술", name: "미술", count: 0 },
            { id: "음악", name: "음악", count: 0 },
            { id: "문학", name: "문학", count: 0 },
        ],
    },
    {
        id: "철학",
        name: "철학",
        icon: PenTool,
        count: 0,
        subCategories: [
            { id: "전체", name: "전체", count: 0 },
            { id: "동양철학", name: "동양철학", count: 0 },
            { id: "서양철학", name: "서양철학", count: 0 },
        ],
    },
    {
        id: "기타",
        name: "기타",
        icon: Hash,
        count: 0,
        subCategories: [
            { id: "전체", name: "전체", count: 0 },
            { id: "자유", name: "자유", count: 0 },
        ],
    },
];