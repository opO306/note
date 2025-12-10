// src/components/AppHeader.tsx
import { ReactNode } from "react";
import { Button } from "./ui/button";
import { ArrowLeft } from "lucide-react";

interface AppHeaderProps {
    title: string;           // 헤더에 보여줄 제목
    icon?: ReactNode;        // 제목 왼쪽에 붙일 아이콘 (선택)
    onBack?: () => void;     // 뒤로가기 눌렀을 때 실행 (없으면 버튼 안 나옴)
    rightSlot?: ReactNode;   // 오른쪽에 들어갈 버튼들 (선택)
}

export function AppHeader({ title, icon, onBack, rightSlot }: AppHeaderProps) {
    return (
        <header className="bg-card/95 backdrop-blur-xl border-b border-border flex-shrink-0 safe-top">
            {/* 🔹 랭킹 화면 헤더와 똑같이 px-4 py-3 구조만 사용 */}
            <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                    {/* 왼쪽: 뒤로가기 버튼 + 아이콘 + 제목 */}
                    <div className="flex items-center space-x-3">
                        {onBack && (
                            <Button variant="ghost" size="icon" onClick={onBack}>
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        )}

                        <div className="flex items-center space-x-2">
                            {icon}
                            <h1 className="font-medium">{title}</h1>
                        </div>
                    </div>

                    {/* 오른쪽: 다크모드 토글 같은 것들 */}
                    {rightSlot && (
                        <div className="flex items-center space-x-1">
                            {rightSlot}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
