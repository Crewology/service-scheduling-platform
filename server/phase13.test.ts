import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

// ============================================================================
// Phase 13 Tests: Embeddable Booking Widgets
// ============================================================================

function createAuthContext(role: "customer" | "provider" | "admin", userId: number, name: string, email?: string) {
  return {
    user: { id: userId, openId: `test-p13-${userId}`, name, role, email },
    req: { headers: { origin: "http://localhost:3000" } } as any,
  };
}

function createPublicContext() {
  return {
    user: null,
    req: { headers: { origin: "http://localhost:3000" } } as any,
  };
}

describe("Phase 13: Embeddable Booking Widgets", () => {
  let providerUserId: number;
  let providerId: number;
  let serviceId: number;

  beforeAll(async () => {
    const suffix = Math.floor(Math.random() * 100000) + 130000;

    // Create provider user
    await db.upsertUser({
      openId: `test-p13-provider-${suffix}`,
      name: "P13 Widget Provider",
      email: `p13provider${suffix}@test.com`,
      role: "provider",
    });
    const pUser = await db.getUserByOpenId(`test-p13-provider-${suffix}`);
    providerUserId = pUser!.id;

    // Create provider profile
    await db.createServiceProvider({
      userId: providerUserId,
      businessName: `P13 Widget Test Business ${suffix}`,
      businessType: "sole_proprietor",
      description: "Test provider for widget tests",
    });
    const provider = await db.getProviderByUserId(providerUserId);
    providerId = provider!.id;

    // Create a service
    const caller = appRouter.createCaller(
      createAuthContext("provider", providerUserId, "P13 Widget Provider", `p13provider${suffix}@test.com`)
    );
    const svc = await caller.service.create({
      categoryId: 7,
      name: `P13 Widget Test Service ${suffix}`,
      description: "Test service for widget embed",
      serviceType: "fixed_location",
      pricingModel: "fixed",
      basePrice: 50,
      durationMinutes: 60,
    });
    serviceId = svc.id;
  });

  // ========================================================================
  // Widget Router: getService
  // ========================================================================

  describe("Widget Router - getService", () => {
    it("should return service and provider info for a valid service ID", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.widget.getService({ serviceId });
      expect(result).toBeDefined();
      expect(result.service).toBeDefined();
      expect(result.service.id).toBe(serviceId);
      expect(result.service.name).toContain("P13 Widget Test Service");
      expect(result.service.durationMinutes).toBe(60);
      expect(result.provider).toBeDefined();
      expect(result.provider!.id).toBe(providerId);
    });

    it("should throw NOT_FOUND for invalid service ID", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      await expect(caller.widget.getService({ serviceId: 999999 })).rejects.toThrow();
    });
  });

  // ========================================================================
  // Widget Router: getProviderInfo
  // ========================================================================

  describe("Widget Router - getProviderInfo", () => {
    it("should return provider info for a valid provider ID", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.widget.getProviderInfo({ providerId });
      expect(result).toBeDefined();
      expect(result.id).toBe(providerId);
      expect(result.businessName).toContain("P13 Widget Test Business");
    });

    it("should throw NOT_FOUND for invalid provider ID", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      await expect(caller.widget.getProviderInfo({ providerId: 999999 })).rejects.toThrow();
    });
  });

  // ========================================================================
  // Widget Router: getProviderServices
  // ========================================================================

  describe("Widget Router - getProviderServices", () => {
    it("should return active services for a valid provider", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.widget.getProviderServices({ providerId });
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
      const found = result.find((s: any) => s.id === serviceId);
      expect(found).toBeDefined();
      expect(found!.name).toContain("P13 Widget Test Service");
    });

    it("should return empty array for provider with no services", async () => {
      // Use a provider ID that likely has no services
      const caller = appRouter.createCaller(createPublicContext());
      // Create a new provider with no services
      const suffix2 = Math.floor(Math.random() * 100000) + 230000;
      await db.upsertUser({
        openId: `test-p13-empty-${suffix2}`,
        name: "P13 Empty Provider",
        email: `p13empty${suffix2}@test.com`,
        role: "provider",
      });
      const emptyUser = await db.getUserByOpenId(`test-p13-empty-${suffix2}`);
      await db.createServiceProvider({
        userId: emptyUser!.id,
        businessName: `P13 Empty Business ${suffix2}`,
        businessType: "sole_proprietor",
      });
      const emptyProvider = await db.getProviderByUserId(emptyUser!.id);
      const result = await caller.widget.getProviderServices({ providerId: emptyProvider!.id });
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  // ========================================================================
  // Widget Router: getAvailability
  // ========================================================================

  describe("Widget Router - getAvailability", () => {
    it("should return availability schedule for a provider", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.widget.getAvailability({ providerId });
      expect(result).toBeDefined();
      expect(result.schedule).toBeDefined();
      expect(result.overrides).toBeDefined();
      expect(Array.isArray(result.schedule)).toBe(true);
      expect(Array.isArray(result.overrides)).toBe(true);
    });

    it("should accept custom date range", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.widget.getAvailability({
        providerId,
        startDate: "2026-04-01",
        endDate: "2026-04-30",
      });
      expect(result).toBeDefined();
      expect(result.schedule).toBeDefined();
    });
  });

  // ========================================================================
  // Widget Router: getBookedSlots
  // ========================================================================

  describe("Widget Router - getBookedSlots", () => {
    it("should return booked slots for a provider on a given date", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const dateStr = futureDate.toISOString().split("T")[0];

      const result = await caller.widget.getBookedSlots({ providerId, date: dateStr });
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ========================================================================
  // Widget Router: getWidgetConfig
  // ========================================================================

  describe("Widget Router - getWidgetConfig", () => {
    it("should return widget config for a valid provider", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      const result = await caller.widget.getWidgetConfig({ providerId });
      expect(result).toBeDefined();
      expect(result.providerId).toBe(providerId);
      expect(result.businessName).toContain("P13 Widget Test Business");
      expect(result.serviceCount).toBeGreaterThanOrEqual(1);
    });

    it("should throw NOT_FOUND for invalid provider", async () => {
      const caller = appRouter.createCaller(createPublicContext());
      await expect(caller.widget.getWidgetConfig({ providerId: 999999 })).rejects.toThrow();
    });
  });

  // ========================================================================
  // Public Access (no auth required)
  // ========================================================================

  describe("Widget Router - Public Access (no auth)", () => {
    it("all widget endpoints should work without authentication", async () => {
      const caller = appRouter.createCaller(createPublicContext());

      // All these should succeed without auth
      const service = await caller.widget.getService({ serviceId });
      expect(service.service.id).toBe(serviceId);

      const providerInfo = await caller.widget.getProviderInfo({ providerId });
      expect(providerInfo.id).toBe(providerId);

      const services = await caller.widget.getProviderServices({ providerId });
      expect(services.length).toBeGreaterThanOrEqual(1);

      const availability = await caller.widget.getAvailability({ providerId });
      expect(availability.schedule).toBeDefined();

      const config = await caller.widget.getWidgetConfig({ providerId });
      expect(config.providerId).toBe(providerId);
    });
  });
});
