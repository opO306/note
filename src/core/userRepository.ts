// src/core/userRepository.ts
//
// Firestore 기반 유저/팔로우 관련 읽기/쓰기 모듈
// - 다른 화면에서는 이 모듈만 통해서 팔로우 정보를 읽고/수정하도록 해서
//   localStorage 의존도를 줄이고, 서버를 단일 진실 소스로 사용한다.

import { db } from "@/firebase";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    runTransaction,
    serverTimestamp,
} from "firebase/firestore";

/** 기본 유저 프로필(필요 최소 정보) */
export interface BasicUserProfile {
    uid: string;
    nickname: string;
    photoURL?: string;
}

/**
 * 현재 로그인 유저 기준 팔로우 스냅샷
 * - followerCount: 나를 팔로우하는 사람 수
 * - followingCount: 내가 팔로우하는 사람 수
 * - followingNicknames: 내가 팔로우하는 사람들의 닉네임 목록
 */
export interface FollowSnapshot {
    followerCount: number;
    followingCount: number;
    followingNicknames: string[];
}

export interface ToggleFollowParams {
    currentUid: string;
    currentNickname: string;
    targetNickname: string;
}

export interface ToggleFollowResult {
    /** 토글 후 최종적으로 팔로우 중인지 여부 */
    isFollowing: boolean;
    /** 토글 이후, 현재 로그인 유저 기준 팔로워/팔로잉 수 */
    followerCount: number;
    followingCount: number;
}

// 내부 유틸: 닉네임으로 유저 찾기 (닉네임은 유니크라는 전제)
async function findUserByNickname(
    nickname: string,
): Promise<BasicUserProfile | null> {
    if (!nickname) return null;

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("nickname", "==", nickname));
    const snap = await getDocs(q);

    if (snap.empty) return null;

    const docSnap = snap.docs[0];
    const data = docSnap.data() as any;

    return {
        uid: docSnap.id,
        nickname: (data?.nickname as string) ?? nickname,
        photoURL: (data?.photoURL as string) ?? "",
    };
}

/**
 * 특정 유저(uid)의 팔로우 관련 통계를 가져온다.
 * - users/{uid} 문서의 followerCount, followingCount를 읽고
 * - follows 컬렉션에서 내가 팔로우한 닉네임 목록을 가져온다.
 */
export async function getFollowSnapshotForUser(
    uid: string,
): Promise<FollowSnapshot> {
    if (!uid) {
        return { followerCount: 0, followingCount: 0, followingNicknames: [] };
    }

    // 1) users/{uid} 통계 읽기
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    const userData = (userSnap.exists() ? (userSnap.data() as any) : {}) ?? {};

    const followerCount =
        typeof userData.followerCount === "number" ? userData.followerCount : 0;
    const followingCount =
        typeof userData.followingCount === "number" ? userData.followingCount : 0;

    // 2) follows 컬렉션에서 내가 팔로우한 사람들 닉네임 목록 조회
    const followsRef = collection(db, "follows");
    const q = query(followsRef, where("followerUid", "==", uid));
    const followsSnap = await getDocs(q);

    const nicknameSet = new Set<string>();
    followsSnap.forEach((docSnap) => {
        const d = docSnap.data() as any;
        const nickname = d?.followingNickname as string | undefined;
        if (nickname) nicknameSet.add(nickname);
    });

    return {
        followerCount,
        followingCount,
        followingNicknames: Array.from(nicknameSet),
    };
}

/**
 * 팔로우 토글 (현재 로그인 유저 기준)
 * - follows/{followerUid}_{targetUid} 문서를 기준으로
 *   존재하면 언팔로우, 없으면 팔로우.
 * - 동시에 users/{currentUid}, users/{targetUid} 의
 *   followingCount, followerCount 를 함께 갱신한다.
 */
export async function toggleFollowByNickname(
    params: ToggleFollowParams,
): Promise<ToggleFollowResult> {
    const { currentUid, currentNickname, targetNickname } = params;

    if (!currentUid) {
        throw new Error("CURRENT_USER_REQUIRED");
    }
    if (!targetNickname) {
        throw new Error("TARGET_NICKNAME_REQUIRED");
    }
    if (currentNickname === targetNickname) {
        // 자기 자신은 팔로우할 수 없음
        return {
            isFollowing: false,
            followerCount: 0,
            followingCount: 0,
        };
    }

    // 1) 닉네임으로 상대 유저 조회
    const targetUser = await findUserByNickname(targetNickname);
    if (!targetUser) {
        throw new Error("TARGET_USER_NOT_FOUND");
    }

    const followerRef = doc(db, "users", currentUid);
    const followingRef = doc(db, "users", targetUser.uid);
    const followDocId = `${currentUid}_${targetUser.uid}`;
    const followRef = doc(db, "follows", followDocId);

    // 2) 트랜잭션으로 팔로우/언팔로우 + 카운트 동기화
    const result = await runTransaction(db, async (transaction) => {
        const [followSnap, followerSnap, followingSnap] = await Promise.all([
            transaction.get(followRef),
            transaction.get(followerRef),
            transaction.get(followingRef),
        ]);

        const followerData =
            (followerSnap.exists() ? (followerSnap.data() as any) : {}) ?? {};
        const followingData =
            (followingSnap.exists() ? (followingSnap.data() as any) : {}) ?? {};

        let followerCount =
            typeof followerData.followerCount === "number"
                ? followerData.followerCount
                : 0;
        let followingCount =
            typeof followerData.followingCount === "number"
                ? followerData.followingCount
                : 0;
        let targetFollowerCount =
            typeof followingData.followerCount === "number"
                ? followingData.followerCount
                : 0;

        if (followSnap.exists()) {
            // 이미 팔로우 중 → 언팔로우
            transaction.delete(followRef);

            followingCount = Math.max(0, followingCount - 1);
            targetFollowerCount = Math.max(0, targetFollowerCount - 1);

            transaction.set(
                followerRef,
                {
                    followingCount,
                },
                { merge: true },
            );
            transaction.set(
                followingRef,
                {
                    followerCount: targetFollowerCount,
                },
                { merge: true },
            );

            return {
                isFollowing: false,
                followerCount: followerCount, // 현재 로그인 유저의 팔로워 수(변동 없음)
                followingCount,
            } satisfies ToggleFollowResult;
        }

        // 아직 팔로우가 아닌 경우 → 새로 팔로우
        followingCount += 1;
        targetFollowerCount += 1;

        transaction.set(followRef, {
            followerUid: currentUid,
            followerNickname: currentNickname,
            followingUid: targetUser.uid,
            followingNickname: targetUser.nickname,
            createdAt: serverTimestamp(),
        });

        transaction.set(
            followerRef,
            {
                followingCount,
            },
            { merge: true },
        );
        transaction.set(
            followingRef,
            {
                followerCount: targetFollowerCount,
            },
            { merge: true },
        );

        return {
            isFollowing: true,
            followerCount: followerCount, // 현재 로그인 유저 기준 팔로워 수는 변동 없음
            followingCount,
        } satisfies ToggleFollowResult;
    });

    return result;
}

/**
 * 
 * 특정 유저(uid)를 팔로우하고 있는 사람들의 닉네임 목록을 가져온다.
 * - follows 컬렉션에서 followingUid == uid 인 문서를 조회하고
 * - followerNickname 필드를 모아서 반환한다.
 */
export async function getFollowersNicknamesForUser(uid: string): Promise<string[]> {
    if (!uid) return [];

    const followsRef = collection(db, "follows");
    const q = query(followsRef, where("followingUid", "==", uid));
    const snap = await getDocs(q);

    const nicknameSet = new Set<string>();
    snap.forEach((docSnap) => {
        const d = docSnap.data() as any;
        const nickname = d?.followerNickname as string | undefined;
        if (nickname) nicknameSet.add(nickname);
    });

    return Array.from(nicknameSet);
}
