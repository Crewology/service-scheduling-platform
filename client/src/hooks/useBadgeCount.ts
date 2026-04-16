import { useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * PWA Badge Count Hook
 * 
 * Manages the app badge count on the PWA icon using navigator.setAppBadge().
 * Syncs with unread notification count from the server.
 * Automatically updates on visibility change (when user returns to the app).
 */
export function useBadgeCount() {
  const { user } = useAuth();
  const { data } = trpc.notification.unreadCount.useQuery(
    undefined,
    {
      enabled: !!user,
      refetchInterval: 60_000, // Refresh every minute
      refetchOnWindowFocus: true,
    }
  );
  const unreadCount = data?.count ?? 0;

  const updateBadge = useCallback((count: number) => {
    if (!("setAppBadge" in navigator)) return;

    try {
      if (count > 0) {
        (navigator as any).setAppBadge(count);
      } else {
        (navigator as any).clearAppBadge();
      }
    } catch (err) {
      // Badge API not supported or permission denied — silently ignore
      console.debug("[Badge] Failed to update badge:", err);
    }
  }, []);

  // Update badge whenever unread count changes
  useEffect(() => {
    updateBadge(unreadCount);
  }, [unreadCount, updateBadge]);

  // Clear badge when user views notifications
  const clearBadge = useCallback(() => {
    updateBadge(0);
  }, [updateBadge]);

  // Sync badge on visibility change (user returns to app)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateBadge(unreadCount);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [unreadCount, updateBadge]);

  return { unreadCount: unreadCount ?? 0, clearBadge };
}
