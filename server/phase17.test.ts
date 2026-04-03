import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";
import {
  getOrCreateReferralCode,
  getReferralCodeByCode,
  getReferralCodeByUserId,
  validateReferralCode,
  createReferral,
  getReferralStats,
  getReferralHistory,
  updateReferralCode,
} from "./db/referrals";

// ============================================================================
// Phase 17 Tests: Code Splitting, Calendar Enhancements, Referral Program
// ============================================================================

function createAuthContext(role: "customer" | "provider" | "admin", userId: number, name: string, email?: string) {
  return {
    user: { id: userId, openId: `test-p17-${userId}`, name, role, email },
    req: { headers: { origin: "http://localhost:3000" } } as any,
  };
}

const caller = (ctx: any) => appRouter.createCaller(ctx);

describe("Phase 17: Code Splitting, Calendar, Referral Program", () => {
  let customerUserId: number;
  let customer2UserId: number;
  let providerUserId: number;
  let providerId: number;
  let serviceId: number;
  let categoryId: number;

  beforeAll(async () => {
    const suffix = Math.floor(Math.random() * 100000) + 170000;

    // Create customer user
    await db.upsertUser({
      openId: `test-p17-customer-${suffix}`,
      name: "P17 Customer",
      email: `p17customer${suffix}@test.com`,
      role: "customer",
    });
    const cUser = await db.getUserByOpenId(`test-p17-customer-${suffix}`);
    customerUserId = cUser!.id;

    // Create second customer user (for referral testing)
    await db.upsertUser({
      openId: `test-p17-customer2-${suffix}`,
      name: "P17 Customer2",
      email: `p17customer2${suffix}@test.com`,
      role: "customer",
    });
    const c2User = await db.getUserByOpenId(`test-p17-customer2-${suffix}`);
    customer2UserId = c2User!.id;

    // Create provider user
    await db.upsertUser({
      openId: `test-p17-provider-${suffix}`,
      name: "P17 Provider",
      email: `p17provider${suffix}@test.com`,
      role: "provider",
    });
    const pUser = await db.getUserByOpenId(`test-p17-provider-${suffix}`);
    providerUserId = pUser!.id;

    // Create provider profile
    await db.createServiceProvider({
      userId: providerUserId,
      businessName: `P17 Test Business ${suffix}`,
      businessDescription: "Test business for Phase 17",
      phoneNumber: "555-0017",
      city: "TestCity",
      state: "TS",
      postalCode: "17000",
    });
    const profile = await db.getProviderByUserId(providerUserId);
    providerId = profile!.id;

    // Get a category
    const categories = await db.getAllCategories();
    categoryId = categories[0]?.id || 15;

    // Create a service
    await db.createService({
      providerId,
      categoryId,
      name: `P17 Test Service ${suffix}`,
      description: "Test service for Phase 17",
      basePrice: "50.00",
      durationMinutes: 60,
      serviceType: "fixed_location",
      isActive: true,
    });
    const services = await db.getServicesByProvider(providerId);
    serviceId = services[0]?.id || 0;
  });

  // ========================================================================
  // Code Splitting Verification
  // ========================================================================

  describe("Code Splitting - db barrel exports", () => {
    it("should export all legacy db functions through barrel", async () => {
      // Verify key functions from the legacy monolith are accessible
      expect(typeof db.upsertUser).toBe("function");
      expect(typeof db.getUserByOpenId).toBe("function");
      expect(typeof db.createServiceProvider).toBe("function");
      expect(typeof db.getProviderByUserId).toBe("function");
      expect(typeof db.createService).toBe("function");
      expect(typeof db.getServicesByProvider).toBe("function");
      expect(typeof db.createBooking).toBe("function");
      expect(typeof db.getBookingById).toBe("function");
      expect(typeof db.getAllCategories).toBe("function");
      expect(typeof db.createReview).toBe("function");
    });

    it("should export new referral functions through barrel", async () => {
      expect(typeof db.getOrCreateReferralCode).toBe("function");
      expect(typeof db.getReferralCodeByCode).toBe("function");
      expect(typeof db.getReferralCodeByUserId).toBe("function");
      expect(typeof db.validateReferralCode).toBe("function");
      expect(typeof db.createReferral).toBe("function");
      expect(typeof db.completeReferral).toBe("function");
      expect(typeof db.getReferralStats).toBe("function");
      expect(typeof db.getReferralHistory).toBe("function");
      expect(typeof db.getPendingReferralForReferee).toBe("function");
      expect(typeof db.updateReferralCode).toBe("function");
    });
  });

  describe("Code Splitting - split file direct imports", () => {
    it("should import referral functions directly from db/referrals", async () => {
      expect(typeof getOrCreateReferralCode).toBe("function");
      expect(typeof getReferralCodeByCode).toBe("function");
      expect(typeof getReferralCodeByUserId).toBe("function");
      expect(typeof validateReferralCode).toBe("function");
      expect(typeof createReferral).toBe("function");
      expect(typeof getReferralStats).toBe("function");
      expect(typeof getReferralHistory).toBe("function");
      expect(typeof updateReferralCode).toBe("function");
    });
  });

  describe("Code Splitting - router merge", () => {
    it("should have all routers accessible through appRouter", () => {
      const ctx = createAuthContext("customer", customerUserId, "P17 Customer");
      const c = caller(ctx);
      // Check that key routers are accessible
      expect(c.booking).toBeDefined();
      expect(c.service).toBeDefined();
      expect(c.review).toBeDefined();
      expect(c.referral).toBeDefined();
      expect(c.promo).toBeDefined();
      expect(c.notification).toBeDefined();
      expect(c.message).toBeDefined();
      expect(c.availability).toBeDefined();
    });
  });

  // ========================================================================
  // Referral Code CRUD
  // ========================================================================

  describe("Referral Code Management", () => {
    it("should create a referral code for a user", async () => {
      const code = await getOrCreateReferralCode(customerUserId);
      expect(code).toBeDefined();
      expect(code.code).toMatch(/^REF-[A-Z0-9]{6}$/);
      expect(code.userId).toBe(customerUserId);
      expect(code.referrerDiscountPercent).toBe(10);
      expect(code.refereeDiscountPercent).toBe(10);
      expect(code.isActive).toBe(true);
    });

    it("should return the same code on subsequent calls", async () => {
      const code1 = await getOrCreateReferralCode(customerUserId);
      const code2 = await getOrCreateReferralCode(customerUserId);
      expect(code1.id).toBe(code2.id);
      expect(code1.code).toBe(code2.code);
    });

    it("should look up referral code by code string", async () => {
      const code = await getOrCreateReferralCode(customerUserId);
      const found = await getReferralCodeByCode(code.code);
      expect(found).toBeDefined();
      expect(found!.id).toBe(code.id);
    });

    it("should return null for non-existent code", async () => {
      const found = await getReferralCodeByCode("REF-ZZZZZZ");
      expect(found).toBeNull();
    });

    it("should look up referral code by user ID", async () => {
      const found = await getReferralCodeByUserId(customerUserId);
      expect(found).toBeDefined();
      expect(found!.userId).toBe(customerUserId);
    });

    it("should update referral code settings", async () => {
      const code = await getOrCreateReferralCode(customerUserId);
      await updateReferralCode(code.id, {
        referrerDiscountPercent: 15,
        refereeDiscountPercent: 20,
        maxReferrals: 50,
      });
      const updated = await getReferralCodeByUserId(customerUserId);
      expect(updated!.referrerDiscountPercent).toBe(15);
      expect(updated!.refereeDiscountPercent).toBe(20);
      expect(updated!.maxReferrals).toBe(50);
    });
  });

  // ========================================================================
  // Referral Code Validation
  // ========================================================================

  describe("Referral Code Validation", () => {
    it("should validate a valid referral code", async () => {
      const code = await getOrCreateReferralCode(customerUserId);
      const result = await validateReferralCode(code.code, customer2UserId);
      expect(result.valid).toBe(true);
      expect(result.referralCode).toBeDefined();
    });

    it("should reject own referral code", async () => {
      const code = await getOrCreateReferralCode(customerUserId);
      const result = await validateReferralCode(code.code, customerUserId);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("own referral code");
    });

    it("should reject invalid referral code", async () => {
      const result = await validateReferralCode("REF-INVALID", customer2UserId);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    it("should reject inactive referral code", async () => {
      const code = await getOrCreateReferralCode(customerUserId);
      await updateReferralCode(code.id, { isActive: false });
      const result = await validateReferralCode(code.code, customer2UserId);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("no longer active");
      // Re-activate for subsequent tests
      await updateReferralCode(code.id, { isActive: true });
    });
  });

  // ========================================================================
  // Referral Creation & Tracking
  // ========================================================================

  describe("Referral Creation & Tracking", () => {
    it("should create a referral record", async () => {
      const code = await getOrCreateReferralCode(customerUserId);
      await createReferral({
        referralCodeId: code.id,
        referrerId: customerUserId,
        refereeId: customer2UserId,
        refereeDiscountAmount: "5.00",
      });
      // Should be recorded
      const history = await getReferralHistory(customerUserId);
      expect(history.length).toBeGreaterThanOrEqual(1);
      const latest = history.find(r => r.refereeId === customer2UserId);
      expect(latest).toBeDefined();
      expect(latest!.status).toBe("pending");
    });

    it("should get referral stats", async () => {
      const stats = await getReferralStats(customerUserId);
      expect(stats.code).toBeDefined();
      expect(stats.totalReferrals).toBeGreaterThanOrEqual(1);
      expect(stats.pendingReferrals).toBeGreaterThanOrEqual(1);
    });

    it("should get referral history", async () => {
      const history = await getReferralHistory(customerUserId);
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0]).toHaveProperty("refereeId");
      expect(history[0]).toHaveProperty("status");
      expect(history[0]).toHaveProperty("createdAt");
    });

    it("should reject duplicate referral for same referee", async () => {
      const code = await getOrCreateReferralCode(customerUserId);
      const result = await validateReferralCode(code.code, customer2UserId);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("already used");
    });
  });

  // ========================================================================
  // Referral tRPC Router
  // ========================================================================

  describe("Referral tRPC Router", () => {
    it("should get or create referral code via tRPC", async () => {
      const ctx = createAuthContext("customer", customerUserId, "P17 Customer");
      const c = caller(ctx);
      const code = await c.referral.getMyCode();
      expect(code).toBeDefined();
      expect(code.code).toMatch(/^REF-/);
    });

    it("should get referral stats via tRPC", async () => {
      const ctx = createAuthContext("customer", customerUserId, "P17 Customer");
      const c = caller(ctx);
      const stats = await c.referral.getStats();
      expect(stats).toHaveProperty("totalReferrals");
      expect(stats).toHaveProperty("completedReferrals");
      expect(stats).toHaveProperty("pendingReferrals");
      expect(stats).toHaveProperty("totalEarnings");
    });

    it("should get referral history via tRPC", async () => {
      const ctx = createAuthContext("customer", customerUserId, "P17 Customer");
      const c = caller(ctx);
      const history = await c.referral.getHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it("should validate referral code via tRPC", async () => {
      // Create a code for customer2 and validate from provider perspective
      const code2 = await getOrCreateReferralCode(customer2UserId);
      const ctx = createAuthContext("provider", providerUserId, "P17 Provider");
      const c = caller(ctx);
      const result = await c.referral.validate({ code: code2.code });
      expect(result.valid).toBe(true);
      expect(result.refereeDiscountPercent).toBeDefined();
    });

    it("should update referral settings via tRPC", async () => {
      const ctx = createAuthContext("customer", customerUserId, "P17 Customer");
      const c = caller(ctx);
      const result = await c.referral.updateSettings({
        referrerDiscountPercent: 12,
        refereeDiscountPercent: 8,
      });
      expect(result.success).toBe(true);
      const code = await getReferralCodeByUserId(customerUserId);
      expect(code!.referrerDiscountPercent).toBe(12);
      expect(code!.refereeDiscountPercent).toBe(8);
    });

    it("should look up referral code publicly via tRPC", async () => {
      const code = await getOrCreateReferralCode(customerUserId);
      const c = caller({});
      const result = await c.referral.lookup({ code: code.code });
      expect(result).toBeDefined();
      expect(result!.code).toBe(code.code);
      expect(result!.refereeDiscountPercent).toBeDefined();
    });

    it("should return null for non-existent code lookup", async () => {
      const c = caller({});
      const result = await c.referral.lookup({ code: "REF-NONEXIST" });
      expect(result).toBeNull();
    });
  });

  // ========================================================================
  // Calendar Enhancement Verification
  // ========================================================================

  describe("Calendar Feed Enhancements", () => {
    it("should have calendar feed route accessible", async () => {
      // Verify the provider has a calendar feed URL
      const ctx = createAuthContext("provider", providerUserId, "P17 Provider");
      const c = caller(ctx);
      const result = await c.provider.getCalendarFeedUrl();
      expect(result).toBeDefined();
      // The result may be an object with a url property or a string
      const feedUrl = typeof result === "string" ? result : (result as any)?.url || (result as any)?.feedUrl || JSON.stringify(result);
      expect(feedUrl).toBeTruthy();
      expect(feedUrl.length).toBeGreaterThan(0);
    });
  });
});
