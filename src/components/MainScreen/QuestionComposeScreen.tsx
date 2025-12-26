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
};

export function QuestionComposeScreen({ onBack, onGoWrite }: Props) {
    const [title, setTitle] = useState("");
    const [context, setContext] = useState("");
    const [tried, setTried] = useState("");
    const [expected, setExpected] = useState("");
    const [actual, setActual] = useState("");

    const canContinue = useMemo(() => {
        // 최소한 제목/상황 정도는 있어야 다음으로
        return title.trim().length >= 2 && context.trim().length >= 5;
    }, [title, context]);

    const buildBody = () => {
        return `
      ### 상황
      ${context}
      
      ### 시도한 것
      ${tried || "-"}
      
      ### 기대 결과
      ${expected || "-"}
      
      ### 실제 결과
      ${actual || "-"}
      
      ### 궁금한 점
      ${title}
        `.trim();
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
                            onGoWrite({ title, body: buildBody() });
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
                                placeholder="예) Firebase Functions 배포 시 unknown triggers 오류"
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
                                placeholder="무슨 기능을 만들고 있었는지, 어떤 환경(기기/OS/버전)인지 적어줘."
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
                                placeholder="재설치, 캐시 삭제, 로그 확인, 설정 변경 등 시도한 내용을 적어줘."
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
                                placeholder="원래는 어떻게 동작해야 하는지."
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
                                placeholder="지금 실제로는 어떻게 되는지."
                                value={actual}
                                onChange={setActual}
                                rows={3}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="text-xs text-muted-foreground px-1">
                    다음 단계에서는 이 내용을 기반으로 "게시글 초안"을 자동 생성해서 글쓰기 화면에 넣어줄 수 있음.
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
                        onClick={() => onGoWrite({ title, body: buildBody() })}
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
