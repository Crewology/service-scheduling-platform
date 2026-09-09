import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import {
  auditLog,
  crmActivityEvents,
  crmAutomationRules,
  crmAutomationRuns,
  crmContactNotes,
  crmContactPreferences,
  crmContacts,
  crmMessageDrafts,
  crmSavedSegments,
  crmTasks,
  messages,
  notificationPreferences,
  serviceProviders,
} from "../../drizzle/schema";
import { requireDb } from "../db/connection";
import { getCrmProviderAccess, listCrmAudienceProviderIds } from "./access";
import { getCrmPhase2PrivateStatus, reconcileCrmProjection } from "./operations";

export type CrmPilotHealthCheckStatus = "ready" | "blocked" | "deferred" | "disabled";

export type CrmPilotHealthCheck = {
  id: string;
  label: string;
  status: CrmPilotHealthCheckStatus;
  detail: string;
};

type ReadinessInput = {
  audienceMode?: "pilot" | "lifecycle_entitled";
  pilotProviderCount: number;
  missingPilotProviderCount: number;
  inactivePilotProviderCount: number;
  ineligiblePilotProviderCount: number;
  projectionWrites: boolean;
  readUi: boolean;
  providerWrites: boolean;
  draftSending: boolean;
  repairJobs: boolean;
  recommendations: boolean;
  enabledAutomationRuleCount: number;
  automationRunCount: number;
  savedSegmentCount: number;
  selfContactCount: number;
  nonPilotContactCount: number;
  scopeMismatchCount: number;
  contactsMissingProjectionCount: number;
  projectionLaggingContactCount: number;
  reconciliationMissingContactCount: number;
  reconciliationStaleContactCount: number;
  sentDraftIntegrityIssueCount: number;
  optedInContactCount: number;
  contactCount: number;
  liveValidatedContactCount: number;
};

export function assessCrmPilotReadiness(input: ReadinessInput) {
  const providerAudienceLabel = input.audienceMode === "lifecycle_entitled" ? "Lifecycle-entitled provider audience" : "Private pilot allowlist";
  const providerScopeLabel = input.audienceMode === "lifecycle_entitled" ? "out-of-audience contacts" : "non-pilot contacts";
  const checks: CrmPilotHealthCheck[] = [
    {
      id: "pilot_allowlist",
      label: providerAudienceLabel,
      status: input.pilotProviderCount > 0 ? "ready" : "disabled",
      detail: input.pilotProviderCount > 0 ? `${input.pilotProviderCount} provider${input.pilotProviderCount === 1 ? "" : "s"} allowlisted` : "No providers are allowlisted",
    },
    {
      id: "provider_availability",
      label: "Provider availability and Customers access",
      status: input.missingPilotProviderCount > 0 || input.inactivePilotProviderCount > 0 || input.ineligiblePilotProviderCount > 0 ? "blocked" : "ready",
      detail: input.missingPilotProviderCount > 0 || input.inactivePilotProviderCount > 0 || input.ineligiblePilotProviderCount > 0
        ? `${input.missingPilotProviderCount} missing · ${input.inactivePilotProviderCount} inactive · ${input.ineligiblePilotProviderCount} without required Customers entitlement`
        : "Every provider in the active audience exists, is active, and retains customer-history access",
    },
    {
      id: "private_capabilities",
      label: "Customers rollout capabilities",
      status: input.projectionWrites && input.readUi && input.providerWrites && input.draftSending ? "ready" : "disabled",
      detail: `Projection ${input.projectionWrites ? "on" : "off"} · Read UI ${input.readUi ? "on" : "off"} · Provider writes ${input.providerWrites ? "on" : "off"} · Confirmed sending ${input.draftSending ? "on" : "off"}`,
    },
    {
      id: "future_capabilities",
      label: "Future capabilities locked",
      status: !input.repairJobs && !input.recommendations && input.enabledAutomationRuleCount === 0 && input.automationRunCount === 0 && input.savedSegmentCount === 0 ? "ready" : "blocked",
      detail: `Repair ${input.repairJobs ? "on" : "off"} · Recommendations ${input.recommendations ? "on" : "off"} · Enabled rules ${input.enabledAutomationRuleCount} · Runs ${input.automationRunCount} · Segments ${input.savedSegmentCount}`,
    },
    {
      id: "tenant_integrity",
      label: "Tenant and relationship integrity",
      status: input.selfContactCount === 0 && input.nonPilotContactCount === 0 && input.scopeMismatchCount === 0 ? "ready" : "blocked",
      detail: `${input.selfContactCount} self-contacts · ${input.nonPilotContactCount} ${providerScopeLabel} · ${input.scopeMismatchCount} scoped-child mismatches`,
    },
    {
      id: "projection_health",
      label: "Projection freshness",
      status: input.contactsMissingProjectionCount === 0 && input.projectionLaggingContactCount === 0 && input.reconciliationMissingContactCount === 0 && input.reconciliationStaleContactCount === 0 ? "ready" : "blocked",
      detail: `${input.contactsMissingProjectionCount} never projected · ${input.projectionLaggingContactCount} behind interaction · ${input.reconciliationMissingContactCount} missing · ${input.reconciliationStaleContactCount} stale`,
    },
    {
      id: "sent_message_integrity",
      label: "Sent-message linkage",
      status: input.sentDraftIntegrityIssueCount === 0 ? "ready" : "blocked",
      detail: input.sentDraftIntegrityIssueCount === 0 ? "Every sent draft has complete message linkage" : `${input.sentDraftIntegrityIssueCount} sent-draft integrity issue${input.sentDraftIntegrityIssueCount === 1 ? "" : "s"}`,
    },
    {
      id: "customer_permission",
      label: "Customer permission coverage",
      status: "ready",
      detail: `${input.optedInContactCount} of ${input.contactCount} relationships currently opted in`,
    },
    {
      id: "live_customer_validation",
      label: "Live customer opt-in and send validation",
      status: input.liveValidatedContactCount > 0 ? "ready" : "deferred",
      detail: input.liveValidatedContactCount > 0
        ? `${input.liveValidatedContactCount} opted-in relationship${input.liveValidatedContactCount === 1 ? " has" : "s have"} a valid linked in-app draft send`
        : "Deferred until a qualified customer completes the opt-in and one-message exercise; automated consent and exactly-once tests passed",
    },
  ];

  const status: CrmPilotHealthCheckStatus = checks.some(check => check.status === "blocked")
    ? "blocked"
    : checks.some(check => check.status === "disabled")
      ? "disabled"
      : checks.some(check => check.status === "deferred")
        ? "deferred"
        : "ready";

  return {
    status,
    recommendation: status === "blocked" ? "Resolve blocked checks before further Customers use" : status === "disabled" ? "Keep the affected capability disabled until intentionally re-enabled" : status === "deferred" ? "Keep confirmed sending limited until live customer validation is completed" : "Provider audience is healthy; no access change occurs automatically",
    checks,
  };
}

function numberValue(value: unknown) {
  return Number(value ?? 0);
}

export async function getCrmPilotHealth() {
  const database = await requireDb();
  const privateStatus = await getCrmPhase2PrivateStatus();
  const pilotProviderIds = await listCrmAudienceProviderIds();
  const rollbackPilotProviderIds = privateStatus.pilotProviderIds;
  const checkedAt = new Date();

  if (pilotProviderIds.length === 0) {
    const readiness = assessCrmPilotReadiness({
      audienceMode: privateStatus.audienceMode,
      pilotProviderCount: 0,
      missingPilotProviderCount: 0,
      inactivePilotProviderCount: 0,
      ineligiblePilotProviderCount: 0,
      projectionWrites: Boolean(privateStatus.flags.projectionWrites),
      readUi: Boolean(privateStatus.flags.readUi),
      providerWrites: Boolean(privateStatus.flags.providerWrites),
      draftSending: Boolean(privateStatus.flags.draftSending),
      repairJobs: Boolean(privateStatus.flags.repairJobs),
      recommendations: Boolean(privateStatus.flags.recommendations),
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
      contactCount: 0,
      liveValidatedContactCount: 0,
    });
    return {
      checkedAt,
      ...readiness,
      audienceMode: privateStatus.audienceMode,
      rollbackPilotProviderCount: rollbackPilotProviderIds.length,
      flags: privateStatus.flags,
      totals: { providers: 0, activeProviders: 0, contacts: 0, optedInContacts: 0, activeNotes: 0, openTasks: 0, completedTasks: 0, dismissedTasks: 0, activeDrafts: 0, sentDrafts: 0, discardedDrafts: 0, activityEvents: 0, liveValidatedContacts: 0 },
      integrity: { selfContacts: 0, nonPilotContacts: 0, scopeMismatches: 0, contactsMissingProjection: 0, projectionLaggingContacts: 0, sentDraftIssues: 0 },
      reconciliation: { providerCount: 0, expectedEligible: 0, actualContacts: 0, missingContacts: 0, extraContacts: 0, staleContacts: 0, storedEvents: 0, exclusions: {}, checkedAt },
      future: { enabledAutomationRules: 0, automationRuns: 0, failedAutomationRuns: 0, savedSegments: 0 },
      providers: [],
      latestRolloutAuditAt: null,
      privacyNotice: "Aggregate operational metadata only. Message bodies, note bodies, task descriptions, addresses, payment data, and unrestricted customer records are excluded.",
      disableOrder: ["Turn off confirmed draft sending", "Turn off provider writes", "Hide the provider read UI", "Stop projection writes"],
    };
  }

  const pilotPredicate = inArray(serviceProviders.id, pilotProviderIds);
  const contactPredicate = inArray(crmContacts.providerId, pilotProviderIds);
  const [
    providerRows,
    contactRows,
    taskRows,
    noteRows,
    draftRows,
    eventRows,
    automationRuleRows,
    automationRunRows,
    savedSegmentRows,
    nonPilotRows,
    taskMismatchRows,
    noteMismatchRows,
    draftMismatchRows,
    eventMismatchRows,
    latestAuditRows,
    reconciliation,
  ] = await Promise.all([
    database.select({ id: serviceProviders.id, businessName: serviceProviders.businessName, isActive: serviceProviders.isActive }).from(serviceProviders).where(pilotPredicate),
    database.select({
      providerId: crmContacts.providerId,
      contacts: sql<number>`count(*)`,
      optedInContacts: sql<number>`sum(case when ${notificationPreferences.relationshipMessageEnabled} = true then 1 else 0 end)`,
      archivedContacts: sql<number>`sum(case when ${crmContacts.archivedAt} is not null or ${crmContacts.manualStage} = 'archived' then 1 else 0 end)`,
      selfContacts: sql<number>`sum(case when ${crmContacts.customerId} = ${serviceProviders.userId} then 1 else 0 end)`,
      contactsMissingProjection: sql<number>`sum(case when ${crmContacts.lastProjectedAt} is null then 1 else 0 end)`,
      projectionLaggingContacts: sql<number>`sum(case when ${crmContacts.lastProjectedAt} < ${crmContacts.lastInteractionAt} then 1 else 0 end)`,
      latestProjectedAt: sql<Date | null>`max(${crmContacts.lastProjectedAt})`,
    }).from(crmContacts)
      .innerJoin(serviceProviders, eq(serviceProviders.id, crmContacts.providerId))
      .leftJoin(notificationPreferences, eq(notificationPreferences.userId, crmContacts.customerId))
      .where(contactPredicate)
      .groupBy(crmContacts.providerId),
    database.select({
      providerId: crmTasks.providerId,
      openTasks: sql<number>`sum(case when ${crmTasks.state} in ('open', 'snoozed') then 1 else 0 end)`,
      completedTasks: sql<number>`sum(case when ${crmTasks.state} = 'completed' then 1 else 0 end)`,
      dismissedTasks: sql<number>`sum(case when ${crmTasks.state} = 'dismissed' then 1 else 0 end)`,
    }).from(crmTasks).where(inArray(crmTasks.providerId, pilotProviderIds)).groupBy(crmTasks.providerId),
    database.select({ providerId: crmContactNotes.providerId, activeNotes: sql<number>`sum(case when ${crmContactNotes.deletedAt} is null then 1 else 0 end)` }).from(crmContactNotes).where(inArray(crmContactNotes.providerId, pilotProviderIds)).groupBy(crmContactNotes.providerId),
    database.select({
      providerId: crmMessageDrafts.providerId,
      activeDrafts: sql<number>`sum(case when ${crmMessageDrafts.state} = 'draft' then 1 else 0 end)`,
      sentDrafts: sql<number>`sum(case when ${crmMessageDrafts.state} = 'sent' then 1 else 0 end)`,
      discardedDrafts: sql<number>`sum(case when ${crmMessageDrafts.state} = 'discarded' then 1 else 0 end)`,
      sentDraftIssues: sql<number>`sum(case when ${crmMessageDrafts.state} = 'sent' and (${crmMessageDrafts.sentMessageId} is null or ${messages.id} is null or ${crmMessageDrafts.approvedByUserId} is null or ${crmMessageDrafts.approvedAt} is null or ${crmMessageDrafts.sentAt} is null) then 1 when ${crmMessageDrafts.state} <> 'sent' and ${crmMessageDrafts.sentMessageId} is not null then 1 else 0 end)`,
      liveValidatedContacts: sql<number>`count(distinct case when ${crmMessageDrafts.state} = 'sent' and ${crmMessageDrafts.sentMessageId} is not null and ${messages.id} is not null and ${notificationPreferences.relationshipMessageEnabled} = true then ${crmMessageDrafts.contactId} end)`,
    }).from(crmMessageDrafts)
      .leftJoin(messages, eq(messages.id, crmMessageDrafts.sentMessageId))
      .leftJoin(notificationPreferences, eq(notificationPreferences.userId, crmMessageDrafts.customerId))
      .where(inArray(crmMessageDrafts.providerId, pilotProviderIds))
      .groupBy(crmMessageDrafts.providerId),
    database.select({ providerId: crmActivityEvents.providerId, activityEvents: sql<number>`count(*)`, latestActivityAt: sql<Date | null>`max(${crmActivityEvents.occurredAt})` }).from(crmActivityEvents).where(inArray(crmActivityEvents.providerId, pilotProviderIds)).groupBy(crmActivityEvents.providerId),
    database.select({ count: sql<number>`count(*)` }).from(crmAutomationRules).where(and(inArray(crmAutomationRules.providerId, pilotProviderIds), eq(crmAutomationRules.enabled, true))),
    database.select({ count: sql<number>`count(*)`, failures: sql<number>`sum(case when ${crmAutomationRuns.status} = 'failed' then 1 else 0 end)` }).from(crmAutomationRuns).where(inArray(crmAutomationRuns.providerId, pilotProviderIds)),
    database.select({ count: sql<number>`count(*)` }).from(crmSavedSegments).where(inArray(crmSavedSegments.providerId, pilotProviderIds)),
    database.select({ count: sql<number>`count(*)` }).from(crmContacts).where(notInArray(crmContacts.providerId, pilotProviderIds)),
    database.select({ count: sql<number>`count(*)` }).from(crmTasks).innerJoin(crmContacts, eq(crmContacts.id, crmTasks.contactId)).where(and(inArray(crmTasks.providerId, pilotProviderIds), sql`(${crmTasks.providerId} <> ${crmContacts.providerId} or ${crmTasks.customerId} <> ${crmContacts.customerId})`)),
    database.select({ count: sql<number>`count(*)` }).from(crmContactNotes).innerJoin(crmContacts, eq(crmContacts.id, crmContactNotes.contactId)).where(and(inArray(crmContactNotes.providerId, pilotProviderIds), sql`(${crmContactNotes.providerId} <> ${crmContacts.providerId} or ${crmContactNotes.customerId} <> ${crmContacts.customerId})`)),
    database.select({ count: sql<number>`count(*)` }).from(crmMessageDrafts).innerJoin(crmContacts, eq(crmContacts.id, crmMessageDrafts.contactId)).where(and(inArray(crmMessageDrafts.providerId, pilotProviderIds), sql`(${crmMessageDrafts.providerId} <> ${crmContacts.providerId} or ${crmMessageDrafts.customerId} <> ${crmContacts.customerId})`)),
    database.select({ count: sql<number>`count(*)` }).from(crmActivityEvents).innerJoin(crmContacts, eq(crmContacts.id, crmActivityEvents.contactId)).where(and(inArray(crmActivityEvents.providerId, pilotProviderIds), sql`(${crmActivityEvents.providerId} <> ${crmContacts.providerId} or ${crmActivityEvents.customerId} <> ${crmContacts.customerId})`)),
    database.select({ createdAt: auditLog.createdAt }).from(auditLog).where(eq(auditLog.action, "update_customers_rollout")).orderBy(desc(auditLog.createdAt)).limit(1),
    reconcileCrmProjection(pilotProviderIds),
  ]);

  const contactsByProvider = new Map(contactRows.map(row => [row.providerId, row]));
  const tasksByProvider = new Map(taskRows.map(row => [row.providerId, row]));
  const notesByProvider = new Map(noteRows.map(row => [row.providerId, row]));
  const draftsByProvider = new Map(draftRows.map(row => [row.providerId, row]));
  const eventsByProvider = new Map(eventRows.map(row => [row.providerId, row]));
  const accessRows = await Promise.all(providerRows.map(async provider => ({ providerId: provider.id, access: await getCrmProviderAccess(provider.id) })));
  const accessByProvider = new Map(accessRows.map(row => [row.providerId, row.access]));

  const providers = providerRows.map(provider => {
    const contacts = contactsByProvider.get(provider.id);
    const tasks = tasksByProvider.get(provider.id);
    const notes = notesByProvider.get(provider.id);
    const drafts = draftsByProvider.get(provider.id);
    const events = eventsByProvider.get(provider.id);
    const access = accessByProvider.get(provider.id);
    return {
      providerId: provider.id,
      businessName: provider.businessName,
      isActive: provider.isActive,
      effectiveTier: access?.entitlement.effectiveTier ?? "free",
      entitlementState: access?.entitlement.state ?? "none",
      customerHistoryEnabled: access?.can("customerHistory") ?? false,
      notesEnabled: access?.can("crmNotes") ?? false,
      followUpsEnabled: access?.can("crmFollowUps") ?? false,
      draftsEnabled: access?.can("crmDrafts") ?? false,
      stageOverridesEnabled: access?.can("crmStageOverrides") ?? false,
      contacts: numberValue(contacts?.contacts),
      optedInContacts: numberValue(contacts?.optedInContacts),
      archivedContacts: numberValue(contacts?.archivedContacts),
      activeNotes: numberValue(notes?.activeNotes),
      openTasks: numberValue(tasks?.openTasks),
      completedTasks: numberValue(tasks?.completedTasks),
      dismissedTasks: numberValue(tasks?.dismissedTasks),
      activeDrafts: numberValue(drafts?.activeDrafts),
      sentDrafts: numberValue(drafts?.sentDrafts),
      discardedDrafts: numberValue(drafts?.discardedDrafts),
      liveValidatedContacts: numberValue(drafts?.liveValidatedContacts),
      activityEvents: numberValue(events?.activityEvents),
      latestProjectedAt: contacts?.latestProjectedAt ?? null,
      latestActivityAt: events?.latestActivityAt ?? null,
    };
  });

  const totals = providers.reduce((result, provider) => ({
    providers: result.providers + 1,
    activeProviders: result.activeProviders + (provider.isActive ? 1 : 0),
    contacts: result.contacts + provider.contacts,
    optedInContacts: result.optedInContacts + provider.optedInContacts,
    activeNotes: result.activeNotes + provider.activeNotes,
    openTasks: result.openTasks + provider.openTasks,
    completedTasks: result.completedTasks + provider.completedTasks,
    dismissedTasks: result.dismissedTasks + provider.dismissedTasks,
    activeDrafts: result.activeDrafts + provider.activeDrafts,
    sentDrafts: result.sentDrafts + provider.sentDrafts,
    discardedDrafts: result.discardedDrafts + provider.discardedDrafts,
    liveValidatedContacts: result.liveValidatedContacts + provider.liveValidatedContacts,
    activityEvents: result.activityEvents + provider.activityEvents,
  }), { providers: 0, activeProviders: 0, contacts: 0, optedInContacts: 0, activeNotes: 0, openTasks: 0, completedTasks: 0, dismissedTasks: 0, activeDrafts: 0, sentDrafts: 0, discardedDrafts: 0, liveValidatedContacts: 0, activityEvents: 0 });

  const scopeMismatches = numberValue(taskMismatchRows[0]?.count) + numberValue(noteMismatchRows[0]?.count) + numberValue(draftMismatchRows[0]?.count) + numberValue(eventMismatchRows[0]?.count);
  const integrity = {
    selfContacts: contactRows.reduce((sum, row) => sum + numberValue(row.selfContacts), 0),
    nonPilotContacts: numberValue(nonPilotRows[0]?.count),
    scopeMismatches,
    contactsMissingProjection: contactRows.reduce((sum, row) => sum + numberValue(row.contactsMissingProjection), 0),
    projectionLaggingContacts: contactRows.reduce((sum, row) => sum + numberValue(row.projectionLaggingContacts), 0),
    sentDraftIssues: draftRows.reduce((sum, row) => sum + numberValue(row.sentDraftIssues), 0),
  };
  const future = {
    enabledAutomationRules: numberValue(automationRuleRows[0]?.count),
    automationRuns: numberValue(automationRunRows[0]?.count),
    failedAutomationRuns: numberValue(automationRunRows[0]?.failures),
    savedSegments: numberValue(savedSegmentRows[0]?.count),
  };
  const readiness = assessCrmPilotReadiness({
    audienceMode: privateStatus.audienceMode,
    pilotProviderCount: pilotProviderIds.length,
    missingPilotProviderCount: Math.max(0, pilotProviderIds.length - providerRows.length),
    inactivePilotProviderCount: providerRows.filter(provider => !provider.isActive).length,
    ineligiblePilotProviderCount: providers.filter(provider => !provider.customerHistoryEnabled).length,
    projectionWrites: Boolean(privateStatus.flags.projectionWrites),
    readUi: Boolean(privateStatus.flags.readUi),
    providerWrites: Boolean(privateStatus.flags.providerWrites),
    draftSending: Boolean(privateStatus.flags.draftSending),
    repairJobs: Boolean(privateStatus.flags.repairJobs),
    recommendations: Boolean(privateStatus.flags.recommendations),
    enabledAutomationRuleCount: future.enabledAutomationRules,
    automationRunCount: future.automationRuns,
    savedSegmentCount: future.savedSegments,
    selfContactCount: integrity.selfContacts,
    nonPilotContactCount: integrity.nonPilotContacts,
    scopeMismatchCount: integrity.scopeMismatches,
    contactsMissingProjectionCount: integrity.contactsMissingProjection,
    projectionLaggingContactCount: integrity.projectionLaggingContacts,
    reconciliationMissingContactCount: reconciliation.missingContacts,
    reconciliationStaleContactCount: reconciliation.staleContacts,
    sentDraftIntegrityIssueCount: integrity.sentDraftIssues,
    optedInContactCount: totals.optedInContacts,
    contactCount: totals.contacts,
    liveValidatedContactCount: totals.liveValidatedContacts,
  });

  return {
    checkedAt,
    ...readiness,
    audienceMode: privateStatus.audienceMode,
    rollbackPilotProviderCount: rollbackPilotProviderIds.length,
    flags: privateStatus.flags,
    totals,
    integrity,
    reconciliation,
    future,
    providers,
    latestRolloutAuditAt: latestAuditRows[0]?.createdAt ?? null,
    privacyNotice: "Aggregate operational metadata only. Message bodies, note bodies, task descriptions, addresses, payment data, and unrestricted customer records are excluded.",
    disableOrder: ["Turn off confirmed draft sending", "Turn off provider writes", "Hide the provider read UI", "Stop projection writes"],
  };
}
