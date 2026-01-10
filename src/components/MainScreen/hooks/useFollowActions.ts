// MainScreen/hooks/useFollowActions.ts
// 팔로우/언팔로우 관련 로직을 관리하는 훅

import { useState, useEffect, useCallback, useRef } from "react";
import { auth, db } from "@/firebase";
import { toast } from "@/toastHelper";
import {
  getFollowersNicknamesForUser,
  toggleFollowByNickname,
} from "@/core/userRepository";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

interface UseFollowActionsParams {
  userNickname: string;
}

// 팔로우 목록에서 쓸 유저 정보 타입 (FollowListScreen과 동일하게 사용 가능)
export interface FollowUserInfo {
  nickname: string;
  avatarUrl?: string;
  bio?: string;
  title?: string;
}

/**
 * 닉네임 배열을 받아서 users 컬렉션에서
 * avatarUrl / bio 를 읽어 FollowUserInfo 배열로 변환
 */
async function buildFollowUserInfosByNicknames(
  nicknames: string[],
): Promise<FollowUserInfo[]> {
  if (!nicknames.length) return [];

  // Firestore where in 은 한 번에 최대 10개라서,
  // 일단 10개 이하라는 가정으로 구현 (많아지면 chunk 처리 필요)
  const limitedNicknames = nicknames.slice(0, 10);

  const usersRef = collection(db, "users");
  const q = query(usersRef, where("nickname", "in", limitedNicknames));

  const snapshot = await getDocs(q);

  const mapByNickname = new Map<string, FollowUserInfo>();

  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as any;
    const nickname = data.nickname as string;

    // 🔹 프로필 이미지 결정 로직 (팔로우 목록용)
    // - 1순위: 우리가 관리하는 커스텀 이미지(profileImageUrl)
    // - 2순위: Firestore photoURL 중 "구글 기본 이미지가 아닌 것"
    // - 없으면 빈 문자열 → UI에서 Dicebear/API 기본 아바타 사용
    let avatarUrl = "";

    if (typeof data.profileImageUrl === "string" && data.profileImageUrl) {
      avatarUrl = data.profileImageUrl;
    } else if (typeof data.photoURL === "string" && data.photoURL) {
      const photoUrl: string = data.photoURL;
      const isGooglePhoto =
        photoUrl.includes("googleusercontent.com") ||
        photoUrl.includes("googleapis.com") ||
        photoUrl.includes("lh3.googleusercontent.com") ||
        photoUrl.includes("lh4.googleusercontent.com") ||
        photoUrl.includes("lh5.googleusercontent.com") ||
        photoUrl.includes("lh6.googleusercontent.com");

      if (!isGooglePhoto) {
        avatarUrl = photoUrl;
      }
    }

    mapByNickname.set(nickname, {
      nickname,
      avatarUrl,
      bio: data.profileDescription || "",
      title: data.currentTitle || "",   // ★ 추가: 현재 장착한 칭호
    });
  });

  // 닉네임 순서를 보존해서 리턴
  return nicknames.map((n) => {
    const info = mapByNickname.get(n);
    return (
      info || {
        nickname: n,
      }
    );
  });
}

export function useFollowActions({ userNickname }: UseFollowActionsParams) {
  // 내가 팔로우하는 사람들 닉네임 목록
  const [followingUsers, setFollowingUsers] = useState<string[]>([]);

  // 나를 팔로우하는 사람 수
  const [followerCount, setFollowerCount] = useState<number>(0);

  // 나를 팔로우하는 사람들 닉네임 목록
  const [followerUsers, setFollowerUsers] = useState<string[]>([]);

  // (옵션) 상세 정보가 필요한 경우를 위한 상태
  const [followerUsersDetailed, setFollowerUsersDetailed] = useState<FollowUserInfo[]>([]);
  const [followingUsersDetailed, setFollowingUsersDetailed] = useState<FollowUserInfo[]>([]);
  const inFlightRef = useRef<Set<string>>(new Set());

  // 대상 닉네임 존재 여부 사전 확인 (닉네임 오타로 인한 반복 에러 방지)
  const checkTargetExists = useCallback(async (targetNickname: string) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("nickname", "==", targetNickname));
    const snap = await getDocs(q);
    if (snap.empty) return { exists: false, isDeleted: false };

    const data = snap.docs[0].data() as any;
    const isDeleted =
      data?.isDeleted === true ||
      data?.status === "deleted" ||
      data?.nickname === "탈퇴한 사용자" ||
      data?.nickname === "탈퇴한 사용자 입니다만" ||
      (typeof data?.nickname === "string" && data.nickname.includes("탈퇴한 사용자"));

    return { exists: true, isDeleted };
  }, []);

  // Firestore 실시간 구독: 팔로우/팔로워 카운트 + 내가 팔로우하는 닉네임 목록
  useEffect(() => {
    const uid = auth.currentUser?.uid ?? null;
    if (!uid) return;

    const followsRef = collection(db, "follows");
    const qFollowing = query(followsRef, where("followerUid", "==", uid));
    const unsubFollowing = onSnapshot(
      qFollowing,
      (snap) => {
        const nicknameSet = new Set<string>();
        snap.forEach((docSnap) => {
          const d = docSnap.data() as any;
          const nickname = d?.followingNickname as string | undefined;
          if (nickname) nicknameSet.add(nickname);
        });
        setFollowingUsers(Array.from(nicknameSet));
      },
      (error) => {
        console.error("팔로우 정보 구독 실패:", error);
      }
    );

    const userRef = doc(db, "users", uid);
    const unsubUser = onSnapshot(
      userRef,
      (snap) => {
        const data = (snap.exists() ? (snap.data() as any) : {}) ?? {};
        const followerCnt =
          typeof data.followerCount === "number" ? data.followerCount : 0;
        setFollowerCount(followerCnt);
      },
      (error) => {
        console.error("팔로워 수 구독 실패:", error);
      }
    );

    return () => {
      unsubFollowing();
      unsubUser();
    };
  }, []);

  // 팔로워 목록 불러오기 (팔로워 화면 열 때만 호출)
  const fetchFollowerUsers = useCallback(async () => {
    const uid = auth.currentUser?.uid ?? null;
    if (!uid) return;

    try {
      const followers = await getFollowersNicknamesForUser(uid);
      setFollowerUsers(followers ?? []);
      // 필요하면 followerCount 를 동기화
      setFollowerCount(Array.isArray(followers) ? followers.length : 0);
    } catch (error) {
      console.error("팔로워 목록 불러오기 실패:", error);
    }
  }, []);

  // followerUsers / followingUsers 가 바뀔 때마다 상세 정보 동기화
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const detailed = await buildFollowUserInfosByNicknames(followerUsers);
        if (!cancelled) {
          setFollowerUsersDetailed(detailed);
        }
      } catch (error) {
        console.error("팔로워 상세 정보 로딩 실패:", error);
      }
    };

    if (followerUsers.length) {
      run();
    } else {
      setFollowerUsersDetailed([]);
    }

    return () => {
      cancelled = true;
    };
  }, [followerUsers]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const detailed = await buildFollowUserInfosByNicknames(followingUsers);
        if (!cancelled) {
          setFollowingUsersDetailed(detailed);
        }
      } catch (error) {
        console.error("팔로잉 상세 정보 로딩 실패:", error);
      }
    };

    if (followingUsers.length) {
      run();
    } else {
      setFollowingUsersDetailed([]);
    }

    return () => {
      cancelled = true;
    };
  }, [followingUsers]);

  // 팔로우/언팔로우 토글
  const handleToggleFollowUser = useCallback(
    async (targetUserName: string): Promise<boolean> => {
      // 자기 자신은 팔로우 불가
      const normalizedTarget = targetUserName?.trim();
      if (!normalizedTarget || normalizedTarget === userNickname) {
        return false;
      }
      // 탈퇴/무효 닉네임 방어
      if (normalizedTarget === "탈퇴한 사용자") {
        toast.error("탈퇴한 사용자는 팔로우할 수 없습니다.");
        return false;
      }

      // 중복 클릭 방지
      if (inFlightRef.current.has(normalizedTarget)) return false;
      inFlightRef.current.add(normalizedTarget);

      const currentUid = auth.currentUser?.uid ?? null;
      if (!currentUid) {
        toast.error("로그인 후 이용해주세요.");
        inFlightRef.current.delete(normalizedTarget);
        return false;
      }

      try {
        // 토글 전에 대상 유저 존재 여부 확인해 불필요한 트랜잭션/에러 방지
        const { exists, isDeleted } = await checkTargetExists(normalizedTarget);
        if (!exists) {
          toast.error("해당 닉네임의 사용자를 찾을 수 없습니다.");
          setFollowingUsers((prev) => prev.filter((name) => name !== normalizedTarget));
          return false;
        }
        if (isDeleted) {
          toast.error("탈퇴한 사용자는 팔로우할 수 없습니다.");
          setFollowingUsers((prev) => prev.filter((name) => name !== normalizedTarget));
          return false;
        }

        // 서버 기준으로 팔로우/언팔로우 토글
        await toggleFollowByNickname({
          currentUid,
          currentNickname: userNickname,
          targetNickname: normalizedTarget,
        });

        return true;
      } catch (error: any) {
        console.error("팔로우/언팔로우 실패:", error);

        const message = typeof error?.message === "string" ? error.message : "";
        if (message.includes("TARGET_USER_NOT_FOUND")) {
          toast.error("해당 닉네임의 사용자를 찾을 수 없습니다.");
          // 서버에 유저가 없으면 로컬 팔로잉 목록에서도 제거해 재시도시 반복 에러 방지
          setFollowingUsers((prev) => prev.filter((name) => name !== normalizedTarget));
        } else {
          toast.error(
            "팔로우 상태를 변경하지 못했습니다. 잠시 후 다시 시도해주세요.",
          );
        }
        return false;
      } finally {
        inFlightRef.current.delete(normalizedTarget);
      }
    },
    [userNickname, checkTargetExists],
  );

  // 특정 사용자를 팔로우 중인지 확인
  const isFollowing = useCallback(
    (targetNickname: string) => {
      return followingUsers.includes(targetNickname);
    },
    [followingUsers],
  );

  // 팔로잉 수
  const followingCount = followingUsers.length;

  return {
    followingUsers,
    followerUsers,
    followerCount,
    followingCount,
    handleToggleFollowUser,
    isFollowing,
    fetchFollowerUsers,
    setFollowerCount,
    // 필요 시 사용할 수 있는 상세 정보
    followerUsersDetailed,
    followingUsersDetailed,
  };
}
