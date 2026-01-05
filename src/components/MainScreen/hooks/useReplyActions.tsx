import React, { useState, useRef, useCallback, useEffect } from "react";
import { auth } from "@/firebase";
import {
  getFirestore,
  collection,
  doc,
  updateDoc,
  increment,
  getDoc,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData
} from "firebase/firestore";
import { toast } from "@/toastHelper";
import { containsProfanity } from "@/components/utils/profanityFilter";
import { detectPersonalInfo, getPersonalInfoMessage } from "@/components/utils/personalInfoDetector";
import type { Post, Reply } from "../types";
import type { UserActivityData } from "@/components/useAchievements";
// ✅ 1. 새로 만든 '쓰기 전용' 알림 생성 함수를 import 합니다.
// (경로가 다르다면 실제 파일 위치에 맞게 수정해주세요.)
import { createNotificationForEvent } from "@/components/utils/notificationUtils";

const db = getFirestore(); // Firestore 인스턴스 초기화

// Safe localStorage helper
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error("localStorage getItem error:", error);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error("localStorage setItem error:", error);
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("localStorage removeItem error:", error);
    }
  },
};

const GUEST_ID_KEY = "guestId"; // 게스트 ID 키 추가

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
    moderationStatus: reply.moderationStatus ?? "approved", // moderationStatus 추가
    clientIp: reply.clientIp ?? null, // clientIp 추가
    guestId: reply.guestId ?? null, // guestId 추가
  };
}

// 댓글 작성 쿨타임: 10초 (밀리초)
const REPLY_COOLDOWN_MS = 10 * 1000;
const LAST_REPLY_SUBMIT_TIME_KEY = "lastReplySubmitTime";

interface UseReplyActionsParams {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  selectedPost: Post | null;
  setSelectedPost: (post: Post | null) => void;
  userNickname: string;
  clampedTrust: number;
  updateActivity: (newActivity: Partial<UserActivityData>) => void;
  userProfileImage: string | null | undefined;
  isGuest: boolean; // isGuest 추가
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
  isGuest, // isGuest 추가
}: UseReplyActionsParams) {
  const [newReplyContent, setNewReplyContent] = useState("");
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [clientIp, setClientIp] = useState<string | undefined>(undefined); // IP 주소 상태 추가
  const [guestId, setGuestId] = useState<string | undefined>(undefined); // 게스트 ID 상태 추가
  const [blockedIPs, setBlockedIPs] = useState<Set<string>>(new Set()); // 차단된 IP 목록 상태
  const [blockedGuestIds, setBlockedGuestIds] = useState<Set<string>>(new Set()); // 차단된 게스트 ID 목록 상태

  // IP 주소 획득
  useEffect(() => {
    const fetchIpAddress = async () => {
      try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        setClientIp(data.ip);
      } catch (error) {
        console.error("IP 주소 획득 실패:", error);
      }
    };
    fetchIpAddress();
  }, []);

  // 게스트 ID 생성 및 로드
  useEffect(() => {
    if (isGuest) {
      let currentGuestId = safeLocalStorage.getItem(GUEST_ID_KEY);
      if (!currentGuestId) {
        currentGuestId = `게스트${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        safeLocalStorage.setItem(GUEST_ID_KEY, currentGuestId);
      }
      setGuestId(currentGuestId);
    } else {
      setGuestId(undefined);
      safeLocalStorage.removeItem(GUEST_ID_KEY);
    }
  }, [isGuest]);

  // 차단된 IP 목록 불러오기
  useEffect(() => {
    const fetchBlockedIPs = async () => {
      try {
        const blockedIPsSnapshot = await getDocs(collection(db, "blockedIPs"));
        const ips = new Set<string>();
        blockedIPsSnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => ips.add(doc.id));
        setBlockedIPs(ips);
      } catch (error) {
        console.error("차단된 IP 목록 로드 실패:", error);
      }
    };
    fetchBlockedIPs();
  }, []);

  // 차단된 게스트 ID 목록 불러오기
  useEffect(() => {
    const fetchBlockedGuestIds = async () => {
      try {
        const blockedGuestIdsSnapshot = await getDocs(collection(db, "suspendedGuestIds"));
        const ids = new Set<string>();
        blockedGuestIdsSnapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => ids.add(doc.id));
        setBlockedGuestIds(ids);
      } catch (error) {
        console.error("차단된 게스트 ID 목록 로드 실패:", error);
      }
    };
    if (isGuest) {
      fetchBlockedGuestIds();
    }
  }, [isGuest]);

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

    // IP 차단 확인 (클라이언트 측에서 1차 방어)
    if (clientIp && blockedIPs.has(clientIp)) {
      toast.error("서비스 이용이 제한되었습니다. 관리자에게 문의하세요.");
      return;
    }

    // 게스트 ID 차단 확인
    if (isGuest && guestId && blockedGuestIds.has(guestId)) {
      toast.error("게스트 계정이 정지되었습니다. 관리자에게 문의하세요.");
      return;
    }

    // ✅ 쿨타임 체크
    const lastSubmitTimeStr = safeLocalStorage.getItem(LAST_REPLY_SUBMIT_TIME_KEY);
    if (lastSubmitTimeStr) {
      try {
        const lastSubmitTime = parseInt(lastSubmitTimeStr, 10);
        const now = Date.now();
        const timeSinceLastSubmit = now - lastSubmitTime;

        if (timeSinceLastSubmit < REPLY_COOLDOWN_MS) {
          const remainingSeconds = Math.ceil((REPLY_COOLDOWN_MS - timeSinceLastSubmit) / 1000);
          toast.error(`댓글 작성 쿨타임이 남아있습니다. ${remainingSeconds}초 후 다시 시도해주세요.`);
          return;
        }
      } catch (error) {
        console.error("쿨타임 체크 오류:", error);
        // 오류가 발생해도 계속 진행
      }
    }

    // ✅ 신뢰도 기반 제재 체크 (게스트는 이 제한을 받지 않음)
    if (!isGuest && clampedTrust <= 0) {
      toast.error("신뢰도 0점에서는 답글을 작성할 수 없습니다.");
      return;
    }
    if (!isGuest && clampedTrust <= 20) {
      toast.error("신뢰도가 너무 낮아 답글을 작성할 수 없습니다. (최소 20점 필요)");
      return;
    }

    if (containsProfanity(newReplyContent)) {
      toast.error("부적절한 표현이 포함되어 있습니다.");
      return;
    }

    // ✅ 개인정보 유출 감지
    const personalInfo = detectPersonalInfo(newReplyContent);
    if (personalInfo.hasPersonalInfo) {
      toast.error(getPersonalInfoMessage(personalInfo.detectedTypes));
      return;
    }

    const currentUid = auth.currentUser?.uid;
    // 게스트 모드에서는 currentUid가 null일 수 있음
    if (!isGuest && !currentUid) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    let authorTitleId: string | null = null;
    if (currentUid) { // 로그인된 사용자만 칭호 조회
      try {
        const userRef = doc(db, "users", currentUid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          authorTitleId = userSnap.data().currentTitle ?? null;
        }
      } catch (error) {
        console.error("댓글 작성자 칭호 조회 실패:", error);
      }
    }

    const newReplyId = Date.now();
    const newReply: Reply = {
      id: newReplyId,
      content: newReplyContent.trim(),
      author: userNickname,
      authorUid: currentUid ?? null, // 게스트인 경우 null
      authorAvatar: userProfileImage ?? null,
      timeAgo: "방금",
      lanterns: 0,
      isGuide: false,
      createdAt: new Date(),
      authorTitleId,
      ...(isGuest && { moderationStatus: "pending", guestId }), // 게스트인 경우 moderationStatus 및 guestId 추가
      clientIp, // 획득한 IP 주소 추가
    };

    const repliesForPost = [...(selectedPost.replies || []), newReply];
    const repliesForPostForFirestore = repliesForPost.map(sanitizeReplyForFirestore);

    const updatedPostData = {
      replies: repliesForPost,
      replyCount: repliesForPost.length,
      comments: repliesForPost.length // UI 표시용 comments 필드도 업데이트
    };
    const updatedPosts = posts.map((post) => String(post.id) === String(selectedPost.id) ? { ...post, ...updatedPostData } : post);

    setPosts(updatedPosts);
    setSelectedPost({ ...selectedPost, ...updatedPostData });
    setNewReplyContent("");

    // 쿨타임 시간 저장
    safeLocalStorage.setItem(LAST_REPLY_SUBMIT_TIME_KEY, Date.now().toString());

    toast.success("답글이 작성되었습니다!");
    if (!isGuest) { // 게스트가 아닌 경우에만 활동 업데이트
      updateActivity({ replies: 1 });
    }

    try {
      const postDocId = typeof selectedPost.id === "string" ? selectedPost.id : String(selectedPost.id);

      // ✅ 2. Firestore에 replies, replyCount, comments 필드 업데이트
      await updateDoc(doc(db, "posts", postDocId), {
        replies: repliesForPostForFirestore,
        replyCount: increment(1),
        comments: repliesForPost.length, // UI 표시용 comments 필드도 저장
        lastReplyAt: new Date(),
        lastReplyAuthor: userNickname,
        lastReplyAuthorUid: currentUid ?? null, // 게스트인 경우 null
        lastReplyProfileImage: userProfileImage ?? null,
      });

      if (currentUid) { // 로그인된 사용자만 업데이트
        await updateDoc(doc(db, "users", currentUid), { replyCount: increment(1) });
      }
    } catch (error) {
      console.error("Firestore 답글 저장 실패:", error);
    }

    // ✅ 3. 댓글 알림 생성 (답글 작성 성공과 독립적으로 처리)
    // 자신의 게시글에 자신이 댓글을 달 때는 알림을 생성하지 않음
    if (currentUid) { // currentUid가 string일 때만 호출
      try {
        const postAuthorUid = (selectedPost as any).authorUid ?? null;
        // 게시글 작성자와 댓글 작성자가 다른 경우에만 알림 생성
        // 게스트의 경우 알림을 생성하지 않음
        if (!isGuest && postAuthorUid && postAuthorUid !== currentUid && postAuthorUid.trim() !== "") {
          await createNotificationForEvent({
            toUserUid: postAuthorUid,
            fromUserUid: currentUid,
            type: "reply",
            categoryId: (selectedPost as any).categoryId ?? selectedPost.category ?? null,
            data: {
              postId: selectedPost.id,
              replyId: newReplyId,
              userId: currentUid ?? null, // currentUid가 string일 때 null이 될 수 없으므로 currentUid 사용
              userName: userNickname,
              userAvatar: userProfileImage ?? null,
            },
          });
        }
      } catch (err) {
        // 알림 생성 실패는 답글 작성 성공에 영향을 주지 않음
        // 하지만 에러를 추적하기 위해 상세 로깅
        console.error("댓글 알림 생성 실패:", {
          error: err,
          postId: selectedPost.id,
          replyId: newReplyId,
          targetUid: (selectedPost as any).authorUid,
        });
      }
    }

    // ✅ 멘션 알림은 onPostUpdated 트리거에서 자동으로 처리되므로 클라이언트에서는 생성하지 않음
  }, [selectedPost, newReplyContent, userNickname, posts, clampedTrust, setPosts, setSelectedPost, updateActivity, userProfileImage, isGuest, clientIp, blockedIPs, guestId, blockedGuestIds]);

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
      const updatedPostData = {
        replies: updatedReplies,
        replyCount: updatedReplies.length,
        comments: updatedReplies.length // UI 표시용 comments 필드도 업데이트
      };
      setPosts(posts.map(p => String(p.id) === String(selectedPost.id) ? { ...p, ...updatedPostData } : p));
      setSelectedPost({ ...selectedPost, ...updatedPostData });
      toast.success("답글이 삭제되었습니다.");
      try {
        const postDocId = typeof selectedPost.id === 'string' ? selectedPost.id : String(selectedPost.id);
        await updateDoc(doc(db, 'posts', postDocId), {
          replies: updatedRepliesForFirestore,
          replyCount: updatedRepliesForFirestore.length,
          comments: updatedRepliesForFirestore.length, // UI 표시용 comments 필드도 저장
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

  const canSubmitReply = (
    (clampedTrust > 0 || isGuest) &&
    (clientIp && !blockedIPs.has(clientIp)) && // IP 차단 시 비활성화
    (!isGuest || (guestId && !blockedGuestIds.has(guestId))) // 게스트 ID 차단 시 비활성화
  );

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