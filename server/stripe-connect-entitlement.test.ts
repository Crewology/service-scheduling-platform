import { beforeEach, describe, expect, it, vi } from "vitest";

const stripeMocks = vi.hoisted(() => ({
  accounts: {
    retrieve: vi.fn(),
    create: vi.fn(),
    createLoginLink: vi.fn(),
  },
  accountLinks: { create: vi.fn() },
  balance: { retrieve: vi.fn() },
}));

const dbMocks = vi.hoisted(() => ({
  getProviderByUserId: vi.fn(),
  getProviderTier: vi.fn(),
  updateProviderStripeAccount: vi.fn(),
}));

vi.mock("stripe", () => ({
  default: class StripeMock {
    accounts = stripeMocks.accounts;
    accountLinks = stripeMocks.accountLinks;
    balance = stripeMocks.balance;
  },
}));
vi.mock("./db", () => dbMocks);

import { stripeConnectRouter } from "./stripeConnectRouter";

const context = {
  user: {
    id: 101,
    email: "provider@example.com",
    name: "Provider",
    role: "provider",
  },
  req: { headers: { origin: "https://ologycrew.test" } },
  res: {},
} as any;

describe("Stripe Connect effective payment entitlement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getProviderByUserId.mockResolvedValue({
      id: 501,
      businessType: "llc",
      stripeAccountId: "acct_retained",
      stripeAccountStatus: "active",
      stripeOnboardingComplete: true,
      payoutEnabled: true,
    });
    dbMocks.getProviderTier.mockResolvedValue("basic");
    stripeMocks.accounts.retrieve.mockResolvedValue({
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
    });
    stripeMocks.accounts.createLoginLink.mockResolvedValue({ url: "https://stripe.test/dashboard" });
  });

  it("reports a retained account as connected but payment collection disabled on Starter", async () => {
    dbMocks.getProviderTier.mockResolvedValue("free");

    const result = await stripeConnectRouter.createCaller(context).getStatus();

    expect(result).toMatchObject({
      connected: true,
      chargesEnabled: true,
      payoutsEnabled: true,
      paymentCollectionEnabled: false,
      requiresPaidPlan: true,
    });
  });

  it("reports payment collection enabled only when paid entitlement and Stripe readiness are both true", async () => {
    const result = await stripeConnectRouter.createCaller(context).getStatus();

    expect(result).toMatchObject({ paymentCollectionEnabled: true, requiresPaidPlan: false });
  });

  it("blocks resumed onboarding on Starter without deleting the retained account", async () => {
    dbMocks.getProviderTier.mockResolvedValue("free");

    await expect(stripeConnectRouter.createCaller(context).getOnboardingLink({ origin: "https://ologycrew.test" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(stripeMocks.accountLinks.create).not.toHaveBeenCalled();
    expect(dbMocks.updateProviderStripeAccount).not.toHaveBeenCalled();
  });

  it("allows Stripe dashboard access after downgrade for payout and account management", async () => {
    dbMocks.getProviderTier.mockResolvedValue("free");

    const result = await stripeConnectRouter.createCaller(context).getDashboardLink();

    expect(result.url).toBe("https://stripe.test/dashboard");
    expect(stripeMocks.accounts.createLoginLink).toHaveBeenCalledWith("acct_retained");
  });
});
