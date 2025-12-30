// MainScreen/hooks/usePostManagement.ts
// 게시물 작성/삭제/관리 관련 로직을 관리하는 훅

import { useState, useCallback } from "react";
import { auth, db } from "@/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  increment,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { toast } from "@/toastHelper";
import { containsProfanity } from "@/components/utils/profanityFilter";
import type { Post } from "../types";
import type { UserActivityData } from "@/components/useAchievements";

interface UsePostManagementParams {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  userNickname: string;
  userProfileImage: string;
  clampedTrust: number;
  updateActivity: (newActivity: Partial<UserActivityData>) => void;
}

export function usePostManagement({
  posts,
  setPosts,
  userNickname,
  userProfileImage,
  clampedTrust,
  updateActivity,
}: UsePostManagementParams) {
  // 작성 경고 다이얼로그 상태
  const [showPostWarning, setShowPostWarning] = useState(false);
  const [dontShowWarningAgain, setDontShowWarningAgain] = useState(false);

  // 글 작성 시작 (경고 확인 후)
  const handleStartWriting = useCallback(
    (onConfirm: () => void) => {
      // ✅ 신뢰도 기반 제재 체크
      if (clampedTrust <= 0) {
        toast.error("신뢰도 0점에서는 글을 작성할 수 없습니다.");
        return false;
      }
      if (clampedTrust <= 10) {
        toast.error("신뢰도가 너무 낮아 글을 작성할 수 없습니다. (최소 10점 필요)");
        return false;
      }

      // 경고 건너뛰기 설정 확인
      if (dontShowWarningAgain || localStorage.getItem("hidePostWarning") === "true") {
        onConfirm();
        return true;
      }

      // 경고 다이얼로그 표시
      setShowPostWarning(true);
      return true;
    },
    [clampedTrust, dontShowWarningAgain]
  );

  // 경고 확인 후 글 작성 진행
  const handleWarningConfirm = useCallback(
    (onConfirm: () => void) => {
      if (dontShowWarningAgain) {
        localStorage.setItem("hidePostWarning", "true");
      }
      setShowPostWarning(false);

      if (clampedTrust <= 0) {
        toast.error("신뢰도 0점에서는 글을 작성할 수 없습니다.");
        return;
      }
      if (clampedTrust <= 10) {
        toast.error("신뢰도가 너무 낮아 글을 작성할 수 없습니다. (최소 10점 필요)");
        return;
      }

      onConfirm();
    },
    [dontShowWarningAgain, clampedTrust]
  );

  // 새 게시물 생성
  const createPost = useCallback(
    async (postData: {
      title: string;
      content: string;
      category: string;
      subCategory: string;
      type: "question" | "guide";
      tags: string[];
    }) => {
      // ✅ 신뢰도 기반 제재 체크
      if (clampedTrust <= 0) {
        toast.error("신뢰도 0점에서는 글을 작성할 수 없습니다.");
        return null;
      }
      if (clampedTrust <= 10) {
        toast.error("신뢰도가 너무 낮아 글을 작성할 수 없습니다. (최소 10점 필요)");
        return null;
      }

      // 욕설 필터링
      if (containsProfanity(postData.title) || containsProfanity(postData.content)) {
        toast.error("부적절한 표현이 포함되어 있습니다.");
        return null;
      }

      const uid = auth.currentUser?.uid ?? null;

      // 새 게시물 객체
      const newPost: Omit<Post, "id"> = {
        ...postData,
        author: userNickname,
        authorUid: uid,
        authorAvatar: userProfileImage,
        createdAt: new Date(),
        hidden: false,
        lanterns: 0,
        replies: [],
        replyCount: 0,
        comments: 0,
        views: 0,
        isBookmarked: false,
        isOwner: true,
      };

      try {
        // Firestore에 저장
        const docRef = await addDoc(collection(db, "posts"), {
          ...newPost,
          createdAt: serverTimestamp(),
        });

        // 로컬에서 사용할 Post 객체 (화면에서 바로 쓸 수 있게 전체 정보 채우기)
        // Firestore에 저장된 후 로컬 상태 업데이트용 객체
        const createdPost: Post = {
          id: docRef.id,
          ...newPost, // newPost에 이미 title, content 등이 다 들어있음
          createdAt: new Date(),
          // 아래 중복 초기화 코드 삭제
          // title: "", 
          // content: "",
          // ... 삭제 ...
        } as Post; // 타입 단언 필요할 수 있음

        // 로컬 상태 업데이트
        setPosts((prev) => [createdPost, ...prev]);


        // 사용자 통계 업데이트
        if (uid) {
          try {
            await updateDoc(doc(db, "users", uid), {
              postCount: increment(1),
            });
          } catch (err) {
            console.error("사용자 postCount 증가 실패:", err);
          }
        }

        // 업적 업데이트 - type에 따라 다른 활동 기록
        if (postData.type === "question") {
          updateActivity({ explorePosts: 1 });
        } else {
          updateActivity({ sharePosts: 1 });
        }

        toast.success("게시글이 작성되었습니다!");
        return createdPost;
      } catch (error) {
        console.error("게시글 작성 실패:", error);
        toast.error("게시글 작성에 실패했습니다.");
        return null;
      }
    },
    [userNickname, userProfileImage, clampedTrust, setPosts, updateActivity]
  );


  // 게시물 삭제
  const deletePost = useCallback(
    async (postId: string | number) => {
      const postIdStr = String(postId);
      const post = posts.find((p) => String(p.id) === postIdStr);

      // 본인 글만 삭제 가능
      if (!post || post.author !== userNickname) {
        toast.error("본인의 글만 삭제할 수 있습니다.");
        return false;
      }

      // 작성 후 30분 이내만 삭제 가능
      const createdAt = post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt);
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      if (createdAt < thirtyMinutesAgo) {
        toast.error("작성 후 30분이 지난 글은 삭제할 수 없습니다.");
        return false;
      }

      try {
        // Firestore에서 삭제
        if (typeof post.id === "string") {
          await deleteDoc(doc(db, "posts", post.id));
        }

        // 로컬 상태 업데이트
        setPosts((prev) => prev.filter((p) => String(p.id) !== postIdStr));

        toast.success("게시글이 삭제되었습니다.");
        return true;
      } catch (error) {
        console.error("게시글 삭제 실패:", error);
        toast.error("게시글 삭제에 실패했습니다.");
        return false;
      }
    },
    [posts, userNickname, setPosts]
  );

  // 조회수 증가 (같은 계정은 같은 글에서 1번만 카운트)
  const incrementViews = useCallback(
    async (postId: string | number) => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        // 로그인 안 되어 있으면 조회수 안 올림 (원하면 여기서만 +1 해도 됨)
        return;
      }

      const postIdStr = String(postId);
      const post = posts.find((p) => String(p.id) === postIdStr);
      if (!post || typeof post.id !== "string") return;

      const postRef = doc(db, "posts", post.id);
      const viewRef = doc(db, "postViews", `${post.id}_${uid}`); // 🔹 postViews 컬렉션

      try {
        const didIncrease = await runTransaction(db, async (tx) => {
          const viewSnap = await tx.get(viewRef);

          // 이미 이 계정이 이 글을 본 적 있으면 아무 것도 안 함
          if (viewSnap.exists()) {
            return false;
          }

          // 처음 보는 경우에만 기록 + 조회수 증가
          tx.set(viewRef, {
            postId: post.id,
            viewerUid: uid,
            viewedAt: serverTimestamp(),
          });
          tx.update(postRef, { views: increment(1) });

          return true;
        });

        // 실제로 +1 했을 때만 로컬 상태도 +1
        if (didIncrease) {
          setPosts((prev) =>
            prev.map((p) =>
              String(p.id) === postIdStr
                ? { ...p, views: (p.views || 0) + 1 }
                : p
            )
          );
        }
      } catch (error) {
        console.error("조회수 업데이트 실패:", error);
      }
    },
    [posts, setPosts]
  );

  // 삭제 가능 여부 확인
  const canDeletePost = useCallback(
    (postId: string | number) => {
      const postIdStr = String(postId);
      const post = posts.find((p) => String(p.id) === postIdStr);

      if (!post || post.author !== userNickname) {
        return false;
      }

      const createdAt = post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt);
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      return createdAt >= thirtyMinutesAgo;
    },
    [posts, userNickname]
  );

  // 경고 체크박스 설정
  const checkboxConfig = {
    checked: dontShowWarningAgain,
    onCheckedChange: setDontShowWarningAgain,
    label: "다시 보지 않기",
  };

  return {
    showPostWarning,
    setShowPostWarning,
    dontShowWarningAgain,
    setDontShowWarningAgain,
    handleStartWriting,
    handleWarningConfirm,
    createPost,
    deletePost,
    incrementViews,
    canDeletePost,
    checkboxConfig,
  };
}
