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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{description}</p>

          {checkbox && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dont-show-again"
                checked={checkbox.checked}
                onCheckedChange={checkbox.onCheckedChange}
              />
              <label
                htmlFor="dont-show-again"
                className="text-sm cursor-pointer"
              >
                {checkbox.label}
              </label>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose}>
              취소
            </Button>
            <Button onClick={handleConfirm}>
              {confirmText}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}