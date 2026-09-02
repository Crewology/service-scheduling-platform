import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { summarizeCustomerSubscriptionAnalytics, summarizeProviderSubscriptionAnalytics } from "./db/payments";

const now = new Date("2026-09-02T12:00:00.000Z");
const day = 86_400_000;

function sub(overrides: Record<string, unknown>) {
  return {
    id: 1,
    providerId: 1,
    tier: "basic",
    status: "active",
    stripeSubscriptionId: "sub_live",
    stripeCustomerId: "cus_live",
    currentPeriodStart: new Date(now.getTime() - 15 * day),
    currentPeriodEnd: new Date(now.getTime() + 15 * day),
    trialEndsAt: null,
    pausedAt: null,
    resumesAt: null,
    cancelAtPeriodEnd: false,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    ...overrides,
  } as any;
}

describe("admin subscription reporting", () => {
  it("separates effective paid access from revenue-generating subscriptions", () => {
    const result = summarizeProviderSubscriptionAnalytics([
      sub({ providerId: 1 }),
      sub({ providerId: 2, tier: "premium", status: "trialing", stripeSubscriptionId: null, trialEndsAt: new Date(now.getTime() + 5 * day) }),
      sub({ providerId: 3, status: "past_due", currentPeriodEnd: new Date(now.getTime() + 2 * day) }),
      sub({ providerId: 4, stripeSubscriptionId: null, stripeCustomerId: null }),
      sub({ providerId: 5, status: "past_due", currentPeriodEnd: new Date(now.getTime() - day) }),
    ], 6, now);

    expect(result.activeSubscribers).toBe(4);
    expect(result.payingSubscribers).toBe(1);
    expect(result.trialingSubscribers).toBe(1);
    expect(result.graceSubscribers).toBe(1);
    expect(result.tiers).toMatchObject({ free: 2, basic: 3, premium: 1 });
    expect(result.mrr).toBe(12);
  });

  it("keeps scheduled cancellation in access and MRR until its paid period ends", () => {
    const result = summarizeProviderSubscriptionAnalytics([
      sub({ cancelAtPeriodEnd: true, currentPeriodEnd: new Date(now.getTime() + 5 * day) }),
    ], 1, now);

    expect(result.activeSubscribers).toBe(1);
    expect(result.payingSubscribers).toBe(1);
    expect(result.scheduledCancellations).toBe(1);
    expect(result.mrr).toBe(12);
  });

  it("normalizes annual Business billing to discounted monthly recurring revenue", () => {
    const result = summarizeProviderSubscriptionAnalytics([
      sub({
        tier: "premium",
        currentPeriodStart: new Date(now.getTime() - 180 * day),
        currentPeriodEnd: new Date(now.getTime() + 185 * day),
      }),
    ], 1, now);

    expect(result.mrr).toBe(16);
  });

  it("includes customer paid-plan access while excluding trials and grants from customer MRR", () => {
    const result = summarizeCustomerSubscriptionAnalytics([
      sub({ userId: 10, providerId: undefined, tier: "pro" }),
      sub({ userId: 11, providerId: undefined, tier: "business", status: "trialing", stripeSubscriptionId: null, trialEndsAt: new Date(now.getTime() + 5 * day) }),
      sub({ userId: 12, providerId: undefined, tier: "business", status: "past_due", currentPeriodEnd: new Date(now.getTime() + 2 * day) }),
      sub({ userId: 13, providerId: undefined, tier: "pro", stripeSubscriptionId: null, stripeCustomerId: null }),
    ] as any, now);

    expect(result.activeSubscribers).toBe(4);
    expect(result.payingSubscribers).toBe(1);
    expect(result.trialingSubscribers).toBe(1);
    expect(result.graceSubscribers).toBe(1);
    expect(result.mrr).toBe(12);
  });

  it("normalizes annual Manager billing to monthly recurring revenue", () => {
    const result = summarizeCustomerSubscriptionAnalytics([
      sub({
        userId: 10,
        providerId: undefined,
        tier: "business",
        currentPeriodStart: new Date(now.getTime() - 180 * day),
        currentPeriodEnd: new Date(now.getTime() + 185 * day),
      }),
    ] as any, now);

    expect(result.mrr).toBe(16);
  });

  it("admin Users rows expose configured tier, effective tier, lifecycle state, and billing-action flags", () => {
    const source = readFileSync(resolve(__dirname, "db/users.ts"), "utf8");
    expect(source).toContain("providerConfiguredTier");
    expect(source).toContain("providerEntitlementState");
    expect(source).toContain("providerAccessEndsAt");
    expect(source).toContain("providerRequiresBillingAction");
    expect(source).toContain("customerConfiguredTier");
    expect(source).toContain("customerEntitlementState");
  });
});
