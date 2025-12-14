// src/core/qnaEngine.ts

// 유저를 간단히 구분하기 위한 아이디 타입
export type UserId = "userA" | "userB" | "userC";

// 유저가 가지고 있는 통계 정보들
export interface UserStats {
    id: UserId;
    name: string;
    questionCount: number;      // 내가 쓴 질문 수
    answerCount: number;        // 내가 쓴 답변 수
    lanternReceived: number;    // 내가 받은 등불(좋아요) 수
    guideCount: number;         // 내가 길잡이로 선정된 횟수
    achievements: string[];     // 내가 따낸 업적 이름들
}

export interface Question {
    id: string;
    authorId: UserId;
    title: string;
}

export interface Answer {
    id: string;
    questionId: string;
    authorId: UserId;
    lanternCount: number;       // 이 답변이 받은 등불 수
    isGuide: boolean;           // 이 답변이 길잡이인지 여부
}

// 전체 Q&A 상태
export interface QnaState {
    users: Record<UserId, UserStats>;
    questions: Question[];
    answers: Answer[];
}

// --------------------------------------
// 1. 초기 상태 만들기
// --------------------------------------

export function createInitialState(): QnaState {
    const users: Record<UserId, UserStats> = {
        userA: {
            id: "userA",
            name: "A유저",
            questionCount: 0,
            answerCount: 0,
            lanternReceived: 0,
            guideCount: 0,
            achievements: [],
        },
        userB: {
            id: "userB",
            name: "B유저",
            questionCount: 0,
            answerCount: 0,
            lanternReceived: 0,
            guideCount: 0,
            achievements: [],
        },
        userC: {
            id: "userC",
            name: "C유저",
            questionCount: 0,
            answerCount: 0,
            lanternReceived: 0,
            guideCount: 0,
            achievements: [],
        },
    };

    return {
        users,
        questions: [],
        answers: [],
    };
}

// --------------------------------------
// 2. Q&A 행동(질문/답변/등불/길잡이)
// --------------------------------------

// 질문 작성
export function simulateQuestion(
    state: QnaState,
    authorId: UserId,
    title: string
): string {
    const id = `q_${state.questions.length + 1}`;

    state.questions.push({
        id,
        authorId,
        title,
    });

    state.users[authorId].questionCount += 1;

    return id;
}

// 답변 작성
export function simulateAnswer(
    state: QnaState,
    authorId: UserId,
    questionId: string,
    _content: string
): string {
    const id = `a_${state.answers.length + 1}`;

    state.answers.push({
        id,
        questionId,
        authorId,
        lanternCount: 0,
        isGuide: false,
    });

    state.users[authorId].answerCount += 1;

    return id;
}

// 등불(좋아요) 받기
export function simulateLantern(
    state: QnaState,
    _giverId: UserId,
    answerId: string
): void {
    const answer = state.answers.find((a) => a.id === answerId);
    if (!answer) return;

    answer.lanternCount += 1;
    state.users[answer.authorId].lanternReceived += 1;
}

// 길잡이로 선택
export function simulateGuideSelection(
    state: QnaState,
    answerId: string
): void {
    const answer = state.answers.find((a) => a.id === answerId);
    if (!answer) return;

    // 같은 질문의 다른 답변들은 길잡이 해제
    state.answers.forEach((a) => {
        if (a.questionId === answer.questionId) {
            a.isGuide = false;
        }
    });

    // 이 답변만 길잡이로 설정
    answer.isGuide = true;
    state.users[answer.authorId].guideCount += 1;
}

// --------------------------------------
// 3. 업적 시스템 (간단 버전)
// --------------------------------------

export function checkAchievementsForUser(user: UserStats): string[] {
    const unlocked: string[] = [];

    function unlock(name: string, condition: boolean) {
        if (condition && !user.achievements.includes(name)) {
            user.achievements.push(name);
            unlocked.push(name);
        }
    }

    // 기본 예시 업적들
    unlock("첫 질문 작성", user.questionCount >= 1);
    unlock("첫 답변 작성", user.answerCount >= 1);
    unlock("첫 등불 받기", user.lanternReceived >= 1);
    unlock("첫 길잡이 선정", user.guideCount >= 1);

    return unlocked;
}

export function checkAllAchievements(state: QnaState): Record<UserId, string[]> {
    const result: Record<UserId, string[]> = {
        userA: [],
        userB: [],
        userC: [],
    };

    (Object.values(state.users) as UserStats[]).forEach((user) => {
        result[user.id] = checkAchievementsForUser(user);
    });

    return result;
}

// --------------------------------------
// 4. 현재 랭킹: 등불 랭킹 / 길잡이 랭킹
//    (점수는 아예 안 씀)
// --------------------------------------

// 등불 많이 받은 순 랭킹
export function getLanternRanking(state: QnaState): UserStats[] {
    return (Object.values(state.users) as UserStats[])
        .slice()
        .sort((a, b) => b.lanternReceived - a.lanternReceived);
}

// 길잡이 많이 된 순 랭킹
export function getGuideRanking(state: QnaState): UserStats[] {
    return (Object.values(state.users) as UserStats[])
        .slice()
        .sort((a, b) => {
            // 1순위: 길잡이 횟수
            if (b.guideCount !== a.guideCount) {
                return b.guideCount - a.guideCount;
            }
            // 2순위: 받은 등불 수 (동점일 때 정렬용)
            return b.lanternReceived - a.lanternReceived;
        });
}
