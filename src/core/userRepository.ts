// src/core/userRepository.ts
//
// Firestore 기반 유저/팔로우 관련 읽기/쓰기 모듈
// - Cloud Function 의존성을 제거하고 Firestore 직접 쓰기로 변경하여 모바일 안정성 확보

import { db, auth } from "@/firebase"; // auth 추가 필수
// functions, httpsCallable 제거 (사용하지 않음)
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    runTransaction,
    serverTimestamp,
    setDoc     // setDoc 추가
} from "firebase/firestore";

/** 기본 유저 프로필(필요 최소 정보) */
export interface BasicUserProfile {
    uid: string;
    nickname: string;
    photoURL?: string;
}

/**
 * 현재 로그인 유저 기준 팔로우 스냅샷
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
    isFollowing: boolean;
    followerCount: number;
    followingCount: number;
}

// 닉네임 설정 (Cloud Function 제거 -> Firestore 직접 쓰기)
export async function setNicknameServer(nickname: string): Promise<string> {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("로그인이 필요합니다.");
    }

    // setDoc + merge로 안전하게 업데이트
    await setDoc(doc(db, "users", user.uid), {
        nickname: nickname,
        nicknameLower: nickname.toLowerCase(), // 검색용
        updatedAt: serverTimestamp()
    }, { merge: true });

    return nickname;
}

// 온보딩 완료 플래그 저장 (Cloud Function 제거 -> Firestore 직접 쓰기)
// 🚨 여기가 문제였던 부분입니다. 이제 Firestore에 직접 저장하므로 성공할 것입니다.
export async function completeOnboardingServer(): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("로그인이 필요합니다.");
    }

    // setDoc with merge: true를 사용하여 문서가 없어도 생성하고, 있으면 업데이트
    await setDoc(doc(db, "users", user.uid), {
        onboardingComplete: true,
        updatedAt: serverTimestamp(),
    }, { merge: true });
}

// 내부 유틸: 닉네임으로 유저 찾기
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
 * 팔로우 토글
 */
export async function toggleFollowByNickname(
    params: ToggleFollowParams,
): Promise<ToggleFollowResult> {
    const { currentUid, currentNickname, targetNickname } = params;

    if (!currentUid) throw new Error("CURRENT_USER_REQUIRED");
    if (!targetNickname) throw new Error("TARGET_NICKNAME_REQUIRED");
    if (currentNickname === targetNickname) {
        return { isFollowing: false, followerCount: 0, followingCount: 0 };
    }

    const targetUser = await findUserByNickname(targetNickname);
    if (!targetUser) throw new Error("TARGET_USER_NOT_FOUND");

    const followDocId = `${currentUid}_${targetUser.uid}`;
    const followRef = doc(db, "follows", followDocId);

    const result = await runTransaction(db, async (transaction) => {
        const followSnap = await transaction.get(followRef);

        if (followSnap.exists()) {
            transaction.delete(followRef);
            return { isFollowing: false, followerCount: 0, followingCount: 0 };
        }

        transaction.set(followRef, {
            followerUid: currentUid,
            followerNickname: currentNickname,
            followingUid: targetUser.uid,
            followingNickname: targetUser.nickname,
            createdAt: serverTimestamp(),
        });

        return { isFollowing: true, followerCount: 0, followingCount: 0 };
    });

    return result;
}

/**
 * 특정 유저(uid)를 팔로우하고 있는 사람들의 닉네임 목록
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