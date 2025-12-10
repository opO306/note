import { useCallback, type MouseEvent } from "react";
import { Card, CardContent } from "./ui/card";
import { LanternIcon, LanternFilledIcon } from "./icons/Lantern";
import { FileText, MessageCircle } from "lucide-react";
import { AppHeader } from "./AppHeader";
// Avatar 대신 공통 최적화 컴포넌트 사용
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { Badge } from "./ui/badge";
import { useUserProfiles, type UserProfileLite } from "@/components/MainScreen/hooks/useUserProfiles";
import { getTitleLabelById } from "@/data/titleData";

interface MyContentListScreenProps {
    /** "posts" = 내 글 / "replies" = 내 답글 */
    mode: "posts" | "replies";
    posts?: any[];
    replies?: any[];
    onBack: () => void;
    onPostClick?: (postId: string) => void;
    onReplyClick?: (postId: string, replyId: number) => void;
}

export function MyContentListScreen({
    mode,
    posts = [],
    replies = [],
    onBack,
    onPostClick,
    onReplyClick,
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

    // 카드에 달아 둔 data-post-id 에서 postId를 꺼내 쓰는 공통 핸들러
    const handlePostCardClick = useCallback(
        (event: MouseEvent<HTMLElement>) => {
            const postIdAttr = event.currentTarget.getAttribute("data-post-id");
            if (!postIdAttr) return;

            onPostClick?.(postIdAttr);
        },
        [onPostClick],
    );

    // 카드에 달아 둔 data-post-id / data-reply-id 에서 id들을 꺼내 쓰는 공통 핸들러
    const handleReplyCardClick = useCallback(
        (event: MouseEvent<HTMLElement>) => {
            const postIdAttr = event.currentTarget.getAttribute("data-post-id");
            const replyIdAttr = event.currentTarget.getAttribute("data-reply-id");
            if (!postIdAttr || !replyIdAttr) return;

            const replyId = Number(replyIdAttr);
            if (!Number.isNaN(replyId)) {
                onReplyClick?.(postIdAttr, replyId);
            }
        },
        [onReplyClick],
    );

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
                        // 리스트 모드
                        <div className="space-y-3">
                            {posts.map((post) => {
                                // 🔹 실시간 users 기준 프로필/칭호 가져오기
                                const authorProfile: UserProfileLite | undefined = post.authorUid
                                    ? userProfiles[post.authorUid]
                                    : undefined;

                                const authorAvatarUrl =
                                    authorProfile?.profileImage ?? post.authorAvatar ?? "";

                                const authorTitleLabel = authorProfile?.currentTitleId
                                    ? getTitleLabelById(authorProfile.currentTitleId)
                                    : null;

                                return (
                                    <Card
                                        key={post.id}
                                        data-post-id={post.id}
                                        className="hover:shadow-md transition-shadow cursor-pointer list-optimized"
                                        onClick={handlePostCardClick}
                                    >
                                        <CardContent className="p-4">
                                            <div className="space-y-3">
                                                {/* 상단: 작성자 + 시간 (게시판 스타일) */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <OptimizedAvatar
                                                            src={authorAvatarUrl}
                                                            alt={post.author}
                                                            size={36} // 9 * 4
                                                            fallbackText={post.author?.charAt(0)?.toUpperCase() || "?"}
                                                        />
                                                        <div>
                                                            <div className="flex items-center space-x-2">
                                                                <p className="font-medium text-sm">
                                                                    {post.author}
                                                                </p>
                                                                {authorTitleLabel && (
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="text-[10px] px-2 py-0.5 h-auto bg-primary/10 text-primary border-primary/20"
                                                                    >
                                                                        {authorTitleLabel}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                                                                {post.timeAgo && <span>{post.timeAgo}</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 제목 */}
                                                {post.title && (
                                                    <h2 className="text-sm font-medium line-clamp-1">
                                                        {post.title}
                                                    </h2>
                                                )}

                                                {/* 내용 요약 */}
                                                {post.content && (
                                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                                        {post.content}
                                                    </p>
                                                )}

                                                {/* 하단: 등불 / 댓글 / 태그 → 게시판 목록과 동일한 구성 */}
                                                <div className="flex items-center justify-between pt-1">
                                                    <div className="flex items-center space-x-4">
                                                        {/* 길잡이 글일 때만 등불 표시 */}
                                                        {post.type === "guide" && (
                                                            <div className="flex items-center space-x-1">
                                                                <LanternIcon className="w-4 h-4 text-muted-foreground" />
                                                                <span className="text-sm text-muted-foreground">
                                                                    {post.lanterns}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* 댓글 수 */}
                                                        <div className="flex items-center space-x-1">
                                                            <MessageCircle className="w-4 h-4 text-muted-foreground" />
                                                            <span className="text-sm text-muted-foreground">
                                                                {post.comments}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* 태그 두 개까지 표시 */}
                                                    {post.tags && post.tags.length > 0 && (
                                                        <div className="flex space-x-1">
                                                            {post.tags[0] && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="text-xs px-1.5 py-0.5"
                                                                >
                                                                    #{post.tags[0]}
                                                                </Badge>
                                                            )}
                                                            {post.tags[1] && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="text-xs px-1.5 py-0.5"
                                                                >
                                                                    #{post.tags[1]}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
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
                                        data-post-id={reply.postId}
                                        data-reply-id={reply.id}
                                        className="hover:shadow-md transition-shadow cursor-pointer list-optimized"
                                        onClick={handleReplyCardClick}
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
