// PostListItem.tsx
import React, { useCallback, useMemo } from "react";
import { Card, CardContent } from "./ui/card";
import { OptimizedAvatar } from "./OptimizedAvatar";
import { Badge } from "./ui/badge";
import { filterGoogleProfileImage } from "@/utils/profileImageUtils";

type PostListItemProps = {
    post: any; // 프로젝트 타입에 맞춰 바꿔도 됨
    userNickname?: string;
    userProfileImage?: string;
    onSelect: (post: any) => void;
};

function PostListItemComponent({ post, userNickname, userProfileImage, onSelect }: PostListItemProps) {
    const author = post?.author ?? "익명";
    const title = post?.title ?? "(제목 없음)";
    const category = post?.category ?? "기타";
    const timeAgo = post?.timeAgo ?? "";

    const showMyAvatar = author === userNickname && userProfileImage;

    // 🔹 프로필 이미지 결정 (구글 이미지 필터링)
    const avatarSrc = useMemo(() => {
        if (showMyAvatar && userProfileImage) {
            return userProfileImage;
        }
        return filterGoogleProfileImage(post?.authorAvatar) ?? undefined;
    }, [showMyAvatar, userProfileImage, post?.authorAvatar]);

    const handleClick = useCallback(() => {
        onSelect(post);
    }, [post, onSelect]);

    return (
        <Card className="cursor-pointer border-border/60 shadow-sm hover:shadow-md bg-card/60 transition-all duration-200">
            <CardContent className="p-4" onClick={handleClick}>
                <div className="flex items-center gap-3">
                    <OptimizedAvatar
                        src={avatarSrc}
                        alt={author ? `${author}님의 프로필` : "프로필 이미지"}
                        nickname={author}
                        fallbackText={String(author).charAt(0).toUpperCase()}
                        className="w-10 h-10 ring-2 ring-border/30 flex-shrink-0"
                        size={40}
                        loading="lazy"
                    />

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="font-medium truncate">{title}</h3>
                            {category && <Badge variant="secondary" className="whitespace-nowrap">{category}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{author} · {timeAgo}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// props가 바뀌지 않으면 재렌더 막기
export const PostListItem = React.memo(PostListItemComponent);
