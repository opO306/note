import { useMemo } from "react";
import { getDisplayName, isDeletedAuthor } from "@/components/utils/deletedUserHelpers";
import { getTitleLabelById, getUserTitle } from "@/data/titleData";
import { useUserProfiles, type UserProfileLite } from "./useUserProfiles";
import type { Post, Reply } from "../types";

export type ReplyWithGuide = Reply & { isGuide: boolean };

interface UsePostDetailViewModelParams {
    post: Post;
    userNickname: string;
    currentTitle: string;
}

interface PostDetailViewModel {
    userProfiles: Record<string, UserProfileLite>;
    postAuthorProfileImage: string | null;
    postAuthorName: string;
    isPostAuthorDeleted: boolean;
    authorTitle: string | null;
    postCreatedAtText: string;
    postCreatedAtDate: Date | null;
    visibleReplies: ReplyWithGuide[];
}

function toDateSafe(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value && typeof (value as any).toDate === "function") {
        return (value as any).toDate();
    }
    if (typeof value === "string" || typeof value === "number") {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
    }
    return null;
}

export function formatDateTime(value: unknown): string {
    const date = toDateSafe(value);
    if (!date) return "";
    return date.toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function usePostDetailViewModel({
    post,
    userNickname,
    currentTitle,
    userProfileImage,
}: UsePostDetailViewModelParams & { userProfileImage?: string }): PostDetailViewModel {
    // 화면에 등장하는 UID 모으기
    const allUidsForThisScreen = useMemo(() => {
        const uids = new Set<string>();
        if (typeof post.authorUid === "string" && post.authorUid.length > 0) {
            uids.add(post.authorUid);
        }
        post.replies?.forEach((r) => {
            if (typeof r.authorUid === "string" && r.authorUid.length > 0) {
                uids.add(r.authorUid);
            }
        });
        return Array.from(uids);
    }, [post.authorUid, post.replies]);

    const userProfiles = useUserProfiles(allUidsForThisScreen);

    const postAuthorProfile = post.authorUid ? userProfiles[post.authorUid] : undefined;
    const liveAuthorTitleId = postAuthorProfile?.currentTitleId ?? null;
    const liveAuthorTitle = getTitleLabelById(liveAuthorTitleId);

    const postAuthorDeletedFlag = (post as any).authorDeleted === true || post.author === "탈퇴한 사용자";
    const postAuthorName = getDisplayName(post.author, postAuthorDeletedFlag);
    const isPostAuthorDeleted = isDeletedAuthor(post.author, postAuthorDeletedFlag);

    // 🔹 자신의 게시글일 때는 무조건 userProfileImage 사용 (실시간 프로필 무시), 그 외에는 실시간 프로필 이미지 우선
    const isOwnPost = post.author === userNickname;
    const postAuthorProfileImage = useMemo(() => {
        if (isOwnPost) {
            // 자신의 게시글일 때는 userProfileImage 우선, 없으면 실시간 프로필, 없으면 post.authorAvatar
            return userProfileImage && userProfileImage.trim().length > 0
                ? userProfileImage
                : (postAuthorProfile?.profileImage ?? post.authorAvatar ?? null);
        }
        // 다른 사람의 게시글일 때는 실시간 프로필 우선
        return postAuthorProfile?.profileImage ?? post.authorAvatar ?? null;
    }, [isOwnPost, userProfileImage, postAuthorProfile?.profileImage, post.authorAvatar]);

    const authorTitleFallback = getUserTitle(post.author ?? "", userNickname, currentTitle);
    const authorTitle = isPostAuthorDeleted ? null : (liveAuthorTitle || authorTitleFallback);

    const postCreatedAtDate = toDateSafe(post.createdAt);
    const postCreatedAtText = formatDateTime(post.createdAt);

    const visibleReplies: ReplyWithGuide[] = useMemo(
        () =>
            post.replies
                ?.filter((reply) => !((reply as any).hidden === true))
                ?.map((reply) => ({
                    ...reply,
                    isGuide: reply.isGuide || post.guideReplyId === reply.id,
                })) ?? [],
        [post.guideReplyId, post.replies],
    );

    return {
        userProfiles,
        postAuthorProfileImage,
        postAuthorName,
        isPostAuthorDeleted,
        authorTitle,
        postCreatedAtText,
        postCreatedAtDate,
        visibleReplies,
    };
}

