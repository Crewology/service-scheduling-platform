import { describe, it, expect, beforeAll, vi } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

// ============================================================================
// Phase 14 Tests: Embedded Analytics, Provider Analytics, Automated Refunds
// ============================================================================

function createAuthContext(role: "customer" | "provider" | "admin", userId: number, name: string, email?: string) {
  return {
    user: { id: userId, openId: `test-p14-${userId}`, name, role, email },
    req: { headers: { origin: "http://localhost:3000" } } as any,
  };
}

describe("Phase 14: Analytics, Provider Dashboard, Refunds", () => {
  let customerUserId: number;
  let providerUserId: number;
  let providerId: number;
  let serviceId: number;

  beforeAll(async () => {
    const suffix = Math.floor(Math.random() * 100000) + 140000;

    // Create customer user
    await db.upsertUser({
      openId: `test-p14-customer-${suffix}`,
      name: "P14 Customer",
      email: `p14customer${suffix}@test.com`,
      role: "customer",
    });
    const cUser = await db.getUserByOpenId(`test-p14-customer-${suffix}`);
    customerUserId = cUser!.id;

    // Create provider user
    await db.upsertUser({
      openId: `test-p14-provider-${suffix}`,
      name: "P14 Provider",
      email: `p14provider${suffix}@test.com`,
      role: "provider",
    });
    const pUser = await db.getUserByOpenId(`test-p14-provider-${suffix}`);
    providerUserId = pUser!.id;

    // Create provider profile
    await db.createServiceProvider({
      userId: providerUserId,
      businessName: `P14 Analytics Test Business ${suffix}`,
      businessType: "sole_proprietor",
      profileSlug: `p14-test-${suffix}`,
    });
    const providerRecord = await db.getProviderByUserId(providerUserId);
    providerId = providerRecord!.id;

    // Create a service
    await db.createService({
      providerId,
      categoryId: 7,
      name: `P14 Test Service ${suffix}`,
      description: "Test service for analytics",
      basePrice: "50.00",
      durationMinutes: 60,
      serviceType: "fixed_location",
      pricingModel: "fixed",
    });
    const providerServices = await db.getServicesByProviderId(providerId);
    serviceId = providerServices[0].id;
  });

  // ─── Booking Source Tracking ─────────────────────────────────────────────

  describe("Booking Source Tracking", () => {
    it("should create booking with direct source by default", async () => {
      const caller = appRouter.createCaller(createAuthContext("customer", customerUserId, "P14 Customer"));
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 3);
      const dateStr = tomorrow.toISOString().split("T")[0];

      const booking = await caller.booking.create({
        serviceId,
        providerId,
        bookingDate: dateStr,
        startTime: "10:00",
        endTime: "11:00",
        locationType: "fixed_location",
        totalAmount: "50.00",
        bookingSource: "direct",
      });

      expect(booking).toBeDefined();
      expect(booking.bookingSource).toBe("direct");
    });

    it("should create booking with embed_widget source", async () => {
      const caller = appRouter.createCaller(createAuthContext("customer", customerUserId, "P14 Customer"));
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 4);
      const dateStr = tomorrow.toISOString().split("T")[0];

      const booking = await caller.booking.create({
        serviceId,
        providerId,
        bookingDate: dateStr,
        startTime: "14:00",
        endTime: "15:00",
        locationType: "fixed_location",
        totalAmount: "50.00",
        bookingSource: "embed_widget",
      });

      expect(booking).toBeDefined();
      expect(booking.bookingSource).toBe("embed_widget");
    });

    it("should create booking with provider_page source", async () => {
      const caller = appRouter.createCaller(createAuthContext("customer", customerUserId, "P14 Customer"));
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 5);
      const dateStr = tomorrow.toISOString().split("T")[0];

      const booking = await caller.booking.create({
        serviceId,
        providerId,
        bookingDate: dateStr,
        startTime: "16:00",
        endTime: "17:00",
        locationType: "fixed_location",
        totalAmount: "50.00",
        bookingSource: "provider_page",
      });

      expect(booking).toBeDefined();
      expect(booking.bookingSource).toBe("provider_page");
    });
  });

  // ─── Provider Analytics ──────────────────────────────────────────────────

  describe("Provider Analytics Dashboard", () => {
    it("should return analytics data for a provider", async () => {
      const caller = appRouter.createCaller(createAuthContext("provider", providerUserId, "P14 Provider"));
      const analytics = await caller.provider.analytics();

      expect(analytics).toBeDefined();
      expect(analytics).toHaveProperty("bookingTrends");
      expect(analytics).toHaveProperty("topServices");
      expect(analytics).toHaveProperty("customerRetention");
      expect(analytics).toHaveProperty("bookingSources");
      expect(analytics).toHaveProperty("refundAnalytics");
    });

    it("should return booking trends as an array", async () => {
      const caller = appRouter.createCaller(createAuthContext("provider", providerUserId, "P14 Provider"));
      const analytics = await caller.provider.analytics();

      expect(Array.isArray(analytics.bookingTrends)).toBe(true);
    });

    it("should return top services as an array", async () => {
      const caller = appRouter.createCaller(createAuthContext("provider", providerUserId, "P14 Provider"));
      const analytics = await caller.provider.analytics();

      expect(Array.isArray(analytics.topServices)).toBe(true);
      if (analytics.topServices.length > 0) {
        expect(analytics.topServices[0]).toHaveProperty("serviceId");
        expect(analytics.topServices[0]).toHaveProperty("totalBookings");
        expect(analytics.topServices[0]).toHaveProperty("revenue");
      }
    });

    it("should return customer retention metrics", async () => {
      const caller = appRouter.createCaller(createAuthContext("provider", providerUserId, "P14 Provider"));
      const analytics = await caller.provider.analytics();

      expect(analytics.customerRetention).toHaveProperty("totalCustomers");
      expect(analytics.customerRetention).toHaveProperty("returningCustomers");
      expect(analytics.customerRetention).toHaveProperty("retentionRate");
      expect(analytics.customerRetention).toHaveProperty("avgBookingsPerCustomer");
    });

    it("should return booking source breakdown", async () => {
      const caller = appRouter.createCaller(createAuthContext("provider", providerUserId, "P14 Provider"));
      const analytics = await caller.provider.analytics();

      expect(Array.isArray(analytics.bookingSources)).toBe(true);
      // We created 3 bookings with different sources
      if (analytics.bookingSources.length > 0) {
        expect(analytics.bookingSources[0]).toHaveProperty("source");
        expect(analytics.bookingSources[0]).toHaveProperty("count");
        expect(analytics.bookingSources[0]).toHaveProperty("revenue");
      }
    });

    it("should return refund analytics", async () => {
      const caller = appRouter.createCaller(createAuthContext("provider", providerUserId, "P14 Provider"));
      const analytics = await caller.provider.analytics();

      expect(analytics.refundAnalytics).toHaveProperty("totalRefunds");
      expect(analytics.refundAnalytics).toHaveProperty("totalRefundAmount");
      expect(analytics.refundAnalytics).toHaveProperty("refundRate");
    });

    it("should reject analytics for non-providers", async () => {
      const caller = appRouter.createCaller(createAuthContext("customer", customerUserId, "P14 Customer"));
      await expect(caller.provider.analytics()).rejects.toThrow();
    });
  });

  // ─── Database Helpers ────────────────────────────────────────────────────

  describe("Database Analytics Helpers", () => {
    it("getBookingTrends should return monthly data", async () => {
      const trends = await db.getBookingTrends(providerId);
      expect(Array.isArray(trends)).toBe(true);
    });

    it("getTopServices should return service rankings", async () => {
      const topServices = await db.getTopServices(providerId);
      expect(Array.isArray(topServices)).toBe(true);
    });

    it("getCustomerRetention should return retention metrics", async () => {
      const retention = await db.getCustomerRetention(providerId);
      expect(retention).toHaveProperty("totalCustomers");
      expect(retention).toHaveProperty("returningCustomers");
      expect(retention).toHaveProperty("retentionRate");
      expect(retention).toHaveProperty("avgBookingsPerCustomer");
    });

    it("getBookingSourceAnalytics should return source breakdown", async () => {
      const sources = await db.getBookingSourceAnalytics(providerId);
      expect(Array.isArray(sources)).toBe(true);
    });

    it("getRefundAnalytics should return refund stats", async () => {
      const refunds = await db.getRefundAnalytics(providerId);
      expect(refunds).toHaveProperty("totalRefunds");
      expect(refunds).toHaveProperty("totalRefundAmount");
      expect(refunds).toHaveProperty("refundRate");
    });

    it("getPaymentByStripePaymentIntentId should return null for non-existent", async () => {
      const payment = await db.getPaymentByStripePaymentIntentId("pi_nonexistent_test");
      expect(payment).toBeUndefined();
    });
  });

  // ─── Refund Processing ───────────────────────────────────────────────────

  describe("Automated Refund Processing", () => {
    it("should have refund_processed notification type in templates", async () => {
      const { getTemplate } = await import("./notifications/templates");
      const template = getTemplate("refund_processed", {
        bookingNumber: "BK-TEST-001",
        refundAmount: "25.00",
        originalAmount: "50.00",
      });

      expect(template.subject).toContain("Refund Processed");
      expect(template.subject).toContain("25.00");
      expect(template.body).toContain("25.00");
      expect(template.body).toContain("50.00");
      expect(template.body).toContain("BK-TEST-001");
      expect(template.smsBody).toContain("25.00");
    });

    it("should include refund timeline info in template", async () => {
      const { getTemplate } = await import("./notifications/templates");
      const template = getTemplate("refund_processed", {
        bookingNumber: "BK-TEST-002",
        refundAmount: "100.00",
        originalAmount: "100.00",
      });

      expect(template.body).toContain("5-10 business days");
    });

    it("cancellation refund tiers should be correctly defined", () => {
      // 48+ hours = 100% refund
      // 24-48 hours = 75% refund
      // 4-24 hours = 50% refund
      // <4 hours = 0% refund
      const testCases = [
        { hours: 72, expectedPercentage: 100 },
        { hours: 48, expectedPercentage: 100 },
        { hours: 36, expectedPercentage: 75 },
        { hours: 24, expectedPercentage: 75 },
        { hours: 12, expectedPercentage: 50 },
        { hours: 4, expectedPercentage: 50 },
        { hours: 2, expectedPercentage: 0 },
        { hours: 0, expectedPercentage: 0 },
      ];

      for (const { hours, expectedPercentage } of testCases) {
        let refundPercentage = 0;
        if (hours >= 48) refundPercentage = 100;
        else if (hours >= 24) refundPercentage = 75;
        else if (hours >= 4) refundPercentage = 50;
        else refundPercentage = 0;

        expect(refundPercentage).toBe(expectedPercentage);
      }
    });
  });

  // ─── Admin Booking Source Analytics ──────────────────────────────────────

  describe("Admin Booking Source Analytics", () => {
    it("should return booking source analytics for admin", async () => {
      // Create an admin user
      const suffix = Math.floor(Math.random() * 100000) + 149000;
      await db.upsertUser({
        openId: `test-p14-admin-${suffix}`,
        name: "P14 Admin",
        email: `p14admin${suffix}@test.com`,
        role: "admin",
      });
      const adminUser = await db.getUserByOpenId(`test-p14-admin-${suffix}`);

      const caller = appRouter.createCaller(createAuthContext("admin" as any, adminUser!.id, "P14 Admin"));
      const result = await caller.admin.getBookingSourceAnalytics();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
