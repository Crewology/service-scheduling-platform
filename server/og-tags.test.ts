import { describe, expect, it } from "vitest";
import { getProviderOgTags, invalidateOgImageCache } from "./ogTags";
import * as db from "./db";

describe("OG Tags for Provider Profiles", () => {
  it("should return empty string for non-existent slug", async () => {
    const result = await getProviderOgTags("non-existent-slug-12345", "https://example.com");
    expect(result).toBe("");
  });

  it("should return OG tags for an existing provider", async () => {
    // First create a test user and provider
    const openId = `og-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await db.upsertUser({
      openId,
      email: `ogtest@example.com`,
      name: "OG Test Provider",
    });
    const user = await db.getUserByOpenId(openId);
    if (!user) throw new Error("Failed to create test user");

    await db.createServiceProvider({
      userId: user.id,
      businessName: "OG Test Business",
      businessType: "sole_proprietor",
      description: "A great test business for OG tags",
      city: "Atlanta",
      state: "GA",
    });

    const provider = await db.getProviderByUserId(user.id);
    if (!provider) throw new Error("Failed to create test provider");

    // Set a slug
    const slug = `og-test-business-${provider.id}`;
    await db.updateProviderSlug(provider.id, slug);

    const result = await getProviderOgTags(slug, "https://example.com");

    expect(result).toContain('og:title');
    expect(result).toContain('OG Test Business on OlogyCrew');
    expect(result).toContain('og:description');
    expect(result).toContain('A great test business for OG tags');
    expect(result).toContain('Atlanta');
    expect(result).toContain('GA');
    expect(result).toContain('og:url');
    expect(result).toContain(`https://example.com/p/${slug}`);
    expect(result).toContain('og:type');
    expect(result).toContain('profile');
    expect(result).toContain('twitter:card');
    expect(result).toContain('summary_large_image');
    expect(result).toContain('og:image');
    // Should include image dimensions for social platforms
    expect(result).toContain('og:image:width');
    expect(result).toContain('1200');
    expect(result).toContain('og:image:height');
    expect(result).toContain('630');
  });

  it("should use fallback description when provider has no description", async () => {
    const openId = `og-nodesc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await db.upsertUser({
      openId,
      email: `ognodesc@example.com`,
      name: "No Desc Provider",
    });
    const user = await db.getUserByOpenId(openId);
    if (!user) throw new Error("Failed to create test user");

    await db.createServiceProvider({
      userId: user.id,
      businessName: "No Desc Biz",
      businessType: "llc",
    });

    const provider = await db.getProviderByUserId(user.id);
    if (!provider) throw new Error("Failed to create test provider");

    const slug = `no-desc-biz-${provider.id}`;
    await db.updateProviderSlug(provider.id, slug);

    const result = await getProviderOgTags(slug, "https://example.com");

    expect(result).toContain('Book services from No Desc Biz on OlogyCrew');
  });

  it("should escape HTML special characters in business name", async () => {
    const openId = `og-escape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await db.upsertUser({
      openId,
      email: `ogescape@example.com`,
      name: "Escape Test",
    });
    const user = await db.getUserByOpenId(openId);
    if (!user) throw new Error("Failed to create test user");

    await db.createServiceProvider({
      userId: user.id,
      businessName: 'Bob & Sons "Best" <Service>',
      businessType: "partnership",
    });

    const provider = await db.getProviderByUserId(user.id);
    if (!provider) throw new Error("Failed to create test provider");

    const slug = `bob-sons-${provider.id}`;
    await db.updateProviderSlug(provider.id, slug);

    const result = await getProviderOgTags(slug, "https://example.com");

    // Should not contain raw HTML special chars
    expect(result).not.toContain('<Service>');
    expect(result).toContain('&amp;');
    expect(result).toContain('&quot;');
    expect(result).toContain('&lt;');
  });

  it("should use cached OG image on second call for same slug", async () => {
    const openId = `og-cache-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await db.upsertUser({
      openId,
      email: `ogcache@example.com`,
      name: "Cache Test Provider",
    });
    const user = await db.getUserByOpenId(openId);
    if (!user) throw new Error("Failed to create test user");

    await db.createServiceProvider({
      userId: user.id,
      businessName: "Cache Test Biz",
      businessType: "sole_proprietor",
      description: "Testing OG image caching",
      city: "New York",
      state: "NY",
    });

    const provider = await db.getProviderByUserId(user.id);
    if (!provider) throw new Error("Failed to create test provider");

    const slug = `cache-test-biz-${provider.id}`;
    await db.updateProviderSlug(provider.id, slug);

    // First call generates image
    const result1 = await getProviderOgTags(slug, "https://example.com");
    expect(result1).toContain('og:image');

    // Second call should use cache (same image URL)
    const result2 = await getProviderOgTags(slug, "https://example.com");
    expect(result2).toContain('og:image');

    // Extract image URLs from both results
    const imageMatch1 = result1.match(/og:image" content="([^"]+)"/);
    const imageMatch2 = result2.match(/og:image" content="([^"]+)"/);
    expect(imageMatch1?.[1]).toBe(imageMatch2?.[1]);
  });

  it("should regenerate OG image after cache invalidation", async () => {
    const openId = `og-inval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await db.upsertUser({
      openId,
      email: `oginval@example.com`,
      name: "Invalidation Test Provider",
    });
    const user = await db.getUserByOpenId(openId);
    if (!user) throw new Error("Failed to create test user");

    await db.createServiceProvider({
      userId: user.id,
      businessName: "Invalidation Test Biz",
      businessType: "sole_proprietor",
      description: "Testing cache invalidation",
      city: "Chicago",
      state: "IL",
    });

    const provider = await db.getProviderByUserId(user.id);
    if (!provider) throw new Error("Failed to create test provider");

    const slug = `inval-test-biz-${provider.id}`;
    await db.updateProviderSlug(provider.id, slug);

    // First call generates image
    const result1 = await getProviderOgTags(slug, "https://example.com");
    expect(result1).toContain('og:image');

    // Invalidate cache
    invalidateOgImageCache(slug);

    // Third call should regenerate (different URL due to nanoid in filename)
    const result3 = await getProviderOgTags(slug, "https://example.com");
    expect(result3).toContain('og:image');

    // Both should have valid image URLs
    const imageMatch1 = result1.match(/og:image" content="([^"]+)"/);
    const imageMatch3 = result3.match(/og:image" content="([^"]+)"/);
    expect(imageMatch1?.[1]).toBeTruthy();
    expect(imageMatch3?.[1]).toBeTruthy();
    // URLs should be different due to nanoid suffix
    expect(imageMatch1?.[1]).not.toBe(imageMatch3?.[1]);
  });
});
