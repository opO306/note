// MainScreen/hooks/useUserProfiles.ts

import { useEffect, useMemo, useState, useCallback } from "react";
import { auth, db } from "@/firebase";
import { doc, getDoc, collection, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// 🔹 화면용 타입 정의
export interface UserProfileLite {
    nickname: string;
    profileImage: string | null;
    currentTitleId: string | null;
    profileDescription: string | null;
    role: "admin" | "user";
}

export interface UserProfileWithDescription extends UserProfileLite {
    profileDescription: string | null;
}

// 🔹 전역 상태 관리 (Global State)
const userProfileCache = new Map<string, UserProfileLite>();
const firestoreUnsubscribers = new Map<string, () => void>();
const componentListeners = new Map<string, Set<() => void>>();
const lastAccessMap = new Map<string, number>();

// 🔹 설정값
const MAX_CACHE_ENTRIES = 50;
const STALE_MS = 5 * 60 * 1000;
const PROFILE_POLLING_INTERVAL = 60000; // 60초 폴링 (데이터 절약)

// 🔹 인증 초기화 상태 추적
let globalAuthReady = false;
const authReadyListeners = new Set<() => void>();

if (typeof window !== 'undefined') {
    onAuthStateChanged(auth, (user) => {
        globalAuthReady = true;
        authReadyListeners.forEach((listener) => listener());

        if (!user) {
            firestoreUnsubscribers.forEach((unsub) => unsub());
            firestoreUnsubscribers.clear();
            userProfileCache.clear();
            lastAccessMap.clear();
            componentListeners.forEach((listeners) => {
                listeners.forEach((notify) => notify());
            });
        }
    });
}

// 🔹 캐시 관리 함수들
function touchCache(uid: string) {
    lastAccessMap.set(uid, Date.now());
    const cached = userProfileCache.get(uid);
    if (cached) {
        userProfileCache.delete(uid);
        userProfileCache.set(uid, cached);
    }
}

function evictCacheIfNeeded() {
    if (userProfileCache.size <= MAX_CACHE_ENTRIES) return;
    for (const uid of userProfileCache.keys()) {
        if (userProfileCache.size <= MAX_CACHE_ENTRIES) break;
        if (componentListeners.get(uid)?.size ?? 0 > 0) continue;
        userProfileCache.delete(uid);
        lastAccessMap.delete(uid);
        const unsub = firestoreUnsubscribers.get(uid);
        if (unsub) { unsub(); firestoreUnsubscribers.delete(uid); }
    }
}

function cleanupIdleSubscribers() {
    const now = Date.now();
    for (const [uid, lastUsed] of lastAccessMap.entries()) {
        if ((componentListeners.get(uid)?.size ?? 0) > 0) continue;
        if (now - lastUsed > STALE_MS) {
            userProfileCache.delete(uid);
            lastAccessMap.delete(uid);
            const unsub = firestoreUnsubscribers.get(uid);
            if (unsub) { unsub(); firestoreUnsubscribers.delete(uid); }
        }
    }
}

let cleanupTimer: NodeJS.Timeout | null = null;
function ensureCleanupTimer() {
    if (!cleanupTimer && typeof window !== 'undefined') {
        cleanupTimer = setInterval(cleanupIdleSubscribers, STALE_MS);
    }
}

// 🔹 Firestore 조회 로직 (폴링 방식 - 데이터 절약)
async function fetchProfileFromFirestore(uid: string): Promise<void> {
    if (!auth.currentUser) return; // 로그인 체크

    try {
        const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);

        touchCache(uid);
        if (!snap.exists()) {
            userProfileCache.delete(uid);
        } else {
            const data = snap.data() as any;

            // 🔹 프로필 이미지 결정 로직
            // - 1순위: 우리가 관리하는 커스텀 이미지(profileImage)
            // - 2순위: Firestore photoURL 중에서 "구글 기본 이미지가 아닌 것"만 허용
            // - 그 외에는 null → UI에서 Dicebear/API 기본 아바타 사용
            let profileImage: string | null = null;

            if (typeof data.profileImage === "string" && data.profileImage) {
                profileImage = data.profileImage;
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
                    profileImage = photoUrl;
                }
            }

            const profile: UserProfileLite = {
                nickname: typeof data.nickname === "string" ? data.nickname : "알 수 없음",
                profileImage,
                currentTitleId: typeof data.currentTitle === "string" ? data.currentTitle : null,
                profileDescription: typeof data.profileDescription === "string" ? data.profileDescription : null,
                role: (data.role === "admin" || data.role === "user") ? data.role : "user",
            };
            userProfileCache.set(uid, profile);
        }
        evictCacheIfNeeded();
        const listeners = componentListeners.get(uid);
        if (listeners) listeners.forEach((notify) => notify());
    } catch (error: any) {
        if (error?.code === 'permission-denied') {
            firestoreUnsubscribers.delete(uid);
            return;
        }
        // 사용자 프로필 조회 실패 (로그 제거)
    }
}

// 🔹 폴링 구독 로직 (데이터 절약을 위해 onSnapshot 대신 사용)
function subscribeToFirestore(uid: string) {
    if (firestoreUnsubscribers.has(uid)) return;
    if (!auth.currentUser) return; // 로그인 체크

    // 즉시 한 번 조회
    fetchProfileFromFirestore(uid);

    // 60초마다 폴링
    const intervalId = setInterval(() => {
        fetchProfileFromFirestore(uid);
    }, PROFILE_POLLING_INTERVAL);

    firestoreUnsubscribers.set(uid, () => {
        clearInterval(intervalId);
    });
}

/**
 * 🔹 메인 훅: useUserProfiles
 */
export function useUserProfiles(rawUids: (string | null | undefined)[]) {
    ensureCleanupTimer();

    // 1. [Fix] 입력된 배열이 매번 새로운 참조여도, 내용이 같으면 같은 키를 생성
    // JSON.stringify나 join을 사용하여 "값"으로 의존성을 관리합니다.
    const safeUids = (rawUids || []).filter((uid): uid is string => typeof uid === "string" && uid.length > 0);
    const uniqueUidsKey = Array.from(new Set(safeUids)).sort().join("|");

    // 2. [Fix] useMemo를 사용하여 key가 바뀔 때만 배열 재생성
    const uniqueUids = useMemo(() => {
        return uniqueUidsKey ? uniqueUidsKey.split("|") : [];
    }, [uniqueUidsKey]);

    // 3. 인증 상태 관리
    const [authReady, setAuthReady] = useState(globalAuthReady);

    // 4. [Fix] currentUser 객체 자체가 아니라 UID 문자열만 의존성으로 사용
    const currentUid = auth.currentUser?.uid;

    useEffect(() => {
        if (globalAuthReady) {
            setAuthReady(true);
            return;
        }
        const onReady = () => setAuthReady(true);
        authReadyListeners.add(onReady);
        return () => { authReadyListeners.delete(onReady); };
    }, []);

    // 5. 스냅샷 생성 함수
    const getSnapshot = useCallback(() => {
        const result: Record<string, UserProfileLite> = {};
        uniqueUids.forEach(uid => {
            const cached = userProfileCache.get(uid);
            if (cached) result[uid] = cached;
        });
        return result;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uniqueUidsKey]); // uniqueUidsKey는 문자열이므로 안전함

    const [profiles, setProfiles] = useState<Record<string, UserProfileLite>>(getSnapshot);

    useEffect(() => {
        // 아직 인증 체크 중이면 아무것도 하지 않고 기존 데이터 유지 (Stale-While-Revalidate)
        if (!authReady) return;

        // 로그인 안 된 상태라도, 굳이 빈 객체로 밀어버리지 않고
        // 캐시에 있는 데이터라도 보여주는 게 UX상 훨씬 부드러움.
        // (어차피 전역 onAuthStateChanged가 로그아웃 시 캐시를 다 지워줌)

        let mounted = true;

        const forceUpdate = () => {
            if (mounted) {
                setProfiles(prev => {
                    const next = getSnapshot();
                    // 얕은 비교 (최적화)
                    let isDifferent = false;
                    const keysA = Object.keys(prev);
                    const keysB = Object.keys(next);
                    if (keysA.length !== keysB.length) isDifferent = true;
                    else {
                        for (const key of keysA) {
                            if (prev[key] !== next[key]) {
                                isDifferent = true;
                                break;
                            }
                        }
                    }
                    return isDifferent ? next : prev;
                });
            }
        };

        uniqueUids.forEach(uid => {
            if (!componentListeners.has(uid)) {
                componentListeners.set(uid, new Set());
            }
            componentListeners.get(uid)!.add(forceUpdate);
            subscribeToFirestore(uid);
            touchCache(uid);
        });

        // 초기 실행
        forceUpdate();

        return () => {
            mounted = false;
            uniqueUids.forEach(uid => {
                const listeners = componentListeners.get(uid);
                if (listeners) {
                    listeners.delete(forceUpdate);
                }
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uniqueUidsKey, authReady, currentUid, getSnapshot]);

    return profiles;
}

/**
 * 로그인한 내 프로필 가져오기
 */
export function useCurrentUserProfileLite() {
    const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUid(user?.uid ?? null);
        });
        return () => unsubscribe();
    }, []);

    const profiles = useUserProfiles(uid ? [uid] : []);
    return uid ? (profiles[uid] ?? null) : null;
}

/**
 * 닉네임으로 유저 찾기
 */
export function useUserProfileByNickname(nickname?: string | null) {
    const [profile, setProfile] = useState<UserProfileWithDescription | null>(null);
    const [authReady, setAuthReady] = useState(globalAuthReady);
    const currentUid = auth.currentUser?.uid;

    useEffect(() => {
        if (globalAuthReady) {
            setAuthReady(true);
            return;
        }
        const onReady = () => setAuthReady(true);
        authReadyListeners.add(onReady);
        return () => { authReadyListeners.delete(onReady); };
    }, []);

    const fetchProfileByNickname = useCallback(async () => {
        if (!authReady || !nickname || !currentUid) {
            setProfile(null);
            return;
        }

        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("nickname", "==", nickname));
            const { getDocs } = await import("firebase/firestore");
            const snap = await getDocs(q);

            if (snap.empty) {
                setProfile(null);
                return;
            }
            const data = snap.docs[0].data() as any;

            // 🔹 프로필 이미지 결정 로직 (닉네임으로 조회할 때도 동일 규칙 적용)
            let profileImage: string | null = null;
            if (typeof data.profileImage === "string" && data.profileImage) {
                profileImage = data.profileImage;
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
                    profileImage = photoUrl;
                }
            }

            setProfile({
                nickname: data.nickname ?? "",
                profileImage,
                currentTitleId: data.currentTitle ?? null,
                profileDescription: data.profileDescription ?? null,
                role: (data.role === "admin" || data.role === "user") ? data.role : "user",
            });
        } catch (error: any) {
            if (error?.code === 'permission-denied') {
                setProfile(null);
                return;
            }
            console.error(error);
        }
    }, [authReady, nickname, currentUid]);

    useEffect(() => {
        fetchProfileByNickname();

        // 60초마다 폴링 (데이터 절약)
        const intervalId = setInterval(fetchProfileByNickname, PROFILE_POLLING_INTERVAL);

        return () => clearInterval(intervalId);
    }, [nickname, authReady, currentUid]);

    return profile;
}