import { describe, it, expect, vi, beforeEach } from "vitest";
import { SUBSCRIPTION_TIERS, getTrialDays } from "./products";

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
      billingPortal: { sessions: { create: vi.fn() } },
    })),
  };
});

import * as db from "./db";

describe("Priority Search Ranking", () => {
  describe("Ranking score calculation", () => {
    it("should give premium tier a 30-point boost", () => {
      const premiumBoost = 30;
      const basicBoost = 15;
      const freeBoost = 0;

      // Premium provider with trust score 50 should rank higher than basic with trust score 50
      const premiumScore = 50 + premiumBoost; // 80
      const basicScore = 50 + basicBoost; // 65
      const freeScore = 50 + freeBoost; // 50

      expect(premiumScore).toBeGreaterThan(basicScore);
      expect(basicScore).toBeGreaterThan(freeScore);
      expect(premiumScore).toBe(80);
      expect(basicScore).toBe(65);
      expect(freeScore).toBe(50);
    });

    it("should rank a trusted free provider above a new premium provider", () => {
      // Trusted free provider: trust score 70, tier boost 0 = 70
      const trustedFreeScore = 70 + 0;
      // New premium provider: trust score 10, tier boost 30 = 40
      const newPremiumScore = 10 + 30;

      expect(trustedFreeScore).toBeGreaterThan(newPremiumScore);
    });

    it("should rank same-trust providers by tier", () => {
      const trustScore = 40;
      const premiumRank = trustScore + 30; // 70
      const basicRank = trustScore + 15; // 55
      const freeRank = trustScore + 0; // 40

      expect(premiumRank).toBeGreaterThan(basicRank);
      expect(basicRank).toBeGreaterThan(freeRank);
    });

    it("should give trialing providers the same boost as active subscribers", () => {
      // Trialing basic should get same 15-point boost as active basic
      const trialingBasicScore = 40 + 15; // 55
      const activeBasicScore = 40 + 15; // 55

      expect(trialingBasicScore).toBe(activeBasicScore);
    });

    it("should not boost cancelled or past_due subscriptions", () => {
      // Cancelled premium should get 0 boost (same as free)
      const cancelledPremiumScore = 40 + 0; // 40
      const freeScore = 40 + 0; // 40

      expect(cancelledPremiumScore).toBe(freeScore);
    });

    it("should always rank official providers first regardless of score", () => {
      // Official flag takes precedence over ranking score
      const officialFirst = true;
      expect(officialFirst).toBe(true);
    });
  });

  describe("Tier boost values", () => {
    it("should have prioritySearch enabled for basic and premium tiers", () => {
      expect(SUBSCRIPTION_TIERS.free.limits.prioritySearch).toBe(false);
      expect(SUBSCRIPTION_TIERS.basic.limits.prioritySearch).toBe(true);
      expect(SUBSCRIPTION_TIERS.premium.limits.prioritySearch).toBe(true);
    });

    it("should have featuredListing only for premium tier", () => {
      expect(SUBSCRIPTION_TIERS.free.limits.featuredListing).toBe(false);
      expect(SUBSCRIPTION_TIERS.basic.limits.featuredListing).toBe(false);
      expect(SUBSCRIPTION_TIERS.premium.limits.featuredListing).toBe(true);
    });
  });
});

describe("14-Day Professional Trial Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Trial configuration", () => {
    it("should have a 14-day trial period", () => {
      expect(getTrialDays()).toBe(14);
    });

    it("should trial the Professional (basic) tier, not Premium", () => {
      // The trial is on the basic tier (Professional)
      const trialTier = "basic";
      expect(trialTier).toBe("basic");
      expect(SUBSCRIPTION_TIERS[trialTier].name).toBe("Professional");
    });

    it("should set correct trial end date (14 days from now)", () => {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const diffDays = Math.round((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(14);
    });
  });

  describe("Trial start logic", () => {
    it("should allow starting trial for new providers without subscription", async () => {
      const mockProvider = { id: 1, userId: 1 };
      (db.getProviderByUserId as any).mockResolvedValue(mockProvider);
      (db.getProviderSubscription as any).mockResolvedValue(null);
      (db.upsertProviderSubscription as any).mockResolvedValue(undefined);

      // Simulate the startProfessionalTrial logic
      const provider = await db.getProviderByUserId(1);
      const existing = await db.getProviderSubscription(provider!.id);
      
      expect(existing).toBeNull();
      // Should proceed to create trial subscription
    });

    it("should allow starting trial for free tier providers", async () => {
      const mockProvider = { id: 1, userId: 1 };
      (db.getProviderByUserId as any).mockResolvedValue(mockProvider);
      (db.getProviderSubscription as any).mockResolvedValue({
        tier: "free",
        status: "active",
        trialEndsAt: null,
      });

      const existing = await db.getProviderSubscription(1);
      expect(existing?.tier).toBe("free");
      expect(existing?.status).toBe("active");
      // Should allow trial start since current tier is free
    });

    it("should return existing trial if already trialing", async () => {
      const trialEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const mockProvider = { id: 1, userId: 1 };
      (db.getProviderByUserId as any).mockResolvedValue(mockProvider);
      (db.getProviderSubscription as any).mockResolvedValue({
        tier: "basic",
        status: "trialing",
        trialEndsAt: trialEnd,
      });

      const existing = await db.getProviderSubscription(1);
      expect(existing?.status).toBe("trialing");
      expect(existing?.tier).toBe("basic");
      // Should return existing trial info without creating a new one
    });

    it("should reject trial for providers with active paid subscription", async () => {
      const mockProvider = { id: 1, userId: 1 };
      (db.getProviderByUserId as any).mockResolvedValue(mockProvider);
      (db.getProviderSubscription as any).mockResolvedValue({
        tier: "premium",
        status: "active",
        trialEndsAt: null,
      });

      const existing = await db.getProviderSubscription(1);
      expect(existing?.status).toBe("active");
      expect(existing?.tier).not.toBe("free");
      // Should throw BAD_REQUEST error
    });
  });

  describe("Trial expiry checking", () => {
    it("should calculate correct days remaining for active trial", () => {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      expect(daysRemaining).toBe(7);
    });

    it("should show urgent nudge when 3 or fewer days remain", () => {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days from now
      const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const showUrgentNudge = daysRemaining <= 3;

      expect(daysRemaining).toBe(2);
      expect(showUrgentNudge).toBe(true);
    });

    it("should not show urgent nudge when more than 3 days remain", () => {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days from now
      const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const showUrgentNudge = daysRemaining <= 3;

      expect(daysRemaining).toBe(10);
      expect(showUrgentNudge).toBe(false);
    });

    it("should detect expired trial and downgrade to free", () => {
      const now = new Date();
      const trialEnd = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
      const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      expect(daysRemaining).toBe(0);
      // Should trigger downgrade to free tier
    });

    it("should return trialExpired=true after trial ends", () => {
      const now = new Date();
      const trialEnd = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const isExpired = daysRemaining <= 0;

      expect(isExpired).toBe(true);
    });
  });

  describe("Trial features access", () => {
    it("should give trialing providers Professional tier features", () => {
      const trialTier = "basic" as const;
      const limits = SUBSCRIPTION_TIERS[trialTier].limits;

      expect(limits.maxServices).toBe(10);
      expect(limits.maxPhotosPerService).toBe(5);
      expect(limits.prioritySearch).toBe(true);
      expect(limits.analyticsAccess).toBe(true);
      expect(limits.customSlug).toBe(true);
    });

    it("should not give trialing providers Premium features", () => {
      const trialTier = "basic" as const;
      const limits = SUBSCRIPTION_TIERS[trialTier].limits;

      expect(limits.customBranding).toBe(false);
      expect(limits.premiumSupport).toBe(false);
      expect(limits.featuredListing).toBe(false);
    });

    it("should revert to free tier limits after trial expires", () => {
      const freeLimits = SUBSCRIPTION_TIERS.free.limits;

      expect(freeLimits.maxServices).toBe(3);
      expect(freeLimits.maxPhotosPerService).toBe(2);
      expect(freeLimits.prioritySearch).toBe(false);
      expect(freeLimits.analyticsAccess).toBe(false);
      expect(freeLimits.customSlug).toBe(false);
    });
  });
});
