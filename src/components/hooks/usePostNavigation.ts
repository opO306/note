// src/components/hooks/usePostNavigation.ts
import { useCallback } from "react";
import { db } from "../../firebase";
import { doc, updateDoc, increment } from "firebase/firestore";
import { toast } from "@/toastHelper";

interface UsePostNavigationParams {
    posts: any[];
    setPosts: React.Dispatch<React.SetStateAction<any[]>>;
    setSelectedPost: (post: any) => void;
    setShowSearchScreen: (value: boolean) => void;
    setShowNotifications: (value: boolean) => void;
    setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
}

/**
 * 게시글 클릭/검색 결과 선택/알림 클릭 등
 * "게시글 열기"와 관련된 동작을 모아둔 훅입니다.
 *
 * MainScreen.tsx 안에 있던 handlePostClick, handlePostSelectFromSearch,
 * handleNotificationClick 을 그대로 옮겨왔습니다.
 */
export function usePostNavigation({
    posts,
    setPosts,
    setSelectedPost,
    setShowSearchScreen,
    setShowNotifications,
    setNotifications,
}: UsePostNavigationParams) {
    // 🔹 게시글을 눌렀을 때: views +1 하고 상세 화면으로
    const handlePostClick = useCallback(
        (post: any) => {
            const updatedPost = {
                ...post,
                views: (post.views ?? 0) + 1,
            };

            // 1) 상세 화면에 보여줄 selectedPost 업데이트
            setSelectedPost(updatedPost);

            // 2) 메인 posts 리스트에서도 views +1
            setPosts((prev) =>
                prev.map((p) =>
                    String(p.id) === String(post.id)
                        ? { ...p, views: (p.views ?? 0) + 1 }
                        : p,
                ),
            );

            // 3) Firestore posts 문서의 views +1
            if (typeof post.id === "string") {
                const postRef = doc(db, "posts", post.id);
                updateDoc(postRef, {
                    views: increment(1),
                }).catch((error) => {
                    console.error("Firestore 조회수 증가 실패:", error);
                });
            }
        },
        [setPosts, setSelectedPost],
    );

    // 🔹 검색 화면에서 게시글 하나를 선택했을 때
    const handlePostSelectFromSearch = useCallback(
        (post: any) => {
            handlePostClick(post);
            setShowSearchScreen(false);
        },
        [handlePostClick, setShowSearchScreen],
    );

    // 🔹 알림 리스트에서 특정 알림을 눌렀을 때
    const handleNotificationClick = useCallback(
        (notification: any) => {
            const post = posts.find((p) => p.id === notification.postId);
            if (!post) return;

            // 알림을 읽음으로 표시
            setNotifications((prev) =>
                prev.map((n) =>
                    n.id === notification.id ? { ...n, isRead: true } : n,
                ),
            );

            setSelectedPost(post);
            setShowNotifications(false);
            toast.info(`"${post.title}" 글로 이동했습니다`);
        },
        [posts, setNotifications, setSelectedPost, setShowNotifications],
    );

    return {
        handlePostClick,
        handlePostSelectFromSearch,
        handleNotificationClick,
    };
}
