// MainScreen/types/quiz.ts
// 퀴즈 관련 타입 정의

export interface QuizQuestion {
    id: string;
    question: string;
    options: [string, string, string, string];
    correctIndex: number;
    explanation: string;
    sourcePostId?: string;
    verified: boolean;
}

export interface WeeklyQuiz {
    weekId: string;
    category: string;
    startDate: Date | any;
    endDate: Date | any;
    questions: QuizQuestion[];
    rewards: {
        perfect: number;
        partial: number;
    };
}

export interface UserQuizAnswer {
    userId: string;
    weekId: string;
    category: string;
    answers: Array<{
        questionId: string;
        selectedIndex: number;
        isCorrect: boolean;
    }>;
    score: number;
    completedAt: Date | any;
}

export interface QuizProgress {
    weekId: string;
    category: string;
    currentQuestionIndex: number;
    answers: Array<{
        questionId: string;
        selectedIndex: number;
    }>;
    startedAt: Date;
}
