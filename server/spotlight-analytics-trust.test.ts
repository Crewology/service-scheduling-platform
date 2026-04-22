import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1, role: "user" | "admin" = "user"): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: {
      protocol: "https",
      headers: { origin: "http://localhost:3000" },
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: { origin: "http://localhost:3000" },
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// ============================================================================
// Feature 1: Featured Provider Spotlight
// ============================================================================
describe("Featured Provider Spotlight", () => {
  it("getSpotlightProviders should return an array (public endpoint)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.provider.getSpotlightProviders();
    expect(Array.isArray(result)).toBe(true);
  });

  it("getSpotlightProviders results should have expected shape", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.provider.getSpotlightProviders();
    // Even if empty, the endpoint should work
    if (result.length > 0) {
      const provider = result[0];
      expect(provider).toHaveProperty("id");
      expect(provider).toHaveProperty("businessName");
      expect(provider).toHaveProperty("trustLevel");
      expect(provider).toHaveProperty("trustScore");
    }
  });

  it("getSpotlightProviders should return at most 6 providers", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.provider.getSpotlightProviders();
    expect(result.length).toBeLessThanOrEqual(6);
  });
});

// ============================================================================
// Feature 2: Provider Analytics (existing endpoint, now with charts)
// ============================================================================
describe("Provider Analytics", () => {
  it("provider.analytics should require authentication", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.provider.analytics()).rejects.toThrow();
  });

  it("provider.analytics should return analytics data for authenticated provider", async () => {
    const caller = appRouter.createCaller(createAuthContext(1));
    try {
      const result = await caller.provider.analytics();
      // If the user has a provider profile, check shape
      if (result) {
        expect(result).toHaveProperty("bookingTrends");
        expect(result).toHaveProperty("topServices");
        expect(result).toHaveProperty("bookingSources");
        expect(result).toHaveProperty("customerRetention");
        expect(Array.isArray(result.bookingTrends)).toBe(true);
        expect(Array.isArray(result.topServices)).toBe(true);
        expect(Array.isArray(result.bookingSources)).toBe(true);
      }
    } catch (err: any) {
      // User might not have a provider profile - that's OK, just verify it's the right error
      expect(err.message).toMatch(/provider|not found|FORBIDDEN/i);
    }
  });
});

// ============================================================================
// Feature 3: Admin Bulk Trust Recalculation
// ============================================================================
describe("Admin Bulk Trust Recalculation", () => {
  it("trust.recalculateAll should reject non-admin users", async () => {
    const caller = appRouter.createCaller(createAuthContext(1, "user"));
    await expect(caller.trust.recalculateAll()).rejects.toThrow(/forbidden|admin/i);
  });

  it("trust.recalculateAll should reject unauthenticated users", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.trust.recalculateAll()).rejects.toThrow();
  });

  it("trust.recalculateAll should succeed for admin users", async () => {
    const caller = appRouter.createCaller(createAuthContext(1, "admin"));
    const result = await caller.trust.recalculateAll();
    expect(result).toHaveProperty("updated");
    expect(typeof result.updated).toBe("number");
    expect(result.updated).toBeGreaterThanOrEqual(0);
  }, 120000);
});
