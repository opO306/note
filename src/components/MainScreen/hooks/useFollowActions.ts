// MainScreen/hooks/useFollowActions.ts
// 팔로우/언팔로우 관련 로직을 관리하는 훅

import { useState, useEffect, useCallback } from "react";
import { auth, db } from "@/firebase";
import { toast } from "@/toastHelper";
import {
  getFollowSnapshotForUser,
  getFollowersNicknamesForUser,
  toggleFollowByNickname,
} from "@/core/userRepository";
import {
  collection,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";
import { createFollowNotification, createNotificationForEvent } from "@/components/hooks/notificationDomainService";

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

    mapByNickname.set(nickname, {
      nickname,
      avatarUrl: data.profileImageUrl || data.photoURL || "",
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

  // Firestore에서 팔로우 정보 불러오기
  // - 앱 시작 시 한 번 가져오고
  // - 이후에는 일정 간격으로 다시 가져와서 실시간에 가깝게 유지
  useEffect(() => {
    const uid = auth.currentUser?.uid ?? null;
    if (!uid) return;

    let isCancelled = false;

    const fetchFollow = async () => {
      try {
        const snapshot = await getFollowSnapshotForUser(uid);
        if (isCancelled) return;

        // 서버 기준 팔로워 수 / 내가 팔로우 중인 닉네임들
        setFollowerCount(snapshot.followerCount ?? 0);
        setFollowingUsers(snapshot.followingNicknames ?? []);
      } catch (error) {
        if (!isCancelled) {
          console.error("팔로우 정보 불러오기 실패:", error);
        }
      }
    };

    // 1) 처음 한 번 즉시 실행
    fetchFollow();

    // 2) 이후 일정 간격으로 반복 실행 (예: 5초마다)
    const intervalId = setInterval(fetchFollow, 5000);

    // 3) 컴포넌트 언마운트되면 정리
    return () => {
      isCancelled = true;
      clearInterval(intervalId);
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
    async (targetUserName: string) => {
      // 자기 자신은 팔로우 불가
      if (!targetUserName || targetUserName === userNickname) {
        return;
      }

      const currentUid = auth.currentUser?.uid ?? null;
      if (!currentUid) {
        toast.error("로그인 후 이용해주세요.");
        return;
      }

      try {
        // 서버 기준으로 팔로우/언팔로우 토글
        const result = await toggleFollowByNickname({
          currentUid,
          currentNickname: userNickname,
          targetNickname: targetUserName,
        });

        // 로컬 상태도 서버 결과에 맞춰 업데이트
        setFollowingUsers((prev) => {
          const isAlreadyFollowing = prev.includes(targetUserName);

          if (result.isFollowing && !isAlreadyFollowing) {
            return [...prev, targetUserName];
          }

          if (!result.isFollowing && isAlreadyFollowing) {
            return prev.filter((name) => name !== targetUserName);
          }

          return prev;
        });

        // 🔹 팔로우 “성공적으로 켜진” 경우에만 알림 생성
        if (result.isFollowing) {
          try {
            // 닉네임으로 대상 유저 UID 조회
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("nickname", "==", targetUserName));
            const snap = await getDocs(q);

            if (!snap.empty) {
              const targetUserDoc = snap.docs[0];
              const targetUid = targetUserDoc.id;

              await createFollowNotification({
                toUserUid: targetUid,              // 팔로우 당한 사람 UID
                fromUserUid: currentUid,           // 팔로우 건 사람 UID
                followerNickname: userNickname,    // 나의 닉네임
                followerAvatar:
                  (auth.currentUser?.photoURL as string | undefined) ?? undefined,
              });
            }
          } catch (err) {
            console.error("팔로우 알림 생성 실패:", err);
            // 여기서는 토스트까지는 안 띄우고 로깅만 하는 쪽이 안전
          }
        }

        // 토스트 메시지
        if (result.isFollowing) {
          toast.success(`${targetUserName}님을 승선했습니다.`);
        } else {
          toast.success(`${targetUserName}님에서 하선했습니다.`);
        }
      } catch (error: any) {
        console.error("팔로우/언팔로우 실패:", error);

        const message = typeof error?.message === "string" ? error.message : "";
        if (message.includes("TARGET_USER_NOT_FOUND")) {
          toast.error("해당 닉네임의 사용자를 찾을 수 없습니다.");
        } else {
          toast.error(
            "팔로우 상태를 변경하지 못했습니다. 잠시 후 다시 시도해주세요.",
          );
        }
      }
    },
    [userNickname],
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
