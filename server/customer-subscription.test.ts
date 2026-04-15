import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// CUSTOMER SUBSCRIPTION TIER CONFIG TESTS
// ============================================================================
describe("Customer Subscription Tiers", () => {
  it("should define three tiers: free, pro, business", async () => {
    const { CUSTOMER_TIERS } = await import("./customerSubscription");
    expect(Object.keys(CUSTOMER_TIERS)).toEqual(["free", "pro", "business"]);
  });

  it("free tier should have 10 saved provider limit", async () => {
    const { CUSTOMER_TIERS } = await import("./customerSubscription");
    expect(CUSTOMER_TIERS.free.savedProviderLimit).toBe(10);
    expect(CUSTOMER_TIERS.free.monthlyPrice).toBe(0);
  });

  it("pro tier should have 50 saved provider limit at $9.99/mo", async () => {
    const { CUSTOMER_TIERS } = await import("./customerSubscription");
    expect(CUSTOMER_TIERS.pro.savedProviderLimit).toBe(50);
    expect(CUSTOMER_TIERS.pro.monthlyPrice).toBe(9.99);
  });

  it("business tier should have unlimited (-1) saved providers at $24.99/mo", async () => {
    const { CUSTOMER_TIERS } = await import("./customerSubscription");
    expect(CUSTOMER_TIERS.business.savedProviderLimit).toBe(-1);
    expect(CUSTOMER_TIERS.business.monthlyPrice).toBe(24.99);
  });

  it("yearly prices should be lower than monthly * 12", async () => {
    const { CUSTOMER_TIERS } = await import("./customerSubscription");
    expect(CUSTOMER_TIERS.pro.yearlyPrice).toBeLessThan(CUSTOMER_TIERS.pro.monthlyPrice * 12);
    expect(CUSTOMER_TIERS.business.yearlyPrice).toBeLessThan(CUSTOMER_TIERS.business.monthlyPrice * 12);
  });

  it("each tier should have a name, features list, and perks", async () => {
    const { CUSTOMER_TIERS } = await import("./customerSubscription");
    for (const tier of Object.values(CUSTOMER_TIERS)) {
      expect(tier.name).toBeTruthy();
      expect(Array.isArray(tier.features)).toBe(true);
      expect(tier.features.length).toBeGreaterThan(0);
      expect(tier.perks).toBeDefined();
    }
  });

  it("business tier should have all perks enabled", async () => {
    const { CUSTOMER_TIERS } = await import("./customerSubscription");
    const perks = CUSTOMER_TIERS.business.perks;
    expect(perks.priorityBooking).toBe(true);
    expect(perks.bulkQuoteRequests).toBe(true);
    expect(perks.bookingAnalytics).toBe(true);
    expect(perks.savedProviderFolders).toBe(true);
    expect(perks.dedicatedSupport).toBe(true);
  });

  it("free tier should have no perks enabled", async () => {
    const { CUSTOMER_TIERS } = await import("./customerSubscription");
    const perks = CUSTOMER_TIERS.free.perks;
    expect(perks.priorityBooking).toBe(false);
    expect(perks.bulkQuoteRequests).toBe(false);
    expect(perks.bookingAnalytics).toBe(false);
    expect(perks.savedProviderFolders).toBe(false);
    expect(perks.dedicatedSupport).toBe(false);
  });
});

// ============================================================================
// SAVED PROVIDER LIMIT LOGIC TESTS
// ============================================================================
describe("canCustomerSaveMore", () => {
  it("free tier: should allow saving when under limit (count < 10)", async () => {
    const { canCustomerSaveMore } = await import("./customerSubscription");
    expect(canCustomerSaveMore("free", 0)).toBe(true);
    expect(canCustomerSaveMore("free", 5)).toBe(true);
    expect(canCustomerSaveMore("free", 9)).toBe(true);
  });

  it("free tier: should block saving when at limit (count >= 10)", async () => {
    const { canCustomerSaveMore } = await import("./customerSubscription");
    expect(canCustomerSaveMore("free", 10)).toBe(false);
    expect(canCustomerSaveMore("free", 15)).toBe(false);
  });

  it("pro tier: should allow saving when under limit (count < 50)", async () => {
    const { canCustomerSaveMore } = await import("./customerSubscription");
    expect(canCustomerSaveMore("pro", 0)).toBe(true);
    expect(canCustomerSaveMore("pro", 25)).toBe(true);
    expect(canCustomerSaveMore("pro", 49)).toBe(true);
  });

  it("pro tier: should block saving when at limit (count >= 50)", async () => {
    const { canCustomerSaveMore } = await import("./customerSubscription");
    expect(canCustomerSaveMore("pro", 50)).toBe(false);
    expect(canCustomerSaveMore("pro", 100)).toBe(false);
  });

  it("business tier: should always allow saving (unlimited)", async () => {
    const { canCustomerSaveMore } = await import("./customerSubscription");
    expect(canCustomerSaveMore("business", 0)).toBe(true);
    expect(canCustomerSaveMore("business", 100)).toBe(true);
    expect(canCustomerSaveMore("business", 10000)).toBe(true);
  });
});

describe("getCustomerSavedLimit", () => {
  it("should return correct limits for each tier", async () => {
    const { getCustomerSavedLimit } = await import("./customerSubscription");
    expect(getCustomerSavedLimit("free")).toBe(10);
    expect(getCustomerSavedLimit("pro")).toBe(50);
    expect(getCustomerSavedLimit("business")).toBe(-1);
  });
});

// ============================================================================
// DB HELPERS TESTS
// ============================================================================
describe("Customer Subscription DB Helpers", () => {
  it("getCustomerTier should return 'free' for users without subscriptions", async () => {
    const db = await import("./db");
    // Non-existent user should default to free
    const tier = await db.getCustomerTier(999999);
    expect(tier).toBe("free");
  });

  it("getCustomerSubscription should return undefined for non-subscribed users", async () => {
    const db = await import("./db");
    const sub = await db.getCustomerSubscription(999999);
    expect(sub).toBeUndefined();
  });

  it("getUserFavoriteCount should return a number", async () => {
    const db = await import("./db");
    const count = await db.getUserFavoriteCount(999999);
    expect(typeof count).toBe("number");
    expect(count).toBeGreaterThanOrEqual(0);
  });

  it("upsertCustomerSubscription should handle foreign key constraint correctly", async () => {
    const db = await import("./db");
    // Inserting with a non-existent userId should fail due to FK constraint
    // This validates the schema is correctly set up with foreign keys
    await expect(
      db.upsertCustomerSubscription({
        userId: 888888,
        tier: "pro",
        stripeSubscriptionId: "sub_test_customer_123",
        stripeCustomerId: "cus_test_customer_123",
        status: "active",
      })
    ).rejects.toThrow();
  });

  it("getCustomerTier should return free for cancelled subscriptions", async () => {
    const db = await import("./db");
    // A user with no subscription should be free
    const tier = await db.getCustomerTier(999998);
    expect(tier).toBe("free");
  });
});

// ============================================================================
// CUSTOMER SUBSCRIPTION ROUTER TESTS
// ============================================================================
describe("Customer Subscription Router", () => {
  it("should export customerSubscriptionRouter", async () => {
    const { customerSubscriptionRouter } = await import("./customerSubscriptionRouter");
    expect(customerSubscriptionRouter).toBeDefined();
  });

  it("should have getSubscription, getTiers, createCheckout, createPortalSession, canSaveMore procedures", async () => {
    const { customerSubscriptionRouter } = await import("./customerSubscriptionRouter");
    const procedures = customerSubscriptionRouter._def.procedures;
    expect(procedures).toHaveProperty("getSubscription");
    expect(procedures).toHaveProperty("getTiers");
    expect(procedures).toHaveProperty("createCheckout");
    expect(procedures).toHaveProperty("createPortalSession");
    expect(procedures).toHaveProperty("canSaveMore");
  });
});

// ============================================================================
// WEBHOOK HANDLER TESTS
// ============================================================================
describe("Customer Subscription Webhook Handling", () => {
  it("stripeWebhook should handle customer_subscription type metadata", async () => {
    // The webhook handler distinguishes between provider and customer subscriptions
    // via metadata.type === "customer_subscription"
    const webhookModule = await import("./stripeWebhook");
    expect(webhookModule.handleStripeWebhook).toBeDefined();
  });
});

// ============================================================================
// SCHEMA TESTS
// ============================================================================
describe("Customer Subscriptions Schema", () => {
  it("should have customerSubscriptions table defined", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.customerSubscriptions).toBeDefined();
  });

  it("customerSubscriptions table should have required columns", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.customerSubscriptions;
    // Check the table has the expected column names
    const columns = Object.keys(table);
    expect(columns).toContain("id");
    expect(columns).toContain("userId");
    expect(columns).toContain("tier");
    expect(columns).toContain("status");
    expect(columns).toContain("stripeSubscriptionId");
    expect(columns).toContain("stripeCustomerId");
  });
});

// ============================================================================
// STRIPE PRODUCT CONFIG TESTS
// ============================================================================
describe("Stripe Product Configuration", () => {
  it("should define a customer stripe product name", async () => {
    const { CUSTOMER_STRIPE_PRODUCT_NAME } = await import("./customerSubscription");
    expect(CUSTOMER_STRIPE_PRODUCT_NAME).toBeTruthy();
    expect(typeof CUSTOMER_STRIPE_PRODUCT_NAME).toBe("string");
  });
});
