import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

let testCounter = 0;

async function createTestContext(role: "customer" | "provider" | "admin" = "customer"): Promise<{ ctx: TrpcContext; userId: number; openId: string }> {
  const id = testCounter++;
  const openId = `role-test-${Date.now()}-${id}-${Math.random().toString(36).slice(2, 8)}`;

  await db.upsertUser({
    openId,
    email: `roletest${id}@example.com`,
    name: `Role Test User ${id}`,
    role,
  });

  const dbUser = await db.getUserByOpenId(openId);
  if (!dbUser) throw new Error("Failed to create test user");

  const user: AuthenticatedUser = {
    id: dbUser.id,
    openId,
    email: dbUser.email || `roletest${id}@example.com`,
    name: `Role Test User ${id}`,
    loginMethod: "manus",
    role,
    firstName: "Test",
    lastName: "User",
    phone: null,
    profilePhotoUrl: null,
    emailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    deletedAt: null,
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
      get: () => "localhost",
    } as any,
  };

  return { ctx, userId: dbUser.id, openId };
}

describe("Provider Role Update on Profile Creation", () => {
  it("should update user role from 'customer' to 'provider' when creating a provider profile", async () => {
    // Create a customer user
    const { ctx, userId, openId } = await createTestContext("customer");
    const caller = appRouter.createCaller(ctx);

    // Verify user starts as customer
    const userBefore = await db.getUserByOpenId(openId);
    expect(userBefore?.role).toBe("customer");

    // Create provider profile
    const provider = await caller.provider.create({
      businessName: "Role Test Business",
      businessType: "sole_proprietor",
      description: "Testing role update",
      acceptsMobile: true,
    });

    expect(provider).toBeDefined();
    expect(provider.businessName).toBe("Role Test Business");

    // Verify user role was updated to 'provider'
    const userAfter = await db.getUserByOpenId(openId);
    expect(userAfter?.role).toBe("provider");
  });

  it("should auto-generate a slug when creating a provider profile", async () => {
    const { ctx, userId } = await createTestContext("customer");
    const caller = appRouter.createCaller(ctx);

    const provider = await caller.provider.create({
      businessName: "Slug Test Business",
      businessType: "llc",
    });

    // Verify slug was generated
    const profile = await caller.provider.getMyProfile();
    expect(profile).toBeDefined();
    expect(profile?.profileSlug).toBeTruthy();
    expect(profile?.profileSlug).toContain("slug-test-business");
  });

  it("should return provider profile via getMyProfile after creation", async () => {
    const { ctx, userId } = await createTestContext("customer");
    const caller = appRouter.createCaller(ctx);

    // Before creation, getMyProfile should return null
    const profileBefore = await caller.provider.getMyProfile();
    expect(profileBefore).toBeNull();

    // Create provider profile
    await caller.provider.create({
      businessName: "Profile Test Business",
      businessType: "sole_proprietor",
      city: "Atlanta",
      state: "GA",
      postalCode: "30301",
    });

    // After creation, getMyProfile should return the profile
    const profileAfter = await caller.provider.getMyProfile();
    expect(profileAfter).toBeDefined();
    expect(profileAfter?.businessName).toBe("Profile Test Business");
    expect(profileAfter?.city).toBe("Atlanta");
    expect(profileAfter?.state).toBe("GA");
  });

  it("should not allow duplicate provider profiles", async () => {
    const { ctx } = await createTestContext("customer");
    const caller = appRouter.createCaller(ctx);

    // First creation should succeed
    await caller.provider.create({
      businessName: "First Business",
      businessType: "sole_proprietor",
    });

    // Second creation should fail
    await expect(
      caller.provider.create({
        businessName: "Second Business",
        businessType: "llc",
      })
    ).rejects.toThrow("Provider profile already exists");
  });

  it("should set categories during provider creation", async () => {
    const { ctx } = await createTestContext("customer");
    const caller = appRouter.createCaller(ctx);

    await caller.provider.create({
      businessName: "Category Test Business",
      businessType: "sole_proprietor",
      categoryIds: [7, 9, 10], // Barber Shop, Handyman, Massage
    });

    const categories = await caller.provider.getMyCategories();
    expect(categories.length).toBe(3);
    const categoryIds = categories.map((c: any) => c.categoryId);
    expect(categoryIds).toContain(7);
    expect(categoryIds).toContain(9);
    expect(categoryIds).toContain(10);
  });
});

describe("updateUserProfile role field", () => {
  it("should support updating user role via updateUserProfile", async () => {
    const { userId, openId } = await createTestContext("customer");

    // Update role to provider
    await db.updateUserProfile(userId, { role: "provider" });

    const user = await db.getUserByOpenId(openId);
    expect(user?.role).toBe("provider");
  });

  it("should not change role when updating other fields", async () => {
    const { userId, openId } = await createTestContext("customer");

    // Update name only
    await db.updateUserProfile(userId, { name: "Updated Name" });

    const user = await db.getUserByOpenId(openId);
    expect(user?.role).toBe("customer"); // Role should remain unchanged
    expect(user?.name).toBe("Updated Name");
  });
});
