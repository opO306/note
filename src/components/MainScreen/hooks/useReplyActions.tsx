// MainScreen/hooks/useReplyActions.tsx
// 답글 작성/삭제 관련 로직을 관리하는 훅
/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */
import React, { useState, useRef, useCallback } from "react";
import { auth, db } from "@/firebase";
// 맨 위 import 부분에 Firestore 함수 추가
import {
  doc,
  updateDoc,
  increment,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { toast } from "@/toastHelper";
import { containsProfanity } from "@/components/utils/profanityFilter";
import type { Post, Reply } from "../types";
import type { UserActivityData } from "@/components/useAchievements";
import { createNotificationForEvent } from "@/components/hooks/notificationDomainService";

// Firestore에 안전하게 저장할 수 있도록 Reply 객체를 정제
function sanitizeReplyForFirestore(reply: Reply) {
  // createdAt 정규화
  let createdAt: Date;

  if (reply.createdAt instanceof Date) {
    createdAt = reply.createdAt;
  } else if (
    reply.createdAt &&
    typeof (reply.createdAt as any).toDate === "function"
  ) {
    createdAt = (reply.createdAt as any).toDate();
  } else if (
    typeof reply.createdAt === "string" ||
    typeof reply.createdAt === "number"
  ) {
    const parsed = new Date(reply.createdAt);
    createdAt = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  } else {
    createdAt = new Date();
  }

  return {
    id: reply.id ?? Date.now(),
    content: reply.content ?? "",
    author: reply.author ?? "알 수 없음",
    authorUid: reply.authorUid ?? null,

    // 🔥 수정됨: undefined가 들어가지 않도록 null 병합 처리 강화
    authorAvatar: (reply as any).authorAvatar || null,

    timeAgo: reply.timeAgo ?? "",
    lanterns: typeof reply.lanterns === "number" ? reply.lanterns : 0,
    isGuide: !!reply.isGuide,
    createdAt,
    authorTitleId: (reply as any).authorTitleId ?? null,
  };
}

// 닉네임으로 users 컬렉션에서 UID 찾기
async function findUserUidByNickname(nickname: string): Promise<string | null> {
  if (!nickname) return null;

  try {
    const usersRef = collection(db, "users");
    const q = query(
      usersRef,
      where("nickname", "==", nickname),
      limit(1),
    );
    const snap = await getDocs(q);

    if (snap.empty) return null;
    return snap.docs[0].id; // 문서 ID = UID
  } catch (err) {
    console.error("[findUserUidByNickname] 실패:", err);
    return null;
  }
}

interface UseReplyActionsParams {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  selectedPost: Post | null;
  setSelectedPost: (post: Post | null) => void;
  userNickname: string;
  clampedTrust: number;
  updateActivity: (newActivity: Partial<UserActivityData>) => void;
  userProfileImage: string | null | undefined;
}

export function useReplyActions({
  posts,
  setPosts,
  selectedPost,
  setSelectedPost,
  userNickname,
  clampedTrust,
  updateActivity,
  userProfileImage,
}: UseReplyActionsParams) {
  // 답글 입력 상태
  const [newReplyContent, setNewReplyContent] = useState("");
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);

  // 답글 내용 변경 핸들러
  const handleReplyContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNewReplyContent(e.target.value);
    },
    []
  );

  // 멘션 삽입 핸들러
  const handleInsertMention = useCallback((targetName: string) => {
    if (!targetName) return;

    setNewReplyContent((prev) => {
      if (!prev) {
        return `@${targetName} `;
      }
      const needsSpace = !prev.endsWith(" ");
      return `${prev}${needsSpace ? " " : ""}@${targetName} `;
    });

    if (replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, []);

  const handleReplySubmit = useCallback(async () => {
    if (!selectedPost || !newReplyContent.trim()) return;

    // 신뢰도 0점 이하면 답글 작성 불가
    if (clampedTrust <= 0) {
      toast.error("신뢰도 0점에서는 답글을 작성할 수 없습니다.");
      return;
    }

    // 욕설 필터링
    if (containsProfanity(newReplyContent)) {
      toast.error("부적절한 표현이 포함되어 있습니다.");
      return;
    }

    const currentUid = auth.currentUser?.uid ?? null;

    // 🔹 기본값: 칭호 정보 없음
    let authorTitleId: string | null = null;

    if (currentUid) {
      try {
        const userRef = doc(db, "users", currentUid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData: any = userSnap.data();
          authorTitleId = userData.currentTitle ?? null;
        }
      } catch (error) {
        console.error("댓글 작성자 칭호 조회 실패:", error);
      }
    }

    // 🔹 화면/상태용 Reply
    const newReplyId = Date.now();
    const newReply: Reply = {
      id: newReplyId,
      content: newReplyContent.trim(),
      author: userNickname,
      authorUid: currentUid,
      authorAvatar: userProfileImage ?? null, // UI용
      timeAgo: "방금",
      lanterns: 0,
      isGuide: false,
      createdAt: new Date(),
      authorTitleId,
    };

    // 화면/상태용 replies
    const repliesForPost = [...(selectedPost.replies || []), newReply];

    // Firestore 저장용 (avatar 제거 + createdAt 정제)
    const repliesForPostForFirestore = repliesForPost.map((r) =>
      sanitizeReplyForFirestore(r as Reply),
    );

    // 1) 로컬 상태 먼저 업데이트
    const updatedPosts = posts.map((post) =>
      String(post.id) === String(selectedPost.id)
        ? {
          ...post,
          replies: repliesForPost,
          replyCount: repliesForPost.length,
          comments:
            typeof post.comments === "number"
              ? post.comments + 1
              : repliesForPost.length,
        }
        : post,
    );

    setPosts(updatedPosts);

    setSelectedPost({
      ...selectedPost,
      replies: repliesForPost,
      replyCount: repliesForPost.length,
      comments:
        typeof selectedPost.comments === "number"
          ? selectedPost.comments + 1
          : repliesForPost.length,
    });

    setNewReplyContent("");
    toast.success("답글이 작성되었습니다!");
    updateActivity({ replies: 1 });

    // 2) Firestore 업데이트
    try {
      let postDocId: string | null =
        typeof selectedPost.id === "string" ? selectedPost.id : null;

      if (!postDocId) {
        const found = posts.find(
          (post) => String(post.id) === String(selectedPost.id),
        );
        if (found && typeof found.id === "string") {
          postDocId = found.id;
        }
      }

      if (!postDocId) {
        console.warn(
          "[handleReplySubmit] Firestore 저장 스킵: 문서 ID를 찾지 못했습니다.",
          { selectedPostId: selectedPost.id },
        );
        return;
      }

      await updateDoc(doc(db, "posts", postDocId), {
        replies: repliesForPostForFirestore,
        replyCount: repliesForPostForFirestore.length,
        comments:
          typeof selectedPost.comments === "number"
            ? selectedPost.comments + 1
            : repliesForPostForFirestore.length,
      });

      if (currentUid) {
        try {
          await updateDoc(doc(db, "users", currentUid), {
            replyCount: increment(1),
          });
        } catch (err) {
          console.error("사용자 replyCount 증가 실패:", err);
        }
      }
    } catch (error) {
      console.error("Firestore 답글 저장 실패:", error);
    }

    // 3) 🔔 댓글 알림 (게시글 작성자에게) – 자기 글에 자기 댓글이면 알림 X
    try {
      const currentUid = auth.currentUser?.uid ?? null;
      const postAuthorUid =
        typeof (selectedPost as any).authorUid === "string"
          ? (selectedPost as any).authorUid
          : null;

      if (postAuthorUid && currentUid && postAuthorUid !== currentUid) {
        await createNotificationForEvent({
          toUserUid: postAuthorUid,
          fromUserUid: currentUid,
          type: "reply",
          categoryId:
            (selectedPost as any).categoryId ?? selectedPost.category ?? null,
          data: {
            postId: selectedPost.id,
            replyId: newReplyId,
            userId: currentUid,
            userName: userNickname,
            // 🔥 수정됨: undefined 대신 null 사용
            userAvatar: userProfileImage ?? null,
          },
        });
      }
    } catch (err) {
      console.error("댓글 알림 생성 실패:", err);
    }

    // 4) 🔔 멘션 알림 (@닉네임) – 여러 명 멘션 시 각자에게 전송
    try {
      const mentionRegex = /@([^\s@]+)/g;
      const mentionedNicknames = new Set<string>();
      let match: RegExpExecArray | null;

      while ((match = mentionRegex.exec(newReply.content)) !== null) {
        const nickname = match[1].trim();
        if (!nickname) continue;
        if (nickname === userNickname) continue; // 자기 자신 멘션은 스킵
        mentionedNicknames.add(nickname);
      }

      // 멘션된 유저들에게 알림 전송
      if (mentionedNicknames.size > 0) {
        const currentUid = auth.currentUser?.uid ?? null;

        for (const nickname of mentionedNicknames) {
          // 게시글 작성자에게는 이미 reply 알림이 갔다면, mention 알림은 옵션.
          // 둘 다 보내고 싶으면 이 조건 제거 가능.
          if (nickname === selectedPost.author) {
            continue;
          }

          const targetUid = await findUserUidByNickname(nickname);
          if (!targetUid) continue;

          if (currentUid && targetUid !== currentUid) {
            try {
              await createNotificationForEvent({
                toUserUid: targetUid,
                fromUserUid: currentUid,
                type: "mention",
                categoryId:
                  (selectedPost as any).categoryId ??
                  selectedPost.category ??
                  null,
                data: {
                  postId: selectedPost.id,
                  replyId: newReplyId,
                  userId: currentUid,
                  userName: userNickname,
                  // 🔥 수정됨: undefined 대신 null 사용
                  userAvatar: userProfileImage ?? null,
                },
              });
            } catch (e) {
              console.error("멘션 알림 생성 실패:", e);
            }
          }
        }
      }
    } catch (e) {
      console.error("멘션 알림 처리 중 오류:", e);
    }
  }, [
    selectedPost,
    newReplyContent,
    userNickname,
    posts,
    clampedTrust,
    setPosts,
    setSelectedPost,
    updateActivity,
    userProfileImage,
  ]);

  // 답글 삭제 핸들러 (기존 로직 유지, 필요시 sanitize 적용 가능)
  const handleDeleteReply = useCallback(
    async (replyId: number) => {
      if (!selectedPost) return;

      const reply = selectedPost.replies?.find((r) => r.id === replyId);

      // 본인 답글만 삭제 가능
      if (!reply || reply.author !== userNickname) {
        toast.error("본인의 답글만 삭제할 수 있습니다.");
        return;
      }

      const updatedReplies = selectedPost.replies.filter(
        (r) => r.id !== replyId
      );

      const updatedPosts = posts.map((post) =>
        String(post.id) === String(selectedPost.id)
          ? {
            ...post,
            replies: updatedReplies,
            replyCount: updatedReplies.length,
            comments: updatedReplies.length,
          }
          : post
      );

      setPosts(updatedPosts);

      setSelectedPost({
        ...selectedPost,
        replies: updatedReplies,
        replyCount: updatedReplies.length,
      });

      toast.success("답글이 삭제되었습니다.");

      try {
        let postDocId: string | null =
          typeof selectedPost.id === "string" ? selectedPost.id : null;

        if (!postDocId) {
          const found = posts.find(
            (post) => String(post.id) === String(selectedPost.id)
          );
          if (found && typeof found.id === "string") {
            postDocId = found.id;
          }
        }

        if (postDocId) {
          // 삭제 쪽도 안전하게 저장하려면 sanitize 사용해도 됨
          const updatedRepliesForFirestore = updatedReplies.map((r) =>
            sanitizeReplyForFirestore(r as Reply)
          );

          const safeUpdatedReplies = JSON.parse(
            JSON.stringify(updatedRepliesForFirestore)
          );

          await updateDoc(doc(db, "posts", postDocId), {
            replies: safeUpdatedReplies,
            replyCount: safeUpdatedReplies.length,
            comments: safeUpdatedReplies.length,
          });
        }
      } catch (error) {
        console.error("Firestore 답글 삭제 실패:", error);
      }
    },
    [selectedPost, userNickname, posts, setPosts, setSelectedPost]
  );

  const renderContentWithMentions = useCallback(
    (
      content: string | null | undefined,
      onMentionClick: (nickname: string) => void
    ): React.ReactNode => {
      if (!content) {
        return null;
      }

      const elements: React.ReactNode[] = [];
      const mentionRegex = /@([^\s@]+)/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = mentionRegex.exec(content)) !== null) {
        const fullMatch = match[0];
        const nickname = match[1];
        const start = match.index;

        if (start > lastIndex) {
          elements.push(content.slice(lastIndex, start));
        }

        elements.push(
          <span
            key={`mention-${start}-${nickname}`}
            data-nickname={nickname}
            className="text-primary font-semibold hover:underline cursor-pointer"
            onClick={() => onMentionClick(nickname)}
          >
            {fullMatch}
          </span>
        );

        lastIndex = start + fullMatch.length;
      }

      if (lastIndex < content.length) {
        elements.push(content.slice(lastIndex));
      }

      return elements;
    },
    []
  );

  const canSubmitReply = clampedTrust > 0;

  return {
    newReplyContent,
    replyInputRef,
    handleReplyContentChange,
    handleInsertMention,
    handleReplySubmit,
    handleDeleteReply,
    renderContentWithMentions,
    canSubmitReply,
    setNewReplyContent,
  };
}