import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

let testCounter = 0;

async function createTestUser(role: "customer" | "provider" | "admin" = "customer") {
  const id = testCounter++;
  const openId = `rolesel-test-${Date.now()}-${id}-${Math.random().toString(36).slice(2, 8)}`;

  await db.upsertUser({
    openId,
    email: `rolesel${id}@example.com`,
    name: `RoleSel Test User ${id}`,
    role,
  });

  const dbUser = await db.getUserByOpenId(openId);
  if (!dbUser) throw new Error("Failed to create test user");

  const user: AuthenticatedUser = {
    id: dbUser.id,
    openId,
    email: dbUser.email || `rolesel${id}@example.com`,
    name: `RoleSel Test User ${id}`,
    loginMethod: "manus",
    role: dbUser.role,
    firstName: null,
    lastName: null,
    phone: null,
    profilePhotoUrl: null,
    emailVerified: false,
    hasSelectedRole: dbUser.hasSelectedRole,
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
    lastSignedIn: dbUser.lastSignedIn,
    deletedAt: null,
  };

  return { user, dbUser };
}

function createAuthContext(user: AuthenticatedUser): TrpcContext {
  return {
    req: {} as any,
    res: { clearCookie: () => {} } as any,
    user,
  };
}

describe("Role Selection", () => {
  it("should select customer role and set hasSelectedRole to true", async () => {
    const { user } = await createTestUser("customer");
    const caller = appRouter.createCaller(createAuthContext(user));

    const result = await caller.auth.selectRole({ role: "customer" });
    expect(result.success).toBe(true);
    expect(result.role).toBe("customer");

    const updated = await db.getUserById(user.id);
    expect(updated?.role).toBe("customer");
    expect(updated?.hasSelectedRole).toBe(true);
  });

  it("should select provider role and set hasSelectedRole to true", async () => {
    const { user } = await createTestUser("customer");
    const caller = appRouter.createCaller(createAuthContext(user));

    const result = await caller.auth.selectRole({ role: "provider" });
    expect(result.success).toBe(true);
    expect(result.role).toBe("provider");

    const updated = await db.getUserById(user.id);
    expect(updated?.role).toBe("provider");
    expect(updated?.hasSelectedRole).toBe(true);
  });

  it("should reject invalid role values", async () => {
    const { user } = await createTestUser("customer");
    const caller = appRouter.createCaller(createAuthContext(user));

    await expect(
      caller.auth.selectRole({ role: "admin" as any })
    ).rejects.toThrow();
  });

  it("new users should have hasSelectedRole = false by default", async () => {
    const openId = `rolesel-new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await db.upsertUser({
      openId,
      email: `newuser@example.com`,
      name: "Brand New User",
    });

    const dbUser = await db.getUserByOpenId(openId);
    expect(dbUser).toBeDefined();
    expect(dbUser?.hasSelectedRole).toBe(false);
  });

  it("should allow role change even after initial selection", async () => {
    const { user } = await createTestUser("customer");
    const caller = appRouter.createCaller(createAuthContext(user));

    await caller.auth.selectRole({ role: "customer" });
    let updated = await db.getUserById(user.id);
    expect(updated?.role).toBe("customer");

    await caller.auth.selectRole({ role: "provider" });
    updated = await db.getUserById(user.id);
    expect(updated?.role).toBe("provider");
    expect(updated?.hasSelectedRole).toBe(true);
  });
});
