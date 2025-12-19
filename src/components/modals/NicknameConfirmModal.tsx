import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles } from "lucide-react";

interface NicknameConfirmModalProps {
    nickname: string;
    onCancel: () => void;
    onConfirm: () => void;
    isDarkMode?: boolean;
}

export function NicknameConfirmModal({
    nickname,
    onCancel,
    onConfirm,
    isDarkMode = false,
}: NicknameConfirmModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, []);

    if (!mounted) return null;

    return createPortal(
        <div className={isDarkMode ? "dark" : ""}>
            {/* 
         1. 배경 오버레이 
         - 로그아웃 모달과 동일한 bg-black/60 backdrop-blur-sm 적용
      */}
            <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center px-4 text-foreground">

                {/* 
           2. 모달 본체 
           - w-[360px]: 가로 넓이 고정 (직사각형 비율 유지)
           - rounded-2xl, p-6, shadow-2xl: 로그아웃 모달과 100% 동일한 스펙
        */}
                <div className="w-[360px] max-w-full rounded-2xl border border-border/60 bg-card shadow-2xl shadow-black/20 p-6 space-y-5">

                    <div className="flex flex-col items-center text-center space-y-3">
                        {/* 
               아이콘 영역 
               - 크기(w-12 h-12)는 동일하지만, '환영' 느낌을 위해 
               - 배경을 회색 대신 'bg-primary/10'(연한 강조색)으로 변경하여 세련됨 추가
            */}
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mb-1">
                            <Sparkles className="w-6 h-6 text-primary" />
                        </div>

                        {/* 텍스트 영역 */}
                        <div className="space-y-1">
                            <p className="text-lg font-semibold text-foreground">
                                <span className="text-primary">"{nickname}"</span>(으)로 시작할까요?
                            </p>
                            <p className="text-sm text-muted-foreground leading-relaxed break-keep">
                                한 번 설정한 닉네임은 변경할 수 없어요.<br />
                                오타가 없는지 확인해주세요.
                            </p>
                        </div>
                    </div>

                    {/* 
             3. 버튼 영역 
             - 로그아웃 모달과 똑같은 높이(h-11)와 둥글기(rounded-xl)
             - 그림자 및 호버 효과 동일하게 적용
          */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            onClick={onCancel}
                            className="flex-1 h-11 rounded-xl border border-input bg-background hover:bg-accent hover:text-accent-foreground text-foreground font-medium transition-colors text-sm"
                        >
                            취소
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-lg shadow-primary/20 transition-colors text-sm"
                        >
                            확인
                        </button>
                    </div>

                </div>
            </div>
        </div>,
        document.body
    );
}