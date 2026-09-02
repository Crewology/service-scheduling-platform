import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getBookingById: vi.fn(),
  getReviewByBookingId: vi.fn(),
  createReview: vi.fn(),
  updateProviderTrustScore: vi.fn(),
  getProviderByUserId: vi.fn(),
  getReviewById: vi.fn(),
  addReviewResponse: vi.fn(),
}));

vi.mock("./db", () => mocks);

import { reviewRouter } from "./routers/reviewRouter";

function context(id: number, role: "customer" | "provider" = "customer"): TrpcContext {
  return {
    user: {
      id,
      openId: `test-clean-lifecycle-${role}-${id}`,
      email: `test-clean-lifecycle-${role}-${id}@example.invalid`,
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

describe("clean review provenance lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateProviderTrustScore.mockResolvedValue(undefined);
  });

  it("creates one booking-linked review only after the customer's booking is completed", async () => {
    const booking = { id: 91, customerId: 10, providerId: 20, status: "completed" };
    const created = { id: 501, bookingId: 91, customerId: 10, providerId: 20, rating: 5, reviewText: "Private fixture" };
    mocks.getBookingById.mockResolvedValue(booking);
    mocks.getReviewByBookingId.mockResolvedValueOnce(null).mockResolvedValueOnce(created);
    mocks.createReview.mockResolvedValue({ id: 501 });

    const result = await reviewRouter.createCaller(context(10)).create({ bookingId: 91, rating: 5, reviewText: "Private fixture" });

    expect(result).toEqual(created);
    expect(mocks.createReview).toHaveBeenCalledWith({ bookingId: 91, customerId: 10, providerId: 20, rating: 5, reviewText: "Private fixture" });
    expect(mocks.updateProviderTrustScore).toHaveBeenCalledWith(20);
  });

  it("rejects reviews before completion, from non-customers, or when one already exists", async () => {
    const caller = reviewRouter.createCaller(context(10));

    mocks.getBookingById.mockResolvedValue({ id: 91, customerId: 10, providerId: 20, status: "confirmed" });
    await expect(caller.create({ bookingId: 91, rating: 4 })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    mocks.getBookingById.mockResolvedValue({ id: 91, customerId: 99, providerId: 20, status: "completed" });
    await expect(caller.create({ bookingId: 91, rating: 4 })).rejects.toMatchObject({ code: "FORBIDDEN" });

    mocks.getBookingById.mockResolvedValue({ id: 91, customerId: 10, providerId: 20, status: "completed" });
    mocks.getReviewByBookingId.mockResolvedValue({ id: 501 });
    await expect(caller.create({ bookingId: 91, rating: 4 })).rejects.toMatchObject({ code: "BAD_REQUEST", message: "Review already exists" });
  });

  it("allows only the booked provider to respond to the booking-linked review", async () => {
    const review = { id: 501, providerId: 20, bookingId: 91 };
    mocks.getReviewById.mockResolvedValue(review);
    mocks.getProviderByUserId.mockImplementation(async (userId: number) => userId === 30 ? { id: 20, userId } : { id: 21, userId });
    mocks.addReviewResponse.mockResolvedValue(undefined);
    mocks.getReviewById.mockResolvedValueOnce(review).mockResolvedValueOnce(review).mockResolvedValueOnce({ ...review, responseText: "Thank you" });

    await expect(reviewRouter.createCaller(context(31, "provider")).addResponse({ reviewId: 501, responseText: "Not mine" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });

    const result = await reviewRouter.createCaller(context(30, "provider")).addResponse({ reviewId: 501, responseText: "Thank you" });
    expect(mocks.addReviewResponse).toHaveBeenCalledWith(501, "Thank you");
    expect(result).toMatchObject({ responseText: "Thank you" });
  });
});
