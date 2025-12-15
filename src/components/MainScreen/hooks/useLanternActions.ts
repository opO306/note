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
  setPosts,
  selectedPost,
  setSelectedPost,
  userNickname: _userNickname,
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

      // 2) optimistic: 토글 상태와 카운트를 즉시 업데이트
      const newLanternedPosts = new Set(existingLanterned);
      if (wasLanterned) {
        newLanternedPosts.delete(postIdStr);
      } else {
        newLanternedPosts.add(postIdStr);
      }
      setLanternedPosts(newLanternedPosts);

      // posts 배열의 lanterns 카운트도 optimistic update
      const delta = wasLanterned ? -1 : 1;
      const currentPost = posts.find(p => String(p.id) === postIdStr);
      const previousLanterns = currentPost?.lanterns ?? 0;

      setPosts(prevPosts => 
        prevPosts.map(p => {
          if (String(p.id) === postIdStr) {
            return { ...p, lanterns: Math.max(0, previousLanterns + delta) };
          }
          return p;
        })
      );

      // selectedPost도 업데이트
      if (selectedPost && String(selectedPost.id) === postIdStr) {
        setSelectedPost({
          ...selectedPost,
          lanterns: Math.max(0, previousLanterns + delta)
        });
      }

      // 서버 함수에 위임하여 집계/검증 처리
      const callable = httpsCallable(functions, "toggleLantern");
      try {
        await callable({ postId: postIdStr });
      } catch (error) {
        // 실패 시 로컬 상태 되돌리기
        setLanternedPosts(existingLanterned);
        setPosts(prevPosts => 
          prevPosts.map(p => {
            if (String(p.id) === postIdStr) {
              return { ...p, lanterns: previousLanterns };
            }
            return p;
          })
        );
        if (selectedPost && String(selectedPost.id) === postIdStr) {
          setSelectedPost({
            ...selectedPost,
            lanterns: previousLanterns
          });
        }
        console.error("등불 토글 실패:", error);
        toast.error("등불 처리에 실패했어요. 잠시 후 다시 시도해주세요.");
        return;
      }

      // 새로 켠 경우에만 업적/통계/알림/토스트 처리 (집계는 서버 트리거)
      if (!wasLanterned) {
        toast.success("등불을 밝혔습니다! ✨");
      }

    },
    [lanternedPosts, posts, setPosts, selectedPost, setSelectedPost]
  );

  // 답글 등불 토글
  const handleReplyLanternToggle = useCallback(
    async (replyId: number, postId: number | string) => {
      const postIdStr = String(postId);
      const wasLanterned = lanternedReplies.has(replyId);

      // optimistic: 등불 상태 업데이트
      const newLanternedReplies = new Set(lanternedReplies);
      if (wasLanterned) {
        newLanternedReplies.delete(replyId);
      } else {
        newLanternedReplies.add(replyId);
      }
      setLanternedReplies(newLanternedReplies);

      // posts 배열의 replies에서 해당 답글의 lanterns 카운트도 optimistic update
      const delta = wasLanterned ? -1 : 1;
      const post = posts.find(p => String(p.id) === postIdStr);
      const reply = post?.replies?.find((r: any) => r.id === replyId);
      const previousLanterns = reply?.lanterns ?? 0;

      setPosts(prevPosts => 
        prevPosts.map(p => {
          if (String(p.id) === postIdStr && Array.isArray(p.replies)) {
            return {
              ...p,
              replies: p.replies.map((r: any) => {
                if (r.id === replyId) {
                  return { ...r, lanterns: Math.max(0, previousLanterns + delta) };
                }
                return r;
              })
            };
          }
          return p;
        })
      );

      // selectedPost도 업데이트
      if (selectedPost && String(selectedPost.id) === postIdStr && Array.isArray(selectedPost.replies)) {
        setSelectedPost({
          ...selectedPost,
          replies: selectedPost.replies.map((r: any) => {
            if (r.id === replyId) {
              return { ...r, lanterns: Math.max(0, previousLanterns + delta) };
            }
            return r;
          })
        });
      }

      // 서버 함수로 위임 (집계/검증)
      const callable = httpsCallable(functions, "toggleReplyLantern");
      try {
        await callable({ postId: postIdStr, replyId });
      } catch (error) {
        // 실패 시 롤백
        setLanternedReplies(lanternedReplies);
        setPosts(prevPosts => 
          prevPosts.map(p => {
            if (String(p.id) === postIdStr && Array.isArray(p.replies)) {
              return {
                ...p,
                replies: p.replies.map((r: any) => {
                  if (r.id === replyId) {
                    return { ...r, lanterns: previousLanterns };
                  }
                  return r;
                })
              };
            }
            return p;
          })
        );
        if (selectedPost && String(selectedPost.id) === postIdStr && Array.isArray(selectedPost.replies)) {
          setSelectedPost({
            ...selectedPost,
            replies: selectedPost.replies.map((r: any) => {
              if (r.id === replyId) {
                return { ...r, lanterns: previousLanterns };
              }
              return r;
            })
          });
        }
        console.error("답글 등불 토글 실패:", error);
        toast.error("등불 처리에 실패했어요. 잠시 후 다시 시도해주세요.");
        return;
      }

      // 새로 켠 경우에만 처리 (카운트 집계는 서버에 위임)
      if (!wasLanterned) {
        toast.success("등불을 밝혔습니다! ✨");
      }
    },
    [lanternedReplies, posts, setPosts, selectedPost, setSelectedPost]
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