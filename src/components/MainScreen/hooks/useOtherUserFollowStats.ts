// MainScreen/hooks/useOtherUserFollowStats.ts
// "다른 유저" 프로필에서 팔로워/팔로잉 숫자 + 목록을 불러오는 훅

import { useEffect, useState } from "react";
import { db } from "@/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
    getFollowSnapshotForUser,
    getFollowersNicknamesForUser,
} from "@/core/userRepository";

interface OtherUserFollowStats {
    followerCount: number;
    followingCount: number;
    followerUsers: string[];
    followingUsers: string[];
    loading: boolean;
}

interface UseOtherUserFollowStatsParams {
    // 프로필에서 보고 있는 유저 닉네임 (UserProfileDialog 의 username 과 동일)
    viewedNickname: string | null;
    // 현재 로그인한 내 닉네임 (내 프로필일 때는 이 훅이 동작하지 않게 하기 위함)
    currentUserNickname: string;
}

// 🔹 "내가 아닌 다른 유저"의 팔로워/팔로잉 정보를 불러오는 훅
export function useOtherUserFollowStats({
    viewedNickname,
    currentUserNickname,
}: UseOtherUserFollowStatsParams): OtherUserFollowStats | null {
    const [state, setState] = useState<OtherUserFollowStats | null>(null);

    useEffect(() => {
        // 프로필이 열려있지 않거나, 내 닉네임이면 → 이 훅은 사용 안 함
        if (!viewedNickname || viewedNickname === currentUserNickname) {
            setState(null);
            return;
        }

        let cancelled = false;

        const run = async () => {
            try {
                // 로딩 시작
                setState(prev =>
                    prev
                        ? { ...prev, loading: true }
                        : {
                            followerCount: 0,
                            followingCount: 0,
                            followerUsers: [],
                            followingUsers: [],
                            loading: true,
                        },
                );

                // 1) nickname 으로 해당 유저의 uid 찾기
                const usersRef = collection(db, "users");
                const q = query(usersRef, where("nickname", "==", viewedNickname));
                const snap = await getDocs(q);
                if (cancelled) return;

                if (snap.empty) {
                    console.warn("[follow] 대상 유저를 찾을 수 없습니다:", viewedNickname);
                    setState({
                        followerCount: 0,
                        followingCount: 0,
                        followerUsers: [],
                        followingUsers: [],
                        loading: false,
                    });
                    return;
                }

                const docSnap = snap.docs[0];
                const data = docSnap.data() as any;
                const targetUid = data.uid ?? docSnap.id;

                // 2) 해당 uid 기준 팔로우 스냅샷 가져오기
                const followSnapshot = await getFollowSnapshotForUser(targetUid);
                if (cancelled) return;

                const followerCount = followSnapshot.followerCount ?? 0;
                const followingNicknames: string[] =
                    followSnapshot.followingNicknames ?? [];

                // 3) 팔로워 닉네임 목록도 별도로 가져오기
                const followerNicknames = await getFollowersNicknamesForUser(targetUid);
                if (cancelled) return;

                setState({
                    followerCount,
                    followingCount: followingNicknames.length,
                    followerUsers: Array.isArray(followerNicknames)
                        ? followerNicknames
                        : [],
                    followingUsers: followingNicknames,
                    loading: false,
                });
            } catch (error) {
                if (!cancelled) {
                    console.error("[follow] 다른 유저 팔로우 정보 로딩 실패:", error);
                    setState({
                        followerCount: 0,
                        followingCount: 0,
                        followerUsers: [],
                        followingUsers: [],
                        loading: false,
                    });
                }
            }
        };

        run();

        return () => {
            cancelled = true;
        };
    }, [viewedNickname, currentUserNickname]);

    return state;
}
