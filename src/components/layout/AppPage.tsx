// src/components/AppPage.tsx
import React, { ReactNode } from "react";
import { AppHeader } from "./AppHeader";

interface AppPageProps {
    /** 상단 헤더 제목 */
    title: string;
    /** 제목 왼쪽 아이콘 (선택) */
    icon?: ReactNode;
    /** 뒤로가기 콜백 (없으면 버튼 안 나옴) */
    onBack?: () => void;
    /** 헤더 오른쪽 영역 (버튼 등) */
    rightSlot?: ReactNode;
    /** 본문 내용 */
    children: ReactNode;
}

/**
 * 상단 고정 헤더 + 하단 스크롤 영역을 공통으로 제공하는 레이아웃 컴포넌트
 * - 전체 화면을 채우고
 * - 헤더 아래 내용만 세로 스크롤
 */
export function AppPage({
    title,
    icon,
    onBack,
    rightSlot,
    children,
}: AppPageProps) {
    return (
        <div className="w-full h-full bg-background text-foreground flex flex-col">
            {/* 상단 헤더 (고정) */}
            <AppHeader title={title} icon={icon} onBack={onBack} rightSlot={rightSlot} />

            {/* 내용 영역: 헤더 높이를 제외한 나머지 전체를 차지 + 내부 스크롤 */}
            <main className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
                {children}
            </main>
        </div>
    );
}
