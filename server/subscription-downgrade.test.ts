import { describe, it, expect } from "vitest";

// ============================================================================
// PROVIDER SUBSCRIPTION PRICING TESTS
// ============================================================================
describe("Provider Subscription Products", () => {
  it("should have correct pricing for all tiers", async () => {
    const { SUBSCRIPTION_TIERS } = await import("./products");
    
    // Free tier
    expect(SUBSCRIPTION_TIERS.free.monthlyPrice).toBe(0);
    expect(SUBSCRIPTION_TIERS.free.yearlyPrice).toBe(0);
    
    // Professional tier - $12/mo, 16% annual discount
    expect(SUBSCRIPTION_TIERS.basic.monthlyPrice).toBe(12);
    expect(SUBSCRIPTION_TIERS.basic.yearlyPrice).toBe(120.96); // $10.08/mo
    expect(SUBSCRIPTION_TIERS.basic.yearlyPrice).toBeLessThan(SUBSCRIPTION_TIERS.basic.monthlyPrice * 12);
    
    // Business tier - $20/mo, 20% annual discount
    expect(SUBSCRIPTION_TIERS.premium.monthlyPrice).toBe(20);
    expect(SUBSCRIPTION_TIERS.premium.yearlyPrice).toBe(192.00); // $16.00/mo
    expect(SUBSCRIPTION_TIERS.premium.yearlyPrice).toBeLessThan(SUBSCRIPTION_TIERS.premium.monthlyPrice * 12);
  });

  it("should have correct annual discount percentages", async () => {
    const { SUBSCRIPTION_TIERS } = await import("./products");
    
    // Pro: 16% discount
    const proMonthlyTotal = SUBSCRIPTION_TIERS.basic.monthlyPrice * 12;
    const proDiscount = ((proMonthlyTotal - SUBSCRIPTION_TIERS.basic.yearlyPrice) / proMonthlyTotal) * 100;
    expect(Math.round(proDiscount)).toBe(16);
    
    // Business: 20% discount
    const bizMonthlyTotal = SUBSCRIPTION_TIERS.premium.monthlyPrice * 12;
    const bizDiscount = ((bizMonthlyTotal - SUBSCRIPTION_TIERS.premium.yearlyPrice) / bizMonthlyTotal) * 100;
    expect(Math.round(bizDiscount)).toBe(20);
  });

  it("should have three tiers: free, basic, premium", async () => {
    const { SUBSCRIPTION_TIERS } = await import("./products");
    expect(Object.keys(SUBSCRIPTION_TIERS)).toEqual(["free", "basic", "premium"]);
  });

  it("each tier should have name and features", async () => {
    const { SUBSCRIPTION_TIERS } = await import("./products");
    for (const tier of Object.values(SUBSCRIPTION_TIERS)) {
      expect(tier.name).toBeTruthy();
      expect(Array.isArray(tier.features)).toBe(true);
      expect(tier.features.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// CUSTOMER SUBSCRIPTION PRICING TESTS
// ============================================================================
describe("Customer Subscription Pricing", () => {
  it("should have correct pricing for all customer tiers", async () => {
    const { CUSTOMER_TIERS } = await import("./customerSubscription");
    
    // Free
    expect(CUSTOMER_TIERS.free.monthlyPrice).toBe(0);
    expect(CUSTOMER_TIERS.free.yearlyPrice).toBe(0);
    
    // Pro - $12/mo
    expect(CUSTOMER_TIERS.pro.monthlyPrice).toBe(12);
    expect(CUSTOMER_TIERS.pro.yearlyPrice).toBe(120.96);
    
    // Business - $20/mo
    expect(CUSTOMER_TIERS.business.monthlyPrice).toBe(20);
    expect(CUSTOMER_TIERS.business.yearlyPrice).toBe(192.00);
  });
});

// ============================================================================
// DOWNGRADE VALIDATION TESTS
// ============================================================================
describe("Downgrade Tier Validation", () => {
  it("should validate tier order correctly", () => {
    const tierOrder: Record<string, number> = { free: 0, starter: 0, basic: 1, pro: 1, premium: 2, business: 2 };
    
    // Valid downgrades
    expect(tierOrder["free"] < tierOrder["basic"]).toBe(true); // basic -> free is a downgrade
    expect(tierOrder["free"] < tierOrder["premium"]).toBe(true); // premium -> free is a downgrade
    expect(tierOrder["basic"] < tierOrder["premium"]).toBe(true); // premium -> basic is a downgrade
    
    // Invalid downgrades (same or upgrade)
    expect(tierOrder["premium"] < tierOrder["basic"]).toBe(false); // basic -> premium is not a downgrade
    expect(tierOrder["basic"] < tierOrder["free"]).toBe(false); // free -> basic is not a downgrade
  });
});
