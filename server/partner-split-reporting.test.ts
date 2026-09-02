import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { summarizePartnerTransferRows } from "./partnerSplit";

function row(overrides: Record<string, unknown>) {
  return {
    id: 1,
    stripeTransferId: "tr_1",
    amount: "4.80",
    currency: "usd",
    sourceType: "provider_subscription",
    sourceId: "in_1",
    sourceDescription: "Provider Pro renewal",
    status: "completed",
    errorMessage: null,
    partnerAccountId: "acct_1U6HO6C4LbrPtrS5",
    splitPercentage: "40.00",
    totalRevenue: "12.00",
    createdAt: new Date("2026-09-02T12:00:00.000Z"),
    ...overrides,
  } as any;
}

describe("partner split reporting", () => {
  it("counts each revenue source once across failed and duplicate successful webhook attempts", () => {
    const summary = summarizePartnerTransferRows([
      row({ id: 1, status: "failed", stripeTransferId: null, errorMessage: "temporary failure" }),
      row({ id: 2 }),
      row({ id: 3 }),
    ]);

    expect(summary.totalRevenue).toBe(12);
    expect(summary.partnerOwed).toBe(4.8);
    expect(summary.totalTransferred).toBe(4.8);
    expect(summary.platformShare).toBe(7.2);
    expect(summary.totalCount).toBe(1);
    expect(summary.completedCount).toBe(1);
    expect(summary.failedCount).toBe(0);
    expect(summary.partnerOutstanding).toBe(0);
  });

  it("reports unresolved failed and sub-minimum obligations without calling them transferred", () => {
    const summary = summarizePartnerTransferRows([
      row({}),
      row({
        id: 2,
        sourceId: "in_2",
        sourceType: "customer_subscription",
        totalRevenue: "20.00",
        amount: "8.00",
        status: "failed",
        stripeTransferId: null,
        errorMessage: "destination unavailable",
      }),
      row({
        id: 3,
        sourceId: "pi_fee",
        sourceType: "booking_platform_fee",
        totalRevenue: "0.50",
        amount: "0.20",
        status: "completed",
        stripeTransferId: null,
        errorMessage: "Amount below Stripe minimum ($0.50), recorded but not transferred",
      }),
    ]);

    expect(summary.totalRevenue).toBe(32.5);
    expect(summary.subscriptionRevenue).toBe(32);
    expect(summary.bookingFeeRevenue).toBe(0.5);
    expect(summary.partnerOwed).toBe(13);
    expect(summary.totalTransferred).toBe(4.8);
    expect(summary.partnerOutstanding).toBe(8.2);
    expect(summary.failedCount).toBe(1);
    expect(summary.deferredCount).toBe(1);
    expect(summary.failedPartnerAmount).toBe(8);
  });

  it("uses a stable Stripe idempotency key without changing the 40/60 split or source transaction", () => {
    const source = readFileSync(resolve(__dirname, "partnerSplit.ts"), "utf8");
    expect(source).toContain("idempotencyKey: `ologycrew-partner-${input.sourceType}-${input.sourceId}-${partnerAccountId}`");
    expect(source).toContain("transferParams.source_transaction = input.chargeId");
    expect(source).toContain("const PARTNER_SPLIT_PERCENTAGE = 40");
    expect(source).toContain("const PLATFORM_SPLIT_PERCENTAGE = 60");
  });
});
