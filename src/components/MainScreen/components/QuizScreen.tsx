// MainScreen/components/QuizScreen.tsx
// 주간 퀴즈 화면 컴포넌트
/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */
import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/ui/AppHeader";
import { EmptyStateCard } from "@/components/ui/empty-state";
import { CheckCircle2, XCircle, Trophy, HelpCircle } from "lucide-react";
import { db } from "@/firebase";
import { collection, doc, getDocs, query, where, setDoc, serverTimestamp } from "firebase/firestore";
import { auth } from "@/firebase";
import { toast } from "@/toastHelper";
import type { WeeklyQuiz, UserQuizAnswer } from "../types/quiz";

interface QuizScreenProps {
    onBack: () => void;
}

type QuizState = "category" | "quiz" | "result";

const QUIZ_COLLECTION = "weekly_quizzes";
const USER_ANSWERS_COLLECTION = "user_quiz_answers";

function getWeekId(date: Date = new Date()): string {
    const kst = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const year = kst.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((kst.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${year}-W${weekNumber.toString().padStart(2, "0")}`;
}

export function QuizScreen({ onBack }: QuizScreenProps) {
    const [state, setState] = useState<QuizState>("category");
    const [quiz, setQuiz] = useState<WeeklyQuiz | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Map<string, number>>(new Map());
    const [showResult, setShowResult] = useState(false);
    const [result, setResult] = useState<{ score: number; correctCount: number; totalCount: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<string[]>([]);
    const [availableQuizzes, setAvailableQuizzes] = useState<Map<string, WeeklyQuiz>>(new Map());

    const weekId = useMemo(() => getWeekId(), []);

    useEffect(() => {
        const loadAvailableQuizzes = async () => {
            setLoading(true);
            try {
                const quizRef = collection(db, QUIZ_COLLECTION);
                const q = query(quizRef, where("weekId", "==", weekId));
                const snap = await getDocs(q);

                const quizMap = new Map<string, WeeklyQuiz>();
                const catList: string[] = [];

                snap.forEach((doc) => {
                    const data = doc.data() as any;
                    const category = data.category as string;
                    if (category && Array.isArray(data.questions) && data.questions.length > 0) {
                        quizMap.set(category, {
                            weekId: data.weekId,
                            category,
                            startDate: data.startDate?.toDate?.() ?? new Date(),
                            endDate: data.endDate?.toDate?.() ?? new Date(),
                            questions: data.questions,
                            rewards: data.rewards ?? { perfect: 10, partial: 5 },
                        });
                        catList.push(category);
                    }
                });

                setAvailableQuizzes(quizMap);
                setCategories(catList);
            } catch (error) {
                console.error("[QuizScreen] 퀴즈 로드 실패:", error);
                toast.error("퀴즈를 불러오지 못했습니다.");
            } finally {
                setLoading(false);
            }
        };

        loadAvailableQuizzes();
    }, [weekId]);

    const handleCategorySelect = useCallback(
        (category: string) => {
            const selectedQuiz = availableQuizzes.get(category);
            if (!selectedQuiz) {
                toast.error("해당 카테고리 퀴즈를 찾을 수 없습니다.");
                return;
            }

            setQuiz(selectedQuiz);
            setCurrentQuestionIndex(0);
            setSelectedAnswers(new Map());
            setShowResult(false);
            setResult(null);
            setState("quiz");
        },
        [availableQuizzes],
    );

    const handleAnswerSelect = useCallback(
        (questionId: string, optionIndex: number) => {
            setSelectedAnswers((prev) => {
                const next = new Map(prev);
                next.set(questionId, optionIndex);
                return next;
            });
        },
        [],
    );

    const handleSubmitQuiz = useCallback(async () => {
        if (!quiz || !auth.currentUser) return;

        const answers: UserQuizAnswer["answers"] = [];
        let correctCount = 0;

        quiz.questions.forEach((q) => {
            const selected = selectedAnswers.get(q.id) ?? -1;
            const isCorrect = selected === q.correctIndex;
            if (isCorrect) correctCount++;
            answers.push({
                questionId: q.id,
                selectedIndex: selected,
                isCorrect,
            });
        });

        const score = Math.round((correctCount / quiz.questions.length) * 100);
        const totalCount = quiz.questions.length;

        setResult({ score, correctCount, totalCount });
        setShowResult(true);

        try {
            const userAnswer: UserQuizAnswer = {
                userId: auth.currentUser.uid,
                weekId: quiz.weekId,
                category: quiz.category,
                answers,
                score,
                completedAt: serverTimestamp() as any,
            };

            const answerRef = doc(
                db,
                USER_ANSWERS_COLLECTION,
                `${auth.currentUser.uid}_${quiz.weekId}_${quiz.category}`,
            );
            await setDoc(answerRef, userAnswer, { merge: true });

            if (score === 100) {
                toast.success(`완벽합니다! ${quiz.rewards.perfect} 루멘을 획득했습니다.`);
            } else if (score >= 60) {
                toast.success(`잘하셨어요! ${quiz.rewards.partial} 루멘을 획득했습니다.`);
            }
        } catch (error) {
            console.error("[QuizScreen] 답안 저장 실패:", error);
        }
    }, [quiz, selectedAnswers]);

    const handleNextQuestion = useCallback(() => {
        if (!quiz) return;
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex((prev) => prev + 1);
        } else {
            handleSubmitQuiz();
        }
    }, [quiz, currentQuestionIndex, handleSubmitQuiz]);

    const handleBackToCategory = useCallback(() => {
        setState("category");
        setQuiz(null);
        setCurrentQuestionIndex(0);
        setSelectedAnswers(new Map());
        setShowResult(false);
        setResult(null);
    }, []);

    const handleRestart = useCallback(() => {
        if (!quiz) return;
        setCurrentQuestionIndex(0);
        setSelectedAnswers(new Map());
        setShowResult(false);
        setResult(null);
    }, [quiz]);

    const currentQuestion = quiz?.questions[currentQuestionIndex];
    const canProceed = currentQuestion && selectedAnswers.has(currentQuestion.id);
    const isLastQuestion = currentQuestionIndex === (quiz?.questions.length ?? 0) - 1;

    if (state === "category") {
        return (
            <div className="w-full h-full bg-background text-foreground flex flex-col">
                <AppHeader title="주간 퀴즈" onBack={onBack} />
                <div className="flex-1 overflow-y-auto flex items-center justify-center">
                    <div className="max-w-screen-md w-full px-4 py-4">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <p className="text-muted-foreground">퀴즈를 불러오는 중...</p>
                            </div>
                        ) : categories.length === 0 ? (
                            <EmptyStateCard
                                icon={<HelpCircle className="w-12 h-12 text-muted-foreground" />}
                                title="이번 주 퀴즈가 없습니다"
                                description="다음 주에 새로운 퀴즈가 생성됩니다."
                            />
                        ) : (
                            <div className="space-y-3">
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <Trophy className="w-5 h-5 text-amber-500" />
                                            <p className="font-medium">이번 주 퀴즈</p>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            카테고리별로 문제를 풀고 루멘을 획득하세요!
                                        </p>
                                    </CardContent>
                                </Card>

                                {categories.map((category) => {
                                    const categoryQuiz = availableQuizzes.get(category);
                                    const questionCount = categoryQuiz?.questions.length ?? 0;

                                    return (
                                        <Card
                                            key={category}
                                            className="cursor-pointer hover:bg-accent/50 transition-colors"
                                            onClick={() => handleCategorySelect(category)}
                                        >
                                            <CardContent className="p-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium">{category}</p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {questionCount}문제
                                                        </p>
                                                    </div>
                                                    <Badge variant="secondary">
                                                        {categoryQuiz?.rewards.perfect ?? 10} 루멘
                                                    </Badge>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (state === "quiz" && quiz && currentQuestion) {
        return (
            <div className="w-full h-full bg-background text-foreground flex flex-col">
                <AppHeader
                    title={`${quiz.category} 퀴즈`}
                    onBack={showResult ? undefined : handleBackToCategory}
                />
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-screen-md mx-auto px-4 py-4">
                        {showResult && result ? (
                            <div className="space-y-4">
                                <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20">
                                    <CardContent className="p-6 text-center">
                                        <div className="flex justify-center mb-4">
                                            {result.score === 100 ? (
                                                <Trophy className="w-16 h-16 text-amber-500" />
                                            ) : result.score >= 60 ? (
                                                <CheckCircle2 className="w-16 h-16 text-green-500" />
                                            ) : (
                                                <XCircle className="w-16 h-16 text-red-500" />
                                            )}
                                        </div>
                                        <p className="text-2xl font-bold mb-2">{result.score}점</p>
                                        <p className="text-sm text-muted-foreground">
                                            {result.correctCount} / {result.totalCount} 정답
                                        </p>
                                        {result.score === 100 && (
                                            <p className="text-sm text-amber-500 mt-2">
                                                +{quiz.rewards.perfect} 루멘 획득!
                                            </p>
                                        )}
                                        {result.score >= 60 && result.score < 100 && (
                                            <p className="text-sm text-green-500 mt-2">
                                                +{quiz.rewards.partial} 루멘 획득!
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>

                                <div className="space-y-3">
                                    {quiz.questions.map((q, idx) => {
                                        const userAnswer = selectedAnswers.get(q.id) ?? -1;
                                        const isCorrect = userAnswer === q.correctIndex;

                                        return (
                                            <Card key={q.id}>
                                                <CardContent className="p-4">
                                                    <div className="flex items-start space-x-2 mb-3">
                                                        {isCorrect ? (
                                                            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                        ) : (
                                                            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                                        )}
                                                        <div className="flex-1">
                                                            <p className="font-medium mb-2">
                                                                {idx + 1}. {q.question}
                                                            </p>
                                                            <div className="space-y-2">
                                                                {q.options.map((option, optIdx) => {
                                                                    const isSelected = userAnswer === optIdx;
                                                                    const isCorrectOption = optIdx === q.correctIndex;

                                                                    return (
                                                                        <div
                                                                            key={optIdx}
                                                                            className={`p-2 rounded border ${isCorrectOption
                                                                                ? "bg-green-500/10 border-green-500/50"
                                                                                : isSelected && !isCorrectOption
                                                                                    ? "bg-red-500/10 border-red-500/50"
                                                                                    : "bg-muted/30 border-border"
                                                                                }`}
                                                                        >
                                                                            <p className="text-sm">
                                                                                {String.fromCharCode(65 + optIdx)}. {option}
                                                                                {isCorrectOption && " ✓"}
                                                                            </p>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            <div className="mt-3 p-2 bg-muted/30 rounded">
                                                                <p className="text-xs text-muted-foreground">
                                                                    <span className="font-medium">해설:</span> {q.explanation}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>

                                <div className="flex space-x-2">
                                    <Button variant="outline" className="flex-1" onClick={handleBackToCategory}>
                                        카테고리 선택
                                    </Button>
                                    <Button className="flex-1" onClick={handleRestart}>
                                        다시 풀기
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <p className="font-medium">
                                                {currentQuestionIndex + 1} / {quiz.questions.length}
                                            </p>
                                            <Badge variant="secondary">
                                                {Math.round(((currentQuestionIndex + 1) / quiz.questions.length) * 100)}%
                                            </Badge>
                                        </div>
                                        <p className="text-lg mb-4">{currentQuestion.question}</p>
                                    </CardContent>
                                </Card>

                                <div className="space-y-2">
                                    {currentQuestion.options.map((option, index) => {
                                        const isSelected = selectedAnswers.get(currentQuestion.id) === index;

                                        return (
                                            <Card
                                                key={index}
                                                className={`cursor-pointer transition-colors ${isSelected
                                                    ? "bg-primary/10 border-primary"
                                                    : "hover:bg-accent/50"
                                                    }`}
                                                onClick={() => handleAnswerSelect(currentQuestion.id, index)}
                                            >
                                                <CardContent className="p-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div
                                                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected
                                                                ? "border-primary bg-primary"
                                                                : "border-muted-foreground"
                                                                }`}
                                                        >
                                                            {isSelected && (
                                                                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                                                            )}
                                                        </div>
                                                        <p className="flex-1">
                                                            {String.fromCharCode(65 + index)}. {option}
                                                        </p>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>

                                <Button
                                    className="w-full"
                                    onClick={handleNextQuestion}
                                    disabled={!canProceed}
                                >
                                    {isLastQuestion ? "결과 확인" : "다음 문제"}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
