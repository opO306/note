// src/components/hooks/usePosts.ts

import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import {
    collection,
    onSnapshot,
    orderBy,
    query,
    limit,
    FirestoreError
} from "firebase/firestore";
import type { Post, Reply } from "../MainScreen/types";

interface UsePostsOptions {
    includeHidden?: boolean;
}

export function usePosts(options?: UsePostsOptions) {
    const { includeHidden = false } = options ?? {};
    const [posts, setPosts] = useState<Post[]>([]);

    useEffect(() => {
        const postsRef = collection(db, "posts");
        const q = query(postsRef, orderBy("createdAt", "desc"), limit(50));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const currentUid = auth.currentUser?.uid ?? null;

                const fetchedPosts = snapshot.docs.map((docSnap) => {
                    const data = docSnap.data(); // any 타입 캐스팅 제거 (안전성 확보)

                    // 1. 숨김 처리된 게시글 필터링
                    const isHidden = data.hidden === true;
                    if (isHidden && !includeHidden) {
                        return null;
                    }

                    // 2. 날짜 변환 로직 (안전하게 처리)
                    const createdAt: Date =
                        data.createdAt && typeof data.createdAt.toDate === "function"
                            ? data.createdAt.toDate()
                            : data.createdAt instanceof Date
                                ? data.createdAt
                                : new Date();

                    // 3. 댓글 데이터 변환 (🔴 여기서 충돌 해결)
                    let replies: Reply[] = [];
                    if (Array.isArray(data.replies)) {
                        replies = data.replies
                            .filter((r: any) => {
                                // r이 객체가 아니거나 null이면 제외 (핵심 수정!)
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
                                    // Timestamp와 Date 객체 모두 대응
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

                // null 제거 (필터링된 항목)
                const visiblePosts = fetchedPosts.filter((p): p is Post => p !== null);
                setPosts(visiblePosts);
            },
            (error: FirestoreError) => {
                console.error("🔥 [usePosts] Firestore Error:", error.code, error.message);
            }
        );

        return () => unsubscribe();
    }, [includeHidden]);

    return { posts, setPosts } as const;
}