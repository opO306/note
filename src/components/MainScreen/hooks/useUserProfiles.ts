// MainScreen/hooks/useUserProfiles.ts
// 여러 컴포넌트에서 사람(유저) 정보를 편하게, 실시간으로 가져다 쓰기 위한 공통 훅

import { useEffect, useState } from "react";
import { auth, db } from "@/firebase";
import { doc, onSnapshot, collection, query, where } from "firebase/firestore";

// 화면에서 쓰기 편하게 만들어 둔 "가벼운 유저 정보" 타입
export interface UserProfileLite {
    nickname: string;
    profileImage: string | null;
    currentTitleId: string | null;
    profileDescription: string | null;
    role: "admin" | "user";
}

// 내부 캐시용 타입
interface InternalUserProfile extends UserProfileLite {
    // 필요하면 나중에 필드를 더 늘리기 쉽도록 분리
    // (지금은 UserProfileLite + role 그대로 사용)
}

// 🔹 모듈 전체에서 공유하는 캐시와 구독 관리 맵
//    - 같은 UID에 대해 여러 번 훅을 써도, 실제 Firestore 구독은 1번만
const userProfileCache = new Map<string, InternalUserProfile>();
const userUnsubscribeMap = new Map<string, () => void>();
let globalListenerCount = 0;

/**
 * 여러 UID에 대한 유저 정보를 실시간으로 가져오는 훅
 * @param uids 화면에서 필요한 UID 배열 (중복/undefined 포함 가능)
 * @returns { [uid]: UserProfileLite } 형태의 객체
 */
export function useUserProfiles(rawUids: (string | null | undefined)[]) {
    // 1) 깨끗한 UID 배열로 정리 (null/undefined 제거 + 중복 제거)
    const uniqueUids = Array.from(
        new Set(
            (rawUids || []).filter(
                (uid): uid is string => typeof uid === "string" && uid.length > 0
            )
        )
    );

    // 2) 이 훅을 쓰는 컴포넌트 전용 "뷰" 상태
    const [profiles, setProfiles] = useState<Record<string, UserProfileLite>>({});

    useEffect(() => {
        if (uniqueUids.length === 0) {
            setProfiles({});
            return;
        }

        let isCancelled = false;

        // 🔹 3) 필요한 UID들에 대해, 캐시에 이미 있으면 그대로 사용
        const nextProfiles: Record<string, UserProfileLite> = {};
        uniqueUids.forEach((uid) => {
            const cached = userProfileCache.get(uid);
            if (cached) {
                nextProfiles[uid] = {
                    nickname: cached.nickname,
                    profileImage: cached.profileImage,
                    currentTitleId: cached.currentTitleId,
                    profileDescription: cached.profileDescription,
                    // 🔹 캐시에서 role도 함께 전달
                    role: cached.role,
                };
            }
        });

        setProfiles(nextProfiles);

        // 🔹 4) 아직 구독 안 된 UID들에 대해서만 Firestore 구독 시작
        uniqueUids.forEach((uid) => {
            if (userUnsubscribeMap.has(uid)) {
                // 이미 구독 중이면 패스
                return;
            }

            const userRef = doc(db, "users", uid);
            const unsubscribe = onSnapshot(
                userRef,
                (snap) => {
                    if (!snap.exists()) {
                        // 문서가 없다면 캐시에서 제거
                        userProfileCache.delete(uid);
                    } else {
                        const data = snap.data() as any;

                        const profile: InternalUserProfile = {
                            nickname: typeof data.nickname === "string" ? data.nickname : "",
                            profileImage:
                                typeof data.profileImage === "string"
                                    ? data.profileImage
                                    : null,
                            currentTitleId:
                                typeof data.currentTitle === "string"
                                    ? data.currentTitle
                                    : null,
                            profileDescription:
                                typeof data.profileDescription === "string"
                                    ? data.profileDescription
                                    : null,
                            // 🔹 role 파싱 (문서에 없으면 기본값 "user")
                            role:
                                data.role === "admin" || data.role === "user"
                                    ? data.role
                                    : "user",
                        };

                        userProfileCache.set(uid, profile);
                    }

                    // 캐시가 바뀌었으니, 이 훅을 쓰는 컴포넌트에도 반영
                    if (!isCancelled) {
                        const updated: Record<string, UserProfileLite> = {};
                        uniqueUids.forEach((u) => {
                            const cached = userProfileCache.get(u);
                            if (cached) {
                                updated[u] = {
                                    nickname: cached.nickname,
                                    profileImage: cached.profileImage,
                                    currentTitleId: cached.currentTitleId,
                                    profileDescription: cached.profileDescription,
                                    // 🔹 role도 함께 전달
                                    role: cached.role,
                                };
                            }
                        });
                        setProfiles(updated);

                    }
                },
                (error) => {
                    console.error("[useUserProfiles] users 문서 구독 에러:", error);
                }
            );

            userUnsubscribeMap.set(uid, unsubscribe);
            globalListenerCount += 1;
        });

        // 🔹 5) 이 훅을 쓰는 컴포넌트가 언마운트 될 때
        return () => {
            isCancelled = true;

            // 여기서는 구독을 바로 끊지 않고, 전역 캐시/구독은 유지합니다.
            // 만약 UID 별로 구독을 정리하고 싶다면,
            // "완전히 아무 곳에서도 쓰지 않을 때"를 추적하는 추가 로직이 필요합니다.
            // (지금은 단순화: 캐시용으로 계속 유지)
        };
    }, [uniqueUids.join("|")]);

    return profiles;
}

/**
 * 현재 로그인한 유저의 "Lite" 프로필을 가져오는 간단한 훅
 * - 필요할 때만 쓰면 됨 (예: 마이페이지 등)
 */
export function useCurrentUserProfileLite() {
    const uid = auth.currentUser?.uid ?? null;
    const profiles = useUserProfiles(uid ? [uid] : []);
    if (!uid) {
        return null;
    }
    return profiles[uid] ?? null;
}
/** 프로필 소개까지 포함한 유저 정보 타입 */
export interface UserProfileWithDescription extends UserProfileLite {
    profileDescription: string | null;
}

/**
 * 닉네임 하나로 users 컬렉션을 실시간(onSnapshot) 구독하는 훅
 * - 다른 유저 프로필 화면에서 사용
 */
export function useUserProfileByNickname(nickname?: string | null) {
    const [profile, setProfile] = useState<UserProfileWithDescription | null>(null);

    useEffect(() => {
        if (!nickname) {
            setProfile(null);
            return;
        }

        const usersRef = collection(db, "users");
        const q = query(usersRef, where("nickname", "==", nickname));

        const unsubscribe = onSnapshot(
            q,
            (snap) => {
                if (snap.empty) {
                    setProfile(null);
                    return;
                }

                const docData = snap.docs[0].data() as any;

                setProfile({
                    nickname:
                        typeof docData.nickname === "string" ? docData.nickname : "",
                    profileImage:
                        typeof docData.profileImage === "string"
                            ? docData.profileImage
                            : null,
                    currentTitleId:
                        typeof docData.currentTitle === "string"
                            ? docData.currentTitle
                            : null,
                    profileDescription:
                        typeof docData.profileDescription === "string"
                            ? docData.profileDescription
                            : null,
                    // 🔹 여기에서도 role 포함
                    role:
                        docData.role === "admin" || docData.role === "user"
                            ? docData.role
                            : "user",
                });

            },
            (error) => {
                console.error(
                    "[useUserProfileByNickname] users 문서 구독 에러:",
                    error
                );
            }
        );

        return () => {
            unsubscribe();
        };
    }, [nickname]);

    return profile;
}
