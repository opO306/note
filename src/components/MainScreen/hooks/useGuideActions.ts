// MainScreen/hooks/useGuideActions.ts
// 길잡이(채택) 관련 로직을 관리하는 훅

import { useState, useEffect, useCallback } from "react";
import { db } from "@/firebase";
import { doc, updateDoc, increment } from "firebase/firestore";
import { toast } from "@/toastHelper";
import { safeLocalStorage } from "@/components/utils/storageUtils";
import type { Post } from "../types";
// 맨 위 다른 import들 아래에 추가
import { createNotificationForEvent } from "@/components/hooks/notificationDomainService";
import { auth } from "@/firebase";  // 이미 위에서 import 안 되어 있으면 같이

const GUIDE_LUMEN_REWARD = 3;

interface UseGuideActionsParams {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  selectedPost: Post | null;
  setSelectedPost: (post: Post | null) => void;
  userNickname: string;
  userGuideCount: number;
  setUserGuideCount: React.Dispatch<React.SetStateAction<number>>;
  addLumensWithTrust: (amount: number, reason: string) => void;
  updateActivity: (activity: { guideCount?: number }) => void;
  updateTrust: (delta: number) => void;
}

export function useGuideActions({
  posts,
  setPosts,
  selectedPost,
  setSelectedPost,
  userNickname,
  userGuideCount,
  setUserGuideCount,
  addLumensWithTrust,
  updateActivity,
  updateTrust,
}: UseGuideActionsParams) {
  // 길잡이로 채택된 답글 ID 목록
  const [guideReplies, setGuideReplies] = useState<Set<number>>(new Set());

  // 각 게시물별 채택된 답글 ID (하나만 채택 가능)
  const [postGuides, setPostGuides] = useState<Map<string, number>>(new Map());

  // localStorage에서 상태 복원
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

  // 길잡이 채택
  const handleGuideSelect = useCallback(
    async (replyId: number, replyAuthor: string, postId: string | number) => {
      const postIdStr = String(postId);

      // 글 정보 찾기
      const post = posts.find((p) => String(p.id) === postIdStr);
      if (!post) {
        toast.error("게시글 정보를 찾을 수 없습니다.");
        return;
      }

      // 이미 이 글에 채택된 답글이 있는지 확인
      const existingGuideFromMap = postGuides.get(postIdStr);
      const existingGuideFromPost = (post as any).guideReplyId;

      if (
        existingGuideFromMap !== undefined ||
        typeof existingGuideFromPost === "number"
      ) {
        toast.error("이미 길잡이가 채택된 글입니다.");
        return;
      }

      // 자기 자신의 답글은 채택 불가
      if (replyAuthor === userNickname) {
        toast.error("자신의 답글은 채택할 수 없습니다.");
        return;
      }

      // 글 작성자만 채택 가능
      if (post.author !== userNickname) {
        toast.error("글 작성자만 길잡이를 채택할 수 있습니다.");
        return;
      }

      // ===========================
      // 1) 로컬 상태 업데이트
      // ===========================
      const newGuideReplies = new Set(guideReplies);
      newGuideReplies.add(replyId);
      setGuideReplies(newGuideReplies);

      const newPostGuides = new Map(postGuides);
      newPostGuides.set(postIdStr, replyId);
      setPostGuides(newPostGuides);

      // localStorage 저장
      safeLocalStorage.setJSON("guideReplies", Array.from(newGuideReplies));
      safeLocalStorage.setJSON("postGuides", Object.fromEntries(newPostGuides));

      // 이 글에 대한 replies 배열에서 isGuide 플래그 업데이트
      const updatedPosts = posts.map((p) => {
        if (String(p.id) === postIdStr) {
          const updatedReplies = (p.replies || []).map((reply: any) => ({
            ...reply,
            isGuide: reply.id === replyId,
          }));
          return { ...p, replies: updatedReplies };
        }
        return p;
      });
      setPosts(updatedPosts);

      // selectedPost도 같이 반영
      if (selectedPost && String(selectedPost.id) === postIdStr) {
        const updatedSelectedPost = updatedPosts.find(
          (p) => String(p.id) === postIdStr
        );
        if (updatedSelectedPost) {
          setSelectedPost(updatedSelectedPost);
        }
      }

      // Firestore에 반영할 updatedReplies 찾아두기
      const updatedPostForFirestore = updatedPosts.find(
        (p) => String(p.id) === postIdStr
      );
      const updatedRepliesForFirestore =
        (updatedPostForFirestore?.replies as any[]) ||
        (post.replies as any[]) ||
        [];

      // ===========================
      // 2) Firestore 업데이트 + 알림 생성
      // ===========================
      try {
        // 1) 이 글의 답글 배열에 isGuide 플래그 적용
        const updatedReplies = (post.replies || []).map((r: any) => ({
          ...r,
          isGuide: r.id === replyId,
        }));

        // 2) 길잡이로 선택된 답글 작성자 uid 찾기
        const guideReply = updatedReplies.find((r) => r.id === replyId);
        const replyAuthorUid =
          guideReply && typeof guideReply.authorUid === "string"
            ? guideReply.authorUid
            : null;

        // 3) 사용자 문서 업데이트 (guideCount + 루멘)
        if (replyAuthorUid) {
          await updateDoc(doc(db, "users", replyAuthorUid), {
            guideCount: increment(1),
            lumenBalance: increment(GUIDE_LUMEN_REWARD),
            lumenTotalEarned: increment(GUIDE_LUMEN_REWARD),
          });
        }

        // 4) 게시글 문서 업데이트 (guide 정보 + replies 전체)
        const postDocId =
          typeof post.id === "string" ? post.id : String(post.id);

        await updateDoc(doc(db, "posts", postDocId), {
          guideReplyId: replyId,
          guideReplyAuthor: replyAuthor,
          replies: updatedReplies,
        });

        // 5) 🔔 알림 생성 (길잡이로 채택된 사람에게)
        if (replyAuthorUid) {
          const currentUid = auth.currentUser?.uid ?? null;

          await createNotificationForEvent({
            toUserUid: replyAuthorUid,       // 길잡이로 채택된 사람
            fromUserUid: currentUid ?? undefined, // 채택한 사람(글 작성자)
            type: "guide",
            // 카테고리 기반 알림 설정을 위해 categoryId 도 같이 넘겨줌
            categoryId: (post as any).categoryId ?? post.category ?? null,
            data: {
              // post.id 가 string 이든 number 든 그대로 넣기
              postId:
                typeof post.id === "string" || typeof post.id === "number"
                  ? post.id
                  : undefined,
              replyId,
              userId: currentUid ?? undefined,     // 채택한 사람 uid
              userName: userNickname,              // 채택한 사람 닉네임
              titleName: replyAuthor,              // 길잡이로 채택된 답글 작성자 닉네임
              lumenReward: GUIDE_LUMEN_REWARD,
            },
          });
        }

      } catch (error) {
        console.error("길잡이 채택 Firestore/알림 업데이트 실패:", error);
      }

      toast.success(`${replyAuthor}님을 길잡이로 채택했습니다! 🌟`);

    },
    [
      posts,
      selectedPost,
      userNickname,
      guideReplies,
      postGuides,
      setPosts,
      setSelectedPost,
    ]
  );

  // 내가 길잡이로 채택되었을 때 처리
  const handleGuideReceived = useCallback(() => {
    // guideCount 증가
    setUserGuideCount((prev) => {
      const newCount = prev + 1;
      safeLocalStorage.setItem("userGuideCount", String(newCount));
      return newCount;
    });

    // 루멘 보상
    addLumensWithTrust(GUIDE_LUMEN_REWARD, "길잡이 채택 보상");

    // 신뢰도 +1
    updateTrust(1);

    // 업적 업데이트
    updateActivity({ guideCount: userGuideCount + 1 });
  }, [
    userGuideCount,
    setUserGuideCount,
    addLumensWithTrust,
    updateTrust,
    updateActivity,
  ]);

  // 특정 답글이 길잡이인지 확인
  const isGuideReply = useCallback(
    (replyId: number) => {
      return guideReplies.has(replyId);
    },
    [guideReplies]
  );

  // 특정 게시물에 이미 채택된 길잡이가 있는지 확인
  const hasGuide = useCallback(
    (postId: string | number) => {
      return postGuides.has(String(postId));
    },
    [postGuides]
  );

  // 특정 게시물의 채택된 길잡이 답글 ID 가져오기
  const getGuideReplyId = useCallback(
    (postId: string | number) => {
      return postGuides.get(String(postId));
    },
    [postGuides]
  );

  return {
    guideReplies,
    postGuides,
    handleGuideSelect,
    handleGuideReceived,
    isGuideReply,
    hasGuide,
    getGuideReplyId,
  };
}
