// src/components/hooks/usePosts.ts

import { useEffect, useState, useCallback } from "react";
import { auth, db } from "../../firebase";
import {
    collection,
    getDocs, // 👈 onSnapshot 대신 사용
    orderBy,
    query,
    limit,
} from "firebase/firestore";
import type { Post, Reply } from "../MainScreen/types";

interface UsePostsOptions {
    includeHidden?: boolean;
}

const INITIAL_POST_LIMIT = 12; // 초기 진입 시 가져올 게시글 개수 (데이터 절약을 위해 24→12로 축소)

export function usePosts(options?: UsePostsOptions) {
    const { includeHidden = false } = options ?? {};

    // 게시글 상태
    const [posts, setPosts] = useState<Post[]>([]);
    // 로딩 상태 (새로고침 중일 때 UI 처리에 유용)
    const [loading, setLoading] = useState<boolean>(false);

    // ♻️ 데이터를 불러오는 함수 (onSnapshot 로직을 여기로 이관)
    const fetchPosts = useCallback(async () => {
        setLoading(true);
        try {
            const postsRef = collection(db, "posts");
            const q = query(postsRef, orderBy("createdAt", "desc"), limit(INITIAL_POST_LIMIT));

            // ⚡️ getDocs: 한 번만 읽어옴 (비용 절약)
            const snapshot = await getDocs(q);

            const currentUid = auth.currentUser?.uid ?? null;

            const fetchedPosts = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();

                // 1. 숨김 처리된 게시글 필터링
                const isHidden = data.hidden === true;
                if (isHidden && !includeHidden) {
                    return null;
                }

                // 2. 날짜 변환 로직
                const createdAt: Date =
                    data.createdAt && typeof data.createdAt.toDate === "function"
                        ? data.createdAt.toDate()
                        : data.createdAt instanceof Date
                            ? data.createdAt
                            : new Date();

                // 3. 댓글 데이터 변환
                let replies: Reply[] = [];
                if (Array.isArray(data.replies)) {
                    replies = data.replies
                        .filter((r: any) => {
                            if (!r || typeof r !== 'object') return false;
                            const isHiddenReply = r.hidden === true;
                            if (isHiddenReply && !includeHidden) return false;
                            return true;
                        })
                        .map((r: any): Reply => {
                            return {
                                id: r.id ?? Date.now(),
                                content: r.content ?? "",
                                author: r.author ?? "알 수 없음",
                                authorUid: r.authorUid ?? null,
                                authorAvatar: r.authorAvatar ?? null,
                                timeAgo: r.timeAgo ?? "",
                                lanterns: r.lanterns ?? 0,
                                isGuide: !!r.isGuide,
                                createdAt: typeof r.createdAt?.toDate === 'function'
                                    ? r.createdAt.toDate()
                                    : (r.createdAt instanceof Date ? r.createdAt : new Date()),
                                authorTitleId: r.authorTitleId ?? null,
                                isAi: r.isAi === true || typeof r.aiLabel === "string",
                                aiLabel: r.aiLabel,
                                aiSummary: r.aiSummary,
                                aiSource: r.aiSource,
                            };
                        });
                }

                // 4. Post 객체 생성
                const post: Post = {
                    id: docSnap.id,
                    title: data.title ?? "",
                    content: data.content ?? "",
                    category: data.category ?? "기타",
                    subCategory: data.subCategory ?? "기타",
                    type: data.type ?? "question",
                    tags: Array.isArray(data.tags) ? data.tags : [],
                    author: data.author ?? "알 수 없음",
                    authorUid: data.authorUid ?? null,
                    authorAvatar: data.authorAvatar ?? "",
                    createdAt,
                    lanterns: data.lanterns ?? 0,
                    replies,
                    replyCount: data.replyCount ?? replies.length,
                    comments: data.comments ?? replies.length,
                    views: data.views ?? 0,
                    isBookmarked: false,
                    isOwner: !!currentUid && !!data.authorUid && currentUid === data.authorUid,
                    authorTitleId: null,
                    authorTitleName: null,
                    hidden: isHidden,
                    reportCount: data.reportCount,
                };
                return post;
            });

            // null 제거
            const visiblePosts = fetchedPosts.filter((p): p is Post => p !== null);
            setPosts(visiblePosts);

        } catch (error) {
            // usePosts Fetch Error (로그 제거)
        } finally {
            setLoading(false);
        }
    }, [includeHidden]);

    // 초기 진입 시 자동 실행
    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    // 🚨 외부에서 refresh 함수를 호출할 수 있도록 반환값에 추가
    return { posts, setPosts, loading, refresh: fetchPosts } as const;
}