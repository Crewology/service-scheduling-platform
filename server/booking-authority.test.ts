import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getServiceById: vi.fn(),
  getProviderById: vi.fn(),
  getUserById: vi.fn(),
  getCategoryById: vi.fn(),
  getAvailabilityOverrides: vi.fn(),
  getAvailabilityByProvider: vi.fn(),
  createBookingWithCalendarGuard: vi.fn(),
  getBookingById: vi.fn(),
  validatePromoCodeById: vi.fn(),
  redeemPromoCode: vi.fn(),
  createNotification: vi.fn(),
}));

vi.mock("./db", () => dbMocks);
vi.mock("./crm/sourceHooks", () => ({ queueCrmBookingProjection: vi.fn() }));
vi.mock("./notifications", () => ({ sendNotification: vi.fn() }));
vi.mock("./notifications/pushHelper", () => ({ sendPushNotification: vi.fn() }));

import { bookingRouter } from "./routers/bookingRouter";

const customer = {
  id: 50,
  openId: "customer-50",
  email: "customer@example.com",
  name: "Customer",
  role: "customer",
  emailVerified: true,
};

const input = {
  serviceId: 330003,
  providerId: 1,
  bookingDate: "2027-06-15",
  startTime: "10:00",
  endTime: "10:30",
  durationMinutes: 30,
  locationType: "fixed_location" as const,
  subtotal: "1.00",
  platformFee: "0.01",
  totalAmount: "1.01",
};

describe("final booking authority", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getServiceById.mockResolvedValue({
      id: 330003,
      providerId: 1,
      categoryId: 15,
      name: "A1",
      pricingModel: "fixed",
      basePrice: "550.00",
      hourlyRate: null,
      durationMinutes: 600,
      minAdvanceBookingHours: 0,
      maxAdvanceBookingDays: 36500,
      isGroupClass: false,
      maxCapacity: 1,
      depositRequired: false,
      isActive: true,
      deletedAt: null,
    });
    dbMocks.getProviderById.mockResolvedValue({ id: 1, userId: 2, isActive: true, deletedAt: null, businessName: "Chisolm Audio" });
    dbMocks.getUserById.mockResolvedValue({ id: 2, email: null, deletedAt: null });
    dbMocks.getCategoryById.mockResolvedValue({ id: 15, isActive: true });
    dbMocks.getAvailabilityOverrides.mockResolvedValue([]);
    dbMocks.getAvailabilityByProvider.mockResolvedValue(
      Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, startTime: "00:00", endTime: "23:59", isAvailable: true })),
    );
    dbMocks.createBookingWithCalendarGuard.mockResolvedValue(9001);
    dbMocks.getBookingById.mockResolvedValue({ id: 9001, bookingNumber: "OC-TEST" });
  });

  it("rejects a provider ID that does not own the service", async () => {
    const caller = bookingRouter.createCaller({ user: customer } as any);
    await expect(caller.create({ ...input, providerId: 999 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.createBookingWithCalendarGuard).not.toHaveBeenCalled();
  });

  it("uses the service provider, full duration, end time, and price instead of forged client values", async () => {
    const caller = bookingRouter.createCaller({ user: customer } as any);
    await caller.create(input);

    expect(dbMocks.createBookingWithCalendarGuard).toHaveBeenCalledWith(expect.objectContaining({
      booking: expect.objectContaining({
        providerId: 1,
        serviceId: 330003,
        startTime: "10:00",
        endTime: "20:00",
        durationMinutes: 600,
        subtotal: "550.00",
        platformFee: "5.50",
        totalAmount: "555.50",
      }),
      isGroupClass: false,
      maxCapacity: 1,
    }));
  });
});
