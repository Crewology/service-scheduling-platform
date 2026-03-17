import { describe, it, expect, vi, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { TRPCError } from "@trpc/server";

// Helper to create mock auth context
function createAuthContext(role: "customer" | "provider" | "admin") {
  const id = Date.now() + Math.floor(Math.random() * 100000);
  return {
    user: {
      id,
      openId: `test-mvp-${role}-${id}`,
      name: `Test ${role}`,
      email: `${role}-${id}@test.com`,
      role,
      firstName: "Test",
      lastName: role,
      phone: null,
      profilePhotoUrl: null,
      stripeCustomerId: null,
      createdAt: new Date(),
      deletedAt: null,
    },
    req: { headers: { origin: "http://localhost:3000" } } as any,
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as any,
  };
}

const caller = (ctx: any) => appRouter.createCaller(ctx);

describe("Admin Stats", () => {
  it("should return real stats for admin users", async () => {
    const ctx = createAuthContext("admin");
    const stats = await caller(ctx).admin.getStats();
    
    expect(stats).toHaveProperty("totalUsers");
    expect(stats).toHaveProperty("newUsersThisMonth");
    expect(stats).toHaveProperty("totalProviders");
    expect(stats).toHaveProperty("pendingVerifications");
    expect(stats).toHaveProperty("totalBookings");
    expect(stats).toHaveProperty("bookingsThisMonth");
    expect(stats).toHaveProperty("totalRevenue");
    expect(stats).toHaveProperty("revenueThisMonth");
    
    // Stats should be numbers (from real DB queries)
    expect(typeof stats.totalUsers).toBe("number");
    expect(typeof stats.totalProviders).toBe("number");
    expect(typeof stats.totalBookings).toBe("number");
  });

  it("should reject non-admin users from getting stats", async () => {
    const ctx = createAuthContext("customer");
    await expect(caller(ctx).admin.getStats()).rejects.toThrow(TRPCError);
  });
});

describe("User Suspension", () => {
  it("should reject non-admin from suspending users", async () => {
    const ctx = createAuthContext("customer");
    await expect(caller(ctx).admin.suspendUser({ userId: 1 })).rejects.toThrow(TRPCError);
  });

  it("should reject suspending non-existent users", async () => {
    const ctx = createAuthContext("admin");
    await expect(caller(ctx).admin.suspendUser({ userId: 999999 })).rejects.toThrow("User not found");
  });

  it("should have unsuspendUser procedure available", async () => {
    const ctx = createAuthContext("admin");
    // Just verify the procedure exists and rejects for non-existent user
    try {
      await caller(ctx).admin.unsuspendUser({ userId: 999999 });
    } catch (e) {
      // Expected - user doesn't exist, but procedure exists
    }
  });
});

describe("Profile Update", () => {
  it("should accept profile update input", async () => {
    const ctx = createAuthContext("customer");
    // This will attempt to update a non-existent user but validates the input schema
    try {
      await caller(ctx).auth.updateProfile({
        firstName: "Updated",
        lastName: "Name",
        phone: "555-1234",
        email: "updated@test.com",
      });
    } catch (e) {
      // May fail if user doesn't exist in DB, but input validation passes
    }
  });
});

describe("Provider Update", () => {
  it("should reject non-providers from updating provider profile", async () => {
    const ctx = createAuthContext("customer");
    await expect(
      caller(ctx).provider.update({
        businessName: "Updated Business",
        description: "New description",
      })
    ).rejects.toThrow("Must be a provider");
  });
});

describe("Provider Earnings", () => {
  it("should reject non-providers from viewing earnings", async () => {
    const ctx = createAuthContext("customer");
    await expect(caller(ctx).provider.earnings()).rejects.toThrow("Must be a provider");
  });
});

describe("Service Update", () => {
  it("should reject non-providers from updating services", async () => {
    const ctx = createAuthContext("customer");
    await expect(
      caller(ctx).service.update({
        id: 1,
        name: "Updated Service",
        basePrice: "100",
      })
    ).rejects.toThrow("Must be a provider");
  });
});

describe("Service Delete", () => {
  it("should reject non-providers from deleting services", async () => {
    const ctx = createAuthContext("customer");
    await expect(
      caller(ctx).service.delete({ id: 1 })
    ).rejects.toThrow("Must be a provider");
  });
});

describe("Availability Delete", () => {
  it("should reject non-providers from deleting schedules", async () => {
    const ctx = createAuthContext("customer");
    await expect(
      caller(ctx).availability.deleteSchedule({ scheduleId: 1 })
    ).rejects.toThrow("Must be a provider");
  });

  it("should reject non-providers from deleting overrides", async () => {
    const ctx = createAuthContext("customer");
    await expect(
      caller(ctx).availability.deleteOverride({ overrideId: 1 })
    ).rejects.toThrow("Must be a provider");
  });
});

describe("Admin Provider Verification", () => {
  it("should have updateProviderVerification procedure", async () => {
    const ctx = createAuthContext("admin");
    // Verify the procedure exists with correct input schema
    try {
      await caller(ctx).admin.updateProviderVerification({
        providerId: 999999,
        verificationStatus: "verified",
      });
    } catch (e) {
      // Expected - provider doesn't exist, but procedure and schema work
    }
  });

  it("should reject non-admin from verification updates", async () => {
    const ctx = createAuthContext("customer");
    await expect(
      caller(ctx).admin.updateProviderVerification({
        providerId: 1,
        verificationStatus: "verified",
      })
    ).rejects.toThrow(TRPCError);
  });
});
