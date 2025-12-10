// src/components/PostCard.tsx
import React, { useCallback } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2 } from "lucide-react";

interface Post {
  id: number;
  author: string;
  title: string;
  content: string;
  likes: number;
  comments: number;
  tags: string[];
}

interface PostCardProps {
  post: Post;
  onLike: (postId: number) => void;
  onComment: (postId: number) => void;
  onShare?: (postId: number) => void;
}

export const PostCard = React.memo(function PostCard({
  post,
  onLike,
  onComment,
  onShare,
}: PostCardProps) {
  const handleLikeClick = useCallback(() => {
    onLike(post.id);
  }, [post.id, onLike]);

  const handleCommentClick = useCallback(() => {
    onComment(post.id);
  }, [post.id, onComment]);

  const handleShareClick = useCallback(() => {
    if (onShare) {
      onShare(post.id);
    }
  }, [post.id, onShare]);
  return (
    <Card className="border-gray-200">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="w-7 h-7">
              <AvatarFallback>{post.author.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{post.author}</span>
              </div>
              <div className="text-xs text-gray-500">방금</div>
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px]">새 글</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="font-mono font-semibold">{post.title}</div>
        <p className="text-sm text-gray-700">{post.content}</p>
        <div className="flex items-center gap-2">
          {post.tags.map(t => (
            <Badge key={t} variant="outline" className="text-[10px]">
              {t}
            </Badge>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-2">
          <Button variant="ghost" size="sm" className="gap-1 text-gray-600"
            onClick={handleLikeClick}>
            <Heart className="w-4 h-4" />
            {post.likes}
          </Button>
          <Button variant="ghost" size="sm" className="gap-1 text-gray-600"
            onClick={handleCommentClick}>
            <MessageCircle className="w-4 h-4" />
            {post.comments}
          </Button>
          {onShare && (
            <Button variant="ghost" size="sm" className="gap-1 text-gray-600"
              onClick={handleShareClick}>
              <Share2 className="w-4 h-4" />
              공유
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
