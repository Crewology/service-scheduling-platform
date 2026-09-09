import { getProviderById } from "../db/providers";
import { getCrmPilotProviderIds } from "../db/crm";
import { getCrmProviderAccess } from "./access";
import { runCrmProjectionBatch } from "./operations";

export type CrmBetaCandidateStatus = "ready" | "blocked" | "pending" | "already_in_pilot";
export type CrmBetaCandidateCheckStatus = "ready" | "blocked" | "pending";

export type CrmBetaCandidateReadinessInput = {
  providerExists: boolean;
  providerActive: boolean;
  officialDemoProvider: boolean;
  alreadyInPilot: boolean;
  currentPilotCount: number;
  maxPilotProviders: number;
  customerHistoryEnabled: boolean;
  privateToolsEnabled: boolean;
  dryRunCandidateCount: number;
  dryRunEligibleCount: number;
  dryRunFailedCount: number;
  dryRunHasMore: boolean;
  hasReachableTester: boolean;
};

export function assessCrmBetaCandidateReadiness(input: CrmBetaCandidateReadinessInput) {
  const checks = [
    {
      id: "provider_record",
      label: "Provider record",
      status: input.providerExists ? "ready" : "blocked",
      detail: input.providerExists ? "Provider exists" : "Provider was not found",
    },
    {
      id: "provider_availability",
      label: "Provider availability",
      status: input.providerActive && !input.officialDemoProvider ? "ready" : "blocked",
      detail: !input.providerActive
        ? "Provider must be active and not deleted"
        : input.officialDemoProvider
          ? "Official demo providers require a separate internal exception"
          : "Provider is active and available",
    },
    {
      id: "lifecycle_entitlements",
      label: "Lifecycle-aware Customers access",
      status: input.customerHistoryEnabled && input.privateToolsEnabled ? "ready" : "blocked",
      detail: input.customerHistoryEnabled && input.privateToolsEnabled
        ? "Customer history and every approved private tool are available"
        : "A current Pro or Business entitlement is required for the complete pilot",
    },
    {
      id: "relationship_evidence",
      label: "Legitimate relationship evidence",
      status: input.dryRunEligibleCount > 0 && input.dryRunFailedCount === 0 && !input.dryRunHasMore ? "ready" : "blocked",
      detail: input.dryRunHasMore
        ? "The bounded dry-run was incomplete"
        : `${input.dryRunEligibleCount} eligible of ${input.dryRunCandidateCount} candidate relationships · ${input.dryRunFailedCount} failures`,
    },
    {
      id: "reachable_tester",
      label: "Reachable customer-side tester",
      status: input.hasReachableTester ? "ready" : "pending",
      detail: input.hasReachableTester ? "Owner confirmed a reachable customer-side tester" : "Owner confirmation is still required",
    },
    {
      id: "cohort_capacity",
      label: "Controlled cohort capacity",
      status: input.alreadyInPilot || input.currentPilotCount < input.maxPilotProviders ? "ready" : "blocked",
      detail: input.alreadyInPilot
        ? "Provider is already in the current private pilot"
        : `${input.currentPilotCount} of ${input.maxPilotProviders} controlled beta places are currently occupied`,
    },
  ] as const;

  const hasBlockedCheck = checks.some(check => check.status === "blocked");
  const hasPendingCheck = checks.some(check => check.status === "pending");
  const status: CrmBetaCandidateStatus = hasBlockedCheck
    ? "blocked"
    : input.alreadyInPilot
      ? "already_in_pilot"
      : hasPendingCheck
        ? "pending"
        : "ready";

  return {
    status,
    recommendation: status === "blocked"
      ? "Resolve every blocked requirement before requesting owner approval"
      : status === "pending"
        ? "Confirm the remaining human evidence before requesting owner approval"
        : status === "already_in_pilot"
          ? "This provider is already enrolled; use Pilot providers and health checks for monitoring"
          : "Ready for a separate named owner approval; this assessment does not enroll the provider",
    checks,
  };
}

export async function getCrmBetaCandidateReadiness(input: {
  providerId: number;
  hasReachableTester: boolean;
  actorUserId: number;
}) {
  const [provider, pilotProviderIds] = await Promise.all([
    getProviderById(input.providerId),
    getCrmPilotProviderIds(),
  ]);
  const maxPilotProviders = 5;

  if (!provider) {
    const readiness = assessCrmBetaCandidateReadiness({
      providerExists: false,
      providerActive: false,
      officialDemoProvider: false,
      alreadyInPilot: false,
      currentPilotCount: pilotProviderIds.length,
      maxPilotProviders,
      customerHistoryEnabled: false,
      privateToolsEnabled: false,
      dryRunCandidateCount: 0,
      dryRunEligibleCount: 0,
      dryRunFailedCount: 0,
      dryRunHasMore: false,
      hasReachableTester: input.hasReachableTester,
    });
    return {
      checkedAt: new Date(),
      provider: null,
      ...readiness,
      dryRun: { candidateCount: 0, eligibleCount: 0, skippedCount: 0, failedCount: 0, exclusions: {}, hasMore: false },
      ownerApprovalRequired: true,
      enrollmentAvailable: false,
      privacyNotice: "Provider-operational counts only. Customer identities and private content are excluded.",
    };
  }

  const [access, dryRun] = await Promise.all([
    getCrmProviderAccess(provider.id),
    runCrmProjectionBatch("dry_run", {
      providerIds: [provider.id],
      providerLimit: 1,
      relationshipLimit: 250,
      includePrivatePilot: true,
      persistOperationalState: false,
    }, input.actorUserId),
  ]);
  const privateToolsEnabled = ["crmNotes", "crmFollowUps", "crmStageOverrides", "crmDrafts"].every(feature => access.can(feature as "crmNotes" | "crmFollowUps" | "crmStageOverrides" | "crmDrafts"));
  const alreadyInPilot = pilotProviderIds.includes(provider.id);
  const readiness = assessCrmBetaCandidateReadiness({
    providerExists: true,
    providerActive: Boolean(provider.isActive && !provider.deletedAt),
    officialDemoProvider: Boolean(provider.isOfficial),
    alreadyInPilot,
    currentPilotCount: pilotProviderIds.length,
    maxPilotProviders,
    customerHistoryEnabled: access.can("customerHistory"),
    privateToolsEnabled,
    dryRunCandidateCount: dryRun.candidateCount,
    dryRunEligibleCount: dryRun.eligibleCount,
    dryRunFailedCount: dryRun.failedCount,
    dryRunHasMore: dryRun.hasMore,
    hasReachableTester: input.hasReachableTester,
  });

  return {
    checkedAt: new Date(),
    provider: {
      providerId: provider.id,
      businessName: provider.businessName,
      active: Boolean(provider.isActive && !provider.deletedAt),
      alreadyInPilot,
      effectiveTier: access.entitlement.effectiveTier,
      entitlementState: access.entitlement.state,
      customerHistoryEnabled: access.can("customerHistory"),
      privateToolsEnabled,
    },
    ...readiness,
    dryRun: {
      candidateCount: dryRun.candidateCount,
      eligibleCount: dryRun.eligibleCount,
      skippedCount: dryRun.skippedCount,
      failedCount: dryRun.failedCount,
      exclusions: dryRun.exclusions,
      hasMore: dryRun.hasMore,
    },
    ownerApprovalRequired: true,
    enrollmentAvailable: false,
    privacyNotice: "Provider-operational counts only. Customer identities and private content are excluded.",
  };
}
