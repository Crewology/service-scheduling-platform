import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  getUserConversations: vi.fn(),
  getConversationMessages: vi.fn(),
  getMessagesByBooking: vi.fn(),
  getBookingById: vi.fn(),
  getProviderByUserId: vi.fn(),
  getUserById: vi.fn(),
  markMessagesAsRead: vi.fn(),
  getUnreadMessageCount: vi.fn(),
  createMessage: vi.fn(),
  createNotification: vi.fn(),
}));

// Mock sseManager
vi.mock("./sseManager", () => ({
  sseManager: {
    pushMessageNotification: vi.fn(),
  },
}));

// Mock pushHelper
vi.mock("./notifications/pushHelper", () => ({
  sendPushNotification: vi.fn(),
}));

import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "customer",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("message.myConversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when no conversations exist", async () => {
    vi.mocked(db.getUserConversations).mockResolvedValue([]);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.message.myConversations();

    expect(result).toEqual([]);
    expect(db.getUserConversations).toHaveBeenCalledWith(1);
  });

  it("returns enriched conversations with user info", async () => {
    const mockConv = {
      id: 1,
      conversationId: "conv-1-2",
      senderId: 2,
      recipientId: 1,
      messageText: "Hello there!",
      bookingId: 10,
      isRead: false,
      readAt: null,
      attachmentUrl: null,
      createdAt: new Date("2026-04-19T00:00:00Z"),
    };

    vi.mocked(db.getUserConversations).mockResolvedValue([mockConv]);
    vi.mocked(db.getUserById).mockResolvedValue({
      id: 2,
      openId: "other-user",
      name: "Other User",
      email: "other@example.com",
      profilePhotoUrl: "https://example.com/photo.jpg",
      loginMethod: "manus",
      role: "provider",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as any);
    vi.mocked(db.getProviderByUserId).mockResolvedValue({
      id: 5,
      userId: 2,
      businessName: "Pro Services",
    } as any);
    vi.mocked(db.getBookingById).mockResolvedValue({
      id: 10,
      bookingNumber: "BK-123",
    } as any);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.message.myConversations();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      conversationId: "conv-1-2",
      otherUserId: 2,
      otherUserName: "Pro Services",
      lastMessage: "Hello there!",
      bookingId: 10,
      bookingLabel: "Booking #BK-123",
    });
  });
});

describe("message.unreadCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unread count for the user", async () => {
    vi.mocked(db.getUnreadMessageCount).mockResolvedValue(5);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.message.unreadCount();

    expect(result).toBe(5);
    expect(db.getUnreadMessageCount).toHaveBeenCalledWith(1);
  });
});

describe("message.listByBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns messages for a booking the user owns", async () => {
    vi.mocked(db.getBookingById).mockResolvedValue({
      id: 10,
      customerId: 1,
      providerId: 5,
    } as any);
    vi.mocked(db.getProviderByUserId).mockResolvedValue(null as any);
    vi.mocked(db.getMessagesByBooking).mockResolvedValue([
      { id: 1, messageText: "Hi", senderId: 1, recipientId: 2 },
    ] as any);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.message.listByBooking({ bookingId: 10 });

    expect(result).toHaveLength(1);
    expect(db.getMessagesByBooking).toHaveBeenCalledWith(10);
  });

  it("throws FORBIDDEN for unauthorized user", async () => {
    vi.mocked(db.getBookingById).mockResolvedValue({
      id: 10,
      customerId: 99,
      providerId: 88,
    } as any);
    vi.mocked(db.getProviderByUserId).mockResolvedValue(null as any);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.message.listByBooking({ bookingId: 10 })).rejects.toThrow("Access denied");
  });
});
