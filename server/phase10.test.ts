import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

// ============================================================================
// Phase 10 Tests: Photo Uploads, Cancellation/Refund, Subscription Tiers
// ============================================================================

function createAuthContext(role: "customer" | "provider" | "admin", userId: number, name: string) {
  return {
    user: { id: userId, openId: `test-p10-${userId}`, name, role },
    req: { headers: { origin: "http://localhost:3000" } } as any,
  };
}

describe("Phase 10: Photos, Cancellations, Subscriptions", () => {
  let providerUserId: number;
  let providerId: number;
  let serviceId: number;
  let customerUserId: number;

  beforeAll(async () => {
    // Create provider user
    const pSuffix = Math.floor(Math.random() * 100000) + 50000;
    await db.upsertUser({
      openId: `test-p10-provider-${pSuffix}`,
      name: "Phase10 Provider",
      role: "provider",
    });
    const pUser = await db.getUserByOpenId(`test-p10-provider-${pSuffix}`);
    providerUserId = pUser!.id;

    // Create provider profile
    const caller = appRouter.createCaller(createAuthContext("provider", providerUserId, "Phase10 Provider"));
    const provider = await caller.provider.create({
      businessName: `P10 Test Biz ${pSuffix}`,
      businessType: "sole_proprietor",
      phone: "555-0199",
      address: "123 Test St",
    });
    providerId = provider.id;

    // Create a service
    const service = await caller.service.create({
      categoryId: 7,
      name: `P10 Test Service ${pSuffix}`,
      serviceType: "mobile",
      pricingModel: "fixed",
      basePrice: 50,
      durationMinutes: 60,
    });
    serviceId = service.id;

    // Create customer user
    const cSuffix = Math.floor(Math.random() * 100000) + 60000;
    await db.upsertUser({
      openId: `test-p10-customer-${cSuffix}`,
      name: "Phase10 Customer",
      role: "customer",
    });
    const cUser = await db.getUserByOpenId(`test-p10-customer-${cSuffix}`);
    customerUserId = cUser!.id;
  });

  // ─── Photo Upload Tests ──────────────────────────────────────────────────

  describe("Service Photo Management", () => {
    it("should get empty photos for a new service", async () => {
      const caller = appRouter.createCaller(createAuthContext("provider", providerUserId, "Phase10 Provider"));
      const photos = await caller.service.getPhotos({ serviceId });
      expect(Array.isArray(photos)).toBe(true);
    });

    it("should reject photo upload from non-provider", async () => {
      const caller = appRouter.createCaller(createAuthContext("customer", customerUserId, "Phase10 Customer"));
      await expect(
        caller.service.uploadPhoto({
          serviceId,
          photoData: Buffer.from("fake-image-data").toString("base64"),
          contentType: "image/jpeg",
        })
      ).rejects.toThrow();
    });

    it("should reject photo upload for someone else's service", async () => {
      // Create another provider
      const suffix2 = Math.floor(Math.random() * 100000) + 70000;
      await db.upsertUser({
        openId: `test-p10-other-${suffix2}`,
        name: "Other Provider",
        role: "provider",
      });
      const otherUser = await db.getUserByOpenId(`test-p10-other-${suffix2}`);
      const otherCaller = appRouter.createCaller(createAuthContext("provider", otherUser!.id, "Other Provider"));
      await otherCaller.provider.create({
        businessName: `Other Biz ${suffix2}`,
        businessType: "sole_proprietor",
        phone: "555-0200",
        address: "456 Test St",
      });
      await expect(
        otherCaller.service.uploadPhoto({
          serviceId,
          photoData: Buffer.from("fake-image-data").toString("base64"),
          contentType: "image/jpeg",
        })
      ).rejects.toThrow("Not your service");
    });
  });

  // ─── Subscription Tier Gating Tests ──────────────────────────────────────

  describe("Subscription Tier Gating", () => {
    it("should return free tier for provider without subscription", async () => {
      const tier = await db.getProviderTier(providerId);
      expect(tier).toBe("free");
    });

    it("should allow free tier to create up to 3 services", async () => {
      const caller = appRouter.createCaller(createAuthContext("provider", providerUserId, "Phase10 Provider"));
      // Already created 1 service in beforeAll, create 2 more
      await caller.service.create({
        categoryId: 7,
        name: `P10 Service 2 ${Date.now()}`,
        serviceType: "virtual",
        pricingModel: "hourly",
        hourlyRate: 30,
        durationMinutes: 45,
      });
      await caller.service.create({
        categoryId: 7,
        name: `P10 Service 3 ${Date.now()}`,
        serviceType: "fixed_location",
        pricingModel: "fixed",
        basePrice: 75,
        durationMinutes: 90,
      });
      // 3rd service should succeed (3 total = limit for free)
      const services = await caller.service.listMine();
      expect(services.length).toBe(3);
    });

    it("should block free tier from creating 4th service", async () => {
      const caller = appRouter.createCaller(createAuthContext("provider", providerUserId, "Phase10 Provider"));
      await expect(
        caller.service.create({
          categoryId: 7,
          name: `P10 Service 4 ${Date.now()}`,
          serviceType: "mobile",
          pricingModel: "fixed",
          basePrice: 100,
          durationMinutes: 60,
        })
      ).rejects.toThrow(/Starter plan allows up to 3 services/);
    });

    it("should block free tier from customizing slug", async () => {
      const caller = appRouter.createCaller(createAuthContext("provider", providerUserId, "Phase10 Provider"));
      await expect(
        caller.provider.updateSlug({ slug: "my-custom-slug" })
      ).rejects.toThrow(/Professional plan/);
    });

    it("should allow free tier to generate auto slug", async () => {
      const caller = appRouter.createCaller(createAuthContext("provider", providerUserId, "Phase10 Provider"));
      const result = await caller.provider.generateSlug();
      expect(result.slug).toBeTruthy();
      expect(result.slug.length).toBeGreaterThan(0);
    });
  });

  // ─── Cancellation Tests ──────────────────────────────────────────────────

  describe("Booking Cancellation", () => {
    it("should cancel a pending booking", async () => {
      // Create a booking first
      const customerCaller = appRouter.createCaller(createAuthContext("customer", customerUserId, "Phase10 Customer"));
      const booking = await customerCaller.booking.create({
        serviceId,
        providerId,
        bookingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        startTime: "10:00",
        endTime: "11:00",
        durationMinutes: 60,
        locationType: "mobile",
        customerNotes: "Test booking for cancellation",
        subtotal: "50.00",
        platformFee: "0.50",
        totalAmount: "50.50",
        depositAmount: "0.00",
        remainingAmount: "50.50",
      });

      expect(booking.id).toBeTruthy();

      // Cancel the booking
      const result = await customerCaller.booking.cancel({
        bookingId: booking.id,
        reason: "Changed my mind",
      });
      expect(result.booking).toBeTruthy();
      expect(result.booking.status).toBe("cancelled");
      expect(result.refundPercentage).toBeDefined();
    });

    it("should not cancel someone else's booking", async () => {
      // Create a booking as customer
      const customerCaller = appRouter.createCaller(createAuthContext("customer", customerUserId, "Phase10 Customer"));
      const booking = await customerCaller.booking.create({
        serviceId,
        providerId,
        bookingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        startTime: "14:00",
        endTime: "15:00",
        durationMinutes: 60,
        locationType: "mobile",
        customerNotes: "Another test booking",
        subtotal: "50.00",
        platformFee: "0.50",
        totalAmount: "50.50",
        depositAmount: "0.00",
        remainingAmount: "50.50",
      });

      // Try to cancel as provider (who is not the customer)
      const suffix3 = Math.floor(Math.random() * 100000) + 80000;
      await db.upsertUser({
        openId: `test-p10-rando-${suffix3}`,
        name: "Random User",
        role: "customer",
      });
      const randoUser = await db.getUserByOpenId(`test-p10-rando-${suffix3}`);
      const randoCaller = appRouter.createCaller(createAuthContext("customer", randoUser!.id, "Random User"));
      await expect(
        randoCaller.booking.cancel({
          bookingId: booking.id,
          reason: "Not my booking",
        })
      ).rejects.toThrow();
    });
  });

  // ─── Products & Fee Configuration Tests ──────────────────────────────────

  describe("Products & Fee Configuration", () => {
    it("should have 1% platform fee", async () => {
      const { PLATFORM_FEE_PERCENTAGE } = await import("./products");
      expect(PLATFORM_FEE_PERCENTAGE).toBe(0.01);
    });

    it("should calculate correct platform fee", async () => {
      const { calculatePlatformFee } = await import("./products");
      expect(calculatePlatformFee(100)).toBe(1); // 1% of $100 = $1
      expect(calculatePlatformFee(50)).toBe(0.5); // 1% of $50 = $0.50
    });

    it("should have three subscription tiers", async () => {
      const { SUBSCRIPTION_TIERS } = await import("./products");
      expect(Object.keys(SUBSCRIPTION_TIERS)).toEqual(["free", "basic", "premium"]);
    });

    it("should have correct tier limits", async () => {
      const { SUBSCRIPTION_TIERS } = await import("./products");
      expect(SUBSCRIPTION_TIERS.free.limits.maxServices).toBe(3);
      expect(SUBSCRIPTION_TIERS.free.limits.maxPhotosPerService).toBe(2);
      expect(SUBSCRIPTION_TIERS.free.limits.customSlug).toBe(false);
      expect(SUBSCRIPTION_TIERS.basic.limits.maxServices).toBe(10);
      expect(SUBSCRIPTION_TIERS.basic.limits.customSlug).toBe(true);
      expect(SUBSCRIPTION_TIERS.premium.limits.maxServices).toBe(999);
      expect(SUBSCRIPTION_TIERS.premium.limits.featuredListing).toBe(true);
    });

    it("should offer 14-day trial", async () => {
      const { getTrialDays } = await import("./products");
      expect(getTrialDays()).toBe(14);
    });

    it("should correctly gate service creation", async () => {
      const { canProviderAddService } = await import("./products");
      expect(canProviderAddService("free", 2)).toBe(true);
      expect(canProviderAddService("free", 3)).toBe(false);
      expect(canProviderAddService("basic", 9)).toBe(true);
      expect(canProviderAddService("basic", 10)).toBe(false);
      expect(canProviderAddService("premium", 100)).toBe(true);
    });

    it("should correctly gate photo uploads", async () => {
      const { canProviderAddPhoto } = await import("./products");
      expect(canProviderAddPhoto("free", 1)).toBe(true);
      expect(canProviderAddPhoto("free", 2)).toBe(false);
      expect(canProviderAddPhoto("basic", 4)).toBe(true);
      expect(canProviderAddPhoto("basic", 5)).toBe(false);
    });
  });

  // ─── Search Priority Tests ──────────────────────────────────────────────

  describe("Search with Priority Boost", () => {
    it("should return search results", async () => {
      const results = await db.searchServices("P10 Test");
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it("should return empty results for non-matching query", async () => {
      const results = await db.searchServices("zzzznonexistent12345");
      expect(results).toEqual([]);
    });
  });
});
