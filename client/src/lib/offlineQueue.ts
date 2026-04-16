/**
 * Offline Action Queue
 * 
 * Queues booking actions (cancel, reschedule) when the user is offline.
 * When connectivity returns, the service worker's Background Sync handler
 * replays the queued actions. Falls back to online-resume replay if
 * Background Sync API is not available.
 */

const QUEUE_KEY = "ologycrew-offline-queue";

export interface QueuedAction {
  id: string;
  type: "cancel_booking" | "reschedule_session" | "update_status";
  payload: Record<string, any>;
  timestamp: number;
  retries: number;
}

/** Get all queued actions */
export function getQueue(): QueuedAction[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Add an action to the offline queue */
export async function enqueueAction(
  type: QueuedAction["type"],
  payload: Record<string, any>
): Promise<void> {
  const action: QueuedAction = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload,
    timestamp: Date.now(),
    retries: 0,
  };

  const queue = getQueue();
  queue.push(action);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

  // Request Background Sync if available
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await (reg as any).sync.register("ologycrew-sync-actions");
    } catch {
      // Background Sync not available; will replay on online event
    }
  }
}

/** Remove a specific action from the queue */
export function dequeueAction(id: string): void {
  const queue = getQueue().filter((a) => a.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Clear the entire queue */
export function clearQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}

/** Update retry count for a failed action */
export function incrementRetry(id: string): void {
  const queue = getQueue().map((a) =>
    a.id === id ? { ...a, retries: a.retries + 1 } : a
  );
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Replay all queued actions against the server */
export async function replayQueue(): Promise<{
  succeeded: number;
  failed: number;
  remaining: QueuedAction[];
}> {
  const queue = getQueue();
  if (queue.length === 0) return { succeeded: 0, failed: 0, remaining: [] };

  let succeeded = 0;
  let failed = 0;

  for (const action of queue) {
    if (action.retries >= 3) {
      // Too many retries — leave in queue for manual resolution
      failed++;
      continue;
    }

    try {
      const endpoint = getEndpointForAction(action);
      const response = await fetch(endpoint.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(endpoint.body),
      });

      if (response.ok) {
        dequeueAction(action.id);
        succeeded++;
      } else if (response.status >= 400 && response.status < 500) {
        // Client error — remove from queue, won't succeed on retry
        dequeueAction(action.id);
        failed++;
      } else {
        // Server error — increment retry
        incrementRetry(action.id);
        failed++;
      }
    } catch {
      incrementRetry(action.id);
      failed++;
    }
  }

  return { succeeded, failed, remaining: getQueue() };
}

function getEndpointForAction(action: QueuedAction) {
  // tRPC batch endpoint format
  const baseUrl = "/api/trpc";

  switch (action.type) {
    case "cancel_booking":
      return {
        url: `${baseUrl}/booking.cancel?batch=1`,
        body: { "0": { json: action.payload } },
      };
    case "reschedule_session":
      return {
        url: `${baseUrl}/booking.rescheduleSession?batch=1`,
        body: { "0": { json: action.payload } },
      };
    case "update_status":
      return {
        url: `${baseUrl}/booking.updateStatus?batch=1`,
        body: { "0": { json: action.payload } },
      };
    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}
