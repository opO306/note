// src/components/CreateActionSheet.tsx
import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ChevronRight, Sparkles, PenLine } from "lucide-react";
import { Button } from "./ui/button";
import { NotebookText } from "lucide-react";

type CreateActionSheetProps = {
    open: boolean;
    onClose: () => void;

    // ✅ 부모가 주입: "질문 정리"로 이동
    onSelectStructured: () => void;

    // ✅ 부모가 주입: 기존 "글쓰기"로 이동
    onSelectWrite: () => void;
    onSelectNotes: () => void;
};

type ActionCardProps = {
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
};

function ActionCard({ icon, title, description, onClick }: ActionCardProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full text-left rounded-2xl border border-border bg-card/90 hover:bg-accent/40 active:bg-accent/60 transition-colors px-4 py-3 flex items-center gap-3"
        >
            <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                {icon}
            </div>

            <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground truncate">{title}</div>
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {description}
                </div>
            </div>

            <ChevronRight className="shrink-0 text-muted-foreground" size={18} />
        </button>
    );
}

export function CreateActionSheet({
    open,
    onClose,
    onSelectStructured,
    onSelectWrite,
    onSelectNotes,
}: CreateActionSheetProps) {
    // ✅ 선택 시: "닫고 -> 이동" 순서(깜빡임/스크롤 꼬임 방지)
    const handleStructured = React.useCallback(() => {
        onClose();
        onSelectStructured();
    }, [onClose, onSelectStructured]);

    const handleWrite = React.useCallback(() => {
        onClose();
        onSelectWrite();
    }, [onClose, onSelectWrite]);

    return (
        <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[80] bg-transparent" />

                {/* 살짝만 어둡게 처리된 오버레이 (뒤 화면이 더 잘 보이도록) */}
                <div
                    aria-hidden="true"
                    className="fixed inset-x-0 bottom-0 z-[81] h-[65%] bg-gradient-to-b from-black/0 via-black/40 to-black/80 pointer-events-none"
                />

                {/* 하단 시트 (처음에 잘 동작하던 구조로 복구) */}
                <Dialog.Content
                    className="
            fixed z-[90] left-0 right-0 bottom-0
            rounded-t-3xl border border-border bg-background
            shadow-[0_-12px_40px_rgba(0,0,0,0.25)]
            p-4 pb-6
            safe-nav-bottom
            outline-none
            data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-6 data-[state=open]:fade-in-0
            data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom-6 data-[state=closed]:fade-out-0
          "
                >
                    {/* 손잡이 */}
                    <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted" />

                    {/* 헤더 */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                            <Dialog.Title className="text-base font-bold text-foreground">
                                무엇을 하고 싶나요?
                            </Dialog.Title>
                            <Dialog.Description className="text-xs text-muted-foreground mt-1">
                                먼저 정리하면 더 좋은 질문/글이 됩니다.
                            </Dialog.Description>
                        </div>

                        <Dialog.Close asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full"
                                aria-label="닫기"
                            >
                                <X size={18} />
                            </Button>
                        </Dialog.Close>
                    </div>

                    {/* 옵션 */}
                    <div className="space-y-3">
                        <ActionCard
                            icon={<Sparkles size={18} />}
                            title="질문을 정리하고 싶어요"
                            description="혼자 정리하고, 나중에 공개할 수 있어요"
                            onClick={handleStructured}
                        />

                        <ActionCard
                            icon={<PenLine size={18} />}
                            title="그냥 글을 쓰고 싶어요"
                            description="바로 커뮤니티에 글을 작성해요"
                            onClick={handleWrite}
                        />
                        <ActionCard
                            icon={<NotebookText size={18} />}
                            title="내 노트를 보고 싶어요"
                            description="정리해둔 내용을 다시 볼 수 있어요"
                            onClick={() => {
                                onClose();
                                onSelectNotes();
                            }}
                        />
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
