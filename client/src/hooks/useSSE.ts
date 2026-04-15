import { useEffect, useRef, useCallback } from "react";

type SSEEventHandler = (data: any) => void;

interface UseSSEOptions {
  enabled?: boolean;
  onNotification?: SSEEventHandler;
  onUnreadCount?: SSEEventHandler;
  onNewMessage?: SSEEventHandler;
  onConnected?: (clientId: string) => void;
  onDisconnected?: () => void;
}

/**
 * React hook for Server-Sent Events (SSE) real-time notifications.
 * 
 * Automatically connects when enabled, reconnects on disconnect,
 * and cleans up on unmount.
 */
export function useSSE(options: UseSSEOptions = {}) {
  const {
    enabled = true,
    onNotification,
    onUnreadCount,
    onNewMessage,
    onConnected,
    onDisconnected,
  } = options;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectDelay = 30000; // 30 seconds max

  // Store latest callbacks in refs to avoid reconnection on handler change
  const handlersRef = useRef({
    onNotification,
    onUnreadCount,
    onNewMessage,
    onConnected,
    onDisconnected,
  });
  handlersRef.current = {
    onNotification,
    onUnreadCount,
    onNewMessage,
    onConnected,
    onDisconnected,
  };

  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      const es = new EventSource("/api/sse/notifications", {
        withCredentials: true,
      });

      es.addEventListener("connected", (e) => {
        reconnectAttempts.current = 0;
        try {
          const data = JSON.parse(e.data);
          handlersRef.current.onConnected?.(data.clientId);
        } catch {
          // ignore parse errors
        }
      });

      es.addEventListener("notification", (e) => {
        try {
          const data = JSON.parse(e.data);
          handlersRef.current.onNotification?.(data);
        } catch {
          // ignore parse errors
        }
      });

      es.addEventListener("unreadCount", (e) => {
        try {
          const data = JSON.parse(e.data);
          handlersRef.current.onUnreadCount?.(data);
        } catch {
          // ignore parse errors
        }
      });

      es.addEventListener("newMessage", (e) => {
        try {
          const data = JSON.parse(e.data);
          handlersRef.current.onNewMessage?.(data);
        } catch {
          // ignore parse errors
        }
      });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        handlersRef.current.onDisconnected?.();

        // Exponential backoff reconnect
        const delay = Math.min(
          1000 * Math.pow(2, reconnectAttempts.current),
          maxReconnectDelay
        );
        reconnectAttempts.current++;

        reconnectTimeoutRef.current = setTimeout(() => {
          if (enabled) connect();
        }, delay);
      };

      eventSourceRef.current = es;
    } catch {
      // EventSource not supported or connection failed
      console.warn("[SSE] Failed to create EventSource connection");
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      // Clean up if disabled
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      return;
    }

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [enabled, connect]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  return { disconnect };
}
