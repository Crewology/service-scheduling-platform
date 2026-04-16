import { describe, expect, it } from "vitest";
import { getProviderOgTags } from "./ogTags";
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
});
