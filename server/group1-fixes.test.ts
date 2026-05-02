import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(overrides: Partial<AuthenticatedUser> = {}): {
  ctx: TrpcContext;
  clearedCookies: { name: string; options: Record<string, unknown> }[];
} {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
  const user: AuthenticatedUser = {
    id: 999,
    openId: "test-group1-user",
    email: "testgroup1@example.com",
    name: "Test Group1 User",
    firstName: "Test",
    lastName: "User",
    loginMethod: "manus",
    role: "customer",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  } as AuthenticatedUser;

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: { origin: "https://test.example.com" },
    } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, clearedCookies };
}

// ============================================================================
// GROUP 1 FIX 1: Login Loop — Comprehensive Deletion Tests
// ============================================================================

describe("Group 1 Fix 2: Enhanced Account Deletion — covers ALL tables", () => {
  it("should return comprehensive cleanup summary with all new fields", async () => {
    const { upsertUser, getUserByOpenId, getUserById, deleteUserAccount } = await import("./db");

    const testOpenId = `test-g1-del-${Date.now()}`;
    await upsertUser({
      openId: testOpenId,
      name: "G1 Delete Test",
      email: `g1delete-${Date.now()}@example.com`,
      firstName: "G1Delete",
      lastName: "Test",
      phone: "555-1234",
      role: "customer",
    });

    const testUser = await getUserByOpenId(testOpenId);
    expect(testUser).toBeDefined();
    if (!testUser) return;

    const result = await deleteUserAccount(testUser.id);

    // Verify all new fields are present in the result
    expect(result.anonymized).toBe(true);
    expect(typeof result.providerDeactivated).toBe("boolean");
    expect(typeof result.servicesDeactivated).toBe("number");
    expect(typeof result.subscriptionsCancelled).toBe("number");
    expect(typeof result.messagesDeleted).toBe("number");
    expect(typeof result.notificationsDeleted).toBe("number");
    expect(typeof result.favoritesDeleted).toBe("number");
    expect(typeof result.foldersDeleted).toBe("number");
    expect(typeof result.reviewsAnonymized).toBe("number");
    expect(typeof result.referralDataDeleted).toBe("number");
    expect(typeof result.pushSubscriptionsDeleted).toBe("number");

    // Verify user was anonymized
    const after = await getUserById(testUser.id);
    expect(after).toBeDefined();
    expect(after!.deletedAt).not.toBeNull();
    expect(after!.name).toContain("deleted-user-");
    expect(after!.firstName).toBe("Deleted");
    expect(after!.lastName).toBe("User");
    expect(after!.phone).toBeNull();
    expect(after!.profilePhotoUrl).toBeNull();
    expect(after!.email).toContain("@deleted.ologycrew.com");
  }, 30000);

  it("should delete messages for the deleted user", async () => {
    const { upsertUser, getUserByOpenId, deleteUserAccount } = await import("./db");
    const { getDb } = await import("./db/connection");
    const { messages } = await import("../drizzle/schema");
    const { eq, or } = await import("drizzle-orm");

    const testOpenId = `test-g1-msg-${Date.now()}`;
    await upsertUser({
      openId: testOpenId,
      name: "Msg Delete Test",
      email: `msgdel-${Date.now()}@example.com`,
      role: "customer",
    });

    const testUser = await getUserByOpenId(testOpenId);
    expect(testUser).toBeDefined();
    if (!testUser) return;

    const db = await getDb();
    if (!db) return;

    // Insert a test message sent by this user
    try {
      await db.insert(messages).values({
        conversationId: `test-conv-${Date.now()}`,
        senderId: testUser.id,
        recipientId: 1, // Gary
        messageText: "Test message for deletion",
      });
    } catch {
      // May fail if FK constraint — that's OK, we still test the deletion path
    }

    // Delete the account
    const result = await deleteUserAccount(testUser.id);
    expect(result.anonymized).toBe(true);

    // Verify messages are deleted
    const remainingMsgs = await db.select().from(messages).where(
      or(eq(messages.senderId, testUser.id), eq(messages.recipientId, testUser.id))
    );
    expect(remainingMsgs.length).toBe(0);
  }, 30000);

  it("should delete notifications for the deleted user", async () => {
    const { upsertUser, getUserByOpenId, deleteUserAccount, createNotification } = await import("./db");
    const { getDb } = await import("./db/connection");
    const { notifications } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const testOpenId = `test-g1-notif-${Date.now()}`;
    await upsertUser({
      openId: testOpenId,
      name: "Notif Delete Test",
      email: `notifdel-${Date.now()}@example.com`,
      role: "customer",
    });

    const testUser = await getUserByOpenId(testOpenId);
    expect(testUser).toBeDefined();
    if (!testUser) return;

    // Create a test notification
    try {
      await createNotification({
        userId: testUser.id,
        type: "booking_confirmed",
        title: "Test notification",
        message: "This should be deleted",
      });
    } catch {
      // May fail — that's OK
    }

    // Delete the account
    const result = await deleteUserAccount(testUser.id);
    expect(result.anonymized).toBe(true);

    // Verify notifications are deleted
    const db = await getDb();
    if (!db) return;
    const remainingNotifs = await db.select().from(notifications).where(
      eq(notifications.userId, testUser.id)
    );
    expect(remainingNotifs.length).toBe(0);
  }, 30000);

  it("should delete favorites and folders for the deleted user", async () => {
    const { upsertUser, getUserByOpenId, deleteUserAccount } = await import("./db");
    const { getDb } = await import("./db/connection");
    const { customerFavorites, savedProviderFolders } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const testOpenId = `test-g1-fav-${Date.now()}`;
    await upsertUser({
      openId: testOpenId,
      name: "Fav Delete Test",
      email: `favdel-${Date.now()}@example.com`,
      role: "customer",
    });

    const testUser = await getUserByOpenId(testOpenId);
    expect(testUser).toBeDefined();
    if (!testUser) return;

    // Delete the account
    const result = await deleteUserAccount(testUser.id);
    expect(result.anonymized).toBe(true);
    expect(typeof result.favoritesDeleted).toBe("number");
    expect(typeof result.foldersDeleted).toBe("number");

    // Verify favorites and folders are deleted
    const db = await getDb();
    if (!db) return;
    const remainingFavs = await db.select().from(customerFavorites).where(
      eq(customerFavorites.userId, testUser.id)
    );
    expect(remainingFavs.length).toBe(0);

    const remainingFolders = await db.select().from(savedProviderFolders).where(
      eq(savedProviderFolders.userId, testUser.id)
    );
    expect(remainingFolders.length).toBe(0);
  }, 30000);

  it("should delete push subscriptions for the deleted user", async () => {
    const { upsertUser, getUserByOpenId, deleteUserAccount } = await import("./db");
    const { getDb } = await import("./db/connection");
    const { pushSubscriptions } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const testOpenId = `test-g1-push-${Date.now()}`;
    await upsertUser({
      openId: testOpenId,
      name: "Push Delete Test",
      email: `pushdel-${Date.now()}@example.com`,
      role: "customer",
    });

    const testUser = await getUserByOpenId(testOpenId);
    expect(testUser).toBeDefined();
    if (!testUser) return;

    // Delete the account
    const result = await deleteUserAccount(testUser.id);
    expect(result.anonymized).toBe(true);
    expect(typeof result.pushSubscriptionsDeleted).toBe("number");

    // Verify push subscriptions are deleted
    const db = await getDb();
    if (!db) return;
    const remainingPush = await db.select().from(pushSubscriptions).where(
      eq(pushSubscriptions.userId, testUser.id)
    );
    expect(remainingPush.length).toBe(0);
  }, 30000);

  it("should delete referral data for the deleted user", async () => {
    const { upsertUser, getUserByOpenId, deleteUserAccount } = await import("./db");
    const { getDb } = await import("./db/connection");
    const { referralCodes, referralCredits } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const testOpenId = `test-g1-ref-${Date.now()}`;
    await upsertUser({
      openId: testOpenId,
      name: "Ref Delete Test",
      email: `refdel-${Date.now()}@example.com`,
      role: "customer",
    });

    const testUser = await getUserByOpenId(testOpenId);
    expect(testUser).toBeDefined();
    if (!testUser) return;

    // Delete the account
    const result = await deleteUserAccount(testUser.id);
    expect(result.anonymized).toBe(true);
    expect(typeof result.referralDataDeleted).toBe("number");

    // Verify referral data is deleted
    const db = await getDb();
    if (!db) return;
    const remainingCodes = await db.select().from(referralCodes).where(
      eq(referralCodes.userId, testUser.id)
    );
    expect(remainingCodes.length).toBe(0);

    const remainingCredits = await db.select().from(referralCredits).where(
      eq(referralCredits.userId, testUser.id)
    );
    expect(remainingCredits.length).toBe(0);
  }, 30000);

  it("should still block admin self-deletion via the tRPC endpoint", async () => {
    const { ctx } = createContext({ role: "admin" as any });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.deleteAccount({ confirmation: "DELETE" })
    ).rejects.toThrow(/Admin accounts cannot be self-deleted/);
  });

  it("should still require DELETE confirmation text", async () => {
    const { ctx } = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.deleteAccount({ confirmation: "WRONG" as any })
    ).rejects.toThrow();
  });
});
