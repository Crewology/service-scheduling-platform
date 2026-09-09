import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { assessCrmPilotReadiness, getCrmPilotHealth } from "./crm/health";
import { crmOperationsRouter } from "./crmOperationsRouter";
import { customersRouter } from "./customersRouter";

function context(role: "admin" | "user", adminRole: "super_admin" | null): TrpcContext {
  return {
    user: {
      id: 990001,
      openId: "test-customers-phase8-owner",
      email: "test-customers-phase8-owner@example.invalid",
      name: "Phase 8 Owner",
      role,
      adminRole,
      emailVerified: true,
      loginMethod: "test",
      authProvider: "email",
      hasSelectedRole: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      firstName: "Phase",
      lastName: "Owner",
      phone: null,
      billingAddressLine1: null,
      billingAddressLine2: null,
      billingCity: null,
      billingState: null,
      billingPostalCode: null,
      profilePhotoUrl: null,
      googleId: null,
      deletedAt: null,
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function providerContext(userId: number, name: string): TrpcContext {
  const base = context("user", null);
  return {
    ...base,
    user: {
      ...base.user,
      id: userId,
      openId: `customers-pilot-provider-${userId}`,
      email: `customers-pilot-provider-${userId}@example.invalid`,
      name,
      firstName: name,
      lastName: "Pilot",
    },
  };
}

const readyInput = {
  pilotProviderCount: 1,
  missingPilotProviderCount: 0,
  inactivePilotProviderCount: 0,
  ineligiblePilotProviderCount: 0,
  projectionWrites: true,
  readUi: true,
  providerWrites: true,
  draftSending: true,
  repairJobs: false,
  recommendations: false,
  enabledAutomationRuleCount: 0,
  automationRunCount: 0,
  savedSegmentCount: 0,
  selfContactCount: 0,
  nonPilotContactCount: 0,
  scopeMismatchCount: 0,
  contactsMissingProjectionCount: 0,
  projectionLaggingContactCount: 0,
  reconciliationMissingContactCount: 0,
  reconciliationStaleContactCount: 0,
  sentDraftIntegrityIssueCount: 0,
  optedInContactCount: 0,
  contactCount: 2,
  liveValidatedContactCount: 0,
};

describe("Customers Phase 8 pilot readiness", () => {
  it("reports a healthy private pilot as deferred until live customer validation is completed", () => {
    const result = assessCrmPilotReadiness(readyInput);
    expect(result.status).toBe("deferred");
    expect(result.recommendation).toContain("Keep the pilot private");
    expect(result.checks.find(check => check.id === "live_customer_validation")).toMatchObject({ status: "deferred" });
    expect(result.checks.find(check => check.id === "customer_permission")).toMatchObject({ status: "ready", detail: "0 of 2 relationships currently opted in" });
  });

  it("reports ready only after an opted-in relationship completes a valid linked draft send", () => {
    const result = assessCrmPilotReadiness({ ...readyInput, optedInContactCount: 1, liveValidatedContactCount: 1 });
    expect(result.status).toBe("ready");
    expect(result.recommendation).toContain("Eligible for an owner rollout review");
    expect(result.checks.find(check => check.id === "live_customer_validation")).toMatchObject({
      status: "ready",
      detail: "1 opted-in relationship has a valid linked in-app draft send",
    });
  });

  it("keeps a two-provider pilot ready when both providers are available and all aggregate safeguards pass", () => {
    const result = assessCrmPilotReadiness({
      ...readyInput,
      pilotProviderCount: 2,
      optedInContactCount: 1,
      contactCount: 4,
      liveValidatedContactCount: 1,
    });
    expect(result.status).toBe("ready");
    expect(result.checks.find(check => check.id === "pilot_allowlist")).toMatchObject({ status: "ready", detail: "2 providers allowlisted" });
    expect(result.checks.find(check => check.id === "customer_permission")).toMatchObject({ status: "ready", detail: "1 of 4 relationships currently opted in" });
  });

  it("blocks rollout readiness for tenant, projection, sent-link, or future-capability violations", () => {
    const result = assessCrmPilotReadiness({
      ...readyInput,
      scopeMismatchCount: 1,
      reconciliationStaleContactCount: 2,
      sentDraftIntegrityIssueCount: 1,
      enabledAutomationRuleCount: 1,
    });
    expect(result.status).toBe("blocked");
    expect(result.checks.filter(check => check.status === "blocked").map(check => check.id)).toEqual(expect.arrayContaining([
      "future_capabilities",
      "tenant_integrity",
      "projection_health",
      "sent_message_integrity",
    ]));
  });

  it("blocks owner readiness when an allowlisted provider loses required lifecycle access and returns ready after restoration", () => {
    const downgraded = assessCrmPilotReadiness({
      ...readyInput,
      pilotProviderCount: 2,
      ineligiblePilotProviderCount: 1,
      optedInContactCount: 1,
      liveValidatedContactCount: 1,
    });
    expect(downgraded.status).toBe("blocked");
    expect(downgraded.checks.find(check => check.id === "provider_availability")).toMatchObject({
      status: "blocked",
      detail: "0 missing · 0 inactive · 1 without required Customers entitlement",
    });

    const restored = assessCrmPilotReadiness({
      ...readyInput,
      pilotProviderCount: 2,
      ineligiblePilotProviderCount: 0,
      optedInContactCount: 1,
      liveValidatedContactCount: 1,
    });
    expect(restored.status).toBe("ready");
    expect(restored.checks.find(check => check.id === "provider_availability")).toMatchObject({ status: "ready" });
  });

  it("requires a super-admin session for pilot health", async () => {
    await expect(crmOperationsRouter.createCaller(context("user", null)).getPilotHealth()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(crmOperationsRouter.createCaller(context("admin", null)).getPilotHealth()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns only aggregate current-pilot health with no private relationship content", async () => {
    const result = await getCrmPilotHealth();
    expect(result.status).toBe("ready");
    expect(result.providers).toEqual(expect.arrayContaining([
      expect.objectContaining({ providerId: 1, businessName: "Chisolm Audio", isActive: true, customerHistoryEnabled: true, draftsEnabled: true, contacts: 3, optedInContacts: 1, sentDrafts: 1, liveValidatedContacts: 1 }),
      expect.objectContaining({ providerId: 1_350_001, businessName: "Gary Studios", isActive: true, effectiveTier: "basic", entitlementState: "trialing", customerHistoryEnabled: true, notesEnabled: true, followUpsEnabled: true, draftsEnabled: true, stageOverridesEnabled: true, contacts: 1, optedInContacts: 0, sentDrafts: 0, liveValidatedContacts: 0 }),
    ]));
    expect(result.totals.providers).toBe(result.providers.length);
    expect(result.totals.activeProviders).toBe(result.providers.filter(provider => provider.isActive).length);
    expect(result.totals.contacts).toBe(result.providers.reduce((sum, provider) => sum + provider.contacts, 0));
    expect(result.totals.optedInContacts).toBe(result.providers.reduce((sum, provider) => sum + provider.optedInContacts, 0));
    expect(result.totals.sentDrafts).toBe(result.providers.reduce((sum, provider) => sum + provider.sentDrafts, 0));
    expect(result.totals.liveValidatedContacts).toBe(result.providers.reduce((sum, provider) => sum + provider.liveValidatedContacts, 0));
    expect(result.totals).toMatchObject({ providers: 2, activeProviders: 2, contacts: 4, optedInContacts: 1, sentDrafts: 1, liveValidatedContacts: 1 });
    expect(result.integrity).toMatchObject({ selfContacts: 0, nonPilotContacts: 0, scopeMismatches: 0, sentDraftIssues: 0 });
    expect(result.future).toMatchObject({ enabledAutomationRules: 0, automationRuns: 0, savedSegments: 0 });
    expect(result.flags).toMatchObject({ projectionWrites: true, readUi: true, providerWrites: true, draftSending: true, repairJobs: false, recommendations: false });
    const { privacyNotice: _privacyNotice, ...dataOnly } = result;
    expect(JSON.stringify(dataOnly)).not.toMatch(/legacy\.vk|freshradioshow|@gmail|messageText|customerEmail|customerName|noteBody|taskDescription/i);
  }, 60_000);

  it("grants each named provider only its own Customers workspace and rejects constructed cross-provider contact IDs", async () => {
    const chisolm = customersRouter.createCaller(providerContext(1, "Chisolm Audio"));
    const garyStudios = customersRouter.createCaller(providerContext(135_990_339, "Gary Studios"));

    await expect(chisolm.getAccess()).resolves.toMatchObject({ visible: true, businessName: "Chisolm Audio", notesEnabled: true, followUpsEnabled: true, draftsEnabled: true, stageOverridesEnabled: true });
    await expect(garyStudios.getAccess()).resolves.toMatchObject({ visible: true, businessName: "Gary Studios", effectiveTier: "basic", notesEnabled: true, followUpsEnabled: true, draftsEnabled: true, stageOverridesEnabled: true });

    await expect(garyStudios.getContact({ contactId: 1_380_030 })).resolves.toMatchObject({ contact: { id: 1_380_030, customerId: 1 } });
    await expect(garyStudios.getContact({ contactId: 1_320_002 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(chisolm.getContact({ contactId: 1_380_030 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  }, 60_000);
});

describe("Customers Phase 8 privacy source contracts", () => {
  const root = path.resolve(process.cwd());
  const healthSource = fs.readFileSync(path.join(root, "server/crm/health.ts"), "utf8");
  const routerSource = fs.readFileSync(path.join(root, "server/crmOperationsRouter.ts"), "utf8");
  const adminSource = fs.readFileSync(path.join(root, "client/src/pages/AdminDashboard.tsx"), "utf8");
  const panelSource = fs.readFileSync(path.join(root, "client/src/pages/admin/CustomersPilotHealthPanel.tsx"), "utf8");

  it("exposes pilot health only through the existing owner procedure", () => {
    expect(routerSource).toContain("getPilotHealth: ownerProcedure.query");
    expect(routerSource).toContain('ctx.user.adminRole !== "super_admin"');
  });

  it("never selects private bodies, addresses, payment data, or customer identity", () => {
    expect(healthSource).not.toMatch(/crmContactNotes\.body|crmTasks\.description|crmMessageDrafts\.body|messages\.messageText|addressLine|postalCode|stripe|customerEmail|customerName/);
    expect(healthSource).toContain("Aggregate operational metadata only");
  });

  it("does not mutate rollout state or trigger jobs from the health path", () => {
    expect(healthSource).not.toMatch(/insert\(|update\(|delete\(|setCrmRolloutFlag|runCrmProjectionBatch|rebuildCrmProviderProjection|heartbeat|schedule/i);
  });

  it("renders the monitoring workspace only for super admins and exposes no rollout mutation", () => {
    expect(adminSource).toContain('user?.adminRole === "super_admin" ? <TabsTrigger value="customers-pilot"');
    expect(adminSource).toContain('user?.adminRole === "super_admin" ? <TabsContent value="customers-pilot"');
    expect(panelSource).toContain("trpc.crmOperations.getPilotHealth.useQuery");
    expect(panelSource).not.toMatch(/crmOperations\.configure|\.useMutation\(|setCrmRolloutFlag/);
  });

  it("keeps the owner interface aggregate-only, transparent about live and deferred validation, and horizontally safe", () => {
    for (const text of ["Customers private pilot", "Live test verified", "Live test deferred", "Deferred is not treated as passed", "Safe disable order", "data.privacyNotice"]) expect(panelSource).toContain(text);
    expect(panelSource).toContain('className="overflow-x-auto"');
    expect(panelSource).not.toMatch(/customerEmail|customerName|messageText|noteBody|taskDescription|addressLine|stripeAccount/);
  });
});
