import React, { useState, useCallback, useEffect } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
import { toast } from "@/toastHelper";
import { X, AlertCircle } from "lucide-react";

interface ReportDialogProps {
  children?: React.ReactNode;
  onReport?: (reasons: string[], details: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  targetType?: string; // 예: "게시글", "댓글", "사용자"
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

  // 제어/비제어 모드 처리
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;

  // 상태 변경 핸들러
  const setDialogOpen = useCallback((value: boolean) => {
    if (isControlled && onOpenChange) {
      onOpenChange(value);
    } else {
      setInternalOpen(value);
    }

    // 닫힐 때 초기화
    if (!value) {
      setTimeout(() => {
        setSelectedReasons([]);
        setDetails("");
      }, 200); // 애니메이션 시간 고려
    }
  }, [isControlled, onOpenChange]);

  // 모달이 열릴 때 Body 스크롤 잠금 및 ESC 키 이벤트
  useEffect(() => {
    if (dialogOpen) {
      document.body.style.overflow = "hidden";

      const handleEscKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setDialogOpen(false);
      };
      window.addEventListener("keydown", handleEscKey);

      return () => {
        document.body.style.overflow = "unset";
        window.removeEventListener("keydown", handleEscKey);
      };
    } else {
      document.body.style.overflow = "unset";
    }
  }, [dialogOpen, setDialogOpen]);

  const reportReasons = [
    { value: "spam", label: "스팸 또는 광고" },
    { value: "harassment", label: "괴롭힘 또는 욕설" },
    { value: "inappropriate", label: "부적절한 내용" },
    { value: "copyright", label: "저작권 침해" },
    { value: "misinformation", label: "잘못된 정보" },
    { value: "other", label: "기타 사유" },
  ];

  const handleReasonChange = (reasonValue: string, checked: boolean) => {
    setSelectedReasons((prev) =>
      checked ? [...prev, reasonValue] : prev.filter((r) => r !== reasonValue)
    );
  };

  const handleSubmit = () => {
    if (selectedReasons.length === 0) {
      toast.error("신고 사유를 최소 하나 이상 선택해주세요.");
      return;
    }

    const submitFn = onSubmit || onReport;
    if (submitFn) {
      submitFn(selectedReasons, details);
    }

    // 성공 메시지는 부모 컴포넌트나 여기서 처리
    toast.success("신고가 접수되었습니다.");
    setDialogOpen(false);
  };

  if (!dialogOpen && !children) return null;

  return (
    <>
      {/* 트리거 버튼 (children이 있을 때만 렌더링) */}
      {children && (
        <span onClick={() => setDialogOpen(true)} className="inline-block cursor-pointer">
          {children}
        </span>
      )}

      {/* 모달 오버레이 및 컨텐츠 */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 배경 (Backdrop) */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={() => setDialogOpen(false)}
          />

          {/* 모달 본문 */}
          <div className="relative z-50 w-full max-w-md p-6 mx-4 bg-background border border-border rounded-xl shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            {/* 닫기 버튼 (우측 상단) */}
            <button
              onClick={() => setDialogOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="w-4 h-4" />
              <span className="sr-only">Close</span>
            </button>

            {/* 헤더 */}
            <div className="flex flex-col space-y-1.5 text-center sm:text-left mb-5">
              <div className="flex items-center gap-2 font-semibold leading-none tracking-tight text-lg text-destructive">
                <AlertCircle className="w-5 h-5" />
                {targetType} 신고하기
              </div>
              <p className="text-sm text-muted-foreground">
                신고 사유를 선택해 주세요. 허위 신고 시 제재를 받을 수 있습니다.
              </p>
            </div>

            {/* 컨텐츠 */}
            <div className="space-y-6">
              {/* 사유 선택 (그리드 레이아웃 적용) */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">신고 사유</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {reportReasons.map((reason) => (
                    <div
                      key={reason.value}
                      className={`flex items-start space-x-2 p-2 rounded-md border transition-colors ${selectedReasons.includes(reason.value)
                        ? "border-destructive/50 bg-destructive/5"
                        : "border-transparent hover:bg-muted"
                        }`}
                    >
                      <Checkbox
                        id={reason.value}
                        checked={selectedReasons.includes(reason.value)}
                        onCheckedChange={(checked) =>
                          handleReasonChange(reason.value, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={reason.value}
                        className="text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 pt-0.5"
                      >
                        {reason.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* 추가 설명 */}
              <div className="space-y-2">
                <Label htmlFor="report-details" className="text-sm font-medium">
                  상세 내용 (선택)
                </Label>
                <Textarea
                  id="report-details"
                  placeholder="신고 사유에 대해 자세히 적어주시면 처리에 도움이 됩니다."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
              </div>
            </div>

            {/* 푸터 (버튼) */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6 pt-2">
              <Button
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                className="mt-2 sm:mt-0"
              >
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleSubmit}
                disabled={selectedReasons.length === 0}
              >
                신고 접수
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}