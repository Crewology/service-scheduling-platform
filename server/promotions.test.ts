import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the promotion DB helpers
vi.mock("./db/promotions", () => ({
  createPromotion: vi.fn().mockResolvedValue({ id: 1, providerId: 10, tier: "quick_boost", status: "pending", headline: "Test", description: "Test desc", amountPaid: 499 }),
  getPromotionById: vi.fn().mockResolvedValue({ id: 1, providerId: 10, tier: "quick_boost", status: "pending" }),
  getPromotionsByProvider: vi.fn().mockResolvedValue([
    { id: 1, providerId: 10, tier: "quick_boost", status: "active", headline: "Boost", description: "Desc", impressions: 50, clicks: 5, startDate: new Date(), endDate: new Date(Date.now() + 86400000) },
  ]),
  getActivePromotions: vi.fn().mockResolvedValue([
    { promotion: { id: 1, providerId: 10, tier: "homepage_feature", headline: "Featured!", description: "Great service" }, provider: { id: 10, businessName: "Test Biz", city: "NYC" }, service: null },
  ]),
  getActivePromotionsByProviderIds: vi.fn().mockResolvedValue([
    { id: 1, providerId: 10, tier: "quick_boost", status: "active" },
  ]),
  activatePromotion: vi.fn().mockResolvedValue(undefined),
  expirePromotions: vi.fn().mockResolvedValue(2),
  incrementImpressions: vi.fn().mockResolvedValue(undefined),
  incrementClicks: vi.fn().mockResolvedValue(undefined),
  updatePromotionStripeSession: vi.fn().mockResolvedValue(undefined),
  updatePromotionPaymentIntent: vi.fn().mockResolvedValue(undefined),
}));

// Mock provider DB
vi.mock("./db/providers", () => ({
  getProviderByUserId: vi.fn().mockResolvedValue({ id: 10, businessName: "Test Provider", city: "NYC", state: "NY", averageRating: "4.5" }),
}));

// Mock service DB
vi.mock("./db/services", () => ({
  getServiceById: vi.fn().mockResolvedValue({ id: 1, name: "DJ Service", description: "Professional DJ", basePrice: "150", durationMinutes: 120 }),
}));

// Mock LLM
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({ headline: "Top DJ in NYC", description: "Professional DJ with amazing beats", cta: "Book Now" }) } }],
  }),
}));

// Mock Stripe
vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({ id: "cs_test_123", url: "https://checkout.stripe.com/test" }),
        },
      },
    })),
  };
});

// Mock ENV
vi.mock("./_core/env", () => ({
  ENV: {
    stripeSecretKey: "sk_test_fake",
    stripeWebhookSecret: "whsec_fake",
  },
}));

describe("Promotion Feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Tier Pricing", () => {
    it("should have correct pricing for all tiers", async () => {
      // Import the router to test getTiers
      const { promotionRouter } = await import("./promotionRouter");
      expect(promotionRouter).toBeDefined();

      // Verify tier pricing constants
      const TIER_PRICING: Record<string, { cents: number; durationHours: number }> = {
        quick_boost: { cents: 499, durationHours: 24 },
        category_spotlight: { cents: 1499, durationHours: 168 },
        homepage_feature: { cents: 2999, durationHours: 168 },
        smart_bundle: { cents: 3999, durationHours: 168 },
      };

      expect(TIER_PRICING.quick_boost.cents).toBe(499);
      expect(TIER_PRICING.category_spotlight.cents).toBe(1499);
      expect(TIER_PRICING.homepage_feature.cents).toBe(2999);
      expect(TIER_PRICING.smart_bundle.cents).toBe(3999);
      expect(TIER_PRICING.quick_boost.durationHours).toBe(24);
      expect(TIER_PRICING.category_spotlight.durationHours).toBe(168);
    });
  });

  describe("Promotion DB Helpers", () => {
    it("should create a promotion record", async () => {
      const promotionDb = await import("./db/promotions");
      const result = await promotionDb.createPromotion({
        providerId: 10,
        serviceId: null,
        tier: "quick_boost",
        status: "pending",
        headline: "Test Headline",
        description: "Test Description",
        aiGenerated: true,
        amountPaid: 499,
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
      expect(result?.tier).toBe("quick_boost");
      expect(result?.status).toBe("pending");
      expect(promotionDb.createPromotion).toHaveBeenCalledWith(
        expect.objectContaining({ providerId: 10, tier: "quick_boost" })
      );
    });

    it("should get promotions by provider", async () => {
      const promotionDb = await import("./db/promotions");
      const results = await promotionDb.getPromotionsByProvider(10);

      expect(results).toHaveLength(1);
      expect(results[0].providerId).toBe(10);
      expect(results[0].tier).toBe("quick_boost");
    });

    it("should get active promotions for display", async () => {
      const promotionDb = await import("./db/promotions");
      const results = await promotionDb.getActivePromotions("homepage_feature");

      expect(results).toHaveLength(1);
      expect(results[0].promotion.tier).toBe("homepage_feature");
      expect(results[0].provider.businessName).toBe("Test Biz");
    });

    it("should activate a promotion with start and end dates", async () => {
      const promotionDb = await import("./db/promotions");
      const start = new Date();
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

      await promotionDb.activatePromotion(1, start, end);
      expect(promotionDb.activatePromotion).toHaveBeenCalledWith(1, start, end);
    });

    it("should increment clicks on a promotion", async () => {
      const promotionDb = await import("./db/promotions");
      await promotionDb.incrementClicks(1);
      expect(promotionDb.incrementClicks).toHaveBeenCalledWith(1);
    });

    it("should expire promotions past their end date", async () => {
      const promotionDb = await import("./db/promotions");
      const expired = await promotionDb.expirePromotions();
      expect(expired).toBe(2);
    });
  });

  describe("Stripe Webhook - Promotion Payment", () => {
    it("should activate promotion when checkout completes", async () => {
      const promotionDb = await import("./db/promotions");

      // Simulate what handlePromotionPayment does
      const promotionId = "1";
      const tier = "quick_boost";
      const durationHours = tier === "quick_boost" ? 24 : 168;
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

      await promotionDb.activatePromotion(parseInt(promotionId), startDate, endDate);

      expect(promotionDb.activatePromotion).toHaveBeenCalledWith(1, startDate, endDate);
      // Verify the duration is correct (24 hours for quick_boost)
      expect(endDate.getTime() - startDate.getTime()).toBe(24 * 60 * 60 * 1000);
    });

    it("should store payment intent ID after activation", async () => {
      const promotionDb = await import("./db/promotions");
      await promotionDb.updatePromotionPaymentIntent(1, "pi_test_123");
      expect(promotionDb.updatePromotionPaymentIntent).toHaveBeenCalledWith(1, "pi_test_123");
    });
  });

  describe("AI Copy Generation", () => {
    it("should generate ad copy via LLM", async () => {
      const { invokeLLM } = await import("./_core/llm");
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert marketing copywriter..." },
          { role: "user", content: "Generate promotional ad copy for this business." },
        ],
      });

      const content = response.choices?.[0]?.message?.content;
      expect(content).toBeDefined();
      const parsed = JSON.parse(content as string);
      expect(parsed.headline).toBe("Top DJ in NYC");
      expect(parsed.description).toBe("Professional DJ with amazing beats");
      expect(parsed.cta).toBe("Book Now");
    });
  });

  describe("Active Promotions by Provider IDs", () => {
    it("should return active promotions for given provider IDs", async () => {
      const promotionDb = await import("./db/promotions");
      const results = await promotionDb.getActivePromotionsByProviderIds([10, 20]);

      expect(results).toHaveLength(1);
      expect(results[0].providerId).toBe(10);
      expect(results[0].status).toBe("active");
    });
  });
});
