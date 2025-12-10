// PostListItem.tsx
import React, { useCallback } from "react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";

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

    const handleClick = useCallback(() => {
        onSelect(post);
    }, [post, onSelect]);

    return (
        <Card className="cursor-pointer border-border/60 shadow-sm hover:shadow-md bg-card/60 transition-all duration-200">
            <CardContent className="p-4" onClick={handleClick}>
                <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 ring-2 ring-border/30 flex-shrink-0">
                        {showMyAvatar ? (
                            <AvatarImage src={userProfileImage} />
                        ) : post?.authorAvatar ? (
                            <AvatarImage src={post.authorAvatar} />
                        ) : null}
                        <AvatarFallback className="bg-muted text-foreground font-medium">
                            {String(author).charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>

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
