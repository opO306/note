// src/dev/logicTest.ts

// ✅ QnaState는 타입이니까 이렇게 type 전용 import
import type { QnaState } from "../core/qnaEngine.ts";

// ✅ 나머지는 실제 함수들이라 일반 import
import {
    createInitialState,
    simulateQuestion,
    simulateAnswer,
    simulateLantern,
    simulateGuideSelection,
    checkAllAchievements,
    getLanternRanking,
    getGuideRanking,
} from "../core/qnaEngine";

// 랭킹 출력 함수
function printRanking(stepTitle: string, state: QnaState) {
    console.log("\n==============================");
    console.log(`📊 현재 랭킹 상태 - ${stepTitle}`);
    console.log("==============================");

    console.log("🔹 등불 랭킹 (받은 등불이 많은 순)");
    const lanternRanking = getLanternRanking(state);
    lanternRanking.forEach((user, index) => {
        console.log(
            `${index + 1}위) ${user.name} | 받은 등불:${user.lanternReceived}, 길잡이:${user.guideCount}`
        );
    });

    console.log("\n🔹 길잡이 랭킹 (길잡이가 많은 순)");
    const guideRanking = getGuideRanking(state);
    guideRanking.forEach((user, index) => {
        console.log(
            `${index + 1}위) ${user.name} | 길잡이:${user.guideCount}, 받은 등불:${user.lanternReceived}`
        );
    });

    console.log("==============================\n");
}

function main() {
    console.log("=== Q&A / 등불 / 길잡이 / 업적 / 랭킹 테스트 시작 ===\n");

    const state = createInitialState();

    // 1단계: A유저가 질문 1개 작성
    const q1 = simulateQuestion(state, "userA", "비유노트는 어떤 앱인가요?");
    checkAllAchievements(state);
    printRanking("A가 첫 질문 작성", state);

    // 2단계: B, C 유저가 답변 작성
    const a1 = simulateAnswer(
        state,
        "userB",
        q1,
        "자기 생각을 비유로 정리하는 Q&A 앱입니다."
    );
    const a2 = simulateAnswer(
        state,
        "userC",
        q1,
        "이해를 중심으로 서로 돕는 커뮤니티 앱이에요."
    );
    checkAllAchievements(state);
    printRanking("B, C가 답변 작성", state);

    // 3단계: A가 둘의 답변에 등불 줌
    simulateLantern(state, "userA", a1);
    simulateLantern(state, "userA", a2);
    checkAllAchievements(state);
    printRanking("A가 답변에 등불 줌", state);

    // 4단계: A가 B의 답변을 길잡이로 선택
    simulateGuideSelection(state, a1);
    checkAllAchievements(state);
    printRanking("B가 길잡이로 선정", state);

    console.log("=== 테스트 종료 ===");
}

// ESM 환경이므로 바로 main() 호출
main();
