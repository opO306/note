// src/components/MainScreen/QuestionComposeScreen.tsx
import { useMemo, useState } from "react";
import { auth, db } from "@/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { toast } from "@/toastHelper";
import { AppHeader } from "@/components/ui/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Props = {
    onBack: () => void;
    onGoWrite: (draft: { title: string; body: string }) => void;
    onNavigateToNotes?: () => void;
};

export function QuestionComposeScreen({ onBack, onGoWrite, onNavigateToNotes }: Props) {
    const [title, setTitle] = useState("");
    const [context, setContext] = useState("");
    const [tried, setTried] = useState("");
    const [expected, setExpected] = useState("");
    const [actual, setActual] = useState("");

    const canContinue = useMemo(() => {
        // 최소한 제목만이라도 있어야 다음으로
        return title.trim().length >= 1;
    }, [title]);

    const buildBody = (includeSectionTitles = true) => {
        if (includeSectionTitles) {
            // 노트 저장용: 섹션 제목 포함
            return `
- 어떤 상황인가요?
${context}

- 무엇을 시도했나요?
${tried || "-"}

- 어떤 결과를 기대했나요?
${expected || "-"}

- 실제로 어떤 결과가 나왔나요?
${actual || "-"}

- 무엇이 궁금한가요?
${title}
            `.trim();
        } else {
            // 글쓰기용: 섹션 제목 없이 내용만
            return `
${context}

${tried || "-"}

${expected || "-"}

${actual || "-"}

${title}
            `.trim();
        }
    };

    const handleSaveNote = async () => {
        if (!canContinue) return;

        const uid = auth.currentUser?.uid;
        if (!uid) {
            toast.error("로그인 후 사용할 수 있어요.");
            return;
        }

        try {
            await addDoc(collection(db, "notes"), {
                uid,
                title: title.trim(),
                body: buildBody(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                source: "questionCompose",
            });

            toast.success("노트로 저장했어요.");
            
            // 노트 화면으로 이동
            if (onNavigateToNotes) {
                onNavigateToNotes();
            }
        } catch {
            toast.error("저장 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.");
        }
    };

    return (
        <div className="w-full h-full bg-background text-foreground flex flex-col">
            <AppHeader
                title="질문 정리"
                onBack={onBack}
                rightSlot={
                    <Button
                        type="button"
                        size="sm"
                        className="rounded-xl text-sm"
                        onClick={() => {
                            onGoWrite({ title, body: buildBody(false) });
                        }}
                    >
                        그냥 글쓰기
                    </Button>
                }
            />

            {/* 내용 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="space-y-3">
                            <label className="text-sm font-medium">제목 (필수)</label>
                            <Input
                                placeholder="예) [심리] 번아웃이 마치 '기름 없는 자동차를 계속 밟는 것' 같아요"
                                value={title}
                                onChange={setTitle}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="space-y-3">
                            <label className="text-sm font-medium">상황 설명 (필수)</label>
                            <TextArea
                                placeholder="예) 교과서에서는 의지력이 근육처럼 단련된다고 하는데, 제 경험은 아침엔 쌩쌩하다가 저녁엔 방전되는 스마트폰 배터리 같아요. 이 두 관점 사이의 괴리감이 왜 발생하는 걸까요? 나만의 비유를 섞어서 설명해주세요."
                                value={context}
                                onChange={setContext}
                                rows={5}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="space-y-3">
                            <label className="text-sm font-medium">내가 해본 것</label>
                            <TextArea
                                placeholder="예) 이 현상을 '도서관의 책 정리 방식'에 비유해서 이해해 보려고 했어요. 그런데 결정을 내릴 때마다 에너지가 소모된다는 '결정 피로' 개념과 어떻게 연결되는지 논리가 막히더라고요."
                                value={tried}
                                onChange={setTried}
                                rows={4}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="space-y-3">
                            <label className="text-sm font-medium">기대 결과</label>
                            <TextArea
                                placeholder="예) 정답을 맞히는 공부가 아니라, 이 현상의 '원리'를 누군가에게 비유로 설명해 줄 수 있을 만큼 명확해지고 싶어요."
                                value={expected}
                                onChange={setExpected}
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="space-y-3">
                            <label className="text-sm font-medium">실제 결과</label>
                            <TextArea
                                placeholder="예) 지금은 단순히 '의지력이 부족하다'는 결론만 나오는데, 왜 그런지 원리를 이해하지 못하고 있어요."
                                value={actual}
                                onChange={setActual}
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="text-xs text-muted-foreground px-1 space-y-1">
                    <p>정답을 묻기보다, 당신이 세상을 이해하는 '방식'을 들려주세요.</p>
                    <p>비유가 구체적일수록 더 깊은 통찰을 나눌 수 있습니다.</p>
                </div>
            </div>

            {/* 하단 고정 버튼 */}
            <div className="px-4 py-3 border-t border-border bg-background/95 backdrop-blur-xl safe-nav-bottom flex-shrink-0">
                <div className="flex gap-2">
                    <button
                        type="button"
                        disabled={!canContinue}
                        onClick={handleSaveNote}
                        className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition
        ${canContinue ? "bg-accent text-foreground hover:bg-accent/80" : "bg-muted text-muted-foreground"}
      `}
                    >
                        노트로 저장
                    </button>

                    <button
                        type="button"
                        disabled={!canContinue}
                        onClick={() => onGoWrite({ title, body: buildBody(false) })}
                        className={`flex-[1.4] py-3 rounded-2xl text-sm font-semibold transition
        ${canContinue ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground"}
      `}
                    >
                        정리 완료 → 글쓰기
                    </button>
                </div>
            </div>
        </div>
    );
}

function Input({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-3 rounded-xl bg-input-background dark:bg-input/30 border border-input outline-none focus:ring-2 focus:ring-primary/30"
        />
    );
}

function TextArea({
    value,
    onChange,
    placeholder,
    rows = 4,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    rows?: number;
}) {
    return (
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="w-full px-3 py-3 rounded-xl bg-input-background dark:bg-input/30 border border-input outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
    );
}
