import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import {
  summarizeAdminProviderTierMembers,
  summarizeProviderSubscriptionAnalytics,
} from "./db/payments";

const now = new Date("2026-09-29T12:00:00.000Z");
const day = 86_400_000;

function subscription(providerId: number, overrides: Record<string, unknown> = {}) {
  return {
    id: providerId,
    providerId,
    tier: "basic",
    status: "active",
    stripeSubscriptionId: `sub_${providerId}`,
    stripeCustomerId: `cus_${providerId}`,
    currentPeriodStart: new Date(now.getTime() - 15 * day),
    currentPeriodEnd: new Date(now.getTime() + 15 * day),
    trialEndsAt: null,
    pausedAt: null,
    resumesAt: null,
    cancelAtPeriodEnd: false,
    createdAt: new Date(now.getTime() - 30 * day),
    updatedAt: new Date(now.getTime() - day),
    ...overrides,
  } as any;
}

function row(providerId: number, businessName: string, providerSubscription: any = null) {
  return {
    providerId,
    businessName,
    profileSlug: businessName.toLowerCase().replaceAll(" ", "-"),
    city: "Atlanta",
    state: "GA",
    userId: providerId + 100,
    userName: `${businessName} Owner`,
    firstName: businessName.split(" ")[0] ?? null,
    lastName: "Owner",
    email: `owner${providerId}@ologycrew.example`,
    profilePhotoUrl: null,
    subscription: providerSubscription,
  };
}

function nonAdminContext(): TrpcContext {
  return {
    user: {
      id: 9001,
      openId: "customer-user",
      email: "customer@example.com",
      name: "Customer User",
      firstName: "Customer",
      lastName: "User",
      phone: null,
      loginMethod: "email",
      role: "customer",
      profilePhotoUrl: null,
      emailVerified: true,
      hasSelectedRole: true,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
      deletedAt: null,
      adminRole: null,
      passwordHash: null,
      emailVerificationToken: null,
      emailVerificationExpires: null,
      passwordResetToken: null,
      passwordResetExpires: null,
      authProvider: "email",
      googleId: null,
      pendingPlanTier: null,
      pendingPlanAudience: null,
      twoFactorEnabled: false,
      billingAddressLine1: null,
      billingAddressLine2: null,
      billingCity: null,
      billingState: null,
      billingPostalCode: null,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Admin subscription tier members", () => {
  const subscriptions = [
    subscription(2),
    subscription(3, {
      tier: "premium",
      status: "trialing",
      stripeSubscriptionId: null,
      trialEndsAt: new Date(now.getTime() + 5 * day),
    }),
    subscription(4, {
      status: "trialing",
      stripeSubscriptionId: null,
      trialEndsAt: new Date(now.getTime() - day),
    }),
    subscription(5, {
      status: "past_due",
      currentPeriodEnd: new Date(now.getTime() + 2 * day),
    }),
    subscription(6, { tier: "premium", status: "cancelled" }),
  ];
  const rows = [
    row(1, "Zulu Starter"),
    row(2, "Alpha Pro", subscriptions[0]),
    row(3, "Beta Business Trial", subscriptions[1]),
    row(4, "Delta Expired Trial", subscriptions[2]),
    row(5, "Gamma Grace", subscriptions[3]),
    row(6, "Echo Cancelled", subscriptions[4]),
  ];

  it("keeps modal membership counts identical to lifecycle-aware tier totals", () => {
    const analytics = summarizeProviderSubscriptionAnalytics(subscriptions, rows.length, now);

    expect(summarizeAdminProviderTierMembers(rows, "free", now).total).toBe(analytics.tiers.free);
    expect(summarizeAdminProviderTierMembers(rows, "basic", now).total).toBe(analytics.tiers.basic);
    expect(summarizeAdminProviderTierMembers(rows, "premium", now).total).toBe(analytics.tiers.premium);
    expect(summarizeAdminProviderTierMembers(rows, "trialing", now).total).toBe(analytics.tiers.trialing);
  });

  it("treats Trialing as a status subset while retaining effective tier membership", () => {
    const trialing = summarizeAdminProviderTierMembers(rows, "trialing", now);
    const business = summarizeAdminProviderTierMembers(rows, "premium", now);

    expect(trialing.members.map((member) => member.businessName)).toEqual(["Beta Business Trial"]);
    expect(business.members.map((member) => member.businessName)).toEqual(["Beta Business Trial"]);
    expect(trialing.members[0]).toMatchObject({
      configuredTier: "premium",
      effectiveTier: "premium",
      lifecycleState: "trialing",
      requiresBillingAction: false,
    });
  });

  it("explains downgraded lifecycle states and sorts providers by business name", () => {
    const starter = summarizeAdminProviderTierMembers(rows, "free", now);

    expect(starter.members.map((member) => member.businessName)).toEqual([
      "Delta Expired Trial",
      "Echo Cancelled",
      "Zulu Starter",
    ]);
    expect(starter.members[0]).toMatchObject({
      configuredTier: "basic",
      effectiveTier: "free",
      lifecycleState: "trial_expired",
      requiresBillingAction: true,
    });
  });

  it("rejects non-admin callers before querying tier membership", async () => {
    const caller = appRouter.createCaller(nonAdminContext());
    await expect(caller.admin.getSubscriptionTierMembers({ group: "free" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  });

  it("uses the same reportable-provider scope and a lazy left join for providers without subscription rows", () => {
    const source = readFileSync(resolve(__dirname, "db/payments.ts"), "utf8");
    expect(source).toContain("reportableProviderSubscriptionScope()");
    expect(source).toContain(".leftJoin(providerSubscriptions");
    expect(source).toContain("serviceProviders.isOfficial} = 0");
    expect(source).toContain("NOT IN ('test.com', 'example.invalid')");
    expect(source).toContain("LOWER(TRIM(${serviceProviders.businessName})) <> 'prattis test'");
  });

  it("keeps the drill-down read-only, lazy-loaded, keyboard accessible, and responsive", () => {
    const dashboard = readFileSync(resolve(__dirname, "../client/src/pages/AdminDashboard.tsx"), "utf8");
    const router = readFileSync(resolve(__dirname, "adminRouter.ts"), "utf8");

    expect(router).toContain("getSubscriptionTierMembers: adminProcedure");
    expect(dashboard).toContain("getSubscriptionTierMembers.useQuery");
    expect(dashboard).toContain("enabled: selectedTierGroup !== null");
    expect(dashboard).toContain('aria-haspopup="dialog"');
    expect(dashboard).toContain("Select a tier to see its providers.");
    expect(dashboard).toContain("max-h-[85vh]");
    expect(dashboard).toContain("overflow-y-auto");
    expect(dashboard).toContain("w-[calc(100%-2rem)]");
    expect(dashboard).not.toContain("updateSubscriptionTierMembers");
  });
});
