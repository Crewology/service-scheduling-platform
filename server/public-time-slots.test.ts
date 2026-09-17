import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    getServiceById: vi.fn(async () => ({
      id: 5,
      providerId: 10,
      categoryId: 7,
      durationMinutes: 60,
      minAdvanceBookingHours: 0,
      maxAdvanceBookingDays: 36500,
      isActive: true,
      deletedAt: null,
      isGroupClass: false,
      maxCapacity: 1,
    })),
    getProviderById: vi.fn(async () => ({ id: 10, userId: 20, isActive: true, deletedAt: null })),
    getUserById: vi.fn(async () => ({ id: 20, deletedAt: null })),
    getCategoryById: vi.fn(async () => ({ id: 7, isActive: true })),
    getProviderAvailability: vi.fn(async () => [
      { dayOfWeek: 2, startTime: "09:00", endTime: "12:00", isAvailable: true },
    ]),
    getAvailabilityOverrides: vi.fn(async () => []),
    getBookingsByDateRange: vi.fn(async () => [{
      id: 777,
      serviceId: 999,
      bookingDate: "2027-06-15",
      startTime: "09:00",
      endTime: "10:00",
      durationMinutes: 60,
      status: "in_progress",
      bookingType: "single",
      customerId: 123,
    }]),
    getSessionsByDateRange: vi.fn(async () => []),
  };
});

import { availabilityRouter } from "./routers/availabilityRouter";

describe("privacy-safe public time slots", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns availability decisions without booking, customer, status, or cross-service metadata", async () => {
    const caller = availabilityRouter.createCaller({ user: null } as any);
    const slots = await caller.getPublicTimeSlots({ serviceId: 5, date: "2027-06-15" });

    expect(slots.length).toBeGreaterThan(0);
    expect(slots.find((slot) => slot.time === "09:00")?.available).toBe(false);
    for (const slot of slots) {
      expect(slot).not.toHaveProperty("bookingDate");
      expect(slot).not.toHaveProperty("status");
      expect(slot).not.toHaveProperty("serviceId");
      expect(slot).not.toHaveProperty("customerId");
    }
  });
});
