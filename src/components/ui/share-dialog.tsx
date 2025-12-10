import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";
import { Input } from "./input";
import { toast } from "@/toastHelper";
import { useClipboard } from "../hooks/useClipboard";
import { useShare, ShareData } from "../hooks/useShare";
import {
  socialShareUrls,
  SocialShareOptions,
  openShareWindow,
  trackShare,
  generateQRCodeUrl,
} from "../utils/shareUtils";
import {
  Share2,
  Link,
  Copy,
  Check,
  MessageCircle,
  Mail,
  Facebook,
  Twitter,
  Send,
  QrCode,
  X,
} from "lucide-react";
import { cn } from "./utils";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareData: ShareData;
  shareOptions: SocialShareOptions;
  /** 표시할 공유 방법들 */
  platforms?: Array<
    "native" | "link" | "twitter" | "facebook" | "whatsapp" | "telegram" | "email" | "kakao" | "line" | "qr"
  >;
  /** 공유할 콘텐츠 타입 (통계용) */
  contentType?: string;
  /** 공유할 콘텐츠 ID (통계용) */
  contentId?: string | number;
}

/**
 * 공유 다이얼로그 컴포넌트
 * 다양한 공유 옵션 제공
 */
export function ShareDialog({
  open,
  onOpenChange,
  shareData,
  shareOptions,
  platforms = ["native", "link", "twitter", "facebook", "whatsapp", "email"],
  contentType = "post",
  contentId,
}: ShareDialogProps) {
  const [showQR, setShowQR] = useState(false);

  const { share, isSupported: isNativeShareSupported } = useShare({
    onSuccess: () => {
      toast.success("공유되었습니다");
      onOpenChange(false);
      if (contentId) trackShare("native", contentType, contentId);
    },
  });

  const { copy, isCopied } = useClipboard({
    timeout: 2000,
    onSuccess: () => {
      toast.success("링크가 복사되었습니다");
      if (contentId) trackShare("clipboard", contentType, contentId);
    },
  });

  const handleNativeShare = async () => {
    await share(shareData);
  };

  const handleCopyLink = () => {
    if (shareData.url) {
      copy(shareData.url);
    }
  };

  const handleSocialShare = (platform: string, url: string) => {
    openShareWindow(url, `Share via ${platform}`, 600, 400);
    if (contentId) trackShare(platform, contentType, contentId);
  };

  const shareButtons = [
    {
      id: "native",
      label: "공유",
      icon: Share2,
      color: "text-blue-500",
      show: isNativeShareSupported && platforms.includes("native"),
      onClick: handleNativeShare,
    },
    {
      id: "link",
      label: isCopied ? "복사됨" : "링크 복사",
      icon: isCopied ? Check : Copy,
      color: "text-gray-500",
      show: platforms.includes("link") && shareData.url,
      onClick: handleCopyLink,
    },
    {
      id: "twitter",
      label: "Twitter",
      icon: Twitter,
      color: "text-[#1DA1F2]",
      show: platforms.includes("twitter"),
      onClick: () =>
        handleSocialShare("twitter", socialShareUrls.twitter(shareOptions)),
    },
    {
      id: "facebook",
      label: "Facebook",
      icon: Facebook,
      color: "text-[#1877F2]",
      show: platforms.includes("facebook"),
      onClick: () =>
        handleSocialShare("facebook", socialShareUrls.facebook(shareOptions)),
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      color: "text-[#25D366]",
      show: platforms.includes("whatsapp"),
      onClick: () =>
        handleSocialShare("whatsapp", socialShareUrls.whatsapp(shareOptions)),
    },
    {
      id: "telegram",
      label: "Telegram",
      icon: Send,
      color: "text-[#0088cc]",
      show: platforms.includes("telegram"),
      onClick: () =>
        handleSocialShare("telegram", socialShareUrls.telegram(shareOptions)),
    },
    {
      id: "email",
      label: "Email",
      icon: Mail,
      color: "text-gray-500",
      show: platforms.includes("email"),
      onClick: () =>
        handleSocialShare("email", socialShareUrls.email(shareOptions)),
    },
    {
      id: "qr",
      label: "QR 코드",
      icon: QrCode,
      color: "text-gray-500",
      show: platforms.includes("qr") && shareData.url,
      onClick: () => setShowQR(!showQR),
    },
  ];

  const visibleButtons = shareButtons.filter((btn) => btn.show);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            <span>공유하기</span>
          </DialogTitle>
          {shareData.title && (
            <DialogDescription className="line-clamp-2">
              {shareData.title}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* 링크 입력 필드 */}
          {shareData.url && (
            <div className="flex items-center space-x-2">
              <Input
                value={shareData.url}
                readOnly
                className="flex-1 text-sm"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={handleCopyLink}
              >
                {isCopied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          )}

          {/* 공유 버튼 그리드 */}
          <div className="grid grid-cols-4 gap-3">
            {visibleButtons.map((button) => (
              <button
                key={button.id}
                onClick={button.onClick}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-lg",
                  "hover:bg-muted transition-colors",
                  "touch-target"
                )}
              >
                <button.icon className={cn("w-6 h-6", button.color)} />
                <span className="text-xs text-center line-clamp-1">
                  {button.label}
                </span>
              </button>
            ))}
          </div>

          {/* QR 코드 표시 */}
          {showQR && shareData.url && (
            <div className="flex flex-col items-center gap-3 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-medium">QR 코드</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowQR(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <img
                src={generateQRCodeUrl(shareData.url, 200)}
                alt="QR Code"
                className="w-48 h-48 bg-white p-2 rounded-lg"
              />
              <p className="text-xs text-muted-foreground text-center">
                QR 코드를 스캔하여 공유하세요
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 간단한 공유 다이얼로그 (링크 복사만)
 */
export function SimpleLinkDialog({
  open,
  onOpenChange,
  url,
  title = "링크 공유",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title?: string;
}) {
  const { copy, isCopied } = useClipboard({
    timeout: 2000,
    onSuccess: () => toast.success("링크가 복사되었습니다"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <Input value={url} readOnly className="flex-1" />
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => copy(url)}
          >
            {isCopied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 게시글 공유 다이얼로그 (미리 구성된)
 */
export function PostShareDialog({
  open,
  onOpenChange,
  post,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: {
    id: number;
    title: string;
    content: string;
    author: string;
    category?: string;
    tags?: string[];
  };
}) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${baseUrl}/posts/${post.id}`;

  const shareData: ShareData = {
    title: post.title,
    text: `"${post.title}" by ${post.author}`,
    url,
  };

  const shareOptions: SocialShareOptions = {
    url,
    title: post.title,
    text: `"${post.title}" by ${post.author}`,
    hashtags: post.tags || [],
  };

  return (
    <ShareDialog
      open={open}
      onOpenChange={onOpenChange}
      shareData={shareData}
      shareOptions={shareOptions}
      contentType="post"
      contentId={post.id}
    />
  );
}
