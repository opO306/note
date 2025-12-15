// MainScreen/hooks/useUserStats.ts

import { useState, useEffect, useCallback, useMemo } from "react";
import { auth, db } from "@/firebase";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";

import type { Post } from "../types";

interface RankingEntry {
  author: string;          // 닉네임 (표시용)
  authorUid: string | null; // 유저 uid (고유 식별용)
  count: number;           // 점수
}

type RankingMap = Record<string, RankingEntry>;

interface UseUserStatsParams {
  posts: Post[];
  userNickname: string;
}

export function useUserStats({ posts, userNickname }: UseUserStatsParams) {
  // 내 통계 상태
  const [userPostLanterns, setUserPostLanterns] = useState(0);
  const [userReplyLanterns, setUserReplyLanterns] = useState(0);
  const [userGuideCount, setUserGuideCount] = useState(0);

  // 프로필 정보 상태
  const [profileDescription, setProfileDescription] = useState("");
  const [profileInterests, setProfileInterests] = useState("");

  // 1. 초기값은 Firestore에서만 로드 (로컬 스토리지 사용 안 함)
  // 모든 사용자 데이터는 Firestore에만 저장됨

  // 2. 내 통계 실시간 동기화 (Firestore -> State)
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const userRef = doc(db, "users", uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as any;

      // 통계 업데이트 (Firestore에서만 관리, 로컬 스토리지 사용 안 함)
      if (typeof data.guideCount === "number") {
        setUserGuideCount(data.guideCount);
      }
      if (typeof data.postLanternsReceived === "number") {
        setUserPostLanterns(data.postLanternsReceived);
      }
      if (typeof data.replyLanternsReceived === "number") {
        setUserReplyLanterns(data.replyLanternsReceived);
      }

      // 프로필 정보 업데이트 (Firestore에서만 관리, 로컬 스토리지 사용 안 함)
      if (typeof data.profileDescription === "string") {
        setProfileDescription(data.profileDescription);
      }
      if (typeof data.profileInterests === "string") {
        setProfileInterests(data.profileInterests);
      }
    }, (error) => {
      console.error("[useUserStats] 통계 구독 실패:", error);
    });

    return () => unsubscribe();
  }, []);

  // 3. 프로필 수정 핸들러 (Firestore에만 저장)
  const handleProfileDescriptionChange = useCallback(async (value: string) => {
    setProfileDescription(value); // UI 즉시 반영 (Optimistic UI)
    // 프로필 정보는 Firestore에만 저장 (로컬 스토리지 사용 안 함)

    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        await updateDoc(doc(db, "users", uid), { profileDescription: value });
      } catch (e) {
        console.error("프로필 설명 저장 실패", e);
      }
    }
  }, []);

  const handleProfileInterestsChange = useCallback(async (value: string) => {
    setProfileInterests(value);
    // 프로필 정보는 Firestore에만 저장 (로컬 스토리지 사용 안 함)

    const uid = auth.currentUser?.uid;
    if (uid) {
      try {
        await updateDoc(doc(db, "users", uid), { profileInterests: value });
      } catch (e) {
        console.error("관심 분야 저장 실패", e);
      }
    }
  }, []);

  // 4. [최적화] 랭킹 계산 통합 (루프 1회로 단축)
  const { weeklyGuideRanking, totalGuideRanking, weeklyLanternRanking } = useMemo(() => {
    const wGuide: RankingMap = {};
    const tGuide: RankingMap = {};
    const wLantern: RankingMap = {};

    // 기준 시간 (1주일 전)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoTime = oneWeekAgo.getTime();

    posts.forEach((post) => {
      const postDate = post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt);
      const postTime = postDate.getTime();
      const isRecentPost = postTime >= oneWeekAgoTime;

      // --- (1) 등불 랭킹 (글) ---
      if (isRecentPost && post.lanterns > 0 && post.author) {
        const key = post.authorUid || post.author; // UID 우선
        wLantern[key] = {
          author: post.author,
          authorUid: post.authorUid || null,
          count: (wLantern[key]?.count ?? 0) + post.lanterns
        };
      }

      // --- 답글 순회 ---
      if (Array.isArray(post.replies)) {
        post.replies.forEach((reply: any) => {
          if (reply.isAi) return; // AI 제외

          const replyAuthor = reply.author;
          if (!replyAuthor) return;

          const replyUid = typeof reply.authorUid === "string" ? reply.authorUid : null;
          const key = replyUid || replyAuthor; // UID 우선 사용

          // (2) 길잡이 랭킹 집계
          if (reply.isGuide) {
            // 누적 랭킹 (기간 무관)
            tGuide[key] = {
              author: replyAuthor,
              authorUid: replyUid,
              count: (tGuide[key]?.count ?? 0) + 1
            };

            // 주간 랭킹 (최근 1주일 글에 달린 채택)
            if (isRecentPost) {
              wGuide[key] = {
                author: replyAuthor,
                authorUid: replyUid,
                count: (wGuide[key]?.count ?? 0) + 1
              };
            }
          }

          // (3) 등불 랭킹 (답글)
          const rLanterns = typeof reply.lanterns === "number" ? reply.lanterns : 0;
          if (rLanterns > 0) {
            const replyDate = reply.createdAt instanceof Date ? reply.createdAt : null;
            // 답글 날짜가 없으면 글 날짜 기준
            const checkTime = replyDate ? replyDate.getTime() : postTime;

            if (checkTime >= oneWeekAgoTime) {
              wLantern[key] = {
                author: replyAuthor,
                authorUid: replyUid,
                count: (wLantern[key]?.count ?? 0) + rLanterns
              };
            }
          }
        });
      }
    });

    return {
      weeklyGuideRanking: wGuide,
      totalGuideRanking: tGuide,
      weeklyLanternRanking: wLantern
    };
  }, [posts]); // posts가 변경될 때만 1번 실행

  // 내 게시물 목록 (Memoization)
  const userPosts = useMemo(
    () => posts.filter((post) => post.author === userNickname),
    [posts, userNickname]
  );

  // 내 답글 목록 (Memoization)
  const userReplies = useMemo(
    () =>
      posts.flatMap((post) =>
        (post.replies || [])
          .filter((reply: any) => reply.author === userNickname)
          .map((reply: any) => ({
            ...reply,
            postTitle: post.title,
            postAuthor: post.author,
            postId: post.id,
          }))
      ),
    [posts, userNickname]
  );

  // 주간 길잡이 상위 10명 (Memoization)
  const topGuideUsers = useMemo(() => {
    return Object.values(weeklyGuideRanking)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((entry, index) => ({
        rank: index + 1,
        nickname: entry.author,
        guideCount: entry.count,
        uid: entry.authorUid // 필요 시 프로필 링크 등에 사용
      }));
  }, [weeklyGuideRanking]);

  return {
    userPostLanterns,
    userReplyLanterns,
    userGuideCount,

    profileDescription,
    profileInterests,
    handleProfileDescriptionChange,
    handleProfileInterestsChange,

    weeklyGuideRanking,
    totalGuideRanking,
    weeklyLanternRanking,

    userPosts,
    userReplies,
    topGuideUsers,
  };
}