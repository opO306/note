import { useCallback, useMemo } from "react";
import { Card, CardContent } from "./ui/card";
import { LanternFilledIcon } from "./icons/Lantern";
import { FileText, MessageCircle, Bookmark } from "lucide-react";
import { AppHeader } from "./layout/AppHeader";
// Avatar 대신 공통 최적화 컴포넌트 사용
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { Badge } from "./ui/badge";
import { useUserProfiles, type UserProfileLite } from "@/components/MainScreen/hooks/useUserProfiles";
import { getTitleLabelById } from "@/data/titleData";
import { filterGoogleProfileImage } from "@/utils/profileImageUtils";

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

    // 카드 클릭 핸들러: id를 직접 전달해 DOM 의존 제거
    const handlePostCardClick = useCallback(
        (postId: string) => () => {
            onPostClick?.(postId);
        },
        [onPostClick],
    );

    const handleReplyCardClick = useCallback(
        (postId: string, replyId: number | string) => () => {
            const numericId = typeof replyId === "number" ? replyId : Number(replyId);
            if (!Number.isNaN(numericId)) {
                onReplyClick?.(postId, numericId);
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

                                // 🔹 프로필 이미지 결정 (구글 이미지 필터링)
                                const authorAvatarUrl = useMemo(() => {
                                    return authorProfile?.profileImage ?? filterGoogleProfileImage(post.authorAvatar) ?? "";
                                }, [authorProfile?.profileImage, post.authorAvatar]);

                                const authorTitleLabel = authorProfile?.currentTitleId
                                    ? getTitleLabelById(authorProfile.currentTitleId)
                                    : null;

                                return (
                                    <Card
                                        key={post.id}
                                        className="border-border/60 shadow-sm bg-card/80 backdrop-blur-sm hover:shadow-md transition-shadow cursor-pointer list-optimized"
                                        onClick={handlePostCardClick(post.id)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="space-y-3">
                                                {/* 상단: 작성자 + 시간 (게시판 스타일) */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <OptimizedAvatar
                                                            src={authorAvatarUrl}
                                                            alt={post.author}
                                                            size={40}
                                                            className="ring-2 ring-border/20"
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
                                                                {(post.timeAgo || post.createdAtText) && (
                                                                    <span title={post.createdAtText || undefined}>
                                                                        {post.timeAgo ?? post.createdAtText}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {/* 타입/카테고리 텍스트 (닉네임 아래) */}
                                                            {(() => {
                                                                const parts = [
                                                                    post.category && post.category !== "전체" ? post.category : null,
                                                                    post.subCategory && post.subCategory !== "전체" ? post.subCategory : null,
                                                                    post.type ? (post.type === "guide" ? "길잡이 글" : "질문글") : null,
                                                                ].filter(Boolean) as string[];
                                                                return parts.length ? (
                                                                    <div className="text-xs text-muted-foreground mt-2">
                                                                        {parts.join(" · ")}
                                                                    </div>
                                                                ) : null;
                                                            })()}
                                                        </div>
                                                    </div>
                                                    {/* 북마크 아이콘 (메인 피드 스타일) */}
                                                    <Bookmark
                                                        className={`w-4 h-4 ${post.isBookmarked ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`}
                                                    />
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

                                                {/* 하단: 등불 / 댓글 / 조회수 / 태그 → 메인 피드 스타일 */}
                                                <div className="flex items-center justify-between pt-1">
                                                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                                                        <div className="flex items-center space-x-1">
                                                            <LanternFilledIcon className="w-4 h-4 text-amber-500" />
                                                            <span>{post.lanterns ?? 0}</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                            <MessageCircle className="w-4 h-4" />
                                                            <span>{post.comments ?? 0}</span>
                                                        </div>
                                                        <div className="flex items-center space-x-1">
                                                            <span className="w-1 h-1 rounded-full bg-muted-foreground/60 inline-block" />
                                                            <span>{post.views ?? 0} 조회</span>
                                                        </div>
                                                    </div>

                                                    {/* 태그만 (나머지 뱃지는 상단으로 이동) */}
                                                    {/* 목록에서는 태그 미표시 (상세에서만 표시) */}
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
