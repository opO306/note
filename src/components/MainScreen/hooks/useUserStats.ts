// MainScreen/hooks/useUserStats.ts
// 사용자 통계 (등불 수, 길잡이 수 등) 관련 로직을 관리하는 훅

import { useState, useEffect, useCallback, useMemo } from "react";
import { auth, db } from "@/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { safeLocalStorage } from "@/components/utils/storageUtils";

import type { Post } from "../types";

interface RankingEntry {
  author: string;          // 닉네임
  authorUid: string | null; // 유저 uid (없으면 null)
  count: number;           // 점수(횟수)
}

type RankingMap = Record<string, RankingEntry>;

interface UseUserStatsParams {
  posts: Post[];
  userNickname: string;
}

export function useUserStats({ posts, userNickname }: UseUserStatsParams) {
  // 내 글에 받은 등불 총합
  const [userPostLanterns, setUserPostLanterns] = useState(0);

  // 내 답글에 받은 등불 총합
  const [userReplyLanterns, setUserReplyLanterns] = useState(0);

  // 길잡이로 채택된 횟수
  const [userGuideCount, setUserGuideCount] = useState(0);

  // 프로필 설명
  const [profileDescription, setProfileDescription] = useState("");

  // 관심 분야
  const [profileInterests, setProfileInterests] = useState("");

  // 주간 길잡이 랭킹 (key: uid 또는 닉네임)
  const [weeklyGuideRanking, setWeeklyGuideRanking] = useState<RankingMap>({});

  // 누적 길잡이 랭킹 (key: uid 또는 닉네임)
  const [totalGuideRanking, setTotalGuideRanking] = useState<RankingMap>({});

  // 주간 등불 랭킹 (key: uid 또는 닉네임)
  const [weeklyLanternRanking, setWeeklyLanternRanking] = useState<RankingMap>({});

  // localStorage에서 초기값 복원
  useEffect(() => {
    setUserPostLanterns(safeLocalStorage.getNumber("userPostLanterns", 0));
    setUserReplyLanterns(safeLocalStorage.getNumber("userReplyLanterns", 0));
    setUserGuideCount(safeLocalStorage.getNumber("userGuideCount", 0));

    const savedProfileDescription = safeLocalStorage.getItem("profileDescription");
    if (savedProfileDescription) {
      setProfileDescription(savedProfileDescription);
    }

    const savedProfileInterests = safeLocalStorage.getItem("profileInterests");
    if (savedProfileInterests) {
      setProfileInterests(savedProfileInterests);
    }
  }, []);

  // Firestore에서 사용자 통계 실시간으로 불러오기
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const userRef = doc(db, "users", uid);

    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) return;

        const data = snap.data() as any;

        // guideCount
        if (typeof data.guideCount === "number") {
          setUserGuideCount(data.guideCount);
          safeLocalStorage.setItem("userGuideCount", String(data.guideCount));
        }

        // 등불 통계
        if (typeof data.postLanternsReceived === "number") {
          setUserPostLanterns(data.postLanternsReceived);
          safeLocalStorage.setItem(
            "userPostLanterns",
            String(data.postLanternsReceived)
          );
        }

        if (typeof data.replyLanternsReceived === "number") {
          setUserReplyLanterns(data.replyLanternsReceived);
          safeLocalStorage.setItem(
            "userReplyLanterns",
            String(data.replyLanternsReceived)
          );
        }
      },
      (error) => {
        console.error("사용자 통계 실시간 구독 실패:", error);
      }
    );

    // 컴포넌트가 언마운트되면 구독 해제
    return () => {
      unsubscribe();
    };
  }, []);

  // 주간 길잡이 랭킹 계산 (posts 기반)
  useEffect(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const ranking: RankingMap = {};

    posts.forEach((post) => {
      // 최근 1주일 내 글만
      if (post.createdAt < oneWeekAgo) return;

      // 길잡이로 채택된 답글 찾기
      const guideReply = post.replies?.find((r: any) => r.isGuide);
      if (!guideReply) return;

      const author = guideReply.author ?? "알 수 없음";
      const authorUid =
        typeof guideReply.authorUid === "string" ? guideReply.authorUid : null;

      // key는 uid가 있으면 uid, 없으면 닉네임
      const key = authorUid || author;

      const prev = ranking[key];
      ranking[key] = {
        author,
        authorUid,
        count: (prev?.count ?? 0) + 1,
      };
    });

    setWeeklyGuideRanking(ranking);
  }, [posts]);

  // 누적 길잡이 랭킹 계산 (기간 제한 없음)
  useEffect(() => {
    const ranking: RankingMap = {};

    posts.forEach((post) => {
      const guideReply = post.replies?.find((r: any) => r.isGuide);
      if (!guideReply) return;

      const author = guideReply.author ?? "알 수 없음";
      const authorUid =
        typeof guideReply.authorUid === "string" ? guideReply.authorUid : null;

      const key = authorUid || author;

      const prev = ranking[key];
      ranking[key] = {
        author,
        authorUid,
        count: (prev?.count ?? 0) + 1,
      };
    });

    setTotalGuideRanking(ranking);
  }, [posts]);

  // 주간 등불 랭킹 계산 (최근 7일, 글 + 답글 등불 합산)
  useEffect(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const ranking: RankingMap = {};

    posts.forEach((post) => {
      const postCreatedAt =
        post.createdAt instanceof Date ? post.createdAt : new Date(post.createdAt);

      // 글 자체가 1주일보다 오래된 경우 → 이 글과 그 안의 답글은 주간 랭킹에서 제외
      if (postCreatedAt < oneWeekAgo) {
        return;
      }

      // 1) 글에 받은 등불
      const postLanterns =
        typeof post.lanterns === "number" ? post.lanterns : 0;

      if (postLanterns > 0 && post.author) {
        const author = post.author;
        const authorUid =
          typeof post.authorUid === "string" ? post.authorUid : null;
        const key = authorUid || author;

        const prev = ranking[key];
        ranking[key] = {
          author,
          authorUid,
          count: (prev?.count ?? 0) + postLanterns,
        };
      }

      // 2) 답글에 받은 등불
      if (Array.isArray(post.replies)) {
        post.replies.forEach((reply: any) => {
          const replyLanterns =
            typeof reply.lanterns === "number" ? reply.lanterns : 0;
          const replyAuthor = reply.author;

          if (!replyAuthor || replyLanterns <= 0) return;

          const replyCreatedAt: Date | null =
            reply.createdAt instanceof Date
              ? reply.createdAt
              : null;

          const baseDate = replyCreatedAt ?? postCreatedAt;
          if (baseDate < oneWeekAgo) return;

          const replyAuthorUid =
            typeof reply.authorUid === "string" ? reply.authorUid : null;
          const key = replyAuthorUid || replyAuthor;

          const prev = ranking[key];
          ranking[key] = {
            author: replyAuthor,
            authorUid: replyAuthorUid,
            count: (prev?.count ?? 0) + replyLanterns,
          };
        });
      }
    });

    setWeeklyLanternRanking(ranking);
  }, [posts]);

  // 프로필 설명 변경
  const handleProfileDescriptionChange = useCallback((value: string) => {
    setProfileDescription(value);
    safeLocalStorage.setItem("profileDescription", value);
  }, []);

  // 관심 분야 변경
  const handleProfileInterestsChange = useCallback((value: string) => {
    setProfileInterests(value);
    safeLocalStorage.setItem("profileInterests", value);
  }, []);

  // 내 게시물 목록
  const userPosts = useMemo(
    () => posts.filter((post) => post.author === userNickname),
    [posts, userNickname]
  );

  // 내 답글 목록 (게시물 정보 포함)
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

  // 랭킹 상위 사용자 목록 (최대 10명)
  const topGuideUsers = useMemo(() => {
    const entries = Object.values(weeklyGuideRanking);

    return entries
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((entry, index) => ({
        rank: index + 1,
        nickname: entry.author,
        guideCount: entry.count,
      }));
  }, [weeklyGuideRanking]);

  return {
    userPostLanterns,
    setUserPostLanterns,
    userReplyLanterns,
    setUserReplyLanterns,
    userGuideCount,
    setUserGuideCount,
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
