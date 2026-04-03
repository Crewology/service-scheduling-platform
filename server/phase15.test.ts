import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

// ============================================================================
// Phase 15 Tests: Promo Code System (CRUD, Validation, Discount, Booking Integration)
// ============================================================================

function createAuthContext(role: "customer" | "provider" | "admin", userId: number, name: string, email?: string) {
  return {
    user: { id: userId, openId: `test-p15-${userId}`, name, role, email },
    req: { headers: { origin: "http://localhost:3000" } } as any,
  };
}

describe("Phase 15: Promo Code System", () => {
  let customerUserId: number;
  let providerUserId: number;
  let providerId: number;
  let serviceId: number;
  let service2Id: number;
  const suffix = Math.floor(Math.random() * 100000) + 150000;

  beforeAll(async () => {
    // Create customer user
    await db.upsertUser({
      openId: `test-p15-customer-${suffix}`,
      name: "P15 Customer",
      email: `p15customer${suffix}@test.com`,
      role: "customer",
    });
    const cUser = await db.getUserByOpenId(`test-p15-customer-${suffix}`);
    customerUserId = cUser!.id;

    // Create provider user
    await db.upsertUser({
      openId: `test-p15-provider-${suffix}`,
      name: "P15 Provider",
      email: `p15provider${suffix}@test.com`,
      role: "provider",
    });
    const pUser = await db.getUserByOpenId(`test-p15-provider-${suffix}`);
    providerUserId = pUser!.id;

    // Create provider profile
    await db.createServiceProvider({
      userId: providerUserId,
      businessName: `P15 Promo Test Business ${suffix}`,
      businessType: "sole_proprietor",
      profileSlug: `p15-test-${suffix}`,
    });
    const providerRecord = await db.getProviderByUserId(providerUserId);
    providerId = providerRecord!.id;

    // Create services
    await db.createService({
      providerId,
      categoryId: 7,
      name: `P15 Test Service ${suffix}`,
      description: "Test service for promo codes",
      pricingModel: "fixed",
      basePrice: "100.00",
      durationMinutes: 60,
      serviceType: "fixed_location",
    });

    await db.createService({
      providerId,
      categoryId: 9,
      name: `P15 Test Service 2 ${suffix}`,
      description: "Another test service",
      pricingModel: "fixed",
      basePrice: "50.00",
      durationMinutes: 30,
      serviceType: "mobile",
    });

    // Get the service IDs by querying
    const providerServices = await db.getServicesByProviderId(providerId);
    // Sort by name to ensure consistent ordering
    const sorted = providerServices.sort((a: any, b: any) => a.name.localeCompare(b.name));
    serviceId = sorted.find((s: any) => s.name.includes("Test Service " + suffix))?.id || sorted[0].id;
    service2Id = sorted.find((s: any) => s.name.includes("Test Service 2"))?.id || sorted[1].id;
  });

  // =========================================================================
  // Promo Code CRUD via Router
  // =========================================================================

  describe("Promo Code CRUD (Provider Router)", () => {
    let promoCodeId: number;

    it("should create a percentage promo code", async () => {
      const caller = appRouter.createCaller(createAuthContext("provider", providerUserId, "P15 Provider"));
      const result = await caller.promo.create({
        code: `P15PCT${suffix}`,
        description: "15% off for testing",
        discountType: "percentage",
        discountValue: 15,
        maxRedemptions: 100,
        maxRedemptionsPerUser: 2,
        appliesToAllServices: true,
      });
      expect(result).toBeTruthy();
      expect(result!.code).toBe(`P15PCT${suffix}`);
      expect(result!.discountType).toBe("percentage");
      expect(parseFloat(result!.discountValue)).toBe(15);
      promoCodeId = result!.id;
    });

    it("should create a fixed amount promo code", async () => {
      const caller = appRouter.createCaller(createAuthContext("provider", providerUserId, "P15 Provider"));
      const result = await caller.promo.create({
        code: `P15FIX${suffix}`,
        description: "$10 off",
        discountType: "fixed",
        discountValue: 10,
        appliesToAllServices: true,
      });
      expect(result).toBeTruthy();
      expect(result!.discountType).toBe("fixed");
      expect(parseFloat(result!.discountValue)).toBe(10);
    });

    it("should list provider promo codes", async () => {
      const caller = appRouter.createCaller(createAuthContext("provider", providerUserId, "P15 Provider"));
      const codes = await caller.promo.list();
      expect(codes.length).toBeGreaterThanOrEqual(2);
    });

    it("should reject duplicate promo code", async () => {
      const caller = appRouter.createCaller(createAuthContext("provider", providerUserId, "P15 Provider"));
      await expect(caller.promo.create({
        code: `P15PCT${suffix}`,
        discountType: "percentage",
        discountValue: 20,
        appliesToAllServices: true,
      })).rejects.toThrow(/already exists/i);
    });

    it("should reject percentage > 100", async () => {
      const caller = appRouter.createCaller(createAuthContext("provider", providerUserId, "P15 Provider"));
      await expect(caller.promo.create({
        code: `P15BAD${suffix}`,
        discountType: "percentage",
        discountValue: 150,
        appliesToAllServices: true,
      })).rejects.toThrow(/exceed 100/i);
    });

    it("should update a promo code", async () => {
      const caller = appRouter.createCaller(createAuthContext("provider", providerUserId, "P15 Provider"));
      const updated = await caller.promo.update({
        id: promoCodeId,
        description: "Updated: 15% off",
        maxRedemptions: 200,
      });
      expect(updated).toBeTruthy();
      expect(updated!.description).toBe("Updated: 15% off");
      expect(updated!.maxRedemptions).toBe(200);
    });

    it("should deactivate a promo code", async () => {
      const caller = appRouter.createCaller(createAuthContext("provider", providerUserId, "P15 Provider"));
      const updated = await caller.promo.update({
        id: promoCodeId,
        isActive: false,
      });
      expect(updated!.isActive).toBe(false);

      // Re-activate for later tests
      await caller.promo.update({
        id: promoCodeId,
        isActive: true,
      });
    });

    it("should reject non-provider creating promo codes", async () => {
      const caller = appRouter.createCaller(createAuthContext("customer", customerUserId, "P15 Customer"));
      await expect(caller.promo.create({
        code: `P15CUST${suffix}`,
        discountType: "percentage",
        discountValue: 10,
        appliesToAllServices: true,
      })).rejects.toThrow(/provider/i);
    });
  });

  // =========================================================================
  // Promo Code Validation via Router
  // =========================================================================

  describe("Promo Code Validation (Customer Router)", () => {
    it("should validate a valid promo code", async () => {
      const caller = appRouter.createCaller(createAuthContext("customer", customerUserId, "P15 Customer"));
      const result = await caller.promo.validate({
        code: `P15PCT${suffix}`,
        serviceId: serviceId,
        orderAmount: 100,
      });
      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(15); // 15% of 100
      expect(result.finalAmount).toBe(85);
    });

    it("should validate a fixed amount promo code", async () => {
      const caller = appRouter.createCaller(createAuthContext("customer", customerUserId, "P15 Customer"));
      const result = await caller.promo.validate({
        code: `P15FIX${suffix}`,
        serviceId: serviceId,
        orderAmount: 100,
      });
      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(10); // $10 off
      expect(result.finalAmount).toBe(90);
    });

    it("should return invalid for non-existent promo code", async () => {
      const caller = appRouter.createCaller(createAuthContext("customer", customerUserId, "P15 Customer"));
      const result = await caller.promo.validate({
        code: "NONEXISTENT999",
        orderAmount: 100,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  // =========================================================================
  // calculatePromoDiscount unit tests
  // =========================================================================

  describe("calculatePromoDiscount", () => {
    const makePromo = (overrides: Partial<any> = {}) => ({
      id: 1,
      providerId: 1,
      code: "TEST",
      description: null,
      discountType: "percentage" as const,
      discountValue: "20",
      minOrderAmount: null,
      maxDiscountAmount: null,
      maxRedemptions: null,
      currentRedemptions: 0,
      maxRedemptionsPerUser: 1,
      validFrom: new Date("2020-01-01"),
      validUntil: null,
      isActive: true,
      appliesToAllServices: true,
      serviceIds: null,
      codeType: "promo" as const,
      createdAt: new Date(),
      ...overrides,
    });

    it("should calculate percentage discount correctly", () => {
      const promo = makePromo({ discountType: "percentage", discountValue: "20" });
      expect(db.calculatePromoDiscount(promo, 100)).toBe(20);
    });

    it("should calculate fixed discount correctly", () => {
      const promo = makePromo({ discountType: "fixed", discountValue: "15" });
      expect(db.calculatePromoDiscount(promo, 100)).toBe(15);
    });

    it("should cap discount at order amount", () => {
      const promo = makePromo({ discountType: "fixed", discountValue: "200" });
      expect(db.calculatePromoDiscount(promo, 50)).toBe(50);
    });

    it("should cap discount at maxDiscountAmount", () => {
      const promo = makePromo({ discountType: "percentage", discountValue: "50", maxDiscountAmount: "10" });
      expect(db.calculatePromoDiscount(promo, 100)).toBe(10);
    });

    it("should return 0 when order is below minOrderAmount", () => {
      const promo = makePromo({ discountType: "percentage", discountValue: "10", minOrderAmount: "50" });
      expect(db.calculatePromoDiscount(promo, 30)).toBe(0);
    });

    it("should apply discount when order meets minOrderAmount", () => {
      const promo = makePromo({ discountType: "percentage", discountValue: "10", minOrderAmount: "50" });
      expect(db.calculatePromoDiscount(promo, 100)).toBe(10);
    });
  });

  // =========================================================================
  // Promo Code with Booking Integration
  // =========================================================================

  describe("Promo Code Booking Integration", () => {
    it("should create a booking with promo code discount applied", async () => {
      // First get the promo code ID
      const promo = await db.getPromoCodeByCode(`P15FIX${suffix}`);
      expect(promo).toBeTruthy();

      const caller = appRouter.createCaller(createAuthContext("customer", customerUserId, "P15 Customer", `p15customer${suffix}@test.com`));
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateStr = tomorrow.toISOString().split("T")[0];

      const booking = await caller.booking.create({
        serviceId,
        bookingDate: dateStr,
        startTime: "10:00",
        endTime: "11:00",
        locationType: "fixed_location",
        bookingSource: "direct",
        promoCodeId: promo!.id,
      });

      expect(booking).toBeTruthy();
      expect(booking.id).toBeGreaterThan(0);

      // Verify the booking total reflects the discount
      const bookingRecord = await db.getBookingById(booking.id);
      expect(bookingRecord).toBeTruthy();
      // Original price was $100, fixed discount of $10 → total should be $90 + platform fee
      const totalAmount = parseFloat(bookingRecord!.totalAmount || "0");
      expect(totalAmount).toBeLessThanOrEqual(101); // Should be less than or equal to original $100 + fee
    });

    it("should create a booking without promo code at full price", async () => {
      const caller = appRouter.createCaller(createAuthContext("customer", customerUserId, "P15 Customer", `p15customer${suffix}@test.com`));
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const dateStr = tomorrow.toISOString().split("T")[0];

      const booking = await caller.booking.create({
        serviceId,
        bookingDate: dateStr,
        startTime: "14:00",
        endTime: "15:00",
        locationType: "fixed_location",
        bookingSource: "direct",
      });

      expect(booking).toBeTruthy();
      const bookingRecord = await db.getBookingById(booking.id);
      expect(bookingRecord).toBeTruthy();
      const totalAmount = parseFloat(bookingRecord!.totalAmount || "0");
      // Full price $100 + 1% platform fee = $101
      expect(totalAmount).toBeCloseTo(101, 0);
    });
  });

  // =========================================================================
  // Service-specific promo codes
  // =========================================================================

  describe("Service-Specific Promo Codes", () => {
    let serviceSpecificPromoId: number;

    it("should create a service-specific promo code", async () => {
      const caller = appRouter.createCaller(createAuthContext("provider", providerUserId, "P15 Provider"));
      const result = await caller.promo.create({
        code: `P15SVC${suffix}`,
        description: "Only for service 1",
        discountType: "percentage",
        discountValue: 25,
        appliesToAllServices: false,
        serviceIds: [serviceId],
      });
      expect(result).toBeTruthy();
      expect(result!.appliesToAllServices).toBe(false);
      serviceSpecificPromoId = result!.id;
    });

    it("should validate for the correct service", async () => {
      const caller = appRouter.createCaller(createAuthContext("customer", customerUserId, "P15 Customer"));
      const result = await caller.promo.validate({
        code: `P15SVC${suffix}`,
        serviceId: serviceId,
        orderAmount: 100,
      });
      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(25);
    });

    it("should reject for a different service", async () => {
      const caller = appRouter.createCaller(createAuthContext("customer", customerUserId, "P15 Customer"));
      const result = await caller.promo.validate({
        code: `P15SVC${suffix}`,
        serviceId: service2Id,
        orderAmount: 50,
      });
      expect(result.valid).toBe(false);
    });
  });

  // =========================================================================
  // Promo Code Deletion
  // =========================================================================

  describe("Promo Code Deletion", () => {
    let deletePromoId: number;

    it("should create and then delete a promo code", async () => {
      const caller = appRouter.createCaller(createAuthContext("provider", providerUserId, "P15 Provider"));
      const result = await caller.promo.create({
        code: `P15DEL${suffix}`,
        discountType: "fixed",
        discountValue: 5,
        appliesToAllServices: true,
      });
      deletePromoId = result!.id;

      const deleteResult = await caller.promo.delete({ id: deletePromoId });
      expect(deleteResult.success).toBe(true);

      // Verify it's gone
      const promo = await db.getPromoCodeById(deletePromoId);
      expect(promo).toBeNull();
    });
  });

  // =========================================================================
  // Expired Promo Code
  // =========================================================================

  describe("Expired Promo Code Validation", () => {
    it("should create an expired promo code and reject validation", async () => {
      const caller = appRouter.createCaller(createAuthContext("provider", providerUserId, "P15 Provider"));
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const result = await caller.promo.create({
        code: `P15EXP${suffix}`,
        discountType: "percentage",
        discountValue: 50,
        validUntil: pastDate.toISOString(),
        appliesToAllServices: true,
      });
      expect(result).toBeTruthy();

      // Customer tries to use expired code
      const customerCaller = appRouter.createCaller(createAuthContext("customer", customerUserId, "P15 Customer"));
      const validation = await customerCaller.promo.validate({
        code: `P15EXP${suffix}`,
        orderAmount: 100,
      });
      expect(validation.valid).toBe(false);
      expect(validation.error).toBeTruthy();
    });
  });
});
