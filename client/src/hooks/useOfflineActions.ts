import { useState, useEffect, useCallback } from "react";
import {
  enqueueAction,
  replayQueue,
  getQueue,
  clearQueue,
  type QueuedAction,
} from "@/lib/offlineQueue";
import { toast } from "sonner";

/**
 * Hook for offline-aware booking actions.
 * 
 * When online: executes the action immediately via the provided mutation.
 * When offline: queues the action and replays when connectivity returns.
 * Shows toast notifications for queued/replayed actions.
 */
export function useOfflineActions() {
  const [pendingActions, setPendingActions] = useState<QueuedAction[]>(getQueue());
  const [isSyncing, setIsSyncing] = useState(false);

  // Refresh pending actions from localStorage
  const refreshQueue = useCallback(() => {
    setPendingActions(getQueue());
  }, []);

  // Replay queued actions when coming back online
  const syncActions = useCallback(async () => {
    const queue = getQueue();
    if (queue.length === 0) return;

    setIsSyncing(true);
    toast.info(`Syncing ${queue.length} queued action${queue.length > 1 ? "s" : ""}...`);

    try {
      const result = await replayQueue();
      if (result.succeeded > 0) {
        toast.success(`${result.succeeded} action${result.succeeded > 1 ? "s" : ""} synced successfully`);
      }
      if (result.failed > 0 && result.remaining.length > 0) {
        toast.warning(`${result.remaining.length} action${result.remaining.length > 1 ? "s" : ""} still pending`);
      }
    } catch (err) {
      toast.error("Failed to sync some actions. Will retry later.");
    } finally {
      setIsSyncing(false);
      refreshQueue();
    }
  }, [refreshQueue]);

  // Listen for online event to trigger sync
  useEffect(() => {
    const handleOnline = () => {
      syncActions();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [syncActions]);

  // Listen for service worker messages about sync completion and replay requests
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_COMPLETE") {
        refreshQueue();
        if (event.data.succeeded > 0) {
          toast.success(`${event.data.succeeded} queued action${event.data.succeeded > 1 ? "s" : ""} synced`);
        }
      }
      if (event.data?.type === "REPLAY_OFFLINE_QUEUE") {
        // Background Sync triggered — replay the queue
        syncActions();
      }
    };

    navigator.serviceWorker?.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", handleMessage);
  }, [refreshQueue, syncActions]);

  /**
   * Execute a booking action, queueing it if offline.
   * Returns true if executed immediately, false if queued.
   */
  const executeOrQueue = useCallback(
    async (
      type: QueuedAction["type"],
      payload: Record<string, any>,
      onlineAction: () => Promise<any>
    ): Promise<boolean> => {
      if (navigator.onLine) {
        try {
          await onlineAction();
          return true;
        } catch (err: any) {
          // If it's a network error, queue it
          if (err.message?.includes("fetch") || err.message?.includes("network")) {
            await enqueueAction(type, payload);
            refreshQueue();
            toast.info("You appear to be offline. Action queued and will sync when connected.");
            return false;
          }
          throw err; // Re-throw non-network errors
        }
      } else {
        await enqueueAction(type, payload);
        refreshQueue();
        toast.info("Action queued. It will be processed when you're back online.", {
          duration: 5000,
        });
        return false;
      }
    },
    [refreshQueue]
  );

  return {
    pendingActions,
    pendingCount: pendingActions.length,
    isSyncing,
    executeOrQueue,
    syncActions,
    clearQueue: () => {
      clearQueue();
      refreshQueue();
    },
  };
}
