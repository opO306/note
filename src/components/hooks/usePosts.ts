// src/components/MainScreen/hooks/usePosts.ts

import { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import {
    collection,
    onSnapshot,
    orderBy,
    query,
    doc,
    getDoc,
} from "firebase/firestore";
import type { Post, Reply } from "../MainScreen/types";

// 🔹 옵션 타입 추가
interface UsePostsOptions {
    includeHidden?: boolean; // true 로 주면 숨김 글까지 포함
}

export function usePosts(options?: UsePostsOptions) {
    const { includeHidden = false } = options ?? {};

    const [posts, setPosts] = useState<Post[]>([]);

    useEffect(() => {
        const postsRef = collection(db, "posts");
        const q = query(postsRef, orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(
            q,
            async (snapshot) => {
                const currentUid = auth.currentUser?.uid ?? null;

                const fetchedPosts = await Promise.all(
                    snapshot.docs.map(async (docSnap) => {
                        const data: any = docSnap.data();

                        // 🔹 Firestore hidden 필드 그대로 읽어오기
                        const isHidden = data.hidden === true;

                        // 기본값: 숨김 글은 아예 리스트에서 제외
                        if (isHidden && !includeHidden) {
                            return null;
                        }

                        // createdAt 정규화
                        const createdAt: Date =
                            data.createdAt && typeof data.createdAt.toDate === "function"
                                ? data.createdAt.toDate()
                                : data.createdAt instanceof Date
                                    ? data.createdAt
                                    : new Date();

                        // replies 정규화
                        let replies: Reply[] = [];

                        if (Array.isArray(data.replies)) {
                            // 🔹 1) 숨김 댓글 필터링: hidden === true 이고, includeHidden 이 false 면 제외
                            const rawReplies = data.replies.filter((r: any) => {
                                const isHiddenReply = r?.hidden === true;
                                if (isHiddenReply && !includeHidden) {
                                    return false; // 리스트에서 빼기
                                }
                                return true;
                            });

                            // 🔹 2) 필터된 것만 Reply 타입으로 변환
                            replies = rawReplies.map((r: any): Reply => {
                                let replyCreatedAt: Date;

                                if (r?.createdAt && typeof r.createdAt.toDate === "function") {
                                    replyCreatedAt = r.createdAt.toDate();
                                } else if (r?.createdAt instanceof Date) {
                                    replyCreatedAt = r.createdAt;
                                } else if (
                                    typeof r?.createdAt === "string" ||
                                    typeof r?.createdAt === "number"
                                ) {
                                    const parsed = new Date(r.createdAt);
                                    replyCreatedAt = Number.isNaN(parsed.getTime())
                                        ? new Date()
                                        : parsed;
                                } else {
                                    replyCreatedAt = new Date();
                                }

                                return {
                                    id:
                                        typeof r.id === "number" || typeof r.id === "string"
                                            ? r.id
                                            : Date.now(),
                                    content: r.content ?? "",
                                    author: r.author ?? "알 수 없음",
                                    authorUid:
                                        typeof r.authorUid === "string" ? r.authorUid : null,
                                    authorAvatar:
                                        typeof r.authorAvatar === "string"
                                            ? r.authorAvatar
                                            : null,
                                    timeAgo: r.timeAgo ?? "",
                                    lanterns:
                                        typeof r.lanterns === "number" ? r.lanterns : 0,
                                    isGuide: !!r.isGuide,
                                    createdAt: replyCreatedAt,
                                    authorTitleId: r.authorTitleId ?? null,
                                };
                            });
                        }

                        // 작성자 칭호
                        let authorTitleId: string | null = null;
                        let authorTitleName: string | null = null;

                        if (data.authorUid) {
                            try {
                                const userDocRef = doc(db, "users", data.authorUid);
                                const userDocSnap = await getDoc(userDocRef);

                                if (userDocSnap.exists()) {
                                    const userData: any = userDocSnap.data();
                                    authorTitleId = userData.currentTitle ?? null;
                                    if (userData.currentTitleName) {
                                        authorTitleName = userData.currentTitleName;
                                    }
                                }
                            } catch (err) {
                                console.error("작성자 칭호 정보 불러오기 실패:", err);
                            }
                        }

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
                            replyCount:
                                typeof data.replyCount === "number"
                                    ? data.replyCount
                                    : replies.length,
                            comments:
                                typeof data.comments === "number"
                                    ? data.comments
                                    : replies.length,
                            views: data.views ?? 0,
                            isBookmarked: false,
                            isOwner:
                                !!currentUid && !!data.authorUid
                                    ? currentUid === data.authorUid
                                    : false,
                            authorTitleId,
                            authorTitleName,

                            // 🔹 hidden 정보도 같이 넣어두면 나중에 운영자 화면에서 다시 쓸 수 있음
                            hidden: isHidden,
                            reportCount:
                                typeof data.reportCount === "number"
                                    ? data.reportCount
                                    : undefined,
                        };

                        return post;
                    })
                );

                // null(숨김글) 제거
                const visiblePosts = fetchedPosts.filter(
                    (p): p is Post => p !== null
                );

                setPosts(visiblePosts);
            },
            (error) => {
                console.error("Firestore 실시간 구독 에러:", error);
            }
        );

        return () => unsubscribe();
    }, [includeHidden]);

    return { posts, setPosts } as const;
}
