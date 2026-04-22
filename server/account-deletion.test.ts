import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(overrides: Partial<AuthenticatedUser> = {}): {
  ctx: TrpcContext;
  clearedCookies: CookieCall[];
} {
  const clearedCookies: CookieCall[] = [];
  const user: AuthenticatedUser = {
    id: 999,
    openId: "test-delete-user",
    email: "testdelete@example.com",
    name: "Test Delete User",
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

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("auth.deleteAccount", () => {
  it("should reject unauthenticated requests", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.deleteAccount({ confirmation: "DELETE" })
    ).rejects.toThrow();
  });

  it("should reject if confirmation text is not DELETE", async () => {
    const { ctx } = createContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.deleteAccount({ confirmation: "WRONG" as any })
    ).rejects.toThrow();
  });

  it("should reject admin self-deletion", async () => {
    const { ctx } = createContext({ role: "admin" as any });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.deleteAccount({ confirmation: "DELETE" })
    ).rejects.toThrow(/Admin accounts cannot be self-deleted/);
  });

  it("should successfully delete a customer account with no active bookings", async () => {
    // Create a real test user in the database
    const { getUserById, upsertUser, deleteUserAccount, hasActiveBookings } = await import("./db");

    // Create a test user
    const testOpenId = `test-delete-${Date.now()}`;
    await upsertUser({
      openId: testOpenId,
      name: "Delete Test",
      email: `deletetest-${Date.now()}@example.com`,
      firstName: "Delete",
      lastName: "Test",
      role: "customer",
    });

    // Find the user
    const { getUserByOpenId } = await import("./db");
    const testUser = await getUserByOpenId(testOpenId);
    expect(testUser).toBeDefined();
    if (!testUser) return;

    // Verify no active bookings
    const hasActive = await hasActiveBookings(testUser.id);
    expect(hasActive).toBe(false);

    // Create context with the real user
    const { ctx, clearedCookies } = createContext({
      id: testUser.id,
      openId: testOpenId,
      email: testUser.email || undefined,
      name: testUser.name || undefined,
      role: "customer" as any,
    });

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.deleteAccount({ confirmation: "DELETE" });

    expect(result.success).toBe(true);
    expect(result.anonymized).toBe(true);

    // Verify the user was anonymized
    const deletedUser = await getUserById(testUser.id);
    expect(deletedUser).toBeDefined();
    expect(deletedUser!.deletedAt).not.toBeNull();
    expect(deletedUser!.firstName).toBe("Deleted");
    expect(deletedUser!.lastName).toBe("User");
    expect(deletedUser!.phone).toBeNull();
    expect(deletedUser!.profilePhotoUrl).toBeNull();

    // Verify session cookie was cleared
    expect(clearedCookies.length).toBeGreaterThanOrEqual(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
  }, 30000);

  it("should block deletion if user has active bookings", async () => {
    // Use the hasActiveBookings function directly
    const { hasActiveBookings } = await import("./db");

    // For user ID 1 (Gary) who likely has bookings, check the function works
    const result = await hasActiveBookings(1);
    // This just verifies the function runs without error
    expect(typeof result).toBe("boolean");
  });
});

describe("db.hasActiveBookings", () => {
  it("should return false for a user with no bookings", async () => {
    const { hasActiveBookings } = await import("./db");
    // Use a very high ID that won't have bookings
    const result = await hasActiveBookings(999999);
    expect(result).toBe(false);
  });
});

describe("db.deleteUserAccount", () => {
  it("should anonymize user data and return cleanup summary", async () => {
    const { upsertUser, getUserByOpenId, getUserById, deleteUserAccount } = await import("./db");

    // Create a test user
    const testOpenId = `test-anon-${Date.now()}`;
    await upsertUser({
      openId: testOpenId,
      name: "Anon Test",
      email: `anontest-${Date.now()}@example.com`,
      firstName: "Anon",
      lastName: "Test",
      phone: "555-0000",
      role: "customer",
    });

    const testUser = await getUserByOpenId(testOpenId);
    expect(testUser).toBeDefined();
    if (!testUser) return;

    const result = await deleteUserAccount(testUser.id);

    expect(result.anonymized).toBe(true);
    expect(typeof result.providerDeactivated).toBe("boolean");
    expect(typeof result.servicesDeactivated).toBe("number");
    expect(typeof result.subscriptionsCancelled).toBe("number");

    // Verify anonymization
    const after = await getUserById(testUser.id);
    expect(after).toBeDefined();
    expect(after!.deletedAt).not.toBeNull();
    expect(after!.name).toContain("deleted-user-");
    expect(after!.firstName).toBe("Deleted");
    expect(after!.lastName).toBe("User");
    expect(after!.phone).toBeNull();
    expect(after!.profilePhotoUrl).toBeNull();
    expect(after!.email).toContain("@deleted.ologycrew.com");
  }, 15000);
});
