import React, { useState, useRef, useCallback } from "react";
import { auth, db } from "@/firebase";
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
// ✅ 1. 새로 만든 '쓰기 전용' 알림 생성 함수를 import 합니다.
// (경로가 다르다면 실제 파일 위치에 맞게 수정해주세요.)
import { createNotificationForEvent } from "@/components/utils/notificationUtils";

// Firestore에 안전하게 저장할 수 있도록 Reply 객체를 정제
function sanitizeReplyForFirestore(reply: Reply) {
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
    const q = query(usersRef, where("nickname", "==", nickname), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].id;
  } catch {
    // findUserUidByNickname 실패 (로그 제거)
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
  const [newReplyContent, setNewReplyContent] = useState("");
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);

  const handleReplyContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNewReplyContent(e.target.value);
    },
    []
  );

  const handleInsertMention = useCallback((targetName: string) => {
    if (!targetName) return;
    setNewReplyContent((prev) => {
      if (!prev) return `@${targetName} `;
      const needsSpace = !prev.endsWith(" ");
      return `${prev}${needsSpace ? " " : ""}@${targetName} `;
    });
    if (replyInputRef.current) replyInputRef.current.focus();
  }, []);

  const handleReplySubmit = useCallback(async () => {
    if (!selectedPost || !newReplyContent.trim()) return;

    if (clampedTrust <= 0) {
      toast.error("신뢰도 0점에서는 답글을 작성할 수 없습니다.");
      return;
    }

    if (containsProfanity(newReplyContent)) {
      toast.error("부적절한 표현이 포함되어 있습니다.");
      return;
    }

    const currentUid = auth.currentUser?.uid;
    if (!currentUid) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    let authorTitleId: string | null = null;
    try {
      const userRef = doc(db, "users", currentUid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        authorTitleId = userSnap.data().currentTitle ?? null;
      }
    } catch (error) {
      console.error("댓글 작성자 칭호 조회 실패:", error);
    }

    const newReplyId = Date.now();
    const newReply: Reply = {
      id: newReplyId,
      content: newReplyContent.trim(),
      author: userNickname,
      authorUid: currentUid,
      authorAvatar: userProfileImage ?? null,
      timeAgo: "방금",
      lanterns: 0,
      isGuide: false,
      createdAt: new Date(),
      authorTitleId,
    };

    const repliesForPost = [...(selectedPost.replies || []), newReply];
    const repliesForPostForFirestore = repliesForPost.map(sanitizeReplyForFirestore);

    const updatedPostData = { replies: repliesForPost, replyCount: repliesForPost.length };
    const updatedPosts = posts.map((post) => String(post.id) === String(selectedPost.id) ? { ...post, ...updatedPostData } : post);

    setPosts(updatedPosts);
    setSelectedPost({ ...selectedPost, ...updatedPostData });
    setNewReplyContent("");
    toast.success("답글이 작성되었습니다!");
    updateActivity({ replies: 1 });

    try {
      const postDocId = typeof selectedPost.id === "string" ? selectedPost.id : String(selectedPost.id);

      // ✅ 2. 보안 규칙 위반 필드('comments')를 제거하고 허용된 필드만 업데이트합니다.
      await updateDoc(doc(db, "posts", postDocId), {
        replies: repliesForPostForFirestore,
        replyCount: increment(1),
        lastReplyAt: new Date(),
        lastReplyAuthor: userNickname,
        lastReplyAuthorUid: currentUid,
        lastReplyProfileImage: userProfileImage ?? null,
      });

      await updateDoc(doc(db, "users", currentUid), { replyCount: increment(1) });
    } catch (error) {
      console.error("Firestore 답글 저장 실패:", error);
    }

    try {
      const postAuthorUid = (selectedPost as any).authorUid ?? null;
      if (postAuthorUid && postAuthorUid !== currentUid) {
        // ✅ 3. 새로 만든 '쓰기 전용' 알림 생성 함수를 호출합니다.
        await createNotificationForEvent({
          toUserUid: postAuthorUid,
          fromUserUid: currentUid,
          type: "reply",
          categoryId: (selectedPost as any).categoryId ?? selectedPost.category ?? null,
          data: {
            postId: selectedPost.id,
            replyId: newReplyId,
            userId: currentUid,
            userName: userNickname,
            userAvatar: userProfileImage ?? null,
          },
        });
      }
    } catch (err) {
      console.error("댓글 알림 생성 실패:", err);
    }

    try {
      const mentionRegex = /@([^\s@]+)/g;
      const mentionedNicknames = new Set<string>();
      let match: RegExpExecArray | null;
      while ((match = mentionRegex.exec(newReply.content)) !== null) {
        const nickname = match[1].trim();
        if (nickname && nickname !== userNickname) {
          mentionedNicknames.add(nickname);
        }
      }

      if (mentionedNicknames.size > 0) {
        for (const nickname of mentionedNicknames) {
          if (nickname === selectedPost.author) continue;
          const targetUid = await findUserUidByNickname(nickname);
          if (targetUid && targetUid !== currentUid) {
            await createNotificationForEvent({
              toUserUid: targetUid,
              fromUserUid: currentUid,
              type: "mention",
              categoryId: (selectedPost as any).categoryId ?? selectedPost.category ?? null,
              data: {
                postId: selectedPost.id,
                replyId: newReplyId,
                userId: currentUid,
                userName: userNickname,
                userAvatar: userProfileImage ?? null,
              },
            });
          }
        }
      }
    } catch (e) {
      console.error("멘션 알림 처리 중 오류:", e);
    }
  }, [selectedPost, newReplyContent, userNickname, posts, clampedTrust, setPosts, setSelectedPost, updateActivity, userProfileImage]);

  const handleDeleteReply = useCallback(
    async (replyId: number) => {
      if (!selectedPost) return;
      const reply = selectedPost.replies?.find((r) => r.id === replyId);
      if (!reply || reply.authorUid !== auth.currentUser?.uid) {
        toast.error("본인의 답글만 삭제할 수 있습니다.");
        return;
      }
      const updatedReplies = selectedPost.replies.filter((r) => r.id !== replyId);
      const updatedRepliesForFirestore = updatedReplies.map(sanitizeReplyForFirestore);
      const updatedPostData = { replies: updatedReplies, replyCount: updatedReplies.length };
      setPosts(posts.map(p => String(p.id) === String(selectedPost.id) ? { ...p, ...updatedPostData } : p));
      setSelectedPost({ ...selectedPost, ...updatedPostData });
      toast.success("답글이 삭제되었습니다.");
      try {
        const postDocId = typeof selectedPost.id === 'string' ? selectedPost.id : String(selectedPost.id);
        await updateDoc(doc(db, 'posts', postDocId), {
          replies: updatedRepliesForFirestore,
          replyCount: updatedRepliesForFirestore.length,
        });
      } catch (error) {
        console.error("Firestore 답글 삭제 실패:", error);
      }
    },
    [selectedPost, posts, setPosts, setSelectedPost]
  );

  // ✅ 4. TypeScript 오류가 발생했던 함수의 실제 내용을 복원합니다.
  const renderContentWithMentions = useCallback(
    (
      content: string | null | undefined,
      onMentionClick: (nickname: string) => void
    ): React.ReactNode => {
      if (!content) {
        return null;
      }
      const normalizedContent = content.replace(/\n{3,}/g, '\n\n');
      const paragraphs = normalizedContent.split(/\n\n/);
      return paragraphs.map((paragraph, pIndex) => {
        const elements: React.ReactNode[] = [];
        const mentionRegex = /@([^\s@]+)/g;
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = mentionRegex.exec(paragraph)) !== null) {
          const fullMatch = match[0];
          const nickname = match[1];
          const start = match.index;
          if (start > lastIndex) {
            elements.push(paragraph.slice(lastIndex, start));
          }
          elements.push(
            <span
              key={`mention-${pIndex}-${start}-${nickname}`}
              data-nickname={nickname}
              className="text-primary font-semibold hover:underline cursor-pointer"
              onClick={() => onMentionClick(nickname)}
            >
              {fullMatch}
            </span>
          );
          lastIndex = start + fullMatch.length;
        }
        if (lastIndex < paragraph.length) {
          elements.push(paragraph.slice(lastIndex));
        }
        return (
          <div key={`paragraph-${pIndex}`} className="whitespace-pre-wrap">
            {elements}
          </div>
        );
      });
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