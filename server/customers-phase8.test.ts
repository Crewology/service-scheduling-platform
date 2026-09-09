import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { assessCrmPilotReadiness, getCrmPilotHealth } from "./crm/health";
import { crmOperationsRouter } from "./crmOperationsRouter";

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
};

describe("Customers Phase 8 pilot readiness", () => {
  it("reports a healthy private pilot as deferred until live customer validation is completed", () => {
    const result = assessCrmPilotReadiness(readyInput);
    expect(result.status).toBe("deferred");
    expect(result.recommendation).toContain("Keep the pilot private");
    expect(result.checks.find(check => check.id === "live_customer_validation")).toMatchObject({ status: "deferred" });
    expect(result.checks.find(check => check.id === "customer_permission")).toMatchObject({ status: "ready", detail: "0 of 2 relationships currently opted in" });
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

  it("requires a super-admin session for pilot health", async () => {
    await expect(crmOperationsRouter.createCaller(context("user", null)).getPilotHealth()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(crmOperationsRouter.createCaller(context("admin", null)).getPilotHealth()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns only aggregate current-pilot health with no private relationship content", async () => {
    const result = await getCrmPilotHealth();
    expect(result.status).toBe("deferred");
    expect(result.providers).toEqual([expect.objectContaining({ providerId: 1, businessName: "Chisolm Audio", isActive: true, customerHistoryEnabled: true, draftsEnabled: true, contacts: 2 })]);
    expect(result.totals).toMatchObject({ providers: 1, activeProviders: 1, contacts: 2 });
    expect(result.integrity).toMatchObject({ selfContacts: 0, nonPilotContacts: 0, scopeMismatches: 0, sentDraftIssues: 0 });
    expect(result.future).toMatchObject({ enabledAutomationRules: 0, automationRuns: 0, savedSegments: 0 });
    expect(result.flags).toMatchObject({ projectionWrites: true, readUi: true, providerWrites: true, draftSending: true, repairJobs: false, recommendations: false });
    const { privacyNotice: _privacyNotice, ...dataOnly } = result;
    expect(JSON.stringify(dataOnly)).not.toMatch(/legacy\.vk|freshradioshow|@gmail|messageText|customerEmail|customerName|noteBody|taskDescription/i);
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

  it("keeps the owner interface aggregate-only, transparent about deferred validation, and horizontally safe", () => {
    for (const text of ["Customers private pilot", "Live test deferred", "Deferred is not treated as passed", "Safe disable order", "data.privacyNotice"]) expect(panelSource).toContain(text);
    expect(panelSource).toContain('className="overflow-x-auto"');
    expect(panelSource).not.toMatch(/customerEmail|customerName|messageText|noteBody|taskDescription|addressLine|stripeAccount/);
  });
});
