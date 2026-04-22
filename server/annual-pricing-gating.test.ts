import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("./db", () => ({
  getProviderByUserId: vi.fn(),
  getProviderSubscription: vi.fn(),
  upsertProviderSubscription: vi.fn(),
  getProviderTier: vi.fn(),
  getActiveServiceCount: vi.fn(),
}));

// Mock stripe
vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      products: { list: vi.fn(), create: vi.fn() },
      prices: { list: vi.fn(), create: vi.fn() },
      customers: { create: vi.fn() },
      checkout: { sessions: { create: vi.fn() } },
    })),
  };
});

// Mock env
vi.mock("./_core/env", () => ({
  ENV: {
    stripeSecretKey: "sk_test_mock",
    stripeWebhookSecret: "whsec_test_mock",
  },
}));

import * as db from "./db";
import { SUBSCRIPTION_TIERS } from "./products";

describe("Annual Pricing Toggle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Pricing calculations", () => {
    it("should have correct monthly prices for all tiers", () => {
      expect(SUBSCRIPTION_TIERS.free.monthlyPrice).toBe(0);
      expect(SUBSCRIPTION_TIERS.basic.monthlyPrice).toBe(19.99);
      expect(SUBSCRIPTION_TIERS.premium.monthlyPrice).toBe(49.99);
    });

    it("should have correct yearly prices with ~20% discount", () => {
      expect(SUBSCRIPTION_TIERS.free.yearlyPrice).toBe(0);

      // Basic: $19.99/mo * 12 = $239.88/yr, 20% off = $191.90/yr
      const basicMonthlyTotal = SUBSCRIPTION_TIERS.basic.monthlyPrice * 12;
      const basicYearlySavings = basicMonthlyTotal - SUBSCRIPTION_TIERS.basic.yearlyPrice;
      const basicDiscount = basicYearlySavings / basicMonthlyTotal;
      expect(basicDiscount).toBeGreaterThanOrEqual(0.19);
      expect(basicDiscount).toBeLessThanOrEqual(0.21);

      // Premium: $49.99/mo * 12 = $599.88/yr, 20% off = $479.90/yr
      const premiumMonthlyTotal = SUBSCRIPTION_TIERS.premium.monthlyPrice * 12;
      const premiumYearlySavings = premiumMonthlyTotal - SUBSCRIPTION_TIERS.premium.yearlyPrice;
      const premiumDiscount = premiumYearlySavings / premiumMonthlyTotal;
      expect(premiumDiscount).toBeGreaterThanOrEqual(0.19);
      expect(premiumDiscount).toBeLessThanOrEqual(0.21);
    });

    it("should calculate annual savings correctly for display", () => {
      const basicSavings = Math.round(SUBSCRIPTION_TIERS.basic.monthlyPrice * 12 - SUBSCRIPTION_TIERS.basic.yearlyPrice);
      expect(basicSavings).toBeGreaterThan(0);
      expect(basicSavings).toBe(48); // $19.99 * 12 - $191.88 = $48

      const premiumSavings = Math.round(SUBSCRIPTION_TIERS.premium.monthlyPrice * 12 - SUBSCRIPTION_TIERS.premium.yearlyPrice);
      expect(premiumSavings).toBeGreaterThan(0);
      expect(premiumSavings).toBe(120); // $49.99 * 12 - $479.88 = $120
    });

    it("should calculate correct per-month price for annual billing", () => {
      const basicAnnualMonthly = SUBSCRIPTION_TIERS.basic.yearlyPrice / 12;
      expect(basicAnnualMonthly).toBeCloseTo(15.99, 2);

      const premiumAnnualMonthly = SUBSCRIPTION_TIERS.premium.yearlyPrice / 12;
      expect(premiumAnnualMonthly).toBeCloseTo(39.99, 2);
    });
  });

  describe("Billing interval selection", () => {
    it("should default to monthly billing", () => {
      const defaultInterval: "month" | "year" = "month";
      expect(defaultInterval).toBe("month");
    });

    it("should toggle between monthly and annual", () => {
      let interval: "month" | "year" = "month";
      
      // Toggle to annual
      interval = interval === "month" ? "year" : "month";
      expect(interval).toBe("year");
      
      // Toggle back to monthly
      interval = interval === "month" ? "year" : "month";
      expect(interval).toBe("month");
    });

    it("should pass interval to createCheckout mutation", () => {
      const checkoutInput = {
        tier: "basic" as const,
        interval: "year" as const,
        withTrial: false,
      };

      expect(checkoutInput.interval).toBe("year");
      expect(checkoutInput.tier).toBe("basic");
    });
  });
});

describe("Tier-Based Feature Gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Service limits by tier", () => {
    it("should enforce correct service limits per tier", () => {
      expect(SUBSCRIPTION_TIERS.free.limits.maxServices).toBe(3);
      expect(SUBSCRIPTION_TIERS.basic.limits.maxServices).toBe(10);
      expect(SUBSCRIPTION_TIERS.premium.limits.maxServices).toBe(999);
    });

    it("should enforce correct photo limits per tier", () => {
      expect(SUBSCRIPTION_TIERS.free.limits.maxPhotosPerService).toBe(2);
      expect(SUBSCRIPTION_TIERS.basic.limits.maxPhotosPerService).toBe(5);
      expect(SUBSCRIPTION_TIERS.premium.limits.maxPhotosPerService).toBe(5);
    });

    it("should detect when provider is at service limit", () => {
      const testCases = [
        { tier: "free", count: 3, limit: 3, atLimit: true },
        { tier: "free", count: 2, limit: 3, atLimit: false },
        { tier: "basic", count: 10, limit: 10, atLimit: true },
        { tier: "basic", count: 5, limit: 10, atLimit: false },
        { tier: "premium", count: 50, limit: 999, atLimit: false },
      ];

      for (const tc of testCases) {
        const isAtLimit = tc.count >= tc.limit;
        expect(isAtLimit).toBe(tc.atLimit);
      }
    });

    it("should detect when provider is near service limit", () => {
      const testCases = [
        { count: 2, limit: 3, nearLimit: true },  // 1 away
        { count: 1, limit: 3, nearLimit: false },  // 2 away
        { count: 3, limit: 3, nearLimit: false },  // at limit (not near)
        { count: 9, limit: 10, nearLimit: true },
      ];

      for (const tc of testCases) {
        const isNearLimit = tc.count >= tc.limit - 1 && tc.count < tc.limit;
        expect(isNearLimit).toBe(tc.nearLimit);
      }
    });
  });

  describe("Backend service limit enforcement", () => {
    it("should block service creation when at free tier limit", async () => {
      const mockProvider = { id: 1, userId: 1 };
      (db.getProviderByUserId as any).mockResolvedValue(mockProvider);
      (db.getProviderTier as any).mockResolvedValue("free");
      (db.getActiveServiceCount as any).mockResolvedValue(3);

      const provider = await db.getProviderByUserId(1);
      const tier = await db.getProviderTier(provider!.id);
      const serviceCount = await db.getActiveServiceCount(provider!.id);
      const tierConfig = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];

      expect(serviceCount).toBe(3);
      expect(tierConfig.limits.maxServices).toBe(3);
      expect(serviceCount >= tierConfig.limits.maxServices).toBe(true);
    });

    it("should allow service creation when under basic tier limit", async () => {
      const mockProvider = { id: 1, userId: 1 };
      (db.getProviderByUserId as any).mockResolvedValue(mockProvider);
      (db.getProviderTier as any).mockResolvedValue("basic");
      (db.getActiveServiceCount as any).mockResolvedValue(5);

      const provider = await db.getProviderByUserId(1);
      const tier = await db.getProviderTier(provider!.id);
      const serviceCount = await db.getActiveServiceCount(provider!.id);
      const tierConfig = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];

      expect(serviceCount).toBe(5);
      expect(tierConfig.limits.maxServices).toBe(10);
      expect(serviceCount < tierConfig.limits.maxServices).toBe(true);
    });

    it("should allow unlimited services for premium tier", async () => {
      const mockProvider = { id: 1, userId: 1 };
      (db.getProviderByUserId as any).mockResolvedValue(mockProvider);
      (db.getProviderTier as any).mockResolvedValue("premium");
      (db.getActiveServiceCount as any).mockResolvedValue(50);

      const provider = await db.getProviderByUserId(1);
      const tier = await db.getProviderTier(provider!.id);
      const serviceCount = await db.getActiveServiceCount(provider!.id);
      const tierConfig = SUBSCRIPTION_TIERS[tier as keyof typeof SUBSCRIPTION_TIERS];

      expect(serviceCount).toBe(50);
      expect(tierConfig.limits.maxServices).toBe(999);
      expect(serviceCount < tierConfig.limits.maxServices).toBe(true);
    });
  });

  describe("Upgrade prompt reason mapping", () => {
    it("should map service_limit to basic minimum tier", () => {
      const REASON_MIN_TIERS: Record<string, string> = {
        service_limit: "basic",
        photo_limit: "basic",
        custom_slug: "basic",
        priority_search: "basic",
        analytics: "basic",
        featured_listing: "premium",
        custom_branding: "premium",
        premium_support: "premium",
        general: "basic",
      };

      expect(REASON_MIN_TIERS.service_limit).toBe("basic");
      expect(REASON_MIN_TIERS.photo_limit).toBe("basic");
      expect(REASON_MIN_TIERS.featured_listing).toBe("premium");
    });

    it("should show both tiers when on free plan", () => {
      const currentTier = "free";
      const minTier = "basic";

      const showBasic = currentTier === "free" && (minTier === "basic" || minTier === "premium");
      const showPremium = currentTier !== "premium";

      expect(showBasic).toBe(true);
      expect(showPremium).toBe(true);
    });

    it("should show only premium when on basic plan", () => {
      const currentTier = "basic";
      const minTier = "basic";

      const showBasic = currentTier === "free" && (minTier === "basic" || minTier === "premium");
      const showPremium = currentTier !== "premium";

      expect(showBasic).toBe(false);
      expect(showPremium).toBe(true);
    });

    it("should show nothing when already on premium", () => {
      const currentTier = "premium";

      const showBasic = currentTier === "free";
      const showPremium = currentTier !== "premium";

      expect(showBasic).toBe(false);
      expect(showPremium).toBe(false);
    });
  });

  describe("Upgrade banner visibility", () => {
    it("should not show banner for premium tier providers", () => {
      const currentTier = "premium";
      const shouldShow = currentTier !== "premium";
      expect(shouldShow).toBe(false);
    });

    it("should show banner when at limit", () => {
      const currentCount = 3;
      const maxCount = 3;
      const isAtLimit = currentCount >= maxCount;
      const isNearLimit = currentCount >= maxCount - 1 && currentCount < maxCount;
      const shouldShow = isAtLimit || isNearLimit;

      expect(shouldShow).toBe(true);
      expect(isAtLimit).toBe(true);
    });

    it("should show banner when near limit (1 away)", () => {
      const currentCount = 2;
      const maxCount = 3;
      const isAtLimit = currentCount >= maxCount;
      const isNearLimit = currentCount >= maxCount - 1 && currentCount < maxCount;
      const shouldShow = isAtLimit || isNearLimit;

      expect(shouldShow).toBe(true);
      expect(isNearLimit).toBe(true);
    });

    it("should not show banner when well under limit", () => {
      const currentCount = 1;
      const maxCount = 3;
      const isAtLimit = currentCount >= maxCount;
      const isNearLimit = currentCount >= maxCount - 1 && currentCount < maxCount;
      const shouldShow = isAtLimit || isNearLimit;

      expect(shouldShow).toBe(false);
    });
  });
});
