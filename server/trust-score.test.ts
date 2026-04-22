import { describe, it, expect } from "vitest";
import { calculateTrustScore, type TrustScoreInput } from "../shared/trustScore";

// ============================================================================
// TRUST SCORE CALCULATION TESTS
// ============================================================================

describe("Trust Score Calculation", () => {
  const baseInput: TrustScoreInput = {
    hasProfilePhoto: false,
    hasDescription: false,
    hasAddress: false,
    hasBusinessType: false,
    activeServiceCount: 0,
    hasPortfolioItems: false,
    stripeAccountStatus: null,
    stripeOnboardingComplete: false,
    payoutEnabled: false,
    totalCompletedBookings: 0,
    averageRating: 0,
    totalReviews: 0,
    accountCreatedAt: new Date(),
    lastActiveAt: new Date(),
  };

  describe("Level assignment", () => {
    it("should assign 'new' level for brand new provider with no profile", () => {
      const result = calculateTrustScore(baseInput);
      expect(result.level).toBe("new");
      expect(result.score).toBeLessThan(20);
    });

    it("should assign 'rising' level for provider with complete profile and payment setup", () => {
      const result = calculateTrustScore({
        ...baseInput,
        hasProfilePhoto: true,
        hasDescription: true,
        hasAddress: true,
        hasBusinessType: true,
        activeServiceCount: 3,
        hasPortfolioItems: true,
        stripeAccountStatus: "active",
        stripeOnboardingComplete: true,
        payoutEnabled: true,
      });
      expect(result.level).toBe("rising");
      expect(result.score).toBeGreaterThanOrEqual(20);
      expect(result.score).toBeLessThan(50);
    });

    it("should assign 'trusted' level for provider with bookings and reviews", () => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const result = calculateTrustScore({
        ...baseInput,
        hasProfilePhoto: true,
        hasDescription: true,
        hasAddress: true,
        hasBusinessType: false,
        activeServiceCount: 3,
        hasPortfolioItems: false,
        stripeAccountStatus: "active",
        stripeOnboardingComplete: true,
        payoutEnabled: true,
        totalCompletedBookings: 8,
        averageRating: 4.0,
        totalReviews: 4,
        accountCreatedAt: threeMonthsAgo,
        lastActiveAt: new Date(),
      });
      expect(result.level).toBe("trusted");
      expect(result.score).toBeGreaterThanOrEqual(50);
      expect(result.score).toBeLessThan(80);
    });

    it("should assign 'top_pro' level for elite provider", () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const result = calculateTrustScore({
        ...baseInput,
        hasProfilePhoto: true,
        hasDescription: true,
        hasAddress: true,
        hasBusinessType: true,
        activeServiceCount: 10,
        hasPortfolioItems: true,
        stripeAccountStatus: "active",
        stripeOnboardingComplete: true,
        payoutEnabled: true,
        totalCompletedBookings: 50,
        averageRating: 4.8,
        totalReviews: 25,
        accountCreatedAt: oneYearAgo,
        lastActiveAt: new Date(),
      });
      expect(result.level).toBe("top_pro");
      expect(result.score).toBeGreaterThanOrEqual(80);
    });
  });

  describe("Score breakdown categories", () => {
    it("should give profile completeness points for photo, description, address, business type", () => {
      const withProfile = calculateTrustScore({
        ...baseInput,
        hasProfilePhoto: true,
        hasDescription: true,
        hasAddress: true,
        hasBusinessType: true,
        activeServiceCount: 3,
      });
      expect(withProfile.breakdown.profileCompleteness).toBeGreaterThan(0);
      
      const withoutProfile = calculateTrustScore(baseInput);
      expect(withProfile.breakdown.profileCompleteness).toBeGreaterThan(withoutProfile.breakdown.profileCompleteness);
    });

    it("should give payment setup points for Stripe configuration", () => {
      const withPayment = calculateTrustScore({
        ...baseInput,
        stripeAccountStatus: "active",
        stripeOnboardingComplete: true,
        payoutEnabled: true,
      });
      expect(withPayment.breakdown.paymentSetup).toBeGreaterThan(0);
      
      const withoutPayment = calculateTrustScore(baseInput);
      expect(withPayment.breakdown.paymentSetup).toBeGreaterThan(withoutPayment.breakdown.paymentSetup);
    });

    it("should give booking history points for completed bookings", () => {
      const withBookings = calculateTrustScore({
        ...baseInput,
        totalCompletedBookings: 20,
      });
      expect(withBookings.breakdown.bookingHistory).toBeGreaterThan(0);
      
      const withoutBookings = calculateTrustScore(baseInput);
      expect(withBookings.breakdown.bookingHistory).toBeGreaterThan(withoutBookings.breakdown.bookingHistory);
    });

    it("should give review points for good ratings and review count", () => {
      const withReviews = calculateTrustScore({
        ...baseInput,
        averageRating: 4.5,
        totalReviews: 10,
      });
      expect(withReviews.breakdown.customerReviews).toBeGreaterThan(0);
      
      const withoutReviews = calculateTrustScore(baseInput);
      expect(withReviews.breakdown.customerReviews).toBeGreaterThan(withoutReviews.breakdown.customerReviews);
    });

    it("should give account age points for older accounts", () => {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const olderAccount = calculateTrustScore({
        ...baseInput,
        accountCreatedAt: sixMonthsAgo,
        lastActiveAt: new Date(),
      });
      expect(olderAccount.breakdown.accountAge).toBeGreaterThan(0);
    });
  });

  describe("Score bounds", () => {
    it("should never exceed 100", () => {
      const maxInput: TrustScoreInput = {
        hasProfilePhoto: true,
        hasDescription: true,
        hasAddress: true,
        hasBusinessType: true,
        activeServiceCount: 100,
        hasPortfolioItems: true,
        stripeAccountStatus: "active",
        stripeOnboardingComplete: true,
        payoutEnabled: true,
        totalCompletedBookings: 1000,
        averageRating: 5.0,
        totalReviews: 500,
        accountCreatedAt: new Date("2020-01-01"),
        lastActiveAt: new Date(),
      };
      const result = calculateTrustScore(maxInput);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("should never be negative", () => {
      const result = calculateTrustScore(baseInput);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Incremental scoring", () => {
    it("should increase score when adding more services", () => {
      const with1 = calculateTrustScore({ ...baseInput, activeServiceCount: 1 });
      const with3 = calculateTrustScore({ ...baseInput, activeServiceCount: 3 });
      const with5 = calculateTrustScore({ ...baseInput, activeServiceCount: 5 });
      expect(with3.score).toBeGreaterThanOrEqual(with1.score);
      expect(with5.score).toBeGreaterThanOrEqual(with3.score);
    });

    it("should increase score with more completed bookings", () => {
      const with0 = calculateTrustScore({ ...baseInput, totalCompletedBookings: 0 });
      const with5 = calculateTrustScore({ ...baseInput, totalCompletedBookings: 5 });
      const with20 = calculateTrustScore({ ...baseInput, totalCompletedBookings: 20 });
      expect(with5.score).toBeGreaterThan(with0.score);
      expect(with20.score).toBeGreaterThan(with5.score);
    });

    it("should increase score with higher ratings", () => {
      const rating3 = calculateTrustScore({ ...baseInput, averageRating: 3.0, totalReviews: 5 });
      const rating4 = calculateTrustScore({ ...baseInput, averageRating: 4.0, totalReviews: 5 });
      const rating5 = calculateTrustScore({ ...baseInput, averageRating: 5.0, totalReviews: 5 });
      expect(rating4.breakdown.customerReviews).toBeGreaterThan(rating3.breakdown.customerReviews);
      expect(rating5.breakdown.customerReviews).toBeGreaterThan(rating4.breakdown.customerReviews);
    });
  });
});

// ============================================================================
// TRUST ROUTER TESTS (unit-level, mocking db)
// ============================================================================

describe("Trust Router - selectFreeTier integration", () => {
  it("should export calculateTrustScore function", () => {
    expect(typeof calculateTrustScore).toBe("function");
  });

  it("should return a valid TrustScoreResult shape", () => {
    const result = calculateTrustScore({
      hasProfilePhoto: true,
      hasDescription: true,
      hasAddress: true,
      hasBusinessType: true,
      activeServiceCount: 2,
      hasPortfolioItems: false,
      stripeAccountStatus: "active",
      stripeOnboardingComplete: true,
      payoutEnabled: true,
      totalCompletedBookings: 3,
      averageRating: 4.0,
      totalReviews: 2,
      accountCreatedAt: new Date("2025-01-01"),
      lastActiveAt: new Date(),
    });

    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("level");
    expect(result).toHaveProperty("breakdown");
    expect(result.breakdown).toHaveProperty("profileCompleteness");
    expect(result.breakdown).toHaveProperty("paymentSetup");
    expect(result.breakdown).toHaveProperty("bookingHistory");
    expect(result.breakdown).toHaveProperty("customerReviews");
    expect(result.breakdown).toHaveProperty("accountAge");
    expect(["new", "rising", "trusted", "top_pro"]).toContain(result.level);
    expect(typeof result.score).toBe("number");
  });
});
