import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

let testCounter = 0;

async function createTestUser(overrides: Partial<{
  role: "customer" | "provider" | "admin";
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  profilePhotoUrl: string | null;
}> = {}) {
  const id = testCounter++;
  const openId = `profile-test-${Date.now()}-${id}-${Math.random().toString(36).slice(2, 8)}`;

  await db.upsertUser({
    openId,
    email: overrides.email ?? `profile${id}@example.com`,
    name: `Profile Test User ${id}`,
    role: overrides.role ?? "customer",
  });

  const dbUser = await db.getUserByOpenId(openId);
  if (!dbUser) throw new Error("Failed to create test user");

  // Update additional fields if provided
  if (overrides.firstName || overrides.lastName || overrides.phone) {
    await db.updateUserProfile(dbUser.id, {
      firstName: overrides.firstName ?? undefined,
      lastName: overrides.lastName ?? undefined,
      phone: overrides.phone ?? undefined,
    });
  }

  const updatedUser = await db.getUserById(dbUser.id);
  if (!updatedUser) throw new Error("Failed to fetch updated user");

  const user: AuthenticatedUser = {
    id: updatedUser.id,
    openId,
    email: updatedUser.email || `profile${id}@example.com`,
    name: `Profile Test User ${id}`,
    loginMethod: "manus",
    role: updatedUser.role,
    firstName: updatedUser.firstName,
    lastName: updatedUser.lastName,
    phone: updatedUser.phone,
    profilePhotoUrl: updatedUser.profilePhotoUrl,
    emailVerified: false,
    hasSelectedRole: updatedUser.hasSelectedRole,
    createdAt: updatedUser.createdAt,
    updatedAt: updatedUser.updatedAt,
    lastSignedIn: updatedUser.lastSignedIn,
    deletedAt: null,
  };

  return { user, dbUser: updatedUser };
}

function createAuthContext(user: AuthenticatedUser): TrpcContext {
  return {
    req: {} as any,
    res: { clearCookie: () => {} } as any,
    user,
  };
}

describe("Profile Features - Update Profile", () => {
  it("should update first name, last name, and phone", async () => {
    const { user } = await createTestUser({ role: "customer" });
    const caller = appRouter.createCaller(createAuthContext(user));

    await caller.auth.updateProfile({
      firstName: "Jane",
      lastName: "Doe",
      phone: "5551234567",
      email: user.email,
    });

    const updated = await db.getUserById(user.id);
    expect(updated?.firstName).toBe("Jane");
    expect(updated?.lastName).toBe("Doe");
    expect(updated?.phone).toBe("5551234567");
  });

  it("should allow customer to update profile without changing role", async () => {
    const { user } = await createTestUser({ role: "customer" });
    const caller = appRouter.createCaller(createAuthContext(user));

    await caller.auth.updateProfile({
      firstName: "Updated",
      lastName: "Name",
      phone: "",
      email: user.email,
    });

    const updated = await db.getUserById(user.id);
    expect(updated?.role).toBe("customer");
    expect(updated?.firstName).toBe("Updated");
  });
});

describe("Profile Features - Role Selection for Provider Switch", () => {
  it("customer can switch to provider role via selectRole", async () => {
    const { user } = await createTestUser({ role: "customer" });
    const caller = appRouter.createCaller(createAuthContext(user));

    const result = await caller.auth.selectRole({ role: "provider" });
    expect(result.success).toBe(true);
    expect(result.role).toBe("provider");

    const updated = await db.getUserById(user.id);
    expect(updated?.role).toBe("provider");
  });

  it("provider role persists after profile update", async () => {
    const { user } = await createTestUser({ role: "provider" });
    const caller = appRouter.createCaller(createAuthContext(user));

    await caller.auth.updateProfile({
      firstName: "Provider",
      lastName: "User",
      phone: "5559876543",
      email: user.email,
    });

    const updated = await db.getUserById(user.id);
    expect(updated?.role).toBe("provider");
    expect(updated?.firstName).toBe("Provider");
  });
});

describe("Profile Features - auth.me returns complete user data", () => {
  it("should return all profile fields including role and hasSelectedRole", async () => {
    const { user } = await createTestUser({
      role: "customer",
      firstName: "Test",
      lastName: "User",
      phone: "5551112222",
    });
    const caller = appRouter.createCaller(createAuthContext(user));

    const me = await caller.auth.me();
    expect(me).toBeDefined();
    expect(me!.role).toBe("customer");
    expect(me!.firstName).toBe("Test");
    expect(me!.lastName).toBe("User");
    expect(me!.phone).toBe("5551112222");
    expect(me!.hasSelectedRole).toBeDefined();
  });

  it("should return null profilePhotoUrl for new users", async () => {
    const { user } = await createTestUser({ role: "customer" });
    const caller = appRouter.createCaller(createAuthContext(user));

    const me = await caller.auth.me();
    expect(me).toBeDefined();
    expect(me!.profilePhotoUrl).toBeNull();
  });
});
