// MainScreen/hooks/useBookmarkActions.ts
// 북마크 관련 로직을 관리하는 훅

import { useState, useEffect, useCallback } from "react";
import { auth, db } from "@/firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { toast } from "@/toastHelper";

// Firestore 헬퍼 함수들
const getBookmarksCollection = (uid: string) =>
  collection(db, "user_bookmarks", uid, "posts");

const getBookmarkDoc = (uid: string, postId: string | number) =>
  doc(db, "user_bookmarks", uid, "posts", String(postId));

interface UseBookmarkActionsParams {
  userNickname: string;
}

export function useBookmarkActions({ userNickname }: UseBookmarkActionsParams) {
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<string>>(new Set());

  // Firestore에서 북마크 불러오기 (앱 시작 시)
  useEffect(() => {
    const uid = auth.currentUser?.uid ?? null;
    if (!uid) return;

    const fetchBookmarks = async () => {
      try {
        const snap = await getDocs(getBookmarksCollection(uid));
        const ids = snap.docs.map((d) => d.id);
        setBookmarkedPosts(new Set(ids));
      } catch (error) {
        console.error("북마크 불러오기 실패:", error);
      }
    };

    fetchBookmarks();
  }, []);

  // userNickname 변경 시 북마크 다시 로드
  useEffect(() => {
    const uid = auth.currentUser?.uid ?? null;

    if (!uid) {
      setBookmarkedPosts(new Set());
      return;
    }

    const loadBookmarks = async () => {
      try {
        const snapshot = await getDocs(getBookmarksCollection(uid));
        const nextSet = new Set<string>();

        snapshot.forEach((docSnap) => {
          const data: any = docSnap.data();
          const postId = (data && data.postId) ?? docSnap.id;
          nextSet.add(String(postId));
        });

        setBookmarkedPosts(nextSet);
      } catch (error) {
        console.error("Firestore에서 북마크 불러오기 실패:", error);
      }
    };

    loadBookmarks();
  }, [userNickname]);

  // 북마크 토글
  const handleBookmarkToggle = useCallback(
    async (postId: string | number) => {
      const postIdStr = String(postId);
      const isCurrentlyBookmarked = bookmarkedPosts.has(postIdStr);
      const uid = auth.currentUser?.uid ?? null;

      // UI 즉시 업데이트
      setBookmarkedPosts((prev) => {
        const newSet = new Set(prev);
        if (isCurrentlyBookmarked) {
          newSet.delete(postIdStr);
        } else {
          newSet.add(postIdStr);
        }
        return newSet;
      });

      // Firestore 업데이트
      if (uid) {
        try {
          if (isCurrentlyBookmarked) {
            await deleteDoc(getBookmarkDoc(uid, postIdStr));
            toast.success("북마크가 해제되었습니다");
          } else {
            await setDoc(
              getBookmarkDoc(uid, postIdStr),
              {
                postId: postIdStr,
                createdAt: serverTimestamp(),
              },
              { merge: true }
            );
            toast.success("북마크에 저장되었습니다");
          }
        } catch (error) {
          console.error("북마크 저장 실패:", error);
          // 실패 시 UI 롤백
          setBookmarkedPosts((prev) => {
            const newSet = new Set(prev);
            if (isCurrentlyBookmarked) {
              newSet.add(postIdStr);
            } else {
              newSet.delete(postIdStr);
            }
            return newSet;
          });
          toast.error("북마크 저장에 실패했습니다");
        }
      } else {
        toast.error("로그인이 필요합니다");
        // 롤백
        setBookmarkedPosts((prev) => {
          const newSet = new Set(prev);
          if (isCurrentlyBookmarked) {
            newSet.add(postIdStr);
          } else {
            newSet.delete(postIdStr);
          }
          return newSet;
        });
      }
    },
    [bookmarkedPosts]
  );

  // 특정 게시물이 북마크되었는지 확인
  const isBookmarked = useCallback(
    (postId: string | number) => {
      return bookmarkedPosts.has(String(postId));
    },
    [bookmarkedPosts]
  );

  return {
    bookmarkedPosts,
    handleBookmarkToggle,
    isBookmarked,
  };
}
