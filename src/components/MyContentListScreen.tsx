import { useCallback } from "react";
import { FileText, MessageCircle } from "lucide-react";
import { AppHeader } from "./layout/AppHeader";
import { useUserProfiles, type UserProfileLite } from "@/components/MainScreen/hooks/useUserProfiles";
import { PostCard } from "@/components/MainScreen/components/PostListView";
import type { Post } from "@/components/MainScreen/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { LanternFilledIcon } from "@/components/icons/Lantern";
import { getTitleLabelById } from "@/data/titleData";

interface PostItem {
    id: string;
    authorUid?: string | null;
    authorAvatar?: string;
    author?: string;
    timeAgo?: string;
    createdAtText?: string;
    title?: string;
    content?: string;
    type?: string;
    lanterns?: number;
    comments?: number;
    views?: number;
    tags?: string[];
    category?: string;
    subCategory?: string;
    isBookmarked?: boolean;
}

interface ReplyItem {
    id: number | string;
    postId: string;
    authorUid?: string | null;
    authorAvatar?: string;
    author?: string;
    postAuthor?: string;
    timeAgo?: string;
    content?: string;
    lanterns?: number;
}

interface MyContentListScreenProps {
    /** "posts" = 내 글 / "replies" = 내 답글 */
    mode: "posts" | "replies";
    posts?: PostItem[];
    replies?: ReplyItem[];
    onBack: () => void;
    onPostClick?: (postId: string) => void;
    onReplyClick?: (postId: string, replyId: number) => void;
    userNickname?: string;
    userProfileImage?: string;
    userUid?: string; // userUid 추가
    currentTitle?: string;
    isPostLanterned?: (postId: string) => boolean;
    isBookmarked?: (postId: string) => boolean;
    formatTimeAgo?: (date: Date) => string;
    formatCreatedAt?: (date: Date) => string;
    onLanternToggle?: (postId: string) => void;
    onBookmarkToggle?: (postId: string) => void;
}

export function MyContentListScreen({
    mode,
    posts = [],
    replies = [],
    onBack,
    onPostClick,
    onReplyClick,
    userNickname,
    userProfileImage,
    currentTitle,
    isPostLanterned = () => false,
    isBookmarked = () => false,
    formatTimeAgo = () => "",
    formatCreatedAt = () => "",
    onLanternToggle = () => {},
    onBookmarkToggle = () => {},
    userUid, // userUid 추가
}: MyContentListScreenProps) {
    const isPostsMode = mode === "posts";

    // 🔹 이 화면에 등장하는 모든 uid 모으기 (글 + 답글)
    const allUidsForThisScreen = [
        ...new Set(
            [
                // 내 글 모드: 각 post.authorUid
                ...posts
                    .map((p) => p.authorUid)
                    .filter(
                        (uid): uid is string => typeof uid === "string" && uid.length > 0
                    ),
                // 내 답글 모드: 각 reply.authorUid
                ...replies
                    .map((r) => r.authorUid)
                    .filter(
                        (uid): uid is string => typeof uid === "string" && uid.length > 0
                    ),
            ]
        ),
    ];

    // 🔹 공통 훅으로 프로필/칭호 실시간 구독
    const userProfiles: Record<string, UserProfileLite> =
        useUserProfiles(allUidsForThisScreen);

    const title = isPostsMode ? "내가 작성한 글" : "내가 남긴 답글";

    const handleReplyCardClick = useCallback(
        (postId: string, replyId: number | string) => () => {
            const numericId = typeof replyId === "number" ? replyId : Number(replyId);
            if (!Number.isNaN(numericId)) {
                onReplyClick?.(postId, numericId);
            }
        },
        [onReplyClick],
    );

    // PostItem을 Post 타입으로 변환하는 헬퍼 함수
    const convertPostItemToPost = useCallback((postItem: PostItem): Post => {
        // timeAgo나 createdAtText에서 Date 추출 시도
        let createdAt = new Date();
        if (postItem.createdAtText) {
            const parsed = new Date(postItem.createdAtText);
            if (!isNaN(parsed.getTime())) {
                createdAt = parsed;
            }
        }

        return {
            id: postItem.id,
            title: postItem.title || "",
            content: postItem.content || "",
            category: postItem.category || "기타",
            subCategory: postItem.subCategory || "기타",
            type: (postItem.type === "guide" ? "guide" : "question") as "question" | "guide",
            tags: postItem.tags || [],
            author: postItem.author || "",
            authorUid: postItem.authorUid || null,
            authorAvatar: postItem.authorAvatar || "",
            createdAt,
            lanterns: postItem.lanterns || 0,
            replies: [],
            replyCount: postItem.comments || 0,
            comments: postItem.comments || 0,
            views: postItem.views || 0,
            isBookmarked: postItem.isBookmarked || false,
            isOwner: true, // 내 글 목록이므로 항상 true
            timeAgo: postItem.timeAgo,
        };
    }, []);

    // PostCard에 전달할 핸들러
    const handlePostCardClickWrapper = useCallback((post: Post) => {
        onPostClick?.(post.id);
    }, [onPostClick]);

    return (
        <div className="flex-1 flex flex-col scrollbar-hide">
            {/* 공통 헤더 사용 */}
            <AppHeader
                title={title}
                onBack={onBack}
                icon={<FileText className="w-4 h-4" />}
            />

            {/* 목록 영역 */}
            <main className="flex-1 scroll-container px-4 py-3 pb-24">

                {isPostsMode ? (
                    // === 내 글 모드 ===
                    posts.length === 0 ? (
                        // 빈 상태: 아이콘 + 글자만 가운데
                        <div className="h-full flex items-center justify-center">
                            <div className="flex flex-col items-center text-center">
                                <FileText className="w-10 h-10 mb-3 text-muted-foreground/60" />
                                <p className="text-sm text-muted-foreground">
                                    아직 작성한 글이 없습니다.
                                </p>
                            </div>
                        </div>
                    ) : (
                        // 리스트 모드 - PostCard 컴포넌트 사용
                        <div className="space-y-3">
                            {posts.map((postItem, index) => {
                                const post = convertPostItemToPost(postItem);
                                const authorProfile: UserProfileLite | undefined = postItem.authorUid
                                    ? userProfiles[postItem.authorUid]
                                    : undefined;

                                // createdAt에서 timeAgo와 createdAtText 생성
                                const timeAgoText = postItem.timeAgo || formatTimeAgo(post.createdAt);
                                const createdAtText = postItem.createdAtText || formatCreatedAt(post.createdAt);

                                return (
                                    <div key={post.id} className="px-0 py-1.5">
                                        <PostCard
                                            post={post}
                                            userNickname={userNickname || ""}
                                            userProfileImage={userProfileImage || ""}
                                            isLanterned={isPostLanterned(post.id)}
                                            isBookmarked={isBookmarked(post.id)}
                                            timeAgo={timeAgoText}
                                            createdAtText={createdAtText}
                                            currentTitle={currentTitle || ""}
                                            authorProfile={authorProfile}
                                            onPostClick={handlePostCardClickWrapper}
                                            onLanternToggle={(postId) => onLanternToggle?.(String(postId))}
                                            onBookmarkToggle={(postId) => onBookmarkToggle?.(String(postId))}
                                            index={index}
                                            userUid={userUid || ""} // userUid 추가
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )
                ) : // === 내 답글 모드 ===
                    replies.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="flex flex-col items-center text-center">
                                <MessageCircle className="w-10 h-10 mb-3 text-muted-foreground/60" />
                                <p className="text-sm text-muted-foreground">
                                    아직 작성한 답글이 없습니다.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {replies.map((reply) => {
                                const replyAuthorProfile: UserProfileLite | undefined = reply.authorUid
                                    ? userProfiles[reply.authorUid]
                                    : undefined;

                                const replyAvatarUrl =
                                    replyAuthorProfile?.profileImage ?? reply.authorAvatar ?? "";
                                const replyTitleLabel = replyAuthorProfile?.currentTitleId
                                    ? getTitleLabelById(replyAuthorProfile.currentTitleId)
                                    : null;

                                return (
                                    <Card
                                        key={reply.id}
                                        className="hover:shadow-md transition-shadow cursor-pointer list-optimized"
                                        onClick={handleReplyCardClick(reply.postId, reply.id)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <OptimizedAvatar
                                                            src={replyAvatarUrl}
                                                            alt={reply.author}
                                                            size={32} // 8 * 4
                                                            fallbackText={reply.author?.charAt(0)?.toUpperCase() || "?"}
                                                        />
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center space-x-1">
                                                                <span className="text-xs font-medium">
                                                                    {reply.author}
                                                                </span>
                                                                {replyTitleLabel && (
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="text-[10px] px-2 py-0.5 h-auto bg-primary/10 text-primary border-primary/20"
                                                                    >
                                                                        {replyTitleLabel}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <span className="text-[11px] text-muted-foreground">
                                                                {reply.postAuthor}님의 글
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {reply.timeAgo && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {reply.timeAgo}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* 내가 쓴 답글 내용만 보여주기 */}
                                                <p className="text-sm line-clamp-2">{reply.content}</p>

                                                <div className="flex items-center space-x-1 mt-2">
                                                    <LanternFilledIcon className="w-3 h-3 text-amber-500" />
                                                    <span className="text-xs text-amber-600">
                                                        {reply.lanterns}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
            </main>
        </div>
    );
}
