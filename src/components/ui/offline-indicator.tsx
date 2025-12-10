import { useEffect, useState } from "react";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { Alert, AlertDescription } from "./alert";
import { Badge } from "./badge";
import { Button } from "./button";
import { 
  WifiOff, 
  Wifi, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { cn } from "./utils";

interface OfflineIndicatorProps {
  position?: "top" | "bottom";
  variant?: "banner" | "badge" | "toast";
  showReconnectButton?: boolean;
  onReconnect?: () => void;
}

/**
 * Component that displays online/offline status
 */
export function OfflineIndicator({
  position = "top",
  variant = "banner",
  showReconnectButton = true,
  onReconnect,
}: OfflineIndicatorProps) {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [show, setShow] = useState(!isOnline);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShow(true);
      setShowReconnected(false);
    } else if (wasOffline) {
      // Show reconnected message
      setShowReconnected(true);
      setShow(true);
      
      // Hide after 3 seconds
      const timer = setTimeout(() => {
        setShow(false);
        setShowReconnected(false);
      }, 3000);

      return () => clearTimeout(timer);
    } else {
      setShow(false);
      setShowReconnected(false);
    }
  }, [isOnline, wasOffline]);

  const handleReconnect = () => {
    if (onReconnect) {
      onReconnect();
    } else {
      window.location.reload();
    }
  };

  if (!show) return null;

  // Badge variant
  if (variant === "badge") {
    return (
      <Badge
        variant={isOnline ? "default" : "destructive"}
        className={cn(
          "fixed z-50 flex items-center gap-1.5 px-3 py-1.5",
          position === "top" ? "top-4 right-4" : "bottom-4 right-4",
          "animate-in slide-in-from-top-2 fade-in",
          "safe-top"
        )}
      >
        {isOnline ? (
          <>
            <Wifi className="w-3.5 h-3.5" />
            <span className="text-xs">온라인</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5" />
            <span className="text-xs">오프라인</span>
          </>
        )}
      </Badge>
    );
  }

  // Toast variant
  if (variant === "toast") {
    return (
      <div
        className={cn(
          "fixed z-50 left-1/2 -translate-x-1/2",
          position === "top" ? "top-4 safe-top" : "bottom-4 safe-nav-bottom",
          "animate-in slide-in-from-top-2 fade-in"
        )}
      >
        <Alert
          className={cn(
            "shadow-lg border-2",
            showReconnected
              ? "bg-success/10 border-success text-success-foreground"
              : "bg-destructive/10 border-destructive text-destructive-foreground"
          )}
        >
          <div className="flex items-center gap-3">
            {showReconnected ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <AlertDescription className="text-sm font-medium">
                  인터넷에 다시 연결되었습니다
                </AlertDescription>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5" />
                <AlertDescription className="text-sm font-medium">
                  인터넷 연결이 끊어졌습니다
                </AlertDescription>
              </>
            )}
          </div>
        </Alert>
      </div>
    );
  }

  // Banner variant (default)
  return (
    <div
      className={cn(
        "fixed left-0 right-0 z-50",
        position === "top" ? "top-0 safe-top" : "bottom-0 safe-nav-bottom",
        "animate-in slide-in-from-top-2 fade-in"
      )}
    >
      <Alert
        className={cn(
          "rounded-none border-x-0 border-t-0",
          showReconnected
            ? "bg-success/10 border-success"
            : "bg-destructive/10 border-destructive"
        )}
      >
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {showReconnected ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-success" />
                <div>
                  <AlertDescription className="font-medium text-success">
                    다시 온라인 상태입니다
                  </AlertDescription>
                  <p className="text-xs text-success/80 mt-0.5">
                    모든 기능을 정상적으로 사용할 수 있습니다
                  </p>
                </div>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-destructive" />
                <div>
                  <AlertDescription className="font-medium text-destructive">
                    인터넷 연결 없음
                  </AlertDescription>
                  <p className="text-xs text-destructive/80 mt-0.5">
                    일부 기능이 제한될 수 있습니다
                  </p>
                </div>
              </>
            )}
          </div>

          {!showReconnected && showReconnectButton && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReconnect}
              className="flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>재시도</span>
            </Button>
          )}
        </div>
      </Alert>
    </div>
  );
}

/**
 * Simple connection status badge for headers
 */
export function ConnectionBadge() {
  const { isOnline, effectiveType } = useOnlineStatus();

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {isOnline ? (
        <>
          <Wifi className="w-3.5 h-3.5 text-success" />
          {effectiveType && (
            <span className="hidden sm:inline">
              {effectiveType === "4g" ? "빠름" : effectiveType === "3g" ? "보통" : "느림"}
            </span>
          )}
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 text-destructive" />
          <span className="hidden sm:inline">오프라인</span>
        </>
      )}
    </div>
  );
}

/**
 * Network quality indicator with visual feedback
 */
export function NetworkQualityIndicator() {
  const { isOnline, effectiveType, downlink } = useOnlineStatus();

  const getQualityLevel = () => {
    if (!isOnline) return 0;
    if (effectiveType === "4g" || (downlink && downlink > 5)) return 3;
    if (effectiveType === "3g" || (downlink && downlink > 1)) return 2;
    return 1;
  };

  const quality = getQualityLevel();

  return (
    <div className="flex items-center gap-1" title={isOnline ? `연결: ${effectiveType || "알 수 없음"}` : "오프라인"}>
      {[1, 2, 3].map((level) => (
        <div
          key={level}
          className={cn(
            "w-1 rounded-full transition-all",
            level === 1 && "h-2",
            level === 2 && "h-3",
            level === 3 && "h-4",
            level <= quality ? "bg-success" : "bg-muted"
          )}
        />
      ))}
    </div>
  );
}

/**
 * Slow connection warning
 */
export function SlowConnectionWarning() {
  const { isOnline, effectiveType, downlink } = useOnlineStatus();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShow(false);
      return;
    }

    const isSlow =
      effectiveType === "slow-2g" ||
      effectiveType === "2g" ||
      (downlink !== undefined && downlink < 0.5);

    setShow(isSlow);
  }, [isOnline, effectiveType, downlink]);

  if (!show) return null;

  return (
    <Alert variant="default" className="bg-warning/10 border-warning">
      <AlertTriangle className="w-4 h-4 text-warning" />
      <AlertDescription className="text-sm">
        <span className="font-medium text-warning">느린 연결 감지</span>
        <p className="text-xs text-warning/80 mt-1">
          일부 콘텐츠 로딩이 느릴 수 있습니다
        </p>
      </AlertDescription>
    </Alert>
  );
}
