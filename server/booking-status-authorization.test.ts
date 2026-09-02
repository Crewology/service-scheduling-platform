import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getBookingById: vi.fn(),
  getProviderByUserId: vi.fn(),
  updateBookingStatus: vi.fn(),
  getServiceById: vi.fn(),
  getUserById: vi.fn(),
  getProviderById: vi.fn(),
  createNotification: vi.fn(),
  updateProviderTrustScore: vi.fn(),
  sendNotification: vi.fn(),
  sendPushNotification: vi.fn(),
  fulfillReferralAndNotify: vi.fn(),
}));

vi.mock("./db", () => ({
  getBookingById: mocks.getBookingById,
  getProviderByUserId: mocks.getProviderByUserId,
  updateBookingStatus: mocks.updateBookingStatus,
  getServiceById: mocks.getServiceById,
  getUserById: mocks.getUserById,
  getProviderById: mocks.getProviderById,
  createNotification: mocks.createNotification,
  updateProviderTrustScore: mocks.updateProviderTrustScore,
}));
vi.mock("./notifications", () => ({ sendNotification: mocks.sendNotification }));
vi.mock("./notifications/pushHelper", () => ({ sendPushNotification: mocks.sendPushNotification }));
vi.mock("./referralFulfillment", () => ({ fulfillReferralAndNotify: mocks.fulfillReferralAndNotify }));

import { bookingRouter } from "./routers/bookingRouter";

function context(id: number, role: "customer" | "provider" | "admin"): TrpcContext {
  return {
    user: {
      id,
      openId: `test-clean-lifecycle-status-${role}-${id}`,
      email: `test-clean-lifecycle-status-${role}-${id}@example.invalid`,
      name: `Test Clean Lifecycle ${role}`,
      role,
      loginMethod: "test",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      deletedAt: null,
    },
    req: { headers: {} },
    res: {},
  } as unknown as TrpcContext;
}

const pastBooking = {
  id: 77,
  bookingNumber: "TEST-CLEAN-STATUS-77",
  customerId: 10,
  providerId: 20,
  serviceId: 30,
  bookingDate: "2025-01-15",
  startTime: "10:00:00",
  endTime: "11:00:00",
  status: "pending",
  totalAmount: "75.00",
};

describe("clean booking status authorization lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBookingById.mockResolvedValue(pastBooking);
    mocks.getProviderByUserId.mockImplementation(async (userId: number) => {
      if (userId === 40) return { id: 20, userId: 40 };
      if (userId === 41) return { id: 21, userId: 41 };
      return null;
    });
    mocks.updateBookingStatus.mockResolvedValue(undefined);
    mocks.getServiceById.mockResolvedValue({ id: 30, name: "Test Service", isGroupClass: false });
    mocks.getUserById.mockImplementation(async (id: number) => id === 10
      ? { id: 10, email: "customer@example.invalid", name: "Customer" }
      : { id: 40, email: "provider@example.invalid", name: "Provider" });
    mocks.getProviderById.mockResolvedValue({ id: 20, userId: 40, businessName: "Provider" });
    mocks.createNotification.mockResolvedValue({ id: 1 });
    mocks.updateProviderTrustScore.mockResolvedValue(undefined);
    mocks.sendNotification.mockResolvedValue({ success: true });
    mocks.sendPushNotification.mockResolvedValue(true);
    mocks.fulfillReferralAndNotify.mockResolvedValue(undefined);
  });

  it("blocks customers from confirming, completing, refunding, or cancelling through the provider status mutation", async () => {
    const caller = bookingRouter.createCaller(context(10, "customer"));
    for (const status of ["confirmed", "completed", "refunded", "cancelled"] as const) {
      await expect(caller.updateStatus({ id: 77, status })).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(mocks.updateBookingStatus).not.toHaveBeenCalled();
  });

  it("allows the owning provider to confirm and notifies the customer", async () => {
    const result = await bookingRouter.createCaller(context(40, "provider")).updateStatus({ id: 77, status: "confirmed" });
    expect(result).toEqual(pastBooking);
    expect(mocks.updateBookingStatus).toHaveBeenCalledWith(77, "confirmed", {});
    expect(mocks.sendNotification).toHaveBeenCalledWith(expect.objectContaining({ type: "booking_confirmed" }));
    expect(mocks.createNotification).toHaveBeenCalledWith(expect.objectContaining({ userId: 10, notificationType: "booking_confirmed" }));
  });

  it("rejects a provider who does not own the booking", async () => {
    await expect(bookingRouter.createCaller(context(41, "provider")).updateStatus({ id: 77, status: "confirmed" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.updateBookingStatus).not.toHaveBeenCalled();
  });

  it("rejects completion before the scheduled end time", async () => {
    mocks.getBookingById.mockResolvedValue({ ...pastBooking, bookingDate: "2035-01-15" });
    await expect(bookingRouter.createCaller(context(40, "provider")).updateStatus({ id: 77, status: "completed" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mocks.updateBookingStatus).not.toHaveBeenCalled();
  });

  it("allows completed past work and refreshes OlogyCrew activity provenance", async () => {
    await bookingRouter.createCaller(context(40, "provider")).updateStatus({ id: 77, status: "completed" });
    expect(mocks.updateBookingStatus).toHaveBeenCalledWith(77, "completed", {});
    expect(mocks.updateProviderTrustScore).toHaveBeenCalledWith(20);
    expect(mocks.sendNotification).toHaveBeenCalledWith(expect.objectContaining({ type: "booking_completed" }));
    expect(mocks.fulfillReferralAndNotify).toHaveBeenCalledWith(77, expect.objectContaining({ id: 10 }), "Test Service");
  });

  it("records administrator cancellations as administrator actions", async () => {
    await bookingRouter.createCaller(context(1, "admin")).updateStatus({ id: 77, status: "cancelled", cancellationReason: "Administrative action" });
    expect(mocks.updateBookingStatus).toHaveBeenCalledWith(77, "cancelled", {
      cancellationReason: "Administrative action",
      cancelledBy: "admin",
    });
  });
});
