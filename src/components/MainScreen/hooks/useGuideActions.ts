import { useState, useEffect, useCallback } from "react";
import { auth, functions } from "@/firebase";
import { httpsCallable } from "firebase/functions";
import { toast } from "@/toastHelper";
import { safeLocalStorage } from "@/components/utils/storageUtils";
import type { Post } from "../types";
// ✅ Firestore 읽기/쓰기 분리 문제를 해결한 함수를 import 합니다.
import { createNotificationForEvent } from "@/components/utils/notificationUtils"; // 경로를 실제 파일 위치에 맞게 수정하세요

interface UseGuideActionsParams {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  selectedPost: Post | null;
  setSelectedPost: (post: Post | null) => void;
  userNickname: string;
}

export function useGuideActions({
  posts,
  setPosts,
  selectedPost,
  setSelectedPost,
  userNickname,
}: UseGuideActionsParams) {
  const [guideReplies, setGuideReplies] = useState<Set<number>>(new Set());
  const [postGuides, setPostGuides] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const savedGuideReplies = safeLocalStorage.getJSON("guideReplies", []);
    if (Array.isArray(savedGuideReplies)) {
      setGuideReplies(new Set(savedGuideReplies));
    }

    const savedPostGuides = safeLocalStorage.getJSON("postGuides", {});
    if (typeof savedPostGuides === "object" && savedPostGuides !== null) {
      const guidesData = Object.entries(savedPostGuides)
        .filter(([, v]) => typeof v === "number") as [string, number][];
      setPostGuides(new Map<string, number>(guidesData));
    }
  }, []);

  const handleGuideSelect = useCallback(
    async (replyId: number, replyAuthor: string, postId: string | number) => {
      const postIdStr = String(postId);
      const post = posts.find((p) => String(p.id) === postIdStr);

      if (!post) {
        toast.error("게시글 정보를 찾을 수 없습니다.");
        return;
      }

      if (postGuides.get(postIdStr) !== undefined || (post as any).guideReplyId) {
        toast.error("이미 길잡이가 채택된 글입니다.");
        return;
      }

      if (replyAuthor === userNickname) {
        toast.error("자신의 답글은 채택할 수 없습니다.");
        return;
      }

      if (post.author !== userNickname) {
        toast.error("글 작성자만 길잡이를 채택할 수 있습니다.");
        return;
      }

      // --- 1) 로컬 상태 즉시 업데이트 (Optimistic UI) ---
      const newGuideReplies = new Set(guideReplies);
      newGuideReplies.add(replyId);
      setGuideReplies(newGuideReplies);

      const newPostGuides = new Map(postGuides);
      newPostGuides.set(postIdStr, replyId);
      setPostGuides(newPostGuides);

      safeLocalStorage.setJSON("guideReplies", Array.from(newGuideReplies));
      safeLocalStorage.setJSON("postGuides", Object.fromEntries(newPostGuides));

      const updatedPosts = posts.map((p) => {
        if (String(p.id) === postIdStr) {
          const updatedReplies = (p.replies || []).map((reply: any) => ({
            ...reply,
            isGuide: reply.id === replyId,
          }));
          return { ...p, replies: updatedReplies, guideReplyId: replyId };
        }
        return p;
      });
      setPosts(updatedPosts);

      if (selectedPost && String(selectedPost.id) === postIdStr) {
        const updatedSelectedPost = updatedPosts.find((p) => String(p.id) === postIdStr);
        if (updatedSelectedPost) setSelectedPost(updatedSelectedPost);
      }

      toast.success(`${replyAuthor}님을 길잡이로 채택했습니다! 🌟`);

      // --- 2) Cloud Functions + Firestore 백그라운드 업데이트 ---
      try {
        // 2-1) Cloud Functions(selectGuide)를 호출해 서버 권한으로
        //      posts / users / replies 를 안전하게 업데이트합니다.
        const selectGuideFn = httpsCallable(
          functions,
          "selectGuide"
        );
        await selectGuideFn({
          postId: postIdStr,
          replyId,
        });

        // 2-2) 알림 발송을 위해 replyAuthorUid 를 로컬 데이터에서 가져옵니다.
        const guideReply = (post.replies || []).find((r: any) => r.id === replyId);
        const replyAuthorUid = guideReply?.authorUid ?? null;

        // ✅ 수정된 createNotificationForEvent 함수를 사용하여 알림 생성
        const currentUid = auth.currentUser?.uid;
        if (replyAuthorUid && currentUid) { // 보낸 사람과 받는 사람이 모두 유효할 때만 알림 전송
          await createNotificationForEvent({
            toUserUid: replyAuthorUid,
            fromUserUid: currentUid,
            type: "guide",
            categoryId: (post as any).categoryId ?? post.category ?? null,
            data: {
              postId: post.id,
              replyId,
              userId: currentUid,
              userName: userNickname,
              // 'titleName' 이나 'lumenReward' 같은 커스텀 필드는 data 객체 안에 넣는 것이 좋습니다.
              // customData: { titleName: replyAuthor, lumenReward: GUIDE_LUMEN_REWARD }
            },
          });
        }
      } catch (error) {
        console.error("길잡이 채택 Firestore/알림 업데이트 실패:", error);
        toast.error("서버에 길잡이 정보를 업데이트하는 중 오류가 발생했습니다.");
        // 여기서 로컬 상태 롤백 로직을 추가할 수도 있습니다.
      }
    },
    [posts, selectedPost, userNickname, guideReplies, postGuides, setPosts, setSelectedPost]
  );

  // 특정 게시글이 이미 길잡이를 가지고 있는지 확인
  const hasGuide = useCallback(
    (postId: string | number): boolean => {
      const postIdStr = String(postId);
      // postGuides에 있거나, posts 배열에서 해당 post의 guideReplyId가 있는지 확인
      if (postGuides.has(postIdStr)) {
        return true;
      }
      const post = posts.find((p) => String(p.id) === postIdStr);
      return !!(post && (post.guideReplyId !== undefined || (post as any).guideReplyId));
    },
    [postGuides, posts]
  );

  // 특정 답글이 길잡이인지 확인
  const isGuideReply = useCallback(
    (replyId: number): boolean => {
      return guideReplies.has(replyId);
    },
    [guideReplies]
  );

  return {
    handleGuideSelect,
    hasGuide,
    isGuideReply,
  };
}