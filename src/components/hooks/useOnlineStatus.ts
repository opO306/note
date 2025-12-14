import { useState, useEffect } from "react";

interface OnlineStatus {
  isOnline: boolean;
  wasOffline: boolean;
  downlink?: number;
  effectiveType?: string;
  saveData?: boolean;
}

/**
 * Hook to detect online/offline status with connection quality
 * Also tracks if the user was previously offline for reconnection handling
 */
export function useOnlineStatus(): OnlineStatus {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState<{
    downlink?: number;
    effectiveType?: string;
    saveData?: boolean;
  }>({});

  useEffect(() => {
    // Update connection info
    const updateConnectionInfo = () => {
      if ("connection" in navigator) {
        const conn = (navigator as any).connection;
        setConnectionInfo({
          downlink: conn?.downlink,
          effectiveType: conn?.effectiveType,
          saveData: conn?.saveData,
        });
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      // Mark that we were offline if we're coming back online
      if (!isOnline) {
        setWasOffline(true);
        // Reset wasOffline after 5 seconds
        setTimeout(() => setWasOffline(false), 5000);
      }
      updateConnectionInfo();
    };

    const handleOffline = () => {
      setIsOnline(false);
      updateConnectionInfo();
    };

    const handleConnectionChange = () => {
      updateConnectionInfo();
    };

    // Initial connection info
    updateConnectionInfo();

    // Listen to online/offline events
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen to connection changes (Network Information API)
    if ("connection" in navigator) {
      const conn = (navigator as any).connection;
      conn?.addEventListener("change", handleConnectionChange);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if ("connection" in navigator) {
        const conn = (navigator as any).connection;
        conn?.removeEventListener("change", handleConnectionChange);
      }
    };
  }, [isOnline]);

  return {
    isOnline,
    wasOffline,
    ...connectionInfo,
  };
}

/**
 * Hook to get simplified connection quality
 */
export function useConnectionQuality(): "good" | "poor" | "offline" {
  const { isOnline, effectiveType, downlink } = useOnlineStatus();

  if (!isOnline) return "offline";

  // Check effective type
  if (effectiveType === "slow-2g" || effectiveType === "2g") return "poor";

  // Check downlink (Mbps)
  if (downlink !== undefined && downlink < 1) return "poor";

  return "good";
}

/**
 * Hook to track network requests and detect connectivity issues
 */
export function useNetworkMonitor() {
  const [failedRequests, setFailedRequests] = useState(0);
  const [lastFailedTime, setLastFailedTime] = useState<Date | null>(null);

  const recordFailure = () => {
    setFailedRequests((prev) => prev + 1);
    setLastFailedTime(new Date());
  };

  const recordSuccess = () => {
    setFailedRequests(0);
    setLastFailedTime(null);
  };

  const hasConnectivityIssues = failedRequests >= 3;

  useEffect(() => {
    // Reset failed requests after 30 seconds
    if (failedRequests > 0) {
      const timer = setTimeout(() => {
        setFailedRequests(0);
        setLastFailedTime(null);
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [failedRequests]);

  return {
    failedRequests,
    lastFailedTime,
    hasConnectivityIssues,
    recordFailure,
    recordSuccess,
  };
}
