import { useMemo, useCallback, useDeferredValue, type RefObject } from "react";
import { useScrollRestoration } from "@/components/hooks/useScrollRestoration";
import { useStabilizedList } from "@/components/hooks/useStabilizedList";
import { useUserProfiles, type UserProfileLite } from "@/components/MainScreen/hooks/useUserProfiles";
import { formatRelativeOrDate } from "@/components/utils/timeUtils";
import type { Post, Category, SortOption } from "../types";

export const SORT_OPTIONS: SortOption[] = [
    { label: "최신순", value: "latest" },
    { label: "오래된순", value: "oldest" },
    { label: "인기순", value: "lanterns" },
];

const SORT_COMPARATORS: Record<SortOption["value"], (a: Post, b: Post) => number> = {
    lanterns: (a, b) => (b.lanterns ?? 0) - (a.lanterns ?? 0),
    oldest: (a, b) => (a.createdAt?.getTime?.() ?? 0) - (b.createdAt?.getTime?.() ?? 0),
    latest: (a, b) => (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0),
};

const isPostHidden = (post: Post) => (post as any).hidden === true;

export interface PostListViewModelResult {
    scrollRef: RefObject<HTMLDivElement | null>;
    currentSubCategories: NonNullable<Category["subCategories"]>;
    visiblePosts: Post[];
    filteredCount: number;
    handleSubCategoryClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    formatTimeAgo: (date?: Date) => string;
    formatCreatedAt: (date?: Date) => string;
    userProfiles: Record<string, UserProfileLite>;
}

interface PostListViewModelParams {
    posts: Post[];
    activeCategory: string;
    activeSubCategory: string;
    sortBy: SortOption["value"];
    categories: Category[];
    onSubCategoryChange: (subId: string) => void;
}

export function usePostListViewModel({
    posts,
    activeCategory,
    activeSubCategory,
    sortBy,
    categories,
    onSubCategoryChange,
}: PostListViewModelParams): PostListViewModelResult {
    const scrollRef = useScrollRestoration({
        key: `main-posts-${activeCategory}-${activeSubCategory}`,
    });

    // 입력/정렬 변화 시 과도한 연산을 늦춰 렌더 스로틀링
    const deferredPosts = useDeferredValue(posts);

    const postAuthorUids = useMemo(() => {
        const uids = new Set<string>();
        deferredPosts.forEach((p) => {
            if (typeof p.authorUid === "string" && p.authorUid.length > 0) {
                uids.add(p.authorUid);
            }
        });
        return Array.from(uids);
    }, [deferredPosts]);

    const userProfiles = useUserProfiles(postAuthorUids);

    const currentCategory = useMemo(
        () => categories.find((cat) => cat.id === activeCategory),
        [categories, activeCategory],
    );

    const currentSubCategories = useMemo(
        () => currentCategory?.subCategories ?? [],
        [currentCategory],
    );

    const handleSubCategoryClick = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            const subId = e.currentTarget.getAttribute("data-sub-id");
            if (subId) {
                onSubCategoryChange(subId);
            }
        },
        [onSubCategoryChange],
    );

    const filteredPosts = useMemo(() => {
        const visible = deferredPosts.filter((post) => !isPostHidden(post));

        const categoryFiltered =
            activeCategory === "전체"
                ? visible
                : visible.filter((post) => post.category === activeCategory);

        if (activeSubCategory === "전체") return categoryFiltered;

        return categoryFiltered.filter((post) => post.subCategory === activeSubCategory);
    }, [deferredPosts, activeCategory, activeSubCategory]);

    const filteredAndSortedPosts = useMemo(() => {
        const sortKey = sortBy ?? "latest";
        const comparator = SORT_COMPARATORS[sortKey] ?? SORT_COMPARATORS.latest;
        return [...filteredPosts].sort(comparator);
    }, [filteredPosts, sortBy]);

    const { visible: visiblePosts } = useStabilizedList(filteredAndSortedPosts, true);

    const formatTimeAgo = useCallback((date?: Date): string => {
        return formatRelativeOrDate(date);
    }, []);

    const formatCreatedAt = useCallback((date?: Date): string => {
        if (!date) return "";
        return date.toLocaleString("ko-KR", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    }, []);

    return {
        scrollRef,
        currentSubCategories,
        visiblePosts,
        filteredCount: filteredAndSortedPosts.length,
        handleSubCategoryClick,
        formatTimeAgo,
        formatCreatedAt,
        userProfiles,
    };
}

