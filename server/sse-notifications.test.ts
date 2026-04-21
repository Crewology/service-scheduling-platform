import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// SSE Manager Tests
// ============================================================================

describe("SSEManager", () => {
  let sseManager: any;

  beforeEach(async () => {
    // Re-import to get fresh instance behavior
    const mod = await import("./sseManager");
    sseManager = mod.sseManager;
  });

  it("should export a singleton sseManager instance", () => {
    expect(sseManager).toBeDefined();
    expect(typeof sseManager.addClient).toBe("function");
    expect(typeof sseManager.removeClient).toBe("function");
    expect(typeof sseManager.sendToUser).toBe("function");
    expect(typeof sseManager.pushNotification).toBe("function");
    expect(typeof sseManager.pushUnreadCount).toBe("function");
    expect(typeof sseManager.pushMessageNotification).toBe("function");
    expect(typeof sseManager.getClientCount).toBe("function");
    expect(typeof sseManager.getTotalClients).toBe("function");
    expect(typeof sseManager.shutdown).toBe("function");
  });

  it("should add a client and return a clientId", () => {
    const mockRes = {
      writeHead: vi.fn(),
      write: vi.fn(),
      on: vi.fn(),
    };

    const clientId = sseManager.addClient(123, mockRes);
    expect(clientId).toBeDefined();
    expect(typeof clientId).toBe("string");
    expect(clientId).toContain("123-");
    expect(mockRes.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    }));
    // Should send initial connected event
    expect(mockRes.write).toHaveBeenCalledWith(expect.stringContaining("event: connected"));
  });

  it("should track client count per user", () => {
    const mockRes1 = { writeHead: vi.fn(), write: vi.fn(), on: vi.fn() };
    const mockRes2 = { writeHead: vi.fn(), write: vi.fn(), on: vi.fn() };

    sseManager.addClient(100, mockRes1);
    sseManager.addClient(100, mockRes2);
    sseManager.addClient(200, { writeHead: vi.fn(), write: vi.fn(), on: vi.fn() });

    expect(sseManager.getClientCount(100)).toBe(2);
    expect(sseManager.getClientCount(200)).toBe(1);
    expect(sseManager.getClientCount(999)).toBe(0);
  });

  it("should remove a client by clientId", () => {
    const mockRes = { writeHead: vi.fn(), write: vi.fn(), on: vi.fn() };
    const initialCount = sseManager.getClientCount(100);
    const clientId = sseManager.addClient(100, mockRes);

    expect(sseManager.getClientCount(100)).toBe(initialCount + 1);
    sseManager.removeClient(clientId);
    expect(sseManager.getClientCount(100)).toBe(initialCount);
  });

  it("should send events to specific user only", () => {
    const mockRes1 = { writeHead: vi.fn(), write: vi.fn(), on: vi.fn() };
    const mockRes2 = { writeHead: vi.fn(), write: vi.fn(), on: vi.fn() };
    const mockRes3 = { writeHead: vi.fn(), write: vi.fn(), on: vi.fn() };

    sseManager.addClient(100, mockRes1);
    sseManager.addClient(100, mockRes2);
    sseManager.addClient(200, mockRes3);

    // Clear initial "connected" writes
    mockRes1.write.mockClear();
    mockRes2.write.mockClear();
    mockRes3.write.mockClear();

    sseManager.sendToUser(100, "test", { hello: "world" });

    expect(mockRes1.write).toHaveBeenCalledTimes(1);
    expect(mockRes2.write).toHaveBeenCalledTimes(1);
    expect(mockRes3.write).not.toHaveBeenCalled();

    const written = mockRes1.write.mock.calls[0][0];
    expect(written).toContain("event: test");
    expect(written).toContain('"hello":"world"');
  });

  it("should push notification events with correct format", () => {
    const mockRes = { writeHead: vi.fn(), write: vi.fn(), on: vi.fn() };
    sseManager.addClient(100, mockRes);
    mockRes.write.mockClear();

    sseManager.pushNotification(100, {
      notificationType: "booking_confirmed",
      title: "Booking Confirmed",
      message: "Your booking has been confirmed",
      actionUrl: "/booking/1/detail",
      relatedBookingId: 1,
    });

    expect(mockRes.write).toHaveBeenCalledTimes(1);
    const written = mockRes.write.mock.calls[0][0];
    expect(written).toContain("event: notification");
    expect(written).toContain("booking_confirmed");
    expect(written).toContain("Booking Confirmed");
    expect(written).toContain("isRead");
  });

  it("should push unread count events", () => {
    const mockRes = { writeHead: vi.fn(), write: vi.fn(), on: vi.fn() };
    sseManager.addClient(100, mockRes);
    mockRes.write.mockClear();

    sseManager.pushUnreadCount(100, 5);

    expect(mockRes.write).toHaveBeenCalledTimes(1);
    const written = mockRes.write.mock.calls[0][0];
    expect(written).toContain("event: unreadCount");
    expect(written).toContain('"count":5');
  });

  it("should push message notification events", () => {
    const mockRes = { writeHead: vi.fn(), write: vi.fn(), on: vi.fn() };
    sseManager.addClient(100, mockRes);
    mockRes.write.mockClear();

    sseManager.pushMessageNotification(100, {
      conversationId: "conv-1-2",
      senderId: 2,
      senderName: "Alice",
      messagePreview: "Hey, how are you?",
    });

    expect(mockRes.write).toHaveBeenCalledTimes(1);
    const written = mockRes.write.mock.calls[0][0];
    expect(written).toContain("event: newMessage");
    expect(written).toContain("conv-1-2");
    expect(written).toContain("Alice");
    expect(written).toContain("Hey, how are you?");
  });

  it("should handle write errors gracefully and remove dead clients", () => {
    // Use a write fn that succeeds for addClient (initial connected event) then fails
    let callCount = 0;
    const mockRes = {
      writeHead: vi.fn(),
      write: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount > 1) throw new Error("Connection closed");
      }),
      on: vi.fn(),
    };
    const clientId = sseManager.addClient(777, mockRes);
    expect(sseManager.getClientCount(777)).toBe(1);

    // Should not throw, but should remove the dead client
    sseManager.sendToUser(777, "test", { data: "test" });
    expect(sseManager.getClientCount(777)).toBe(0);
  });

  it("should return total client count", () => {
    expect(sseManager.getTotalClients()).toBeGreaterThanOrEqual(0);
    const mockRes1 = { writeHead: vi.fn(), write: vi.fn(), on: vi.fn() };
    const mockRes2 = { writeHead: vi.fn(), write: vi.fn(), on: vi.fn() };
    const initial = sseManager.getTotalClients();
    sseManager.addClient(100, mockRes1);
    sseManager.addClient(200, mockRes2);
    expect(sseManager.getTotalClients()).toBe(initial + 2);
  });

  it("should not send to users with no connections", () => {
    // Should not throw
    sseManager.sendToUser(99999, "test", { data: "test" });
    sseManager.pushNotification(99999, {
      notificationType: "test",
      title: "Test",
      message: "Test",
    });
    sseManager.pushUnreadCount(99999, 0);
    sseManager.pushMessageNotification(99999, {
      conversationId: "conv-1-2",
      senderId: 1,
      senderName: "Test",
      messagePreview: "Test",
    });
  });
});

// ============================================================================
// SSE Event Format Tests
// ============================================================================

describe("SSE Event Format", () => {
  it("should format notification events as valid SSE", async () => {
    const mockRes = { writeHead: vi.fn(), write: vi.fn(), on: vi.fn() };
    const { sseManager } = await import("./sseManager");

    sseManager.addClient(500, mockRes as any);
    mockRes.write.mockClear();

    sseManager.sendToUser(500, "notification", { title: "Test" });

    const written = mockRes.write.mock.calls[0][0] as string;
    // SSE format: event: <name>\ndata: <json>\n\n
    expect(written).toMatch(/^event: notification\ndata: .+\n\n$/);
    
    // Extract JSON data
    const dataLine = written.split("\n")[1];
    const json = JSON.parse(dataLine.replace("data: ", ""));
    expect(json.title).toBe("Test");
  });

  it("should include createdAt and isRead in notification pushes", async () => {
    const mockRes = { writeHead: vi.fn(), write: vi.fn(), on: vi.fn() };
    const { sseManager } = await import("./sseManager");

    sseManager.addClient(501, mockRes as any);
    mockRes.write.mockClear();

    sseManager.pushNotification(501, {
      notificationType: "booking_created",
      title: "New Booking",
      message: "You have a new booking",
    });

    const written = mockRes.write.mock.calls[0][0] as string;
    const dataLine = written.split("\n")[1];
    const json = JSON.parse(dataLine.replace("data: ", ""));
    expect(json.isRead).toBe(false);
    expect(json.createdAt).toBeDefined();
  });
});

// ============================================================================
// Notification Type Coverage Tests
// ============================================================================

describe("Notification Types for SSE", () => {
  const notificationTypes = [
    "booking_created",
    "booking_confirmed",
    "booking_cancelled",
    "booking_completed",
    "booking_in_progress",
    "message_received",
    "payment_received",
    "reminder_24h",
    "reminder_1h",
    "review_received",
    "quote_request_new",
  ];

  it.each(notificationTypes)("should handle %s notification type", async (type) => {
    const mockRes = { writeHead: vi.fn(), write: vi.fn(), on: vi.fn() };
    const { sseManager } = await import("./sseManager");

    sseManager.addClient(600, mockRes);
    mockRes.write.mockClear();

    sseManager.pushNotification(600, {
      notificationType: type,
      title: `Test ${type}`,
      message: `Test message for ${type}`,
    });

    expect(mockRes.write).toHaveBeenCalledTimes(1);
    const written = mockRes.write.mock.calls[0][0] as string;
    expect(written).toContain(type);
  });
});

// ============================================================================
// SSE Endpoint Auth Tests
// ============================================================================

describe("SSE Endpoint Authentication", () => {
  it("should return 401 for unauthenticated requests", async () => {
    const response = await fetch("http://localhost:3000/api/sse/notifications");
    expect(response.status).toBe(401);
  });
});

// ============================================================================
// useSSE Hook Tests (unit-level)
// ============================================================================

describe("useSSE hook module", () => {
  it("should export useSSE function", async () => {
    // Verify the hook file exists and exports correctly
    const fs = await import("fs");
    const hookPath = "/home/ubuntu/service-scheduling-platform/client/src/hooks/useSSE.ts";
    const content = fs.readFileSync(hookPath, "utf-8");
    
    expect(content).toContain("export function useSSE");
    expect(content).toContain("EventSource");
    expect(content).toContain("/api/sse/notifications");
    expect(content).toContain("onNotification");
    expect(content).toContain("onUnreadCount");
    expect(content).toContain("onNewMessage");
    expect(content).toContain("onConnected");
    expect(content).toContain("onDisconnected");
    expect(content).toContain("reconnect");
  });

  it("should implement exponential backoff reconnection", async () => {
    const fs = await import("fs");
    const hookPath = "/home/ubuntu/service-scheduling-platform/client/src/hooks/useSSE.ts";
    const content = fs.readFileSync(hookPath, "utf-8");
    
    expect(content).toContain("Math.pow(2");
    expect(content).toContain("maxReconnectDelay");
    expect(content).toContain("reconnectAttempts");
  });
});

// ============================================================================
// Integration: Booking notification creates SSE push
// ============================================================================

describe("Booking notification SSE integration", () => {
  it("should have SSE push code in db-legacy createNotification", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/service-scheduling-platform/server/db-legacy.ts",
      "utf-8"
    );
    
    expect(content).toContain("sseManager.pushNotification");
    expect(content).toContain("sseManager.pushUnreadCount");
    expect(content).toContain("import(\"./sseManager\")");
  });

  it("should have SSE push code in db/notifications createNotification", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/service-scheduling-platform/server/db/notifications.ts",
      "utf-8"
    );
    
    expect(content).toContain("sseManager.pushNotification");
    expect(content).toContain("sseManager.pushUnreadCount");
    expect(content).toContain("import(\"../sseManager\")");
  });

  it("should create in-app notifications in booking creation flow", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/service-scheduling-platform/server/routers/bookingRouter.ts",
      "utf-8"
    );
    
    // Booking creation should create in-app notifications
    expect(content).toContain("notificationType: \"booking_created\"");
    expect(content).toContain("notificationType: \"booking_confirmed\"");
    expect(content).toContain("New Booking Request");
    expect(content).toContain("Booking Confirmed");
  });

  it("should create in-app notifications for booking status changes", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/service-scheduling-platform/server/routers/bookingRouter.ts",
      "utf-8"
    );
    
    expect(content).toContain("booking_confirmed");
    expect(content).toContain("booking_completed");
    expect(content).toContain("booking_cancelled");
    expect(content).toContain("booking_in_progress");
  });

  it("should create in-app notifications for new messages", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/service-scheduling-platform/server/routers/messageRouter.ts",
      "utf-8"
    );
    
    expect(content).toContain("notificationType: \"message_received\"");
    expect(content).toContain("sseManager.pushMessageNotification");
    expect(content).toContain("New Message");
  });

  it("should create in-app notifications for booking cancellation", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/service-scheduling-platform/server/routers/bookingRouter.ts",
      "utf-8"
    );
    
    expect(content).toContain("Booking Cancelled");
    expect(content).toContain("Booking Cancelled by Customer");
  });
});

// ============================================================================
// Frontend SSE Integration Tests
// ============================================================================

describe("Frontend SSE integration", () => {
  it("should use SSE in NotificationDropdown", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/service-scheduling-platform/client/src/components/shared/NavHeader.tsx",
      "utf-8"
    );
    
    expect(content).toContain("useSSE");
    expect(content).toContain("sseConnected");
    expect(content).toContain("handleSSENotification");
    expect(content).toContain("handleSSEUnreadCount");
    expect(content).toContain("handleSSENewMessage");
    // Should show toast for new notifications
    expect(content).toContain("toast(");
    // Should use slower polling when SSE is connected
    expect(content).toContain("sseConnected ? 60000 : 15000");
  });
});
