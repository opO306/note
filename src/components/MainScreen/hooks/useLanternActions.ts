// MainScreen/hooks/useLanternActions.ts
// 등불(좋아요) 토글 관련 로직을 관리하는 훅
import { useState, useEffect, useCallback } from "react";
import { auth, db, functions } from "@/firebase";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { toast } from "@/toastHelper";
import type { Post } from "../types";

// 🔔 추가: 알림 도메인 서비스
import { createNotificationForEvent } from "@/components/hooks/notificationDomainService";

// 🔹 추가
type UserActivityState = {
  lanternsReceived: number;
  lanternsGiven: number;
  [key: string]: any;
};

// Firestore 헬퍼 함수들
const getUserLanternsCollection = (uid: string, kind: "posts" | "replies") =>
  collection(db, "user_lanterns", uid, kind);

interface UseLanternActionsParams {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  selectedPost: Post | null;
  setSelectedPost: (post: Post | null) => void;
  userNickname: string;
  userActivity: UserActivityState;
  updateActivity: (activity: Partial<UserActivityState>) => void;
  userPostLanterns: number;
  setUserPostLanterns: React.Dispatch<React.SetStateAction<number>>;
  userReplyLanterns: number;
  setUserReplyLanterns: React.Dispatch<React.SetStateAction<number>>;
  addLumensWithTrust: (amount: number, reason: string) => void;
  updateTrust: (delta: number) => void;
}

export function useLanternActions({
  posts,
  setPosts: _setPosts,
  selectedPost: _selectedPost,
  setSelectedPost: _setSelectedPost,
  userNickname,
  userActivity: _userActivity,
  updateActivity: _updateActivity,
  userPostLanterns: _userPostLanterns,
  setUserPostLanterns: _setUserPostLanterns,
  userReplyLanterns: _userReplyLanterns,
  setUserReplyLanterns: _setUserReplyLanterns,
  addLumensWithTrust: _addLumensWithTrust,
  updateTrust: _updateTrust,
}: UseLanternActionsParams) {

  // 등불 상태
  const [lanternedPosts, setLanternedPosts] = useState<Set<string>>(new Set());
  const [lanternedReplies, setLanternedReplies] = useState<Set<number>>(new Set());

  // Firestore에서 등불 상태 불러오기 (앱 시작 시)
  useEffect(() => {
    const uid = auth.currentUser?.uid ?? null;
    if (!uid) return;

    const fetchLanternState = async () => {
      try {
        // 게시글 등불
        const postsSnap = await getDocs(getUserLanternsCollection(uid, "posts"));
        const postIds = postsSnap.docs.map((d) => d.id);
        setLanternedPosts(new Set(postIds));

        // 답글 등불
        const repliesSnap = await getDocs(getUserLanternsCollection(uid, "replies"));
        const replyIds = repliesSnap.docs
          .map((d) => Number(d.id))
          .filter((id) => !Number.isNaN(id));
        setLanternedReplies(new Set(replyIds));
      } catch (error) {
        console.error("등불 상태 불러오기 실패:", error);
      }
    };

    fetchLanternState();
  }, []);

  // 게시글 등불 토글
  const handleLanternToggle = useCallback(
    async (postId: string | number) => {
      const postIdStr = String(postId);

      // 1) 토글 전: 기존에 이 글에 등불을 켰는지 확인
      const existingLanterned = new Set<string>();
      lanternedPosts.forEach((id: any) => existingLanterned.add(String(id)));
      const wasLanterned = existingLanterned.has(postIdStr);

      // 2) optimistic: 토글 상태만 로컬에 표시 (카운트는 서버 집계 반영을 기다림)
      const newLanternedPosts = new Set(existingLanterned);
      if (wasLanterned) {
        newLanternedPosts.delete(postIdStr);
      } else {
        newLanternedPosts.add(postIdStr);
      }
      setLanternedPosts(newLanternedPosts);

      // 서버 함수에 위임하여 집계/검증 처리
      const callable = httpsCallable(functions, "toggleLantern");
      try {
        await callable({ postId: postIdStr });
      } catch (error) {
        // 실패 시 로컬 상태 되돌리기
        setLanternedPosts(existingLanterned);
        console.error("등불 토글 실패:", error);
        toast.error("등불 처리에 실패했어요. 잠시 후 다시 시도해주세요.");
        return;
      }

      // 새로 켠 경우에만 업적/통계/알림/토스트 처리 (집계는 서버 트리거)
      if (!wasLanterned) {
        const post = posts.find((p) => String(p.id) === postIdStr);

        // 🔔 게시글 등불 알림 (내 글에 다른 사람이 등불을 켠 경우만)
        if (post) {
          const currentUid = auth.currentUser?.uid ?? null;
          const postAuthorUid =
            typeof post.authorUid === "string" ? post.authorUid : null;

          if (
            currentUid &&
            postAuthorUid &&
            currentUid !== postAuthorUid
          ) {
            try {
              // 🔹 게시글 등불 알림 부분
              await createNotificationForEvent({
                toUserUid: postAuthorUid,
                fromUserUid: currentUid,
                type: "lantern",
                categoryId: (post as any).categoryId ?? post.category ?? null,
                data: {
                  postId: post.id,             // ✅ 무조건 넣기 (string)
                  userId: currentUid,
                  userName: userNickname,
                  lanternCount: 1,
                },
              });

            } catch (notifyError) {
              console.error("게시글 등불 알림 생성 실패:", notifyError);
              // 알림 실패해도 등불/통계 동작은 그대로 유지
            }
          }
        }

        toast.success("등불을 밝혔습니다! ✨");
      }

    },
    [lanternedPosts, posts, userNickname]
  );

  // 답글 등불 토글
  const handleReplyLanternToggle = useCallback(
    async (replyId: number, postId: number | string) => {
      const postIdStr = String(postId);
      const wasLanterned = lanternedReplies.has(replyId);

      const newLanternedReplies = new Set(lanternedReplies);

      setLanternedReplies(newLanternedReplies);

      // 서버 함수로 위임 (집계/검증)
      const callable = httpsCallable(functions, "toggleReplyLantern");
      try {
        await callable({ postId: postIdStr, replyId });
      } catch (error) {
        setLanternedReplies(lanternedReplies);
        console.error("답글 등불 토글 실패:", error);
        toast.error("등불 처리에 실패했어요. 잠시 후 다시 시도해주세요.");
        return;
      }

      // 새로 켠 경우에만 처리 (카운트 집계는 서버에 위임)
      if (!wasLanterned) {
        const postIdStr = String(postId);
        const post = posts.find((p) => p.id === postIdStr);
        const reply = post?.replies.find((r: any) => r.id === replyId);

        // 🔔 답글 등불 알림 (내 답글에 다른 사람이 등불을 켠 경우만)
        if (post && reply) {
          const currentUid = auth.currentUser?.uid ?? null;
          const replyAuthorUid =
            reply.authorUid && typeof reply.authorUid === "string"
              ? reply.authorUid
              : null;

          if (
            currentUid &&
            replyAuthorUid &&
            currentUid !== replyAuthorUid
          ) {
            try {
              // 🔹 답글 등불 알림 부분
              await createNotificationForEvent({
                toUserUid: replyAuthorUid,
                fromUserUid: currentUid,
                type: "lantern",
                categoryId: (post as any).categoryId ?? post.category ?? null,
                data: {
                  postId: post.id,             // ✅ 무조건 넣기
                  replyId,
                  userId: currentUid,
                  userName: userNickname,
                  lanternCount: 1,
                },
              });

            } catch (notifyError) {
              console.error("답글 등불 알림 생성 실패:", notifyError);
            }
          }
        }

        toast.success("등불을 밝혔습니다! ✨");
      }
    },
    [lanternedReplies, posts, userNickname]
  );

  // 특정 게시물이 등불 켜졌는지 확인
  const isPostLanterned = useCallback(
    (postId: string | number) => {
      return lanternedPosts.has(String(postId));
    },
    [lanternedPosts]
  );

  // 특정 답글이 등불 켜졌는지 확인
  const isReplyLanterned = useCallback(
    (replyId: number) => {
      return lanternedReplies.has(replyId);
    },
    [lanternedReplies]
  );

  return {
    lanternedPosts,
    lanternedReplies,
    handleLanternToggle,
    handleReplyLanternToggle,
    isPostLanterned,
    isReplyLanterned,
  };
}
