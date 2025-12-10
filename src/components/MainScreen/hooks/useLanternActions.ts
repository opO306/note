// MainScreen/hooks/useLanternActions.ts
// 등불(좋아요) 토글 관련 로직을 관리하는 훅
import { useState, useEffect, useCallback } from "react";
import { auth, db } from "@/firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
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

const getUserPostLanternDoc = (uid: string, postId: string) =>
  doc(db, "user_lanterns", uid, "posts", postId);

const getUserReplyLanternDoc = (uid: string, replyId: number) =>
  doc(db, "user_lanterns", uid, "replies", String(replyId));

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
  userNickname,
  userActivity,
  updateActivity,
  userPostLanterns: _userPostLanterns,
  setUserPostLanterns,
  userReplyLanterns: _userReplyLanterns,
  setUserReplyLanterns,
  addLumensWithTrust,
  updateTrust,
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

      // 2) 토글 후 Set 만들기
      const newLanternedPosts = new Set(existingLanterned);

      const updatedPosts = posts.map((post) => {
        const postKey = String(post.id);
        if (postKey === postIdStr) {
          const currentLanterns = typeof post.lanterns === "number" ? post.lanterns : 0;

          if (wasLanterned) {
            // 이미 켜져 있던 등불 → 끄기
            newLanternedPosts.delete(postIdStr);
            return { ...post, lanterns: Math.max(0, currentLanterns - 1) };
          } else {
            // 처음 켜는 등불
            newLanternedPosts.add(postIdStr);
            return { ...post, lanterns: currentLanterns + 1 };
          }
        }
        return post;
      });

      setLanternedPosts(newLanternedPosts);
      setPosts(updatedPosts);

      // Firestore에 내 등불 상태 저장/삭제
      const uid = auth.currentUser?.uid ?? null;
      if (uid) {
        try {
          if (wasLanterned) {
            await deleteDoc(getUserPostLanternDoc(uid, postIdStr));
          } else {
            await setDoc(
              getUserPostLanternDoc(uid, postIdStr),
              {
                postId: postIdStr,
                createdAt: serverTimestamp(),
              },
              { merge: true }
            );
          }
        } catch (error) {
          console.error("사용자 등불 상태 저장 실패:", error);
        }
      }

      // 선택된 글 상세 화면도 같이 업데이트
      if (selectedPost && String(selectedPost.id) === postIdStr) {
        const updatedSelectedPost = updatedPosts.find(
          (p) => String(p.id) === postIdStr
        );
        if (updatedSelectedPost) {
          setSelectedPost(updatedSelectedPost);
        }
      }

      // Firestore posts 컬렉션에 등불 수 반영
      try {
        // wasLanterned: 이미 켜져 있던 등불이면 -1, 아니면 +1
        await updateDoc(doc(db, "posts", postIdStr), {
          lanterns: increment(wasLanterned ? -1 : 1),
        });
      } catch (error) {
        console.error("Firestore 게시글 등불 업데이트 실패:", error);
      }

      // 새로 켠 경우에만 업적/통계/알림/토스트 처리
      if (!wasLanterned) {
        const post = posts.find((p) => String(p.id) === postIdStr);

        if (post && post.author === userNickname) {
          // 내 글에 누군가 등불을 켰을 때
          setUserPostLanterns((prev) => {
            const newTotal = prev + 1;
            localStorage.setItem("userPostLanterns", newTotal.toString());
            return newTotal;
          });
          updateActivity({
            lanternsReceived: userActivity.lanternsReceived + 1,
          });
        } else if (post) {
          // 내가 남의 글에 등불을 켰을 때
          updateActivity({
            lanternsGiven: userActivity.lanternsGiven + 1,
          });
        }

        // Firestore users 통계
        try {
          const currentUid = auth.currentUser?.uid ?? null;
          const postAuthorUid =
            post && typeof post.authorUid === "string" ? post.authorUid : null;

          // 글 작성자: 등불 받은 횟수 +1
          if (postAuthorUid) {
            await updateDoc(doc(db, "users", postAuthorUid), {
              lanternsReceived: increment(1),
              postLanternsReceived: increment(1),
            });
          }

          // 등불 준 사람: 등불 준 횟수 +1
          if (currentUid) {
            await updateDoc(doc(db, "users", currentUid), {
              lanternsGiven: increment(1),
            });
          }
        } catch (error) {
          console.error("Firestore 유저 등불 통계 업데이트 실패:", error);
        }

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
    [
      lanternedPosts,
      posts,
      selectedPost,
      userActivity,
      userNickname,
      updateActivity,
      setPosts,
      setSelectedPost,
      setUserPostLanterns,
    ]
  );

  // 답글 등불 토글
  const handleReplyLanternToggle = useCallback(
    async (replyId: number, postId: number | string) => {
      const postIdStr = String(postId);
      const wasLanterned = lanternedReplies.has(replyId);

      const newLanternedReplies = new Set(lanternedReplies);

      const updatedPosts = posts.map((post) => {
        if (String(post.id) === postIdStr) {
          const updatedReplies = post.replies.map((reply: any) => {
            if (reply.id === replyId) {
              if (wasLanterned) {
                newLanternedReplies.delete(replyId);
                return { ...reply, lanterns: Math.max(0, reply.lanterns - 1) };
              } else {
                newLanternedReplies.add(replyId);
                return { ...reply, lanterns: reply.lanterns + 1 };
              }
            }
            return reply;
          });
          return { ...post, replies: updatedReplies };
        }
        return post;
      });

      setLanternedReplies(newLanternedReplies);
      setPosts(updatedPosts);

      // 🔹 Firestore posts 컬렉션에 이 게시글의 replies 배열 반영
      try {
        const updatedPostForFirestore = updatedPosts.find(
          (p) => String(p.id) === postIdStr
        );

        if (updatedPostForFirestore) {
          await updateDoc(doc(db, "posts", postIdStr), {
            replies: updatedPostForFirestore.replies,
          });
        }
      } catch (error) {
        console.error("Firestore 게시글의 replies 등불 업데이트 실패:", error);
      }

      // Firestore에 내 답글 등불 상태 저장/삭제
      const uid = auth.currentUser?.uid ?? null;
      if (uid) {
        try {
          if (wasLanterned) {
            await deleteDoc(getUserReplyLanternDoc(uid, replyId));
          } else {
            await setDoc(
              getUserReplyLanternDoc(uid, replyId),
              {
                replyId,
                postId,
                createdAt: serverTimestamp(),
              },
              { merge: true }
            );
          }
        } catch (error) {
          console.error("사용자 답글 등불 상태 저장 실패:", error);
        }
      }

      // 선택된 글 화면도 같이 업데이트
      if (selectedPost && String(selectedPost.id) === postIdStr) {
        const updatedSelectedPost = updatedPosts.find(
          (p) => String(p.id) === postIdStr
        );
        if (updatedSelectedPost) {
          setSelectedPost(updatedSelectedPost);
        }
      }

      // 새로 켠 경우에만 처리
      if (!wasLanterned) {
        const postIdStr = String(postId);
        const post = posts.find((p) => p.id === postIdStr);
        const reply = post?.replies.find((r: any) => r.id === replyId);

        if (reply && reply.author === userNickname) {
          // 자신의 답글에 받은 등불
          setUserReplyLanterns((prev) => {
            const newTotal = prev + 1;
            localStorage.setItem("userReplyLanterns", newTotal.toString());

            // 등불 100개마다 루멘 1개 자동 지급
            const prevBundles = Math.floor(prev / 100);
            const newBundles = Math.floor(newTotal / 100);
            const gainedLumens = newBundles - prevBundles;

            if (gainedLumens > 0) {
              addLumensWithTrust(gainedLumens, "답글 등불 보상");
            }

            return newTotal;
          });

          // 신뢰도 +0.1
          updateTrust(0.1);
        }

        // 업적 업데이트
        if (reply && reply.author === userNickname) {
          updateActivity({
            lanternsReceived: userActivity.lanternsReceived + 1,
          });
        } else {
          updateActivity({
            lanternsGiven: userActivity.lanternsGiven + 1,
          });
        }

        // Firestore users 통계
        try {
          const currentUid = auth.currentUser?.uid ?? null;
          const replyAuthorUid = reply?.authorUid;

          if (replyAuthorUid && typeof replyAuthorUid === "string") {
            await updateDoc(doc(db, "users", replyAuthorUid), {
              lanternsReceived: increment(1),
              replyLanternsReceived: increment(1),
            });
          }

          if (currentUid) {
            await updateDoc(doc(db, "users", currentUid), {
              lanternsGiven: increment(1),
            });
          }
        } catch (error) {
          console.error("Firestore 유저 등불 통계 업데이트 실패:", error);
        }

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
    [
      lanternedReplies,
      posts,
      selectedPost,
      userActivity,
      userNickname,
      updateActivity,
      setPosts,
      setSelectedPost,
      setUserReplyLanterns,
      addLumensWithTrust,
      updateTrust,
    ]
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
