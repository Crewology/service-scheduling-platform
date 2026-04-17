import { describe, expect, it } from "vitest";
import {
  getProviderOgTags,
  getServiceOgTags,
  getCategoryOgTags,
  getHomepageOgTags,
  invalidateOgImageCache,
  invalidateServiceOgImageCache,
} from "./ogTags";
import * as db from "./db";

describe("OG Tags for Provider Profiles", () => {
  it("should return empty string for non-existent slug", async () => {
    const result = await getProviderOgTags("non-existent-slug-12345", "https://example.com");
    expect(result).toBe("");
  });

  it("should return OG tags for an existing provider", async () => {
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

    const slug = `og-test-business-${provider.id}`;
    await db.updateProviderSlug(provider.id, slug);

    const result = await getProviderOgTags(slug, "https://example.com");

    expect(result).toContain('og:title');
    expect(result).toContain('OG Test Business on OlogyCrew');
    expect(result).toContain('og:description');
    expect(result).toContain('A great test business for OG tags');
    expect(result).toContain('Atlanta');
    expect(result).toContain('og:url');
    expect(result).toContain(`https://example.com/p/${slug}`);
    expect(result).toContain('og:type');
    expect(result).toContain('profile');
    expect(result).toContain('twitter:card');
    expect(result).toContain('summary_large_image');
    expect(result).toContain('og:image');
    expect(result).toContain('og:image:width');
    expect(result).toContain('1200');
    expect(result).toContain('og:image:height');
    expect(result).toContain('630');
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

    const result1 = await getProviderOgTags(slug, "https://example.com");
    expect(result1).toContain('og:image');

    const result2 = await getProviderOgTags(slug, "https://example.com");
    expect(result2).toContain('og:image');

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

    const result1 = await getProviderOgTags(slug, "https://example.com");
    expect(result1).toContain('og:image');

    invalidateOgImageCache(slug);

    const result3 = await getProviderOgTags(slug, "https://example.com");
    expect(result3).toContain('og:image');

    const imageMatch1 = result1.match(/og:image" content="([^"]+)"/);
    const imageMatch3 = result3.match(/og:image" content="([^"]+)"/);
    expect(imageMatch1?.[1]).toBeTruthy();
    expect(imageMatch3?.[1]).toBeTruthy();
    expect(imageMatch1?.[1]).not.toBe(imageMatch3?.[1]);
  });
});

describe("OG Tags for Service Pages", () => {
  it("should return empty string for non-existent service ID", async () => {
    const result = await getServiceOgTags(999999, "https://example.com");
    expect(result).toBe("");
  });

  it("should return OG tags for an existing service", async () => {
    // Create a test user, provider, and service
    const openId = `og-svc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await db.upsertUser({
      openId,
      email: `ogsvc@example.com`,
      name: "Service OG Test",
    });
    const user = await db.getUserByOpenId(openId);
    if (!user) throw new Error("Failed to create test user");

    await db.createServiceProvider({
      userId: user.id,
      businessName: "Service OG Biz",
      businessType: "sole_proprietor",
      description: "Test business for service OG",
      city: "Miami",
      state: "FL",
    });

    const provider = await db.getProviderByUserId(user.id);
    if (!provider) throw new Error("Failed to create test provider");

    // Get a valid category ID
    const categories = await db.getAllCategories();
    const categoryId = categories.length > 0 ? categories[0].id : 9; // fallback to HANDYMAN

    const insertResult = await db.createService({
      providerId: provider.id,
      categoryId,
      name: "Premium Haircut",
      description: "A premium haircut experience",
      serviceType: "fixed_location",
      pricingModel: "fixed",
      basePrice: "50.00",
      durationMinutes: 45,
    });
    const serviceId = Number((insertResult as any)[0]?.insertId ?? (insertResult as any).insertId);

    const result = await getServiceOgTags(serviceId, "https://example.com");

    expect(result).toContain('og:title');
    expect(result).toContain('Premium Haircut');
    expect(result).toContain('Service OG Biz');
    expect(result).toContain('OlogyCrew');
    expect(result).toContain('og:description');
    expect(result).toContain('$50');
    expect(result).toContain('og:url');
    expect(result).toContain(`https://example.com/service/${serviceId}`);
    expect(result).toContain('og:type');
    expect(result).toContain('product');
    expect(result).toContain('og:image');
    expect(result).toContain('og:image:width');
    expect(result).toContain('1200');
    expect(result).toContain('twitter:card');
    expect(result).toContain('summary_large_image');
  });

  it("should use cached service OG image on second call", async () => {
    const openId = `og-svccache-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await db.upsertUser({
      openId,
      email: `ogsvccache@example.com`,
      name: "Svc Cache Test",
    });
    const user = await db.getUserByOpenId(openId);
    if (!user) throw new Error("Failed to create test user");

    await db.createServiceProvider({
      userId: user.id,
      businessName: "Svc Cache Biz",
      businessType: "sole_proprietor",
    });

    const provider = await db.getProviderByUserId(user.id);
    if (!provider) throw new Error("Failed to create test provider");

    const categories = await db.getAllCategories();
    const categoryId = categories.length > 0 ? categories[0].id : 9;

    const cacheInsert = await db.createService({
      providerId: provider.id,
      categoryId,
      name: "Cache Test Service",
      serviceType: "mobile",
      pricingModel: "hourly",
      hourlyRate: "75.00",
      durationMinutes: 60,
    });
    const serviceId = Number((cacheInsert as any)[0]?.insertId ?? (cacheInsert as any).insertId);

    const result1 = await getServiceOgTags(serviceId, "https://example.com");
    const result2 = await getServiceOgTags(serviceId, "https://example.com");

    const imageMatch1 = result1.match(/og:image" content="([^"]+)"/);
    const imageMatch2 = result2.match(/og:image" content="([^"]+)"/);
    expect(imageMatch1?.[1]).toBe(imageMatch2?.[1]);
  });

  it("should regenerate service OG image after cache invalidation", async () => {
    const openId = `og-svcinval-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await db.upsertUser({
      openId,
      email: `ogsvcinval@example.com`,
      name: "Svc Inval Test",
    });
    const user = await db.getUserByOpenId(openId);
    if (!user) throw new Error("Failed to create test user");

    await db.createServiceProvider({
      userId: user.id,
      businessName: "Svc Inval Biz",
      businessType: "sole_proprietor",
    });

    const provider = await db.getProviderByUserId(user.id);
    if (!provider) throw new Error("Failed to create test provider");

    const categories = await db.getAllCategories();
    const categoryId = categories.length > 0 ? categories[0].id : 9;

    const invalInsert = await db.createService({
      providerId: provider.id,
      categoryId,
      name: "Inval Test Service",
      description: "A test service for invalidation",
      serviceType: "virtual",
      pricingModel: "fixed",
      basePrice: "100.00",
      durationMinutes: 30,
    });
    const serviceId = Number((invalInsert as any)[0]?.insertId ?? (invalInsert as any).insertId);

    const result1 = await getServiceOgTags(serviceId, "https://example.com");
    invalidateServiceOgImageCache(serviceId);
    const result2 = await getServiceOgTags(serviceId, "https://example.com");

    const imageMatch1 = result1.match(/og:image" content="([^"]+)"/);
    const imageMatch2 = result2.match(/og:image" content="([^"]+)"/);
    expect(imageMatch1?.[1]).toBeTruthy();
    expect(imageMatch2?.[1]).toBeTruthy();
    expect(imageMatch1?.[1]).not.toBe(imageMatch2?.[1]);
  });
});

describe("OG Tags for Category Pages", () => {
  it("should return empty string for non-existent category slug", async () => {
    const result = await getCategoryOgTags("non-existent-category-xyz", "https://example.com");
    expect(result).toBe("");
  });

  it("should return OG tags for an existing category", async () => {
    const categories = await db.getAllCategories();
    if (categories.length === 0) return; // skip if no categories

    const category = categories[0];
    const result = await getCategoryOgTags(category.slug, "https://example.com");

    expect(result).toContain('og:title');
    expect(result).toContain(category.name);
    expect(result).toContain('Services');
    expect(result).toContain('OlogyCrew');
    expect(result).toContain('og:url');
    expect(result).toContain(`https://example.com/category/${category.slug}`);
    expect(result).toContain('og:type');
    expect(result).toContain('website');
    expect(result).toContain('twitter:card');
    expect(result).toContain('summary_large_image');
    expect(result).toContain('og:image');
  });
});

describe("OG Tags for Homepage", () => {
  it("should return OG tags with OlogyCrew branding", () => {
    const result = getHomepageOgTags("https://example.com");

    expect(result).toContain('og:title');
    expect(result).toContain('OlogyCrew');
    expect(result).toContain('Book Trusted Service Professionals');
    expect(result).toContain('og:description');
    expect(result).toContain('og:url');
    expect(result).toContain('https://example.com');
    expect(result).toContain('og:type');
    expect(result).toContain('website');
    expect(result).toContain('og:site_name');
    expect(result).toContain('OlogyCrew');
    expect(result).toContain('twitter:card');
    expect(result).toContain('summary_large_image');
    expect(result).toContain('og:image');
  });

  it("should use the correct origin URL", () => {
    const result = getHomepageOgTags("https://ologycrew.com");
    expect(result).toContain('https://ologycrew.com');
    expect(result).not.toContain('localhost');
  });
});
