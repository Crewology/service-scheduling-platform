import { beforeEach, describe, expect, it, vi } from "vitest";

const stripeMocks = vi.hoisted(() => ({
  subscriptions: {
    retrieve: vi.fn(),
    update: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
  },
  products: {
    list: vi.fn(),
    search: vi.fn(),
    create: vi.fn(),
  },
  prices: {
    list: vi.fn(),
    create: vi.fn(),
  },
  customers: {
    create: vi.fn(),
    retrieve: vi.fn(),
  },
  checkout: {
    sessions: { create: vi.fn() },
  },
  billingPortal: {
    sessions: { create: vi.fn() },
  },
  invoices: {
    list: vi.fn(),
  },
}));

const dbMocks = vi.hoisted(() => ({
  getProviderByUserId: vi.fn(),
  getProviderSubscription: vi.fn(),
  upsertProviderSubscription: vi.fn(),
  getCustomerSubscription: vi.fn(),
  getCustomerTier: vi.fn(),
  upsertCustomerSubscription: vi.fn(),
  getActiveServiceCount: vi.fn(),
  getUserFavoriteCount: vi.fn(),
  createNotification: vi.fn().mockResolvedValue({ insertId: 1 }),
}));

vi.mock("stripe", () => ({
  default: class StripeMock {
    subscriptions = stripeMocks.subscriptions;
    products = stripeMocks.products;
    prices = stripeMocks.prices;
    customers = stripeMocks.customers;
    checkout = stripeMocks.checkout;
    billingPortal = stripeMocks.billingPortal;
    invoices = stripeMocks.invoices;
  },
}));

vi.mock("./db", () => dbMocks);
vi.mock("./notifications", () => ({ sendNotification: vi.fn().mockResolvedValue(true) }));
vi.mock("./trialNotifications", () => ({
  sendTrialStartedNotification: vi.fn().mockResolvedValue(true),
  checkAndSendTrialMilestoneNotification: vi.fn().mockResolvedValue(true),
}));

import { subscriptionRouter } from "./subscriptionRouter";
import { customerSubscriptionRouter } from "./customerSubscriptionRouter";

const futurePeriodStart = 1_800_000_000;
const futurePeriodEnd = 1_802_678_400;

function stripeSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub_live",
    status: "active",
    cancel_at_period_end: false,
    items: {
      data: [{
        id: "si_live",
        current_period_start: futurePeriodStart,
        current_period_end: futurePeriodEnd,
        price: { recurring: { interval: "month" } },
      }],
    },
    ...overrides,
  };
}

function ctx(role: "provider" | "customer" = "provider") {
  return {
    user: {
      id: 101,
      openId: "test-user",
      name: "Lifecycle Tester",
      email: "lifecycle@example.com",
      role,
      avatarUrl: null,
      isSuspended: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    req: { headers: { origin: "https://ologycrew.test" } },
    res: {},
  } as any;
}

describe("provider subscription lifecycle mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getProviderByUserId.mockResolvedValue({ id: 501, businessName: "Lifecycle Pro" });
    stripeMocks.products.list.mockResolvedValue({ data: [{ id: "prod_provider", name: "OlogyCrew Provider Subscription", active: true }] });
    stripeMocks.prices.list.mockResolvedValue({ data: [{ id: "price_provider", unit_amount: 2_000, recurring: { interval: "month" } }] });
  });

  it("keeps paid access through the current period when scheduling Starter", async () => {
    dbMocks.getProviderSubscription.mockResolvedValue({
      providerId: 501,
      tier: "basic",
      status: "active",
      stripeSubscriptionId: "sub_provider",
      stripeCustomerId: "cus_provider",
    });
    stripeMocks.subscriptions.update.mockResolvedValue(stripeSubscription({ cancel_at_period_end: true }));

    const result = await subscriptionRouter.createCaller(ctx()).downgrade({ targetTier: "free" });

    expect(stripeMocks.subscriptions.update).toHaveBeenCalledWith("sub_provider", { cancel_at_period_end: true });
    expect(dbMocks.upsertProviderSubscription).toHaveBeenCalledWith(expect.objectContaining({
      providerId: 501,
      tier: "basic",
      status: "active",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date(futurePeriodEnd * 1000),
    }));
    expect(result).toMatchObject({ newTier: "basic", scheduledTier: "free" });
  });

  it("reactivates the same tier and interval without creating a Checkout session", async () => {
    dbMocks.getProviderSubscription.mockResolvedValue({
      providerId: 501,
      tier: "basic",
      status: "active",
      stripeSubscriptionId: "sub_provider",
      stripeCustomerId: "cus_provider",
      cancelAtPeriodEnd: true,
    });
    stripeMocks.subscriptions.retrieve.mockResolvedValue(stripeSubscription({ cancel_at_period_end: true }));
    stripeMocks.subscriptions.update.mockResolvedValue(stripeSubscription());

    const result = await subscriptionRouter.createCaller(ctx()).createCheckout({
      tier: "basic",
      interval: "month",
      withTrial: false,
    });

    expect(stripeMocks.subscriptions.update).toHaveBeenCalledWith("sub_provider", { cancel_at_period_end: false });
    expect(stripeMocks.checkout.sessions.create).not.toHaveBeenCalled();
    expect(result.url).toBeNull();
    expect(result.message).toContain("No new charge");
  });

  it("upgrades in place and clears scheduled cancellation", async () => {
    dbMocks.getProviderSubscription.mockResolvedValue({
      providerId: 501,
      tier: "basic",
      status: "active",
      stripeSubscriptionId: "sub_provider",
      stripeCustomerId: "cus_provider",
      cancelAtPeriodEnd: true,
    });
    stripeMocks.subscriptions.retrieve.mockResolvedValue(stripeSubscription({ cancel_at_period_end: true }));
    stripeMocks.subscriptions.update.mockResolvedValue(stripeSubscription());

    await subscriptionRouter.createCaller(ctx()).createCheckout({ tier: "premium", interval: "month", withTrial: false });

    expect(stripeMocks.subscriptions.update).toHaveBeenCalledWith("sub_provider", expect.objectContaining({
      cancel_at_period_end: false,
      proration_behavior: "create_prorations",
    }));
    expect(dbMocks.upsertProviderSubscription).toHaveBeenCalledWith(expect.objectContaining({ tier: "premium", cancelAtPeriodEnd: false }));
    expect(stripeMocks.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it("blocks plan mutations while Stripe reports a past-due subscription", async () => {
    dbMocks.getProviderSubscription.mockResolvedValue({
      providerId: 501,
      tier: "basic",
      status: "past_due",
      stripeSubscriptionId: "sub_provider",
    });
    stripeMocks.subscriptions.retrieve.mockResolvedValue(stripeSubscription({ status: "past_due" }));

    await expect(subscriptionRouter.createCaller(ctx()).createCheckout({ tier: "premium", interval: "month", withTrial: false }))
      .rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(stripeMocks.checkout.sessions.create).not.toHaveBeenCalled();
  });
});

describe("customer subscription lifecycle mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stripeMocks.products.search.mockResolvedValue({ data: [{ id: "prod_customer" }] });
    stripeMocks.prices.list.mockResolvedValue({ data: [{ id: "price_customer", unit_amount: 2_000, recurring: { interval: "month" } }] });
  });

  it("keeps Coordinator access through the current period when scheduling Individual", async () => {
    dbMocks.getCustomerTier.mockResolvedValue("pro");
    dbMocks.getCustomerSubscription.mockResolvedValue({
      userId: 101,
      tier: "pro",
      status: "active",
      stripeSubscriptionId: "sub_customer",
      stripeCustomerId: "cus_customer",
    });
    stripeMocks.subscriptions.update.mockResolvedValue(stripeSubscription({ cancel_at_period_end: true }));

    const result = await customerSubscriptionRouter.createCaller(ctx("customer")).downgrade({ targetTier: "free" });

    expect(dbMocks.upsertCustomerSubscription).toHaveBeenCalledWith(expect.objectContaining({
      tier: "pro",
      status: "active",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date(futurePeriodEnd * 1000),
    }));
    expect(result).toMatchObject({ newTier: "pro", scheduledTier: "free" });
  });

  it("reactivates the same tier and interval without creating a Checkout session", async () => {
    dbMocks.getCustomerSubscription.mockResolvedValue({
      userId: 101,
      tier: "pro",
      status: "active",
      stripeSubscriptionId: "sub_customer",
      stripeCustomerId: "cus_customer",
      cancelAtPeriodEnd: true,
    });
    stripeMocks.subscriptions.retrieve.mockResolvedValue(stripeSubscription({ cancel_at_period_end: true }));
    stripeMocks.subscriptions.update.mockResolvedValue(stripeSubscription());

    const result = await customerSubscriptionRouter.createCaller(ctx("customer")).createCheckout({
      tier: "pro",
      interval: "month",
      withTrial: false,
    });

    expect(stripeMocks.subscriptions.update).toHaveBeenCalledWith("sub_customer", { cancel_at_period_end: false });
    expect(stripeMocks.checkout.sessions.create).not.toHaveBeenCalled();
    expect(result.message).toContain("No new charge");
  });

  it("upgrades Coordinator to Manager in place instead of opening a second subscription Checkout", async () => {
    dbMocks.getCustomerSubscription.mockResolvedValue({
      userId: 101,
      tier: "pro",
      status: "active",
      stripeSubscriptionId: "sub_customer",
      stripeCustomerId: "cus_customer",
    });
    stripeMocks.subscriptions.retrieve.mockResolvedValue(stripeSubscription());
    stripeMocks.subscriptions.update.mockResolvedValue(stripeSubscription());

    const result = await customerSubscriptionRouter.createCaller(ctx("customer")).createCheckout({
      tier: "business",
      interval: "month",
      withTrial: false,
    });

    expect(stripeMocks.subscriptions.update).toHaveBeenCalledWith("sub_customer", expect.objectContaining({
      cancel_at_period_end: false,
      proration_behavior: "create_prorations",
    }));
    expect(dbMocks.upsertCustomerSubscription).toHaveBeenCalledWith(expect.objectContaining({ tier: "business", cancelAtPeriodEnd: false }));
    expect(stripeMocks.checkout.sessions.create).not.toHaveBeenCalled();
    expect(result.message).toContain("Upgraded to Manager");
  });
});
