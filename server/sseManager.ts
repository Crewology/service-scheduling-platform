import type { Response } from "express";

/**
 * SSE (Server-Sent Events) Manager
 * 
 * Manages real-time connections to push notifications to connected clients.
 * Each user can have multiple connections (multiple tabs/devices).
 * 
 * Events pushed:
 *   - notification: New in-app notification (booking, message, payment, etc.)
 *   - unreadCount: Updated unread notification count
 */

interface SSEClient {
  id: string;
  userId: number;
  res: Response;
  connectedAt: number;
}

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Send heartbeat every 30s to keep connections alive
    this.heartbeatInterval = setInterval(() => {
      this.broadcast(":heartbeat\n\n");
    }, 30000);
  }

  /**
   * Register a new SSE client connection
   */
  addClient(userId: number, res: Response): string {
    const clientId = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    });

    // Send initial connection event
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);

    const client: SSEClient = {
      id: clientId,
      userId,
      res,
      connectedAt: Date.now(),
    };

    this.clients.set(clientId, client);
    console.log(`[SSE] Client connected: ${clientId} (user ${userId}). Total: ${this.clients.size}`);

    // Clean up on disconnect
    res.on("close", () => {
      this.removeClient(clientId);
    });

    return clientId;
  }

  /**
   * Remove a client connection
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      console.log(`[SSE] Client disconnected: ${clientId} (user ${client.userId}). Total: ${this.clients.size}`);
    }
  }

  /**
   * Send an event to all connections for a specific user
   */
  sendToUser(userId: number, event: string, data: any): void {
    let sent = 0;
    for (const client of Array.from(this.clients.values())) {
      if (client.userId === userId) {
        try {
          client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
          sent++;
        } catch (err) {
          console.error(`[SSE] Error sending to client ${client.id}:`, err);
          this.removeClient(client.id);
        }
      }
    }
    if (sent > 0) {
      console.log(`[SSE] Sent "${event}" to user ${userId} (${sent} connection${sent > 1 ? "s" : ""})`);
    }
  }

  /**
   * Send a notification event to a user
   * This is the main method called when a new notification is created
   */
  pushNotification(userId: number, notification: {
    id?: number;
    notificationType: string;
    title: string;
    message: string;
    actionUrl?: string | null;
    relatedBookingId?: number | null;
    createdAt?: Date | string;
  }): void {
    this.sendToUser(userId, "notification", {
      ...notification,
      createdAt: notification.createdAt || new Date().toISOString(),
      isRead: false,
    });
  }

  /**
   * Send updated unread count to a user
   */
  pushUnreadCount(userId: number, count: number): void {
    this.sendToUser(userId, "unreadCount", { count });
  }

  /**
   * Send a message notification to a user
   */
  pushMessageNotification(userId: number, data: {
    conversationId: string;
    senderId: number;
    senderName: string;
    messagePreview: string;
    bookingId?: number;
  }): void {
    this.sendToUser(userId, "newMessage", data);
  }

  /**
   * Send a typing indicator event to a user
   */
  pushTypingIndicator(userId: number, data: {
    conversationId: string;
    senderId: number;
    senderName: string;
    isTyping: boolean;
  }): void {
    this.sendToUser(userId, "typing", data);
  }

  /**
   * Send a read receipt event to a user (sender sees their messages were read)
   */
  pushReadReceipt(userId: number, data: {
    conversationId: string;
    readBy: number;
    readAt: string;
  }): void {
    this.sendToUser(userId, "readReceipt", data);
  }

  /**
   * Broadcast raw data to all connected clients (used for heartbeat)
   */
  private broadcast(data: string): void {
    for (const client of Array.from(this.clients.values())) {
      try {
        client.res.write(data);
      } catch {
        this.removeClient(client.id);
      }
    }
  }

  /**
   * Get count of connected clients for a user
   */
  getClientCount(userId: number): number {
    let count = 0;
    for (const client of Array.from(this.clients.values())) {
      if (client.userId === userId) count++;
    }
    return count;
  }

  /**
   * Get total number of connected clients
   */
  getTotalClients(): number {
    return this.clients.size;
  }

  /**
   * Clean up all connections (for graceful shutdown)
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    for (const client of Array.from(this.clients.values())) {
      try {
        client.res.end();
      } catch {
        // Ignore errors during shutdown
      }
    }
    this.clients.clear();
    console.log("[SSE] Manager shut down, all clients disconnected");
  }
}

// Singleton instance
export const sseManager = new SSEManager();
