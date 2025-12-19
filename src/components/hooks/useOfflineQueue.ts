import { useState, useEffect, useCallback } from "react";
import { useOnlineStatus } from "./useOnlineStatus";

export interface QueuedAction {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retries: number;
}

const QUEUE_STORAGE_KEY = "offline_action_queue";
const MAX_RETRIES = 3;

/**
 * Hook to manage offline action queue
 * Stores actions when offline and processes them when back online
 */
export function useOfflineQueue() {
  const { isOnline } = useOnlineStatus();
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load queue from localStorage on mount
  useEffect(() => {
    try {
      const savedQueue = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (savedQueue) {
        setQueue(JSON.parse(savedQueue));
      }
    } catch (error) {
      console.error("Failed to load offline queue:", error);
    }
  }, []);

  // Save queue to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error("Failed to save offline queue:", error);
    }
  }, [queue]);

  /**
   * Add action to queue
   */
  const addToQueue = useCallback((type: string, data: any) => {
    const action: QueuedAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    setQueue((prev) => [...prev, action]);
    return action.id;
  }, []);

  /**
   * Remove action from queue
   */
  const removeFromQueue = useCallback((actionId: string) => {
    setQueue((prev) => prev.filter((action) => action.id !== actionId));
  }, []);

  /**
   * Clear entire queue
   */
  const clearQueue = useCallback(() => {
    setQueue([]);
    try {
      localStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear offline queue:", error);
    }
  }, []);

  /**
   * Process queue when online
   */
  const processQueue = useCallback(
    async (handler: (action: QueuedAction) => Promise<void>) => {
      if (!isOnline || isProcessing || queue.length === 0) {
        return;
      }

      setIsProcessing(true);

      const failedActions: QueuedAction[] = [];

      for (const action of queue) {
        try {
          await handler(action);
          // Success - remove from queue
          removeFromQueue(action.id);
        } catch (error) {
          console.error(`Failed to process action ${action.id}:`, error);

          // Increment retry count
          const updatedAction = {
            ...action,
            retries: action.retries + 1,
          };

          // If max retries reached, discard action
          if (updatedAction.retries >= MAX_RETRIES) {
            console.warn(`Action ${action.id} exceeded max retries, discarding`);
            removeFromQueue(action.id);
          } else {
            failedActions.push(updatedAction);
          }
        }
      }

      // Update failed actions with new retry counts
      if (failedActions.length > 0) {
        setQueue((prev) =>
          prev.map((action) => {
            const failedAction = failedActions.find((a) => a.id === action.id);
            return failedAction || action;
          })
        );
      }

      setIsProcessing(false);
    },
    [isOnline, isProcessing, queue, removeFromQueue]
  );

  /**
   * Get queue statistics
   */
  const getQueueStats = useCallback(() => {
    return {
      total: queue.length,
      pending: queue.filter((a) => a.retries === 0).length,
      retrying: queue.filter((a) => a.retries > 0).length,
      oldestTimestamp: queue.length > 0 ? Math.min(...queue.map((a) => a.timestamp)) : null,
    };
  }, [queue]);

  return {
    queue,
    isProcessing,
    addToQueue,
    removeFromQueue,
    clearQueue,
    processQueue,
    getQueueStats,
  };
}

/**
 * Hook for auto-syncing queue when coming back online
 */
export function useAutoSync(
  handler: (action: QueuedAction) => Promise<void>,
  options: { onSyncComplete?: () => void; onSyncError?: (error: Error) => void } = {}
) {
  const { isOnline, wasOffline } = useOnlineStatus();
  const { queue, processQueue, getQueueStats } = useOfflineQueue();
  const [lastSyncAttempt, setLastSyncAttempt] = useState<Date | null>(null);

  useEffect(() => {
    // Auto-sync when coming back online
    if (isOnline && wasOffline && queue.length > 0) {
      const sync = async () => {
        setLastSyncAttempt(new Date());
        try {
          await processQueue(handler);
          options.onSyncComplete?.();
        } catch (error) {
          console.error("Auto-sync failed:", error);
          options.onSyncError?.(error as Error);
        }
      };

      // Small delay to ensure connection is stable
      const timer = setTimeout(sync, 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOnline, wasOffline, queue.length, processQueue, handler, options]);

  return {
    lastSyncAttempt,
    queueStats: getQueueStats(),
  };
}
