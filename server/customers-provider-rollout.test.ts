import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getProviderSubscription: vi.fn(),
  getCrmAudienceMode: vi.fn(),
  getCrmPilotProviderIds: vi.fn(),
  isCrmRolloutEnabled: vi.fn(),
  getProviderAudienceIdentity: vi.fn(),
}));

vi.mock("./db/payments", async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getProviderSubscription: mocks.getProviderSubscription,
}));

vi.mock("./db/crm/operationalState", async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getCrmAudienceMode: mocks.getCrmAudienceMode,
  getCrmPilotProviderIds: mocks.getCrmPilotProviderIds,
  isCrmRolloutEnabled: mocks.isCrmRolloutEnabled,
}));

vi.mock("./db/providers", async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getProviderAudienceIdentity: mocks.getProviderAudienceIdentity,
}));

import { getCrmProviderAccess } from "./crm/access";
import { isReservedCrmIdentity } from "./crm/identity";

describe("Customers provider-wide lifecycle-entitled audience", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCrmPilotProviderIds.mockResolvedValue([1, 1350001]);
    mocks.getCrmAudienceMode.mockResolvedValue("pilot");
    mocks.getProviderSubscription.mockResolvedValue({ tier: "free", status: "active" });
    mocks.getProviderAudienceIdentity.mockResolvedValue({ providerId: 46, businessName: "Eligible Provider", isOfficial: false, isActive: true, providerDeletedAt: null, openId: "eligible-provider", email: "provider@example.com", loginMethod: "google", userDeletedAt: null });
  });

  it("preserves the exact named pilot as the default rollback audience", async () => {
    await expect(getCrmProviderAccess(1)).resolves.toMatchObject({ audienceMode: "pilot", isPilotProvider: true, isAudienceProvider: true });
    await expect(getCrmProviderAccess(46)).resolves.toMatchObject({ audienceMode: "pilot", isPilotProvider: false, isAudienceProvider: false });
  });

  it("admits lifecycle-entitled Starter providers for history without granting private tools", async () => {
    mocks.getCrmAudienceMode.mockResolvedValue("lifecycle_entitled");
    const access = await getCrmProviderAccess(46);
    expect(access).toMatchObject({ audienceMode: "lifecycle_entitled", isPilotProvider: false, isAudienceProvider: true });
    expect(access.can("customerHistory")).toBe(true);
    for (const feature of ["crmNotes", "crmFollowUps", "crmDrafts", "crmStageOverrides"] as const) {
      expect(access.can(feature)).toBe(false);
    }
  });

  it("derives private tools from paid lifecycle state rather than pilot membership", async () => {
    mocks.getCrmAudienceMode.mockResolvedValue("lifecycle_entitled");
    mocks.getProviderSubscription.mockResolvedValue({ tier: "basic", status: "trialing", trialEndsAt: new Date(Date.now() + 86_400_000) });
    const access = await getCrmProviderAccess(46);
    expect(access).toMatchObject({ isPilotProvider: false, isAudienceProvider: true });
    for (const feature of ["customerHistory", "crmNotes", "crmFollowUps", "crmDrafts", "crmStageOverrides"] as const) {
      expect(access.can(feature)).toBe(true);
    }
  });

  it("excludes the known Prattis Test provider without broadly rejecting legitimate providers", () => {
    expect(isReservedCrmIdentity({
      providerId: 1_680_002,
      businessName: "Prattis Test",
      openId: "client-care-provider",
      email: "client.care@visionkwest.com",
      loginMethod: "google",
    })).toBe(true);
    expect(isReservedCrmIdentity({
      providerId: 1_680_003,
      businessName: "Test Prep Tutoring",
      openId: "legitimate-provider",
      email: "owner@tutoring.example",
      loginMethod: "google",
    })).toBe(false);
  });
});

describe("Customers provider-wide rollout source contracts", () => {
  const root = path.resolve(import.meta.dirname, "..");
  const shared = fs.readFileSync(path.join(root, "shared/crm.ts"), "utf8");
  const access = fs.readFileSync(path.join(root, "server/crm/access.ts"), "utf8");
  const projection = fs.readFileSync(path.join(root, "server/crm/projection.ts"), "utf8");
  const operations = fs.readFileSync(path.join(root, "server/crm/operations.ts"), "utf8");
  const operationsRouter = fs.readFileSync(path.join(root, "server/crmOperationsRouter.ts"), "utf8");
  const customersRouter = fs.readFileSync(path.join(root, "server/customersRouter.ts"), "utf8");

  it("defines a private reversible audience mode that defaults to pilot", () => {
    expect(shared).toContain('CRM_AUDIENCE_MODES = ["pilot", "lifecycle_entitled"]');
    expect(shared).toContain('"customersAudienceMode"');
    expect(access).toContain('audienceMode === "lifecycle_entitled"');
    expect(customersRouter).toContain("access.isAudienceProvider");
  });

  it("gates live projection with lifecycle-entitled audience access and preserves source exclusions", () => {
    expect(projection).toContain("getCrmProviderAccess(providerId)");
    expect(projection).toContain('access.can("customerHistory")');
    expect(projection).toContain('reason: "provider_not_in_audience"');
    expect(projection).toContain("isProviderSelf");
    expect(projection).toContain("reserved_test_identity");
    expect(projection).toContain("official_demo_excluded");
  });

  it("keeps rollout changes owner-only, audited, bounded, and reversible", () => {
    expect(operations).toContain("audienceMode?: CrmAudienceMode");
    expect(operations).toContain("setCrmAudienceMode");
    expect(operationsRouter).toContain("audienceMode: z.enum(CRM_AUDIENCE_MODES).optional()");
    expect(operationsRouter).toContain('action: "update_customers_rollout"');
    expect(operationsRouter).toContain("providerIdsSchema.min(1)");
    expect(operationsRouter).toContain(".max(25)");
    expect(operationsRouter).toContain('z.literal("RUN_CUSTOMERS_BACKFILL")');
    expect(operationsRouter).not.toMatch(/publicProcedure|enrollProvider|enableForAll/);
  });
});
