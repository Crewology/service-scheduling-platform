import { describe, expect, it, beforeAll } from "vitest";
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

describe("Provider Categories", () => {
  it("getMyCategories returns empty array when no provider exists", async () => {
    const ctx = createAuthContext(99999);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.provider.getMyCategories();
    expect(result).toEqual([]);
  });

  it("category.list returns all categories", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const categories = await caller.category.list();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
    // Verify category structure
    const first = categories[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("name");
    expect(first).toHaveProperty("slug");
  });

  it("category.getBySlug returns a category", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const categories = await caller.category.list();
    if (categories.length === 0) return;
    const cat = await caller.category.getBySlug({ slug: categories[0].slug });
    expect(cat).toBeTruthy();
    expect(cat!.id).toBe(categories[0].id);
  });

  it("service.listMine returns empty array when no provider exists", async () => {
    const ctx = createAuthContext(99998);
    const caller = appRouter.createCaller(ctx);
    const result = await caller.service.listMine();
    expect(result).toEqual([]);
  });
});

describe("Provider Router - Public Endpoints", () => {
  it("provider.list returns an array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.provider.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("provider.listByCategory returns an array", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // Use a category ID that may or may not have providers
    const result = await caller.provider.listByCategory({ categoryId: 7 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("provider.getBySlug throws NOT_FOUND for invalid slug", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.provider.getBySlug({ slug: "nonexistent-slug-12345" })
    ).rejects.toThrow();
  });
});

describe("Service Router - Category Listing", () => {
  it("service.listByCategory returns services for a valid category", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.service.listByCategory({ categoryId: 7 });
    expect(Array.isArray(result)).toBe(true);
  });
});
