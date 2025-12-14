// src/components/BlockedUserListDialog.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getFunctions, httpsCallable } from "firebase/functions";
import { toast } from "@/toastHelper";
import { UserX, X } from "lucide-react";

interface BlockedUserListDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    blockedUserIds: string[]; // 현재 차단된 ID 목록
    onUnblocked: () => void; // 해제 후 부모에게 알림 (새로고침 등)
}

export function BlockedUserListDialog({
    open,
    onOpenChange,
    blockedUserIds,
    onUnblocked,
}: BlockedUserListDialogProps) {
    const [loadingId, setLoadingId] = useState<string | null>(null);

    // 팝업이 닫혀있으면 렌더링하지 않음
    if (!open) return null;

    const handleUnblock = async (targetUserId: string) => {
        try {
            setLoadingId(targetUserId);
            const functions = getFunctions();
            const unblockUser = httpsCallable(functions, "unblockUser");

            await unblockUser({ targetUserId });

            toast.success("차단이 해제되었습니다.");
            onUnblocked(); // 목록 갱신 요청
        } catch (error) {
            console.error(error);
            toast.error("차단 해제 실패");
        } finally {
            setLoadingId(null);
        }
    };

    return (
        // 🔹 배경 오버레이 (AlertDialogSimple과 동일한 스타일)
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200">

            {/* 🔹 팝업 카드 */}
            <Card className="w-full max-w-md h-[50vh] flex flex-col shadow-lg scale-100">

                {/* 헤더 */}
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b">
                    <CardTitle className="flex items-center text-lg">
                        <UserX className="w-5 h-5 mr-2" />
                        차단한 사용자 관리
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                        <X className="w-4 h-4" />
                    </Button>
                </CardHeader>

                {/* 컨텐츠 (스크롤 영역) */}
                <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
                    <div className="flex-1 p-4 overflow-hidden">
                        {blockedUserIds.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                                <p>차단한 사용자가 없습니다.</p>
                            </div>
                        ) : (
                            <ScrollArea className="h-full pr-3">
                                <div className="space-y-2">
                                    {blockedUserIds.map((uid) => (
                                        <div
                                            key={uid}
                                            className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50"
                                        >
                                            <div className="flex flex-col overflow-hidden mr-2">
                                                <span className="text-[10px] text-muted-foreground uppercase">User ID</span>
                                                <span className="text-sm font-mono truncate w-full" title={uid}>
                                                    {uid}
                                                </span>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={loadingId === uid}
                                                onClick={() => handleUnblock(uid)}
                                                className="shrink-0 h-8 text-xs border-red-200 hover:bg-red-50 text-red-600 dark:hover:bg-red-900/20 dark:border-red-900/50"
                                            >
                                                {loadingId === uid ? "처리 중" : "해제"}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </div>

                    {/* 하단 닫기 버튼 영역 */}
                    <div className="p-3 border-t bg-secondary/10 flex justify-end">
                        <Button onClick={() => onOpenChange(false)}>
                            닫기
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}