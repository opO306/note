import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import React from "react";

interface AppHeaderProps {
    title: string;
    subtitle?: string;
    onBack?: () => void;
    rightSlot?: React.ReactNode; // 설정, 필터 등 우측 버튼 추가 가능
}

export function AppHeader({ title, subtitle, onBack, rightSlot }: AppHeaderProps) {
    return (
        <header className="bg-card/95 backdrop-blur-xl border-b border-border flex-shrink-0 safe-top">
            <div className="px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        {onBack && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onBack}
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        )}
                        <div className="flex flex-col">
                            <h1 className="font-medium">{title}</h1>
                            {subtitle && (
                                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
                            )}
                        </div>
                    </div>
                    {rightSlot && <div>{rightSlot}</div>}
                </div>
            </div>
        </header>
    );
}
