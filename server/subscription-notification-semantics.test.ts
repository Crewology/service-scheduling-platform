import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getTemplate } from "./notifications/templates";
import { getInvoiceSubscriptionId } from "./stripeWebhook";

describe("subscription notification semantics", () => {
  it("describes a paid-to-free change as scheduled with no-charge reactivation", () => {
    const template = getTemplate("subscription_downgraded", {
      tier: "Starter (Free)",
      previousTier: "Pro",
      accessEndsAt: "2026-10-02T12:00:00.000Z",
    });

    expect(template.body).toContain("remains active through");
    expect(template.body).toContain("October 2, 2026");
    expect(template.body).toContain("without a new charge");
    expect(template.body).not.toContain("effective immediately");
  });

  it("describes paid-tier changes as immediate Stripe proration", () => {
    const template = getTemplate("subscription_downgraded", {
      tier: "Pro",
      previousTier: "Business",
    });

    expect(template.body).toContain("effective immediately");
    expect(template.body).toContain("prorated billing adjustment");
  });

  it("distinguishes payment-failure grace access from suspended access", () => {
    const grace = getTemplate("subscription_payment_failed", {
      customerName: "Gary",
      tier: "Business",
      accessEndsAt: "2026-09-10T12:00:00.000Z",
      billingUrl: "/provider/subscription",
    });
    const suspended = getTemplate("subscription_payment_failed", {
      customerName: "Gary",
      tier: "Business",
      billingUrl: "/provider/subscription",
    });

    expect(grace.body).toContain("Current access through");
    expect(suspended.body).toContain("Temporarily suspended");
    expect(grace.body).toContain("/provider/subscription");
  });

  it("uses audience-provided free plan names for terminal cancellation", () => {
    const customer = getTemplate("subscription_cancelled", { tier: "Individual", customerName: "Customer" });
    const provider = getTemplate("subscription_cancelled", { tier: "Starter (Free)", businessName: "Business" });

    expect(customer.body).toContain("Current Plan:** Individual");
    expect(customer.body).not.toContain("Starter tier");
    expect(provider.body).toContain("Starter (Free)");
  });

  it("provides renewal and restored-payment confirmations", () => {
    expect(getTemplate("subscription_renewed", { tier: "Pro", amount: "$12.00" }).body).toContain("renewed successfully");
    expect(getTemplate("subscription_payment_restored", { tier: "Manager" }).body).toContain("paid-plan access is active again");
  });

  it("extracts current and legacy Stripe invoice subscription references", () => {
    expect(getInvoiceSubscriptionId({ parent: { subscription_details: { subscription: "sub_parent" } } } as any)).toBe("sub_parent");
    expect(getInvoiceSubscriptionId({ subscription: { id: "sub_legacy" } } as any)).toBe("sub_legacy");
    expect(getInvoiceSubscriptionId({} as any)).toBeNull();
  });

  it("wires failed and successful invoices to lifecycle-aware notification types", () => {
    const source = readFileSync(resolve(__dirname, "stripeWebhook.ts"), "utf8");
    expect(source).toContain('type: "subscription_payment_failed"');
    expect(source).toContain('"subscription_payment_restored" : "subscription_renewed"');
    expect(source).toContain("await handleSubscriptionUpdate(subscription)");
    expect(source).toContain("executePartnerTransfer");
  });

  it("renders provider and customer billing history from effective entitlement state", () => {
    const providerPage = readFileSync(resolve(__dirname, "../client/src/pages/BillingHistory.tsx"), "utf8");
    const customerPage = readFileSync(resolve(__dirname, "../client/src/pages/CustomerBillingHistory.tsx"), "utf8");
    const providerRouter = readFileSync(resolve(__dirname, "subscriptionRouter.ts"), "utf8");
    const customerRouter = readFileSync(resolve(__dirname, "customerSubscriptionRouter.ts"), "utf8");

    expect(providerPage).toContain("trpc.subscription.mySubscription.useQuery");
    expect(customerPage).toContain("trpc.customerSubscription.getSubscription.useQuery");
    expect(providerPage).toContain('case "scheduled"');
    expect(customerPage).toContain('case "action_required"');
    expect(providerPage).toContain("data.nextCursor");
    expect(customerPage).toContain("data.nextCursor");
    expect(providerPage).not.toContain("Trial expired — please upgrade or downgrade");
    expect(customerPage).not.toContain("Trial expired — please upgrade or downgrade");
    expect(providerRouter).toContain("nextCursor: invoices.data[invoices.data.length - 1]?.id || null");
    expect(customerRouter).toContain("nextCursor: invoices.data[invoices.data.length - 1]?.id || null");
  });
});
