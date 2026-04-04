import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
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
// Featured Providers Tests
// ============================================================================
describe("Featured Providers", () => {
  it("listFeatured endpoint should return an array", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.provider.listFeatured();
    expect(Array.isArray(result)).toBe(true);
  });

  it("featured providers should include categories array", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.provider.listFeatured();
    for (const provider of result) {
      expect(provider).toHaveProperty("categories");
      expect(Array.isArray(provider.categories)).toBe(true);
    }
  });
});

// ============================================================================
// Next Available Endpoint Tests
// ============================================================================
describe("Provider Next Available", () => {
  it("getNextAvailable should return availability data structure", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.provider.getNextAvailable({ providerId: 1, days: 7 });
    expect(result).toHaveProperty("hasAvailability");
    expect(typeof result.hasAvailability).toBe("boolean");
    expect(result).toHaveProperty("slots");
    expect(Array.isArray(result.slots)).toBe(true);
  });

  it("getNextAvailable should return empty slots for non-existent provider", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.provider.getNextAvailable({ providerId: 999999, days: 7 });
    expect(result.hasAvailability).toBe(false);
    expect(result.slots).toHaveLength(0);
  });

  it("getNextAvailable should accept days=1 and days=14", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result1 = await caller.provider.getNextAvailable({ providerId: 1, days: 1 });
    expect(result1).toHaveProperty("hasAvailability");
    const result14 = await caller.provider.getNextAvailable({ providerId: 1, days: 14 });
    expect(result14).toHaveProperty("hasAvailability");
  });
});

// ============================================================================
// Portfolio Before/After Tests
// ============================================================================
describe("Portfolio Before/After", () => {
  it("addPortfolioItem should accept before_after mediaType", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    try {
      await caller.provider.addPortfolioItem({
        imageUrl: "https://example.com/after.jpg",
        mediaType: "before_after",
        beforeImageUrl: "https://example.com/before.jpg",
        title: "Kitchen Renovation",
        description: "Before and after kitchen remodel",
      });
    } catch (err: any) {
      // Expected NOT_FOUND because test user is not a provider
      expect(err.code).toBe("NOT_FOUND");
    }
  });

  it("addPortfolioItem should accept single image mediaType", async () => {
    const caller = appRouter.createCaller(createAuthContext());
    try {
      await caller.provider.addPortfolioItem({
        imageUrl: "https://example.com/photo.jpg",
        mediaType: "image",
      });
    } catch (err: any) {
      expect(err.code).toBe("NOT_FOUND");
    }
  });

  it("getPublicPortfolio should return array with proper fields", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.provider.getPublicPortfolio({ providerId: 1 });
    expect(Array.isArray(result)).toBe(true);
    for (const item of result) {
      expect(item).toHaveProperty("mediaType");
      expect(item).toHaveProperty("imageUrl");
    }
  });

  it("listByCategory should return providers for a valid category", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.provider.listByCategory({ categoryId: 15 });
    expect(Array.isArray(result)).toBe(true);
  });
});
