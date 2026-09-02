import { describe, expect, it } from "vitest";
import {
  getStripeSubscriptionPeriod,
  mapStripeSubscriptionStatus,
  requireStripeSubscriptionPeriodEnd,
} from "./stripeSubscriptionLifecycle";

describe("Stripe subscription lifecycle adapter", () => {
  it.each([
    ["active", "active"],
    ["trialing", "trialing"],
    ["past_due", "past_due"],
    ["unpaid", "past_due"],
    ["paused", "paused"],
    ["canceled", "cancelled"],
    ["incomplete", "incomplete"],
    ["incomplete_expired", "incomplete"],
  ])("maps Stripe status %s to local status %s", (stripeStatus, expected) => {
    expect(mapStripeSubscriptionStatus(stripeStatus)).toBe(expected);
  });

  it("prefers item-level current period timestamps used by the current Stripe API", () => {
    const period = getStripeSubscriptionPeriod({
      start_date: 100,
      current_period_end: 200,
      items: { data: [{ current_period_start: 300, current_period_end: 400 }] },
    });

    expect(period.currentPeriodStart?.toISOString()).toBe("1970-01-01T00:05:00.000Z");
    expect(period.currentPeriodEnd?.toISOString()).toBe("1970-01-01T00:06:40.000Z");
  });

  it("falls back safely for legacy payloads and terminal cancellations", () => {
    expect(getStripeSubscriptionPeriod({ start_date: 100, current_period_end: 200 })).toEqual({
      currentPeriodStart: new Date(100_000),
      currentPeriodEnd: new Date(200_000),
    });
    expect(getStripeSubscriptionPeriod({ ended_at: 500 }).currentPeriodEnd).toEqual(new Date(500_000));
  });

  it("never invents an arbitrary billing period when Stripe omits the end date", () => {
    expect(getStripeSubscriptionPeriod({})).toEqual({
      currentPeriodStart: undefined,
      currentPeriodEnd: undefined,
    });
    expect(() => requireStripeSubscriptionPeriodEnd({})).toThrow("missing its current period end");
  });
});
