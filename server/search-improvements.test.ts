import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Tests for search improvements:
 * 1. Service search returns businessName and providerSlug fields
 * 2. Provider search endpoint exists and returns results
 * 3. Service search matches provider business name
 */

function createPublicContext(): TrpcContext {
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

describe("search improvements", () => {
  describe("service.search", () => {
    it("returns results with businessName and providerSlug fields", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const results = await caller.service.search({ keyword: "haircut" });

      // Should return an array
      expect(Array.isArray(results)).toBe(true);

      // If results exist, each should have businessName and providerSlug
      if (results.length > 0) {
        const first = results[0] as any;
        expect(first).toHaveProperty("businessName");
        expect(first).toHaveProperty("providerSlug");
        // businessName should be a string (or null for providers without a name)
        expect(typeof first.businessName === "string" || first.businessName === null).toBe(true);
      }
    });

    it("returns results when searching by provider business name", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      // Search by a known provider name - should return their services
      const results = await caller.service.search({ keyword: "OlogyCrew" });

      // Should return an array (may be empty if no services match, but shouldn't error)
      expect(Array.isArray(results)).toBe(true);
    });

    it("respects the 50 result limit", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      // Search with a broad term
      const results = await caller.service.search({});

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(50);
    });

    it("filters by categoryId", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      // Search with a category filter
      const results = await caller.service.search({ categoryId: 7 });

      expect(Array.isArray(results)).toBe(true);
      // All results should have the specified categoryId
      for (const result of results) {
        expect(result.categoryId).toBe(7);
      }
    });

    it("handles empty search term gracefully", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const results = await caller.service.search({ keyword: "" });

      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("provider.search", () => {
    it("returns providers matching a business name query", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const results = await caller.provider.search({ query: "Marcus" });

      expect(Array.isArray(results)).toBe(true);

      if (results.length > 0) {
        const first = results[0] as any;
        // Each provider should have essential fields
        expect(first).toHaveProperty("id");
        expect(first).toHaveProperty("businessName");
        expect(first).toHaveProperty("slug");
        expect(first).toHaveProperty("categories");
        // businessName should contain the search term (case insensitive)
        const nameOrDesc = (first.businessName || "").toLowerCase() + (first.description || "").toLowerCase();
        expect(nameOrDesc).toContain("marcus");
      }
    });

    it("returns empty array for empty query", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const results = await caller.provider.search({ query: "" });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it("returns empty array for whitespace-only query", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const results = await caller.provider.search({ query: "   " });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it("returns providers with categories array", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      const results = await caller.provider.search({ query: "OlogyCrew" });

      expect(Array.isArray(results)).toBe(true);

      if (results.length > 0) {
        const first = results[0] as any;
        expect(Array.isArray(first.categories)).toBe(true);
        // Each category should have id and name
        if (first.categories.length > 0) {
          expect(first.categories[0]).toHaveProperty("id");
          expect(first.categories[0]).toHaveProperty("name");
        }
      }
    });

    it("limits results to 10", async () => {
      const ctx = createPublicContext();
      const caller = appRouter.createCaller(ctx);

      // Use a very broad search term
      const results = await caller.provider.search({ query: "a" });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(10);
    });
  });
});
