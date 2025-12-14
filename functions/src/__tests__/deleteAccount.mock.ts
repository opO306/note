/**
 * 간이 시뮬레이션 테스트
 * - 실제 Firestore/Functions 호출 없이 메모리에서 deleteAccount 로직을 모사해
 *   기대 동작(닉네임 익명화, 팔로우 삭제, 댓글/글 작성자 익명화)을 검증합니다.
 * - 실행: `npx ts-node functions/src/__tests__/deleteAccount.mock.ts`
 */

type Post = {
  id: string;
  authorUid: string | null;
  authorId?: string | null;
  authorNickname: string;
  authorDeleted?: boolean;
  title: string;
  content: string;
  replies?: Reply[];
};

type Reply = {
  id: string;
  authorUid: string | null;
  authorNickname: string;
  authorDeleted?: boolean;
  content: string;
};

type Follow = { id: string; followerUid: string; followingUid: string };

const DELETED_USER_NAME = "탈퇴한 사용자";

function simulateDeleteAccount({
  uid,
  users,
  follows,
  posts,
}: {
  uid: string;
  users: Map<string, any>;
  follows: Map<string, Follow>;
  posts: Map<string, Post>;
}) {
  // 1) users/{uid} 익명 처리
  const userDoc = users.get(uid) || {};
  users.set(uid, {
    ...userDoc,
    nickname: DELETED_USER_NAME,
    displayName: DELETED_USER_NAME,
    photoURL: null,
    bio: "",
    isDeleted: true,
    deletedAt: "serverTimestamp",
    email: undefined, // 삭제되었다고 가정
  });

  // 2) follows 컬렉션 삭제
  for (const [id, f] of Array.from(follows.entries())) {
    if (f.followerUid === uid || f.followingUid === uid) {
      follows.delete(id);
    }
  }

  // 3) posts/replies 익명 처리
  for (const [id, post] of posts.entries()) {
    let changed = false;
    if (post.authorUid === uid || post.authorId === uid) {
      post.authorUid = null;
      post.authorId = null;
      post.authorNickname = DELETED_USER_NAME;
      post.authorDeleted = true;
      changed = true;
    }

    if (Array.isArray(post.replies)) {
      let repliesChanged = false;
      post.replies = post.replies.map((r) => {
        if (r.authorUid === uid) {
          repliesChanged = true;
          return {
            ...r,
            authorUid: null,
            authorNickname: DELETED_USER_NAME,
            authorDeleted: true,
          };
        }
        return r;
      });
      changed = changed || repliesChanged;
    }

    if (changed) {
      posts.set(id, post);
    }
  }
}

// ────────────────── 테스트 데이터 ──────────────────
const uid = "user-1";

const users = new Map<string, any>([
  [uid, { nickname: "원래닉네임", displayName: "원래닉네임", email: "u1@test.com" }],
]);

const follows = new Map<string, Follow>([
  ["f1", { id: "f1", followerUid: uid, followingUid: "user-2" }],
  ["f2", { id: "f2", followerUid: "user-3", followingUid: uid }],
  ["f3", { id: "f3", followerUid: "user-2", followingUid: "user-3" }], // 남아야 함
]);

const posts = new Map<string, Post>([
  [
    "p1",
    {
      id: "p1",
      authorUid: uid,
      authorNickname: "원래닉네임",
      title: "제목1",
      content: "본문1",
      replies: [
        { id: "r1", authorUid: uid, authorNickname: "원래닉네임", content: "내 댓글" },
        { id: "r2", authorUid: "user-2", authorNickname: "다른닉", content: "다른 사람" },
      ],
    },
  ],
  [
    "p2",
    {
      id: "p2",
      authorUid: "user-2",
      authorNickname: "다른닉",
      title: "제목2",
      content: "본문2",
      replies: [{ id: "r3", authorUid: uid, authorNickname: "원래닉네임", content: "또 내 댓글" }],
    },
  ],
]);

simulateDeleteAccount({ uid, users, follows, posts });

// ────────────────── 검증 ──────────────────
const assert = (cond: boolean, msg: string) => {
  if (!cond) throw new Error(msg);
};

// users 익명화
const userAfter = users.get(uid);
assert(userAfter.nickname === DELETED_USER_NAME, "유저 닉네임 익명화 실패");
assert(userAfter.isDeleted === true, "isDeleted 플래그 누락");

// follows 삭제 (uid 연관 문서만)
assert(!follows.has("f1"), "followerUid 매치 삭제 실패");
assert(!follows.has("f2"), "followingUid 매치 삭제 실패");
assert(follows.has("f3"), "무관한 팔로우가 삭제되면 안 됨");

// posts/replies 익명화
const p1 = posts.get("p1")!;
assert(p1.authorNickname === DELETED_USER_NAME, "게시글 작성자 익명화 실패");
assert(p1.authorUid === null, "게시글 authorUid null 처리 실패");
assert(p1.replies?.[0].authorNickname === DELETED_USER_NAME, "내 댓글 익명화 실패");
assert(p1.replies?.[0].authorUid === null, "내 댓글 authorUid null 처리 실패");
assert(p1.replies?.[1].authorNickname === "다른닉", "타인 댓글 변형되면 안 됨");

const p2 = posts.get("p2")!;
assert(p2.replies?.[0].authorNickname === DELETED_USER_NAME, "다른 글에 달린 내 댓글 익명화 실패");

console.log("✅ deleteAccount 모의 테스트 통과");
