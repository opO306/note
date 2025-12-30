import { useState, useEffect, useCallback } from "react";
import { auth, functions, db } from "@/firebase";
import { httpsCallable } from "firebase/functions";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { toast } from "@/toastHelper";
import confetti from "canvas-confetti";
import { safeLocalStorage } from "@/components/utils/storageUtils";
import { invalidateUserDataCache } from "@/utils/userDataLoader";
import type { Post } from "../types";

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

      // --- [NEW] 공개 테스트 개척자 칭호 지급 로직 ---
      // ✅ 답변 작성자(길잡이로 채택된 사람)에게 칭호 지급
      const isOpenBeta = true; // 공개 테스트 기간 플래그
      if (isOpenBeta) {
        try {
          // 답변에서 작성자 UID 찾기
          const selectedReply = post.replies?.find((r: any) => r.id === replyId);
          const replyAuthorUid = selectedReply?.authorUid || selectedReply?.userId;
          
          if (!replyAuthorUid) {
            console.warn("답변 작성자 UID를 찾을 수 없습니다.");
          } else {
            const userRef = doc(db, "users", replyAuthorUid);
            // 사용자 데이터 확인 (칭호 보유 여부)
            getDoc(userRef).then(async (snap) => {
              if (snap.exists()) {
                const userData = snap.data();
                const ownedTitles: string[] = userData.ownedTitles || [];
                
                // 아직 개척자 칭호가 없다면 지급
                if (!ownedTitles.includes("guide_pathfinder")) {
                  await updateDoc(userRef, {
                    ownedTitles: arrayUnion("guide_pathfinder")
                  });
                  
                  // 캐시 무효화
                  invalidateUserDataCache(replyAuthorUid);
                  
                  // 획득 연출
                  confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#f59e0b', '#fbbf24', '#d97706'] // Amber colors
                  });
                  
                  toast.success("🏆 최초 채택 달성! '개척자' 칭호를 획득했습니다!");
                }
              }
            }).catch(err => console.error("칭호 지급 확인 중 오류:", err));
          }
        } catch (e) {
          console.error("개척자 칭호 로직 오류:", e);
        }
      }

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

        // ✅ 알림은 Cloud Function에서 생성하므로 클라이언트에서는 생성하지 않음
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