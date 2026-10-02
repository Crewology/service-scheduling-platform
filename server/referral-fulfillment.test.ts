import { beforeEach, describe, expect, it, vi } from "vitest";
import { bookings, payments, referrals, referralCredits, serviceProviders, users } from "../drizzle/schema";

const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./db/connection", () => ({ getDb }));
import { fulfillReferralOnBookingComplete } from "./db/referrals";

type Payment = Parameters<typeof import("./referralRewardPolicy").netCapturedBookingCents>[0][number];
const payment = (patch: Partial<Payment> = {}): Payment => ({
  paymentType: "full", amount: "100.00", refundAmount: "0.00", status: "captured",
  stripePaymentIntentId: "pi_test", currency: "USD", ...patch,
});
function scenario() {
  const state = {
    bookingStatus: "completed", customerId: 12, isOfficial: false, referralStatus: "pending",
    refereeBookingId: 101 as number | null, bookingCreatedAt: new Date("2026-05-02T00:00:00Z"),
    referralCreatedAt: new Date("2026-05-01T00:00:00Z"),
    previousCompleted: false,
    captured: [payment()] as Payment[], completedCount: 0, awards: [] as any[], reward: "" as string,
  };
  const db: any = {
    transaction: async (run: (tx: any) => Promise<any>) => run(db),
    select: (selection?: any) => ({
      from: (table: any) => {
        const rows = () => {
          if (table === bookings) {
            const current = { id: 101, customerId: state.customerId, providerId: 9,
              status: state.bookingStatus, createdAt: state.bookingCreatedAt, totalAmount: "100.00" };
            if (selection?.providerId) return [
              ...(state.previousCompleted ? [{ ...current, id: 99, createdAt: new Date("2026-04-29T00:00:00Z") }] : []),
              current,
            ];
            return state.bookingStatus ? [current] : [];
          }
          if (table === referrals && selection?.count) return [{ count: state.completedCount }];
          if (table === referrals) return state.referralStatus === "pending" ? [{ id: 5, refereeId: 12, referrerId: 7,
            status: "pending", refereeBookingId: state.refereeBookingId, createdAt: state.referralCreatedAt }] : [];
          if (table === serviceProviders) return [{ isOfficial: state.isOfficial }];
          if (table === payments) return state.captured;
          if (table === users) return [{ id: 7 }];
          throw new Error("Unexpected table");
        };
        const query: any = {
          limit: () => query,
          for: () => query,
          then(resolve: any, reject: any) { return Promise.resolve(rows()).then(resolve, reject); },
        };
        return { where: () => query };
      },
    }),
    insert: (table: any) => ({ values: async (values: any) => {
      if (table !== referralCredits) throw new Error("Unexpected insert");
      state.awards.push(values);
    } }),
    update: (table: any) => ({ set: (values: any) => ({ where: async () => {
      if (table !== referrals) throw new Error("Unexpected update");
      state.referralStatus = values.status;
      state.reward = values.referrerDiscountAmount;
    } }) }),
  };
  getDb.mockResolvedValue(db);
  return state;
}

beforeEach(() => vi.resetAllMocks());

describe("first qualified referral fulfillment", () => {
  it("does not award before service completion even if payment was captured first", async () => {
    const state = scenario(); state.bookingStatus = "confirmed";
    expect(await fulfillReferralOnBookingComplete(101)).toBe(false);
    expect(state.awards).toHaveLength(0);
    state.bookingStatus = "completed";
    expect(await fulfillReferralOnBookingComplete(101)).toBe(true);
    expect(state.reward).toBe("10.00");
  });
  it("waits for capture when completion precedes payment, then awards exactly once", async () => {
    const state = scenario(); state.captured = [payment({ status: "pending" })];
    expect(await fulfillReferralOnBookingComplete(101)).toBe(false);
    expect(state.referralStatus).toBe("pending");
    state.captured = [payment({ paymentType: "deposit", amount: "20.00" })];
    expect(await fulfillReferralOnBookingComplete(101)).toBe(true);
    expect(state.awards).toMatchObject([{ amount: "2.00", earnedReferralId: 5, bookingId: 101 }]);
    expect(await fulfillReferralOnBookingComplete(101)).toBe(false);
    expect(state.awards).toHaveLength(1);
  });
  it("does not reward a provider's official demo booking", async () => {
    const state = scenario(); state.isOfficial = true;
    expect(await fulfillReferralOnBookingComplete(101)).toBe(false);
    expect(state.awards).toHaveLength(0);
  });
  it("does not reward a booking before the referral was recorded, or one without a pending referral", async () => {
    const state = scenario(); state.refereeBookingId = null;
    state.referralCreatedAt = new Date("2026-05-03T00:00:00Z");
    expect(await fulfillReferralOnBookingComplete(101)).toBe(false);
    state.referralStatus = "completed";
    expect(await fulfillReferralOnBookingComplete(101)).toBe(false);
  });
  it("does not reward a later paid booking after an earlier qualifying completion", async () => {
    const state = scenario(); state.previousCompleted = true;
    expect(await fulfillReferralOnBookingComplete(101)).toBe(false);
    expect(state.awards).toHaveLength(0);
  });
  it("uses net captured amount after partial refunds but not a fully refunded payment", async () => {
    const state = scenario(); state.captured = [payment({ status: "refunded", refundAmount: "100.00" })];
    expect(await fulfillReferralOnBookingComplete(101)).toBe(false);
    state.captured = [payment({ status: "refunded", refundAmount: "30.00" })];
    expect(await fulfillReferralOnBookingComplete(101)).toBe(true);
    expect(state.awards[0]).toMatchObject({ amount: "7.00" });
  });
  it("applies the tier just before completion and never recomputes existing earned entries", async () => {
    const state = scenario(); state.completedCount = 6;
    expect(await fulfillReferralOnBookingComplete(101)).toBe(true);
    expect(state.reward).toBe("15.00");
    state.completedCount = 26;
    expect(await fulfillReferralOnBookingComplete(101)).toBe(false);
    expect(state.reward).toBe("15.00");
  });
});
