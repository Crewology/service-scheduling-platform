import { describe, expect, it } from "vitest";
import { centsToDollars, dollarsToCents, netCapturedBookingCents, remainingCreditById, rewardCents } from "./referralRewardPolicy";

type Payment = Parameters<typeof netCapturedBookingCents>[0][number];
const payment = (overrides: Partial<Payment> = {}): Payment => ({
  paymentType: "full", status: "captured", amount: "100.00", refundAmount: "0.00",
  currency: "USD", stripePaymentIntentId: "pi_unique", ...overrides,
});

const day = (n: number) => new Date(`2026-01-${String(n).padStart(2, "0")}T12:00:00Z`);

describe("referral rewards on net captured USD payments", () => {
  it("converts dollars exactly without floats and rejects malformed/negative amounts", () => {
    expect(dollarsToCents("20.05")).toBe(2005);
    expect(centsToDollars(2005)).toBe("20.05");
    expect(dollarsToCents("0.1")).toBe(10);
    for (const invalid of ["1.001", "-1.00", "Infinity", "1e4"]) expect(() => dollarsToCents(invalid)).toThrow();
  });
  it("excludes unpaid, authorized, failed, cancelled, and non-USD amounts", () => {
    for (const status of ["pending", "authorized", "failed", "cancelled"] as const) {
      expect(netCapturedBookingCents([payment({ status })])).toBe(0);
    }
    expect(netCapturedBookingCents([payment({ currency: "eur" })])).toBe(0);
    expect(netCapturedBookingCents([payment({ stripePaymentIntentId: null })])).toBe(0);
  });
  it("includes deposit plus final and every distinct actually captured charge", () => {
    const rows = [payment({ paymentType: "deposit", amount: "20.00", stripePaymentIntentId: "pi_dep" }),
      payment({ paymentType: "final", amount: "80.00", stripePaymentIntentId: "pi_final" })];
    expect(netCapturedBookingCents(rows)).toBe(10_000);
    expect(rewardCents(netCapturedBookingCents(rows.slice(0, 1)), 10)).toBe(200);
    expect(netCapturedBookingCents([...rows, payment()])).toBe(20_000);
  });
  it("reduces partially refunded captured charges and excludes fully refunded charges", () => {
    expect(netCapturedBookingCents([payment({ status: "refunded", refundAmount: "30.00" })])).toBe(7000);
    expect(rewardCents(7000, 15)).toBe(1050);
    expect(netCapturedBookingCents([payment({ status: "refunded", refundAmount: "100.00" })])).toBe(0);
    expect(netCapturedBookingCents([payment({ status: "refunded", refundAmount: "120.00" })])).toBe(0);
    expect(netCapturedBookingCents([payment({ paymentType: "refund" })])).toBe(0);
  });
  it("calculates Bronze through Platinum amounts with cent rounding", () => {
    expect([10, 15, 20, 25].map(percent => centsToDollars(rewardCents(2005, percent))))
      .toEqual(["2.01", "3.01", "4.01", "5.01"]);
    expect(rewardCents(0, 25)).toBe(0);
  });
});

describe("credit expiry and spend allocation", () => {
  it("attributes spending to earliest expiry without double debiting expired history", () => {
    const expiry = new Date("2026-01-20T00:00:00Z");
    const laterExpiry = new Date("2026-02-20T00:00:00Z");
    const rows = [
      { id: 1, type: "earned" as const, amount: "10.00", createdAt: day(1), expiresAt: expiry },
      { id: 2, type: "earned" as const, amount: "8.00", createdAt: day(2), expiresAt: laterExpiry },
      { id: 3, type: "spent" as const, amount: "7.00", createdAt: day(3), expiresAt: null },
      { id: 4, type: "expired" as const, amount: "3.00", createdAt: day(20), expiresAt: null },
    ];
    expect(remainingCreditById(rows, day(10))).toEqual(new Map([[1, 300], [2, 800]]));
    expect(remainingCreditById(rows, day(25))).toEqual(new Map([[1, 0], [2, 800]]));
  });
  it("does not apply later spending to credits already expired at time of purchase", () => {
    const rows = [
      { id: 1, type: "earned" as const, amount: "10.00", createdAt: day(1), expiresAt: day(5) },
      { id: 2, type: "earned" as const, amount: "10.00", createdAt: day(2), expiresAt: day(29) },
      { id: 3, type: "spent" as const, amount: "8.00", createdAt: day(10), expiresAt: null },
    ];
    expect(remainingCreditById(rows, day(12)).get(2)).toBe(200);
  });
});
