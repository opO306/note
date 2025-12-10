import React, { useState, useCallback } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
import { toast } from "@/toastHelper";
import { Flag } from "lucide-react";

interface ReportDialogProps {
  children?: React.ReactNode; // 신고 버튼 등 트리거
  onReport?: (reasons: string[], details: string) => void;
  open?: boolean;                         // (선택) 외부에서 제어
  onOpenChange?: (open: boolean) => void; // (선택) 외부에서 제어
  targetType?: string;
  onSubmit?: (reasons: string[], details: string) => void;
}

export function ReportDialog({
  children,
  onReport,
  open,
  onOpenChange,
  targetType = "게시글",
  onSubmit,
}: ReportDialogProps) {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [details, setDetails] = useState("");
  const [internalOpen, setInternalOpen] = useState(false);

  // controlled / uncontrolled 처리
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;

  const emptyFn = useCallback(() => {}, []);
  const setDialogOpen = isControlled ? (onOpenChange || emptyFn) : setInternalOpen;

  const reportReasons = [
    { value: "spam", label: "스팸 또는 광고" },
    { value: "harassment", label: "괴롭힘 또는 욕설" },
    { value: "inappropriate", label: "부적절한 내용" },
    { value: "copyright", label: "저작권 침해" },
    { value: "misinformation", label: "잘못된 정보" },
    { value: "other", label: "기타" },
  ];

  const handleReasonChange = useCallback((reasonValue: string, checked: boolean) => {
    setSelectedReasons((prev) =>
      checked ? [...prev, reasonValue] : prev.filter((r) => r !== reasonValue),
    );
  }, []);

  const handleDetailsChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDetails(e.target.value);
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    if (selectedReasons.length === 0) {
      toast.error("신고 사유를 하나 이상 선택해주세요.");
      return;
    }

    const submitFn = onSubmit || onReport;
    if (submitFn) {
      submitFn(selectedReasons, details);
    }

    setSelectedReasons([]);
    setDetails("");
    setDialogOpen(false);
  }, [selectedReasons, details, onSubmit, onReport, setDialogOpen]);

  const handleCancel = useCallback(() => {
    setDialogOpen(false);
  }, [setDialogOpen]);

  const handleSubmitClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      handleSubmit();
    },
    [handleSubmit],
  );

  const createCheckboxChangeHandler = useCallback(
    (reasonValue: string) =>
      (checked: boolean) => {
        handleReasonChange(reasonValue, checked);
      },
    [handleReasonChange],
  );

  const handleOverlayClick = useCallback(() => {
    setDialogOpen(false);
  }, [setDialogOpen]);

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <>
      {children && (
        <span
          onClick={() => setDialogOpen(true)}
          style={{ display: "inline-block" }}
        >
          {children}
        </span>
      )}

      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={handleOverlayClick}
        >
          <div
            className="w-[360px] max-w-[90vw] rounded-lg border border-border bg-card p-6 shadow-lg"
            onClick={handleContentClick}
          >
            <div className="space-y-4">
              {/* 헤더 */}
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <Flag className="w-4 h-4" />
                  <h2 className="text-lg font-semibold">{targetType} 신고하기</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  신고하는 이유를 선택하고 추가 설명을 작성해주세요. (다중 선택 가능)
                </p>
              </div>

              {/* 신고 사유 */}
              <div>
                <Label className="text-sm font-medium">
                  신고 사유 (다중 선택 가능)
                </Label>
                <div className="mt-2 space-y-3">
                  {reportReasons.map((reasonOption) => (
                    <div
                      key={reasonOption.value}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={reasonOption.value}
                        checked={selectedReasons.includes(reasonOption.value)}
                        onCheckedChange={createCheckboxChangeHandler(
                          reasonOption.value,
                        )}
                      />
                      <Label
                        htmlFor={reasonOption.value}
                        className="text-sm cursor-pointer"
                      >
                        {reasonOption.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* 추가 설명 */}
              <div>
                <Label htmlFor="details" className="text-sm font-medium">
                  추가 설명 (선택사항)
                </Label>
                <Textarea
                  id="details"
                  placeholder="신고 사유에 대한 자세한 설명을 작성해주세요..."
                  value={details}
                  onChange={handleDetailsChange}
                  className="mt-2 min-h-[80px]"
                />
              </div>

              {/* 버튼 */}
              <div className="flex space-x-2 pt-2">
                <Button variant="outline" onClick={handleCancel} className="flex-1">
                  취소
                </Button>
                <Button onClick={handleSubmitClick} className="flex-1">
                  신고하기
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
