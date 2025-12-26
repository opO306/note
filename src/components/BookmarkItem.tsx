import { memo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/components/utils";

export interface Post {
    id: string;
    title: string;
    author: string;
    avatarUrl?: string;
}

export interface BookmarkItemProps {
    post: Post;
    onSelect: (postId: string) => void;
    onRemove?: (postId: string) => void;
    className?: string;
}

export const BookmarkItem = memo(function BookmarkItem({
    post,
    onSelect,
    onRemove,
    className,
}: BookmarkItemProps) {
    const handleOpen = useCallback(() => onSelect(post.id), [onSelect, post.id]);
    const handleRemove = useCallback(() => onRemove?.(post.id), [onRemove, post.id]);

    return (
        <Card className={cn("cursor-pointer", className)}>
            <CardContent className="p-3 flex items-center gap-3">
                <Avatar className="w-10 h-10">
                    <AvatarImage src={post.avatarUrl} />
                    <AvatarFallback>{post.author.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{post.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{post.author}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="text-sm underline" onClick={handleOpen}>열기</button>
                    {onRemove && (
                        <button className="text-sm text-red-600 underline" onClick={handleRemove}>
                            삭제
                        </button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
});
