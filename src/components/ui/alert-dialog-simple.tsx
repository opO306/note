import { useState } from "react";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { X } from "lucide-react";

interface AlertDialogSimpleProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;    // ✨ 추가됨
  isDestructive?: boolean; // ✨ 추가됨 (빨간 버튼용)
  onConfirm?: () => void;
  checkbox?: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    label: string;
  };
}

export function AlertDialogSimple({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "확인",
  cancelText = "취소", // ✨ 기본값 설정
  isDestructive = false, // ✨ 기본값 설정
  onConfirm,
  checkbox
}: AlertDialogSimpleProps) {
  if (!open) return null;

  const handleConfirm = () => {
    onConfirm?.();
    onOpenChange(false);
  };

  const handleClose = () => {
    // 🔹 체크박스가 있다면, 창 닫을 때 무조건 해제
    if (checkbox) {
      checkbox.onCheckedChange(false);
    }

    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50  flex items-center justify-center p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md shadow-lg scale-100">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 줄바꿈(\n)이 적용되도록 whitespace-pre-line 추가 */}
          <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
            {description}
          </p>

          {checkbox && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dont-show-again"
                checked={checkbox.checked}
                onCheckedChange={checkbox.onCheckedChange}
              />
              <label
                htmlFor="dont-show-again"
                className="text-sm cursor-pointer select-none"
              >
                {checkbox.label}
              </label>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="outline" onClick={handleClose}>
              {cancelText} {/* ✨ props로 받은 텍스트 사용 */}
            </Button>
            <Button
              onClick={handleConfirm}
              // ✨ isDestructive가 true면 빨간색 스타일 적용
              variant={isDestructive ? "destructive" : "default"}
              className={isDestructive ? "bg-red-600 hover:bg-red-700 text-white" : ""}
            >
              {confirmText}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}