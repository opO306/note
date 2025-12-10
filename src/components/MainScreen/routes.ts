// src/components/MainScreen/routes.ts

// 글 상세가 어디서 열렸는지 (이미 있던 타입 그대로 재사용)
export type PostDetailSource =
    | "home"
    | "myPage"
    | "myPostsList"
    | "myRepliesList"
    | "followList"
    | "userProfilePosts"
    | "userProfileReplies";

// 메인 화면에서 다루는 "화면"들을 전부 하나의 유니온 타입으로 정의
export type MainRoute =
    | { name: "home" }
    | { name: "myPage" }
    | { name: "ranking" }
    | { name: "bookmarks" }
    | { name: "category" }
    | { name: "search" }
    | { name: "titleShop" }
    | { name: "titlesCollection" }
    | { name: "achievements" }
    | { name: "followList"; mode: "followers" | "following" }
    | { name: "myContentList"; mode: "posts" | "replies" }
    | { name: "userProfile"; nickname: string }
    | { name: "adminReports" }
    | {
        name: "postDetail";
        postId: string;
        source: PostDetailSource;
    };
