/* eslint-disable react/forbid-dom-props */
// src/components/CreateActionSheet.tsx
import * as React from "react";
import { Sparkles, PenLine, NotebookText } from "lucide-react";

type CreateActionSheetProps = {
    open: boolean;
    onClose: () => void;
    onSelectStructured: () => void;
    onSelectWrite: () => void;
    onSelectNotes: () => void;
};

type ActionButtonProps = {
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
    variant?: "default" | "outline";
};

function ActionButton({ icon, title, description, onClick, variant = "default" }: ActionButtonProps) {
    const [isDark, setIsDark] = React.useState(() =>
        document.documentElement.classList.contains('dark')
    );

    React.useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.classList.contains('dark'));
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        return () => observer.disconnect();
    }, []);

    return (
        <button
            type="button"
            onClick={onClick}
            style={variant === "default" && isDark ? {
                backgroundColor: '#2D2F31',
                borderColor: '#c9a532'
            } : undefined}
            className={`
                w-full text-left
                rounded-xl
                border
                transition-all
                px-4 py-3.5
                flex items-center gap-3
                hover:scale-[1.02] active:scale-[0.98]
                ${variant === "default"
                    ? "bg-primary/20 border-primary/30 hover:bg-primary/30 text-foreground dark:text-[#D4D4D4]"
                    : "border-border/30 bg-transparent hover:bg-accent/20 text-foreground"
                }
            `}
            onMouseEnter={(e) => {
                if (variant === "default" && isDark) {
                    e.currentTarget.style.backgroundColor = '#353739';
                }
            }}
            onMouseLeave={(e) => {
                if (variant === "default" && isDark) {
                    e.currentTarget.style.backgroundColor = '#2D2F31';
                }
            }}
        >
            <div
                className={`
                    shrink-0 w-10 h-10 rounded-xl
                    flex items-center justify-center
                    ${variant === "default"
                        ? isDark
                            ? "bg-[#D4D4D4]/10 text-[#D4D4D4]"
                            : "bg-primary/10 text-primary"
                        : "bg-primary/10 text-primary"
                    }
                `}
            >
                {icon}
            </div>
            <div className="min-w-0 flex-1 flex flex-col gap-1">
                <div className={`text-[15px] font-semibold ${variant === "default" && isDark ? "text-[#D4D4D4]" : "text-foreground"}`}>
                    {title}
                </div>
                <div className={`text-[13px] leading-snug ${variant === "default" && isDark ? "text-[#D4D4D4]/80" : "text-muted-foreground"}`}>
                    {description}
                </div>
            </div>
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
    React.useEffect(() => {
        if (!open) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open, onClose]);

    const handleStructured = React.useCallback(() => {
        onClose();
        onSelectStructured();
    }, [onClose, onSelectStructured]);

    const handleWrite = React.useCallback(() => {
        onClose();
        onSelectWrite();
    }, [onClose, onSelectWrite]);

    const handleNotes = React.useCallback(() => {
        onClose();
        onSelectNotes();
    }, [onClose, onSelectNotes]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[9999]">
            {/* Overlay: 너무 칠흑이 아니라, 앱 톤 유지하면서 포커스만 주기 */}
            <div
                className="
          absolute inset-0
          bg-black/35
          backdrop-blur-[3px]
        "
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Center */}
            <div
                className="absolute inset-0 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    onClick={(e) => e.stopPropagation()}
                    className="
                        w-full max-w-[400px]
                        rounded-2xl
                        border border-border/30
                        bg-card
                        shadow-[0_24px_90px_rgba(0,0,0,0.55)]
                        overflow-hidden
                    "
                >
                    {/* Content */}
                    <div className="p-6 space-y-6">
                        {/* Header - 중앙 정렬 */}
                        <div className="flex flex-col items-center text-center space-y-3">
                            <div className="w-12 h-12 rounded-full bg-accent/50 flex items-center justify-center shrink-0">
                                <Sparkles className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div className="space-y-1">
                                <div className="text-lg font-semibold text-foreground">
                                    무엇을 하고 싶나요?
                                </div>
                                <div className="text-sm text-muted-foreground leading-relaxed">
                                    먼저 정리하면 더 좋은 질문/글이 됩니다.
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-4">
                            <ActionButton
                                icon={<Sparkles size={18} />}
                                title="질문을 정리하고 싶어요"
                                description="혼자 정리하고 나중에 공개할 수 있어요"
                                onClick={handleStructured}
                                variant="default"
                            />
                            <ActionButton
                                icon={<PenLine size={18} />}
                                title="그냥 글을 쓰고 싶어요"
                                description="바로 커뮤니티에 글을 작성해요"
                                onClick={handleWrite}
                                variant="default"
                            />
                            <ActionButton
                                icon={<NotebookText size={18} />}
                                title="내 노트를 보고 싶어요"
                                description="정리해둔 내용을 다시 볼 수 있어요"
                                onClick={handleNotes}
                                variant="default"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
