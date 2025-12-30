import { useCallback } from "react";
import { auth, db, app } from "../../firebase";
import {
    collection,
    addDoc,
    serverTimestamp,
    doc,
    updateDoc,
    increment,
    deleteDoc,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { toast } from "@/toastHelper";

interface UsePostActionsParams {
    userNickname: string | undefined;
    userProfileImage: string | undefined;
    userActivity: any;
    updateActivity: (patch: any) => void;
    posts: any[];
    setPosts: (updater: (prev: any[]) => any[]) => void;
    setCategories: (updater: (prev: any[]) => any[]) => void;
    setShowWriteScreen: (value: boolean) => void;
    setShowSearchScreen: (value: boolean) => void;
    setSelectedPost: (post: any) => void;
    setCurrentScreen: (screen: any) => void;
    setActiveCategory: (categoryId: string) => void;
    setActiveSubCategory: (subCategoryId: string) => void;
}

export function usePostActions({
    userNickname,
    userProfileImage,
    userActivity,
    updateActivity,
    posts,
    setPosts,
    setCategories,
    setShowWriteScreen,
    setShowSearchScreen,
    setSelectedPost,
    setCurrentScreen,
    setActiveCategory,
    setActiveSubCategory,
}: UsePostActionsParams) {
    const handlePostSubmit = useCallback(
        async (postData: {
            title: string;
            content: string;
            category: string;
            subCategory: string;
            type: "question" | "guide";
            tags: string[];
            useSagesBell?: boolean;
        }) => {
            if (!userNickname) {
                toast.error("닉네임 정보를 찾을 수 없습니다. 다시 로그인해주세요.");
                return;
            }

            try {
                // 1. 먼저 Firestore에 저장해서 진짜 문서 ID(docRef.id)를 받는다
                const now = new Date();

                const docRef = await addDoc(collection(db, "posts"), {
                    title: postData.title,
                    content: postData.content,
                    category: postData.category,
                    subCategory: postData.subCategory,
                    type: postData.type,
                    tags: postData.tags,
                    author: userNickname,
                    authorUid: auth.currentUser?.uid ?? null,
                    authorAvatar: userProfileImage || "",
                    createdAt: serverTimestamp(), // 서버 시간
                    lanterns: 0,
                    replies: [],
                    replyCount: 0,
                    comments: 0, // UI 표시용 comments 필드 초기화
                    views: 0,
                    useSagesBell: postData.useSagesBell || false, // 현자의 종 사용 여부
                });

                // 2. docRef.id 를 그대로 써서 화면용 newPost 만들기
                const newPost = {
                    id: docRef.id,
                    title: postData.title,
                    content: postData.content,
                    category: postData.category,
                    subCategory: postData.subCategory,
                    type: postData.type,
                    tags: postData.tags,
                    author: userNickname,
                    authorUid: auth.currentUser?.uid ?? null,
                    authorAvatar: userProfileImage || "",
                    createdAt: now,
                    lanterns: 0,
                    replies: [],
                    replyCount: 0,
                    comments: 0,
                    views: 0,
                    isBookmarked: false,
                    isOwner: true,
                };

                // 3. 화면에 반영
                setPosts((prev) => [newPost, ...prev]);
                setShowWriteScreen(false);
                setShowSearchScreen(false);
                setSelectedPost(newPost);
                setCurrentScreen("home");

                // 4. 카테고리 카운트 업데이트 (원래 로직 그대로)
                setCategories((prevCategories) =>
                    prevCategories.map((cat: any) => {
                        if (cat.id === "전체") {
                            return { ...cat, count: cat.count + 1 };
                        }
                        if (cat.id === postData.category) {
                            return {
                                ...cat,
                                count: cat.count + 1,
                                subCategories: cat.subCategories.map((sub: any) =>
                                    sub.id === "전체" || sub.id === postData.subCategory
                                        ? { ...sub, count: sub.count + 1 }
                                        : sub
                                ),
                            };
                        }
                        return cat;
                    })
                );

                // 5. 업적 업데이트 (원래 로직 그대로)
                if (postData.type === "question") {
                    updateActivity({
                        explorePosts: userActivity.explorePosts + 1,
                    });
                } else if (postData.type === "guide") {
                    updateActivity({
                        sharePosts: userActivity.sharePosts + 1,
                    });
                }

                // 🔹 유저 문서에 글 개수 +1 (통계용)
                const currentUid = auth.currentUser?.uid ?? null;
                if (currentUid) {
                    try {
                        await updateDoc(doc(db, "users", currentUid), {
                            postCount: increment(1),
                        });
                    } catch (err) {
                        console.error("사용자 postCount 증가 실패:", err);
                    }
                }

                // 6. 현자의 종 호출 (질문글이고 useSagesBell이 true일 때만)
                if (postData.type === "question" && postData.useSagesBell) {
                    try {
                        const functions = getFunctions(app, "asia-northeast3");
                        const callSagesBellFn = httpsCallable(functions, "callSagesBell");
                        await callSagesBellFn({
                            postId: docRef.id,
                            categoryId: postData.category,
                            questionTitle: postData.title,
                        });
                        toast.success("현자의 종이 울렸습니다. 고수들의 답변을 기다려주세요!");
                    } catch (error) {
                        console.error("현자의 종 호출 실패:", error);
                        // 실패해도 글 작성은 성공했으므로 에러 토스트는 표시하지 않음
                    }
                }

                // 7. 작성한 카테고리로 이동 + 토스트
                setActiveCategory(postData.category);
                setActiveSubCategory(postData.subCategory);
                toast.success("글이 작성되었습니다!");
            } catch (error) {
                console.error("게시글 Firestore 저장 실패:", error);
                toast.error("글 작성 중 오류가 발생했습니다. 다시 시도해주세요.");
            }
        },
        [
            userNickname,
            userProfileImage,
            userActivity,
            updateActivity,
            setPosts,
            setShowWriteScreen,
            setShowSearchScreen,
            setSelectedPost,
            setCurrentScreen,
            setCategories,
            setActiveCategory,
            setActiveSubCategory,
        ]
    );

    // 게시글 삭제 가능 여부 확인 (30분 이내)
    const canDeletePost = useCallback((post: any) => {
        if (!post.isOwner) return false;
        const createdAt = new Date(post.createdAt);
        const now = new Date();
        const diffInMinutes =
            (now.getTime() - createdAt.getTime()) / (1000 * 60);
        return diffInMinutes <= 30;
    }, []);

    // 게시글 삭제 (Firestore + 로컬 둘 다)
    const handleDeletePost = useCallback(
        async (postId: string | number) => {
            const postIdStr = String(postId);

            const postToDelete = posts.find((p) => String(p.id) === postIdStr);
            const currentUid = auth.currentUser?.uid ?? null;

            if (!postToDelete) {
                toast.error("삭제할 게시글을 찾을 수 없습니다.");
                return;
            }

            // ✅ 한 번 더 안전장치: UID 기반 소유자 확인
            if (
                !currentUid ||
                !postToDelete.authorUid ||
                postToDelete.authorUid !== currentUid
            ) {
                toast.error("이 게시글을 삭제할 권한이 없습니다.");
                return;
            }

            // ✅ 30분 제한도 한 번 더 체크 (실수 방지)
            if (!canDeletePost(postToDelete)) {
                toast.error("작성 후 30분이 지나 삭제할 수 없습니다.");
                return;
            }

            try {
                // 1) Firestore에서 실제 문서 삭제
                await deleteDoc(doc(db, "posts", postIdStr));

                // 2) 로컬 상태에서 삭제
                setPosts((prev) => prev.filter((p) => String(p.id) !== postIdStr));

                // 3) 카테고리 카운트 업데이트
                setCategories((prevCategories) =>
                    prevCategories.map((cat: any) => {
                        if (cat.id === postToDelete.category) {
                            return {
                                ...cat,
                                count: Math.max(0, cat.count - 1),
                                subCategories: cat.subCategories.map((sub: any) =>
                                    sub.id === "전체" || sub.id === postToDelete.subCategory
                                        ? { ...sub, count: Math.max(0, sub.count - 1) }
                                        : sub
                                ),
                            };
                        }
                        return cat;
                    })
                );

                setSelectedPost(null);
                toast.success("게시글이 삭제되었습니다.");
            } catch (error) {
                console.error("Firestore 게시글 삭제 실패:", error);
                toast.error("글 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
            }
        },
        [posts, setPosts, setCategories, setSelectedPost, canDeletePost]
    );

    return {
        handlePostSubmit,
        handleDeletePost,
        canDeletePost,
    };
}
