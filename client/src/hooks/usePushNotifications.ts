import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";

type PushPermissionState = "default" | "granted" | "denied" | "unsupported";

export function usePushNotifications() {
  const [permission, setPermission] = useState<PushPermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const subscribeMutation = trpc.push.subscribe.useMutation();
  const unsubscribeMutation = trpc.push.unsubscribe.useMutation();
  const testMutation = trpc.push.test.useMutation();
  const statusQuery = trpc.push.status.useQuery(undefined, {
    enabled: permission === "granted",
  });

  // Check initial permission state
  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PushPermissionState);
  }, []);

  // Sync subscription status from server
  useEffect(() => {
    if (statusQuery.data) {
      setIsSubscribed(statusQuery.data.subscribed);
    }
  }, [statusQuery.data]);

  const subscribe = useCallback(async () => {
    if (permission === "unsupported") return false;
    setIsLoading(true);

    try {
      // Request permission
      const result = await Notification.requestPermission();
      setPermission(result as PushPermissionState);

      if (result !== "granted") {
        setIsLoading(false);
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from env
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.error("[Push] VAPID public key not configured");
        setIsLoading(false);
        return false;
      }

      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidKey);

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const json = subscription.toJSON();

      // Send subscription to server
      await subscribeMutation.mutateAsync({
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh!,
        auth: json.keys!.auth!,
        userAgent: navigator.userAgent,
      });

      setIsSubscribed(true);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("[Push] Subscription failed:", error);
      setIsLoading(false);
      return false;
    }
  }, [permission, subscribeMutation]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await unsubscribeMutation.mutateAsync({
          endpoint: subscription.endpoint,
        });
      }

      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error("[Push] Unsubscribe failed:", error);
      setIsLoading(false);
      return false;
    }
  }, [unsubscribeMutation]);

  const sendTest = useCallback(async () => {
    try {
      const result = await testMutation.mutateAsync();
      return result.success;
    } catch {
      return false;
    }
  }, [testMutation]);

  return {
    permission,
    isSubscribed,
    isLoading,
    isSupported: permission !== "unsupported",
    subscribe,
    unsubscribe,
    sendTest,
  };
}

/**
 * Convert a base64 URL-safe string to a Uint8Array for applicationServerKey.
 */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}
