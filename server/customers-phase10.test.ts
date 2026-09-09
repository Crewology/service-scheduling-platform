import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { assessCrmBetaCandidateReadiness } from "./crm/betaReadiness";
import { crmOperationsRouter } from "./crmOperationsRouter";

const root = path.resolve(process.cwd());
const panelSource = fs.readFileSync(path.join(root, "client/src/pages/admin/CustomersPilotHealthPanel.tsx"), "utf8");
const routerSource = fs.readFileSync(path.join(root, "server/crmOperationsRouter.ts"), "utf8");
const readinessSource = fs.readFileSync(path.join(root, "server/crm/betaReadiness.ts"), "utf8");

function context(role: "admin" | "user", adminRole: "super_admin" | null): TrpcContext {
  return {
    user: {
      id: 990010,
      openId: "test-customers-phase10-owner",
      email: "garychisolm30@gmail.com",
      name: "Phase 10 Owner",
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

const readyCandidate = {
  providerExists: true,
  providerActive: true,
  officialDemoProvider: false,
  alreadyInPilot: false,
  currentPilotCount: 2,
  maxPilotProviders: 5,
  customerHistoryEnabled: true,
  privateToolsEnabled: true,
  dryRunCandidateCount: 2,
  dryRunEligibleCount: 2,
  dryRunFailedCount: 0,
  dryRunHasMore: false,
  hasReachableTester: true,
};

describe("Customers Phase 10 controlled beta readiness", () => {
  it("distinguishes ready, pending, blocked, and already-in-pilot evidence without implying enrollment", () => {
    const ready = assessCrmBetaCandidateReadiness(readyCandidate);
    expect(ready.status).toBe("ready");
    expect(ready.recommendation).toContain("separate named owner approval");

    expect(assessCrmBetaCandidateReadiness({ ...readyCandidate, hasReachableTester: false }).status).toBe("pending");
    expect(assessCrmBetaCandidateReadiness({ ...readyCandidate, privateToolsEnabled: false }).status).toBe("ready");
    expect(assessCrmBetaCandidateReadiness({ ...readyCandidate, dryRunEligibleCount: 0 }).status).toBe("pending");
    expect(assessCrmBetaCandidateReadiness({ ...readyCandidate, currentPilotCount: 5 }).status).toBe("blocked");
    expect(assessCrmBetaCandidateReadiness({ ...readyCandidate, alreadyInPilot: true }).status).toBe("already_in_pilot");
  });

  it("requires a super-admin session for candidate assessment", async () => {
    await expect(crmOperationsRouter.createCaller(context("user", null)).assessBetaCandidate({ providerId: 1, hasReachableTester: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(crmOperationsRouter.createCaller(context("admin", null)).assessBetaCandidate({ providerId: 1, hasReachableTester: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("assesses an existing pilot provider without changing private rollout state or exposing customer content", async () => {
    const caller = crmOperationsRouter.createCaller(context("admin", "super_admin"));
    const before = await caller.getStatus();
    const result = await caller.assessBetaCandidate({ providerId: 1, hasReachableTester: true });
    const after = await caller.getStatus();

    expect(result.status).toBe("already_in_pilot");
    expect(result.provider).toMatchObject({ providerId: 1, businessName: "Chisolm Audio", active: true, alreadyInPilot: true, customerHistoryEnabled: true, privateToolsEnabled: true });
    expect(result.dryRun.eligibleCount).toBeGreaterThan(0);
    expect(result.ownerApprovalRequired).toBe(true);
    expect(result.enrollmentAvailable).toBe(false);
    expect(result.privacyNotice).toContain("Customer identities and private content are excluded");
    expect(JSON.stringify(result)).not.toMatch(/@|noteBody|messageBody|taskDescription|customerName|customerEmail|address|payment/);
    expect(after.pilotProviderIds).toEqual(before.pilotProviderIds);
    expect(after.flags).toEqual(before.flags);
    expect(after.lastRunId).toBe(before.lastRunId);
  });

  it("renders a non-writing owner review with explicit evidence states and no enrollment action", () => {
    for (const text of [
      "Provider access review",
      "Run a non-writing assessment",
      "Reachable customer-side tester confirmed",
      "Ready",
      "Pending evidence",
      "Blocked",
      "no provider access or rollout state changed",
    ]) expect(panelSource).toContain(text);
    expect(panelSource).toContain("trpc.crmOperations.assessBetaCandidate.useQuery");
    expect(panelSource).not.toMatch(/crmOperations\.configure|runBackfill|Enroll provider|Add to pilot/);
  });

  it("keeps candidate assessment owner-only, non-persistent, and separate from audited enrollment", () => {
    expect(routerSource).toContain("assessBetaCandidate: ownerProcedure");
    expect(readinessSource).toContain('runCrmProjectionBatch("dry_run"');
    expect(readinessSource).toContain("persistOperationalState: false");
    expect(readinessSource).toContain("ownerApprovalRequired: true");
    expect(readinessSource).toContain("enrollmentAvailable: false");
    expect(readinessSource).not.toMatch(/setCrmPilotProviderIds|setCrmPhase2PrivateConfig|createAuditEntry|projectCrmRelationshipSafely/);
  });
});
