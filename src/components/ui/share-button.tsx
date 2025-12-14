import { useState } from "react";
import { Button } from "./button";
import { toast } from "@/toastHelper";
import { useShare, ShareData } from "../hooks/useShare";
import { useClipboard } from "../hooks/useClipboard";
import { Share2, Check, Copy, Link } from "lucide-react";
import { cn } from "./utils";

interface ShareButtonProps {
  /** 공유할 데이터 */
  shareData: ShareData;
  /** 버튼 변형 */
  variant?: "default" | "outline" | "ghost" | "link";
  /** 버튼 크기 */
  size?: "default" | "sm" | "lg" | "icon";
  /** 추가 클래스명 */
  className?: string;
  /** 아이콘만 표시 */
  iconOnly?: boolean;
  /** 복사 fallback 활성화 */
  enableCopyFallback?: boolean;
  /** 커스텀 라벨 */
  label?: string;
}

/**
 * 공유 버튼 컴포넌트
 * Web Share API를 지원하면 네이티브 공유, 지원하지 않으면 클립보드 복사
 */
export function ShareButton({
  shareData,
  variant = "ghost",
  size = "sm",
  className,
  iconOnly = false,
  enableCopyFallback = true,
  label = "공유",
}: ShareButtonProps) {
  const { share, isSupported, isSharing } = useShare({
    onSuccess: () => {
      toast.success("공유되었습니다");
    },
    onError: (error) => {
      toast.error("공유에 실패했습니다");
      console.error("Share failed:", error);
    },
  });

  const { copy, isCopied } = useClipboard({
    timeout: 2000,
    onSuccess: () => {
      toast.success("링크가 복사되었습니다");
    },
    onError: (error) => {
      toast.error("복사에 실패했습니다");
      console.error("Copy failed:", error);
    },
  });

  const handleShare = async () => {
    if (isSupported) {
      // Web Share API 사용
      await share(shareData);
    } else if (enableCopyFallback && shareData.url) {
      // Fallback: 클립보드 복사
      await copy(shareData.url);
    } else {
      toast.error("공유 기능을 사용할 수 없습니다");
    }
  };

  const getIcon = () => {
    if (isSharing) {
      return <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />;
    }
    if (!isSupported && isCopied) {
      return <Check className="w-4 h-4" />;
    }
    if (!isSupported && enableCopyFallback) {
      return <Copy className="w-4 h-4" />;
    }
    return <Share2 className="w-4 h-4" />;
  };

  const getLabel = () => {
    if (isSharing) return "공유 중...";
    if (!isSupported && isCopied) return "복사됨";
    if (!isSupported && enableCopyFallback) return "링크 복사";
    return label;
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      disabled={isSharing}
      className={cn("flex items-center gap-2", className)}
    >
      {getIcon()}
      {!iconOnly && <span>{getLabel()}</span>}
    </Button>
  );
}

/**
 * 간단한 링크 복사 버튼
 */
export function CopyLinkButton({
  url,
  variant = "ghost",
  size = "sm",
  className,
  label = "링크 복사",
}: {
  url: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  label?: string;
}) {
  const { copy, isCopied } = useClipboard({
    timeout: 2000,
    onSuccess: () => {
      toast.success("링크가 복사되었습니다");
    },
  });

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => copy(url)}
      className={cn("flex items-center gap-2", className)}
    >
      {isCopied ? (
        <>
          <Check className="w-4 h-4" />
          <span>복사됨</span>
        </>
      ) : (
        <>
          <Link className="w-4 h-4" />
          <span>{label}</span>
        </>
      )}
    </Button>
  );
}

/**
 * 플로팅 공유 버튼 (고정 위치)
 */
export function FloatingShareButton({
  shareData,
  position = "bottom-left",
  className,
}: {
  shareData: ShareData;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  className?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const positionClasses = {
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-right": "bottom-20 right-4",
    "bottom-left": "bottom-20 left-4",
  };

  return (
    <div
      className={cn(
        "fixed z-40 safe-nav-bottom",
        positionClasses[position],
        className
      )}
    >
      <ShareButton
        shareData={shareData}
        variant="default"
        size="icon"
        iconOnly
        className="rounded-full shadow-lg h-12 w-12"
      />
    </div>
  );
}

/**
 * 공유 버튼 그룹 (여러 옵션)
 */
export function ShareButtonGroup({
  shareData,
  showCopy = true,
  showNativeShare = true,
  className,
}: {
  shareData: ShareData;
  showCopy?: boolean;
  showNativeShare?: boolean;
  className?: string;
}) {
  const { isSupported } = useShare();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showNativeShare && isSupported && (
        <ShareButton
          shareData={shareData}
          enableCopyFallback={false}
          label="공유"
        />
      )}
      {showCopy && shareData.url && (
        <CopyLinkButton url={shareData.url} />
      )}
    </div>
  );
}
