import { describe, it, expect } from "vitest";
import { SUBSCRIPTION_TIERS, canProviderAddPhoto } from "./products";

describe("Group 3: Plan & Pricing Updates", () => {
  // =============================================
  // 1. Pricing updates: Pro=$12, Business=$20
  // =============================================
  describe("Provider subscription pricing", () => {
    it("Starter tier should be free (monthlyPrice = 0)", () => {
      expect(SUBSCRIPTION_TIERS.free.monthlyPrice).toBe(0);
    });

    it("Pro tier should be $12/month", () => {
      expect(SUBSCRIPTION_TIERS.basic.monthlyPrice).toBe(12);
    });

    it("Business tier should be $20/month", () => {
      expect(SUBSCRIPTION_TIERS.premium.monthlyPrice).toBe(20);
    });

    it("Pro yearly should be ~$120.96 (16% off)", () => {
      expect(SUBSCRIPTION_TIERS.basic.yearlyPrice).toBeCloseTo(120.96, 1);
    });

    it("Business yearly should be ~$192.00 (20% off)", () => {
      expect(SUBSCRIPTION_TIERS.premium.yearlyPrice).toBeCloseTo(192.00, 1);
    });
  });

  // =============================================
  // 2. Photo upload limits per plan
  // =============================================
  describe("Photo upload limits per plan", () => {
    it("Starter (free) should allow 1 photo per service", () => {
      expect(SUBSCRIPTION_TIERS.free.limits.maxPhotosPerService).toBe(1);
    });

    it("Professional (basic) should allow 3 photos per service", () => {
      expect(SUBSCRIPTION_TIERS.basic.limits.maxPhotosPerService).toBe(3);
    });

    it("Business (premium) should allow 5 photos per service", () => {
      expect(SUBSCRIPTION_TIERS.premium.limits.maxPhotosPerService).toBe(5);
    });

    it("canProviderAddPhoto should return true when under limit", () => {
      expect(canProviderAddPhoto("free", 0)).toBe(true);
      expect(canProviderAddPhoto("basic", 2)).toBe(true);
      expect(canProviderAddPhoto("premium", 4)).toBe(true);
    });

    it("canProviderAddPhoto should return false when at limit", () => {
      expect(canProviderAddPhoto("free", 1)).toBe(false);
      expect(canProviderAddPhoto("basic", 3)).toBe(false);
      expect(canProviderAddPhoto("premium", 5)).toBe(false);
    });

    it("canProviderAddPhoto should return false when over limit", () => {
      expect(canProviderAddPhoto("free", 2)).toBe(false);
      expect(canProviderAddPhoto("basic", 5)).toBe(false);
      expect(canProviderAddPhoto("premium", 10)).toBe(false);
    });
  });

  // =============================================
  // 3. Service limits per plan
  // =============================================
  describe("Service limits per plan", () => {
    it("Starter should allow 3 services", () => {
      expect(SUBSCRIPTION_TIERS.free.limits.maxServices).toBe(3);
    });

    it("Professional should allow 10 services", () => {
      expect(SUBSCRIPTION_TIERS.basic.limits.maxServices).toBe(10);
    });

    it("Business should allow effectively unlimited services", () => {
      expect(SUBSCRIPTION_TIERS.premium.limits.maxServices).toBeGreaterThanOrEqual(999);
    });
  });

  // =============================================
  // 4. Feature flags per plan
  // =============================================
  describe("Feature flags per plan", () => {
    it("Starter should not have priority search", () => {
      expect(SUBSCRIPTION_TIERS.free.limits.prioritySearch).toBe(false);
    });

    it("Professional should have priority search", () => {
      expect(SUBSCRIPTION_TIERS.basic.limits.prioritySearch).toBe(true);
    });

    it("Business should have featured listing", () => {
      expect(SUBSCRIPTION_TIERS.premium.limits.featuredListing).toBe(true);
    });

    it("Only Business should have custom branding", () => {
      expect(SUBSCRIPTION_TIERS.free.limits.customBranding).toBe(false);
      expect(SUBSCRIPTION_TIERS.basic.limits.customBranding).toBe(false);
      expect(SUBSCRIPTION_TIERS.premium.limits.customBranding).toBe(true);
    });

    it("Only Professional and Business should have custom slug", () => {
      expect(SUBSCRIPTION_TIERS.free.limits.customSlug).toBe(false);
      expect(SUBSCRIPTION_TIERS.basic.limits.customSlug).toBe(true);
      expect(SUBSCRIPTION_TIERS.premium.limits.customSlug).toBe(true);
    });
  });

  // =============================================
  // 5. Tier names should match expected display names
  // =============================================
  describe("Tier display names", () => {
    it("Free tier should be named 'Starter'", () => {
      expect(SUBSCRIPTION_TIERS.free.name).toBe("Starter");
    });

    it("Basic tier should be named 'Pro'", () => {
      expect(SUBSCRIPTION_TIERS.basic.name).toBe("Pro");
    });

    it("Premium tier should be named 'Business'", () => {
      expect(SUBSCRIPTION_TIERS.premium.name).toBe("Business");
    });
  });
});
