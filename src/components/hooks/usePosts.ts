// src/components/hooks/usePosts.ts

import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import {
    collection,
    // getDocs, // 👈 onSnapshot 대신 사용
    orderBy,
    query,
    limit,
    onSnapshot, // 👈 onSnapshot 추가
} from "firebase/firestore";
import type { Post, Reply } from "../MainScreen/types";

interface UsePostsOptions {
    includeHidden?: boolean;
}

const INITIAL_POST_LIMIT = 10; // ✅ 비용 절감: 초기 로드 24개 → 10개로 감소

export function usePosts(options?: UsePostsOptions & { enabled?: boolean }) {
    const { includeHidden = false, enabled = true } = options ?? {};

    // 게시글 상태
    const [posts, setPosts] = useState<Post[]>([]);
    // 로딩 상태 (새로고침 중일 때 UI 처리에 유용)
    const [loading, setLoading] = useState<boolean>(false);

    // ♻️ 데이터를 불러오는 함수 (onSnapshot 로직을 여기로 이관)
    // onSnapshot을 사용하므로 useCallback으로 감쌀 필요 없음 (useEffect 내부에서 클린업 처리)
    useEffect(() => {
        if (!enabled) return; // enabled가 false일 경우 함수 실행을 막음

        setLoading(true);
        const postsRef = collection(db, "posts");
        const q = query(postsRef, orderBy("createdAt", "desc"), limit(INITIAL_POST_LIMIT));

        // ⚡️ onSnapshot: 실시간 업데이트를 구독
        const unsubscribe = onSnapshot(q, (snapshot) => {
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
                    authorTitleId: data.authorTitleId ?? null,
                    authorTitleName: data.authorTitleName ?? null,
                    hidden: isHidden,
                    reportCount: data.reportCount ?? 0,
                    moderationStatus: data.moderationStatus ?? "pending",
                    clientIp: data.clientIp ?? null,
                };
                return post;
            });

            // null 제거
            const visiblePosts = fetchedPosts.filter((p): p is Post => p !== null);
            setPosts(visiblePosts);
            setLoading(false); // 데이터 수신 완료 시 로딩 해제
        }, (error) => {
            console.error("Error fetching posts: ", error); // 에러 로그 추가
            setLoading(false);
        });

        return () => unsubscribe(); // 클린업 함수 반환
    }, [includeHidden, enabled]);

    return { posts, setPosts, loading, refresh: () => { /* onSnapshot은 자동 새로고침 */ } } as const;
}