import { describe, expect, it } from "vitest";
import {
  CUSTOMER_PLANS,
  PROVIDER_PLANS,
  customerHasFeature,
  providerHasFeature,
  resolveCustomerEntitlement,
  resolveProviderEntitlement,
} from "../shared/entitlements";

const NOW = new Date("2026-09-02T16:00:00.000Z");
const FUTURE = new Date("2026-09-20T16:00:00.000Z");
const PAST = new Date("2026-08-20T16:00:00.000Z");

describe("authoritative plan catalog", () => {
  it("uses the current provider and customer prices everywhere", () => {
    expect(PROVIDER_PLANS.basic.monthlyPrice).toBe(12);
    expect(PROVIDER_PLANS.premium.monthlyPrice).toBe(20);
    expect(CUSTOMER_PLANS.pro.monthlyPrice).toBe(12);
    expect(CUSTOMER_PLANS.business.monthlyPrice).toBe(20);
  });

  it("keeps provider payments and invoicing paid while customer core booking remains free", () => {
    expect(providerHasFeature("free", "paymentCollection")).toBe(false);
    expect(providerHasFeature("free", "invoicing")).toBe(false);
    expect(providerHasFeature("basic", "paymentCollection")).toBe(true);
    expect(providerHasFeature("premium", "invoicing")).toBe(true);
    expect(customerHasFeature("free", "directBooking")).toBe(true);
    expect(customerHasFeature("free", "quoteRequests")).toBe(true);
  });
});

describe("shared subscription lifecycle resolver", () => {
  it("resolves missing and active free records to free access", () => {
    expect(resolveProviderEntitlement(undefined, NOW).effectiveTier).toBe("free");
    expect(resolveCustomerEntitlement({ tier: "free", status: "active" }, NOW).state).toBe("free");
  });

  it("grants a valid trial and expires it deterministically", () => {
    const valid = resolveProviderEntitlement({ tier: "basic", status: "trialing", trialEndsAt: FUTURE }, NOW);
    expect(valid).toMatchObject({ effectiveTier: "basic", state: "trialing", isTrialing: true, hasPaidAccess: true });
    const expired = resolveProviderEntitlement({ tier: "basic", status: "trialing", trialEndsAt: PAST }, NOW);
    expect(expired).toMatchObject({ effectiveTier: "free", state: "trial_expired", hasPaidAccess: false, requiresBillingAction: true });
  });

  it("keeps scheduled cancellation active only through a valid future period end", () => {
    const cancelling = resolveCustomerEntitlement({ tier: "business", status: "active", cancelAtPeriodEnd: true, currentPeriodEnd: FUTURE }, NOW);
    expect(cancelling).toMatchObject({ effectiveTier: "business", state: "cancelling", isScheduledToCancel: true, accessEndsAt: FUTURE });
    const ended = resolveCustomerEntitlement({ tier: "business", status: "cancelled", cancelAtPeriodEnd: true, currentPeriodEnd: PAST }, NOW);
    expect(ended).toMatchObject({ effectiveTier: "free", state: "cancelled", hasPaidAccess: false });
  });

  it("supports legacy cancelled rows that still have valid future scheduled access", () => {
    const legacy = resolveCustomerEntitlement({ tier: "business", status: "cancelled", cancelAtPeriodEnd: true, currentPeriodEnd: FUTURE }, NOW);
    expect(legacy).toMatchObject({ effectiveTier: "business", state: "cancelling", isScheduledToCancel: true });
  });

  it("gives a bounded past-due grace period and suspends access without a future end", () => {
    const grace = resolveProviderEntitlement({ tier: "premium", status: "past_due", currentPeriodEnd: FUTURE }, NOW);
    expect(grace).toMatchObject({ effectiveTier: "premium", state: "past_due_grace", requiresBillingAction: true });
    const suspended = resolveProviderEntitlement({ tier: "premium", status: "past_due", currentPeriodEnd: PAST }, NOW);
    expect(suspended).toMatchObject({ effectiveTier: "free", state: "past_due_suspended", requiresBillingAction: true });
  });

  it("does not grant paid access to paused, incomplete, or fully cancelled records", () => {
    for (const status of ["paused", "incomplete", "cancelled"] as const) {
      expect(resolveProviderEntitlement({ tier: "premium", status }, NOW).effectiveTier).toBe("free");
    }
  });

  it("preserves intentional active administrative grants without requiring Stripe IDs", () => {
    const grant = resolveProviderEntitlement({ tier: "premium", status: "active", stripeSubscriptionId: null }, NOW);
    expect(grant).toMatchObject({ effectiveTier: "premium", state: "active", hasPaidAccess: true, canManageBilling: false });
  });
});
