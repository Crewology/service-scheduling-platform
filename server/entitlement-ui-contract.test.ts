import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("entitlement-aware customer payment surfaces", () => {
  const serviceDetail = read("client/src/pages/ServiceDetail.tsx");
  const bookingConfirmation = read("client/src/pages/BookingConfirmation.tsx");
  const providerRouter = read("server/routers/providerRouter.ts");

  it("publishes only a boolean payment-availability signal, not the connected account identifier", () => {
    expect(providerRouter).toContain("canAcceptPlatformPayments:");
    expect(providerRouter).toContain('providerHasFeature(effectiveTier, "paymentCollection")');
    expect(providerRouter).toContain("const { stripeAccountId, ...safeProvider } = provider");
  });

  it("routes priced bookings to payment only when the provider can collect on-platform", () => {
    expect(serviceDetail).toContain("const canAcceptPlatformPayments");
    expect(serviceDetail.match(/paymentRequested && canAcceptPlatformPayments/g)?.length).toBe(3);
    expect(serviceDetail).toContain("This provider will arrange payment after confirming");
    expect(serviceDetail).toContain("!service.requireUpfrontPayment && canAcceptPlatformPayments");
  });

  it("hides later Pay Now actions and explains that no charge was created", () => {
    expect(bookingConfirmation).toContain("Payment Arranged with Provider");
    expect(bookingConfirmation).toContain("No charge has been created");
    expect(bookingConfirmation.match(/canAcceptPlatformPayments &&/g)?.length).toBeGreaterThanOrEqual(2);
  });
});

describe("subscription cancellation and reactivation surfaces", () => {
  const providerPage = read("client/src/pages/SubscriptionManagement.tsx");
  const customerPage = read("client/src/pages/AccountSubscription.tsx");
  const providerRouter = read("server/subscriptionRouter.ts");
  const customerRouter = read("server/customerSubscriptionRouter.ts");

  it("offers no-charge Keep Current Plan reactivation for both account types", () => {
    for (const page of [providerPage, customerPage]) {
      expect(page).toContain("Keep Current Plan");
      expect(page).toContain("currentInterval");
      expect(page).toContain("without a new charge");
    }
  });

  it("guards missing legacy cancellation dates without non-null assertions", () => {
    expect(providerPage).not.toContain("currentPeriodEnd!");
    expect(customerPage).not.toContain("currentPeriodEnd!");
    expect(providerPage).toContain("Cancellation is scheduled for the end of the current billing period");
    expect(customerPage).toContain("Cancellation is scheduled for the end of the current billing period");
  });

  it("does not silently create a new subscription from recently cancelled history", () => {
    for (const source of [providerRouter, customerRouter]) {
      expect(source).not.toContain("recentlyCanceled");
      expect(source).not.toContain("subscriptions.create(");
      expect(source).not.toContain("within the last hour");
    }
  });
});
