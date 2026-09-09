import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CRM_PROVIDER_FEATURES } from "../shared/crm";
import {
  PROVIDER_PLANS,
  providerHasFeature,
  resolveProviderEntitlement,
  type ProviderFeature,
} from "../shared/entitlements";

const NOW = new Date("2026-09-09T18:00:00.000Z");
const FUTURE = new Date("2026-09-23T18:00:00.000Z");
const PAST = new Date("2026-09-01T18:00:00.000Z");
const PHASE_11_FEATURES = [
  "customerHistory",
  "crmNotes",
  "crmFollowUps",
  "crmDrafts",
  "crmSegments",
  "crmRetentionAnalytics",
  "crmCustomAutomations",
] as const satisfies readonly ProviderFeature[];

const privateFeatures = PHASE_11_FEATURES.filter(feature => feature !== "customerHistory");

describe("Customers Phase 11 authoritative entitlements", () => {
  it("implements every owner-specified capability with the approved Starter, Pro, and Business assignments", () => {
    expect(CRM_PROVIDER_FEATURES).toEqual(expect.arrayContaining([...PHASE_11_FEATURES]));
    expect(new Set(CRM_PROVIDER_FEATURES).size).toBe(CRM_PROVIDER_FEATURES.length);

    expect(providerHasFeature("free", "customerHistory")).toBe(true);
    for (const feature of privateFeatures) expect(providerHasFeature("free", feature)).toBe(false);

    for (const feature of ["customerHistory", "crmNotes", "crmFollowUps", "crmDrafts", "crmRetentionAnalytics"] as const) {
      expect(providerHasFeature("basic", feature)).toBe(true);
    }
    expect(providerHasFeature("basic", "crmSegments")).toBe(false);
    expect(providerHasFeature("basic", "crmCustomAutomations")).toBe(false);

    for (const feature of PHASE_11_FEATURES) expect(providerHasFeature("premium", feature)).toBe(true);
  });

  it("retains paid Customers access only for lifecycle states with valid paid access", () => {
    const snapshots = [
      { label: "trialing", snapshot: { tier: "basic" as const, status: "trialing", trialEndsAt: FUTURE }, tier: "basic", state: "trialing" },
      { label: "active", snapshot: { tier: "premium" as const, status: "active" }, tier: "premium", state: "active" },
      { label: "scheduled cancellation", snapshot: { tier: "premium" as const, status: "active", cancelAtPeriodEnd: true, currentPeriodEnd: FUTURE }, tier: "premium", state: "cancelling" },
      { label: "past-due grace", snapshot: { tier: "basic" as const, status: "past_due", currentPeriodEnd: FUTURE }, tier: "basic", state: "past_due_grace" },
      { label: "legacy scheduled cancellation", snapshot: { tier: "basic" as const, status: "cancelled", cancelAtPeriodEnd: true, currentPeriodEnd: FUTURE }, tier: "basic", state: "cancelling" },
    ];
    for (const row of snapshots) {
      const entitlement = resolveProviderEntitlement(row.snapshot, NOW);
      expect(entitlement, row.label).toMatchObject({ effectiveTier: row.tier, state: row.state, hasPaidAccess: true });
      expect(providerHasFeature(entitlement.effectiveTier, "crmNotes"), row.label).toBe(true);
    }
  });

  it("falls back to Starter history and denies private Customers tools after paid access ends", () => {
    const snapshots = [
      { tier: "basic" as const, status: "trialing", trialEndsAt: PAST },
      { tier: "premium" as const, status: "past_due", currentPeriodEnd: PAST },
      { tier: "premium" as const, status: "cancelled", cancelAtPeriodEnd: true, currentPeriodEnd: PAST },
      { tier: "premium" as const, status: "cancelled" },
      { tier: "premium" as const, status: "paused" },
      { tier: "premium" as const, status: "incomplete" },
    ];
    for (const snapshot of snapshots) {
      const entitlement = resolveProviderEntitlement(snapshot, NOW);
      expect(entitlement.effectiveTier).toBe("free");
      expect(providerHasFeature(entitlement.effectiveTier, "customerHistory")).toBe(true);
      for (const feature of privateFeatures) expect(providerHasFeature(entitlement.effectiveTier, feature)).toBe(false);
    }
  });

  it("restores private capabilities from the authoritative lifecycle resolver without changing retained data", () => {
    const downgraded = resolveProviderEntitlement({ tier: "basic", status: "cancelled", currentPeriodEnd: PAST }, NOW);
    const restored = resolveProviderEntitlement({ tier: "basic", status: "active", currentPeriodEnd: FUTURE }, NOW);
    expect(providerHasFeature(downgraded.effectiveTier, "crmDrafts")).toBe(false);
    expect(providerHasFeature(restored.effectiveTier, "crmDrafts")).toBe(true);
    expect(providerHasFeature(restored.effectiveTier, "crmRetentionAnalytics")).toBe(true);
  });

  it("keeps approved provider prices and public plan feature copy unchanged", () => {
    expect(PROVIDER_PLANS.free).toMatchObject({ name: "Starter", monthlyPrice: 0, yearlyPrice: 0 });
    expect(PROVIDER_PLANS.basic).toMatchObject({ name: "Pro", monthlyPrice: 12, yearlyPrice: 120.96 });
    expect(PROVIDER_PLANS.premium).toMatchObject({ name: "Business", monthlyPrice: 20, yearlyPrice: 192 });
    for (const plan of Object.values(PROVIDER_PLANS)) {
      expect(plan.features.join(" ")).not.toMatch(/Customers|CRM|segments|automation|retention/i);
    }
  });
});

describe("Customers Phase 11 server-derived access contracts", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const entitlementSource = fs.readFileSync(path.join(root, "shared/entitlements.ts"), "utf8");
  const routerSource = fs.readFileSync(path.join(root, "server/customersRouter.ts"), "utf8");
  const accessSource = fs.readFileSync(path.join(root, "server/crm/access.ts"), "utf8");
  const listSource = fs.readFileSync(path.join(root, "client/src/pages/ProviderCustomers.tsx"), "utf8");
  const detailSource = fs.readFileSync(path.join(root, "client/src/pages/ProviderCustomerDetail.tsx"), "utf8");
  const healthSource = fs.readFileSync(path.join(root, "server/crm/health.ts"), "utf8");
  const panelSource = fs.readFileSync(path.join(root, "client/src/pages/admin/CustomersPilotHealthPanel.tsx"), "utf8");

  it("uses the exact canonical capability key and contains no legacy automation alias in application code", () => {
    expect(entitlementSource).toContain('"crmCustomAutomations"');
    expect(entitlementSource).not.toContain("crmAutomationControls");
    expect(routerSource).toContain('access.can("crmCustomAutomations")');
  });

  it("derives every Customers capability from the effective lifecycle tier on the server", () => {
    expect(accessSource).toContain("resolveProviderEntitlement(subscription)");
    expect(accessSource).toContain("providerHasFeature(entitlement.effectiveTier, feature)");
    for (const feature of PHASE_11_FEATURES) expect(routerSource).toContain(`access.can("${feature}")`);
    expect(routerSource).toContain("provider.isActive && access.isAudienceProvider && readUiEnabled");
    expect(routerSource).toContain("providerWritesEnabled");
    expect(routerSource).toContain("ctx.provider.id");
    expect(routerSource).not.toMatch(/\.input\(z\.object\(\{[^}]*providerId/s);
  });

  it("renders server-derived access reasons instead of inferring Customers access from plan names in the frontend", () => {
    for (const source of [listSource, detailSource]) {
      expect(source).toContain("access.data.readOnlyReason");
      expect(source).not.toMatch(/effectiveTier\s*===|Starter keeps|Pro or Business is required/);
    }
  });

  it("keeps deferred capabilities as entitlements only and completes aggregate Phase 10 oversight", () => {
    expect(routerSource).not.toMatch(/crmSegmentsEnabled|crmRetentionAnalyticsEnabled|crmCustomAutomationsEnabled/);
    expect(healthSource).toContain("failedAutomationRuns");
    expect(healthSource).toContain("completedTasks");
    expect(healthSource).toContain("dismissedTasks");
    expect(panelSource).toContain("Automation failures");
    expect(panelSource).toContain("completed");
    expect(panelSource).toContain("cancelled");
  });
});
