import { and, eq, inArray, sql } from "drizzle-orm";
import {
  crmActivityEvents,
  crmContactStageHistory,
  crmContacts,
} from "../../drizzle/schema";
import { CRM_ROLLOUT_FLAGS } from "../../shared/crm";
import { requireDb } from "../db/connection";
import {
  getCrmContactByCustomer,
  getCrmOperationalSetting,
  getCrmPilotProviderIds,
  isCrmRolloutEnabled,
  setCrmPilotProviderIds,
  setCrmRolloutFlag,
  upsertCrmOperationalSetting,
} from "../db/crm";
import {
  inspectCrmProjectionCandidate,
  listCrmProjectionCustomerIds,
  listCrmProjectionProviderIds,
  projectCrmRelationshipSafely,
} from "./projection";

type ProjectionBatchInput = {
  providerIds?: number[];
  afterProviderId?: number;
  afterCustomerId?: number;
  providerLimit?: number;
  relationshipLimit?: number;
  includePrivatePilot?: boolean;
  allowReservedTestIdentity?: boolean;
  persistOperationalState?: boolean;
};

type ProjectionBatchMode = "dry_run" | "backfill" | "repair";

function parsePrivateJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function setCrmPhase2PrivateConfig(input: {
  pilotProviderIds?: number[];
  projectionWrites?: boolean;
  repairJobs?: boolean;
  actorUserId: number;
}) {
  const effectivePilotProviderIds = input.pilotProviderIds ?? await getCrmPilotProviderIds();
  if ((input.projectionWrites === true || input.repairJobs === true) && effectivePilotProviderIds.length === 0) {
    throw new Error("At least one private pilot provider is required before Customers projection writes or repair can be enabled");
  }
  if (input.pilotProviderIds) await setCrmPilotProviderIds(input.pilotProviderIds, input.actorUserId);
  if (typeof input.projectionWrites === "boolean") {
    await setCrmRolloutFlag(CRM_ROLLOUT_FLAGS.projectionWrites, input.projectionWrites, input.actorUserId);
  }
  if (typeof input.repairJobs === "boolean") {
    await setCrmRolloutFlag(CRM_ROLLOUT_FLAGS.repairJobs, input.repairJobs, input.actorUserId);
  }
  for (const lockedFlag of [
    CRM_ROLLOUT_FLAGS.readUi,
    CRM_ROLLOUT_FLAGS.providerWrites,
    CRM_ROLLOUT_FLAGS.recommendations,
    CRM_ROLLOUT_FLAGS.draftSending,
  ]) {
    await setCrmRolloutFlag(lockedFlag, false, input.actorUserId);
  }
  return getCrmPhase2PrivateStatus();
}

export async function getCrmPhase2PrivateStatus() {
  const [pilotProviderIds, metrics, lastSuccessAt, lastError, backfillCursor, lastRunId] = await Promise.all([
    getCrmPilotProviderIds(),
    getCrmOperationalSetting("customersProjectionMetrics"),
    getCrmOperationalSetting("customersProjectionLastSuccessAt"),
    getCrmOperationalSetting("customersProjectionLastError"),
    getCrmOperationalSetting("customersBackfillCursor"),
    getCrmOperationalSetting("customersBackfillLastRunId"),
  ]);
  const flags = Object.fromEntries(await Promise.all(Object.entries(CRM_ROLLOUT_FLAGS).map(async ([name, key]) => [
    name,
    await isCrmRolloutEnabled(key),
  ])));
  return {
    flags,
    pilotProviderIds,
    metrics: parsePrivateJson<Record<string, unknown> | null>(metrics, null),
    lastSuccessAt,
    lastError,
    backfillCursor: parsePrivateJson<{ providerId: number; customerId: number }>(backfillCursor, { providerId: 0, customerId: 0 }),
    lastRunId,
  };
}

export async function runCrmProjectionBatch(
  mode: ProjectionBatchMode,
  input: ProjectionBatchInput,
  actorUserId: number,
) {
  const runId = `crm-${mode}-${Date.now()}-${actorUserId}`;
  const providerLimit = Math.min(Math.max(input.providerLimit ?? 10, 1), 25);
  const relationshipLimit = Math.min(Math.max(input.relationshipLimit ?? 100, 1), 250);
  const resumeProviderId = input.afterProviderId ?? 0;
  const resumeCustomerId = input.afterCustomerId ?? 0;
  const providerIds = await listCrmProjectionProviderIds({
    afterProviderId: resumeCustomerId > 0 ? Math.max(0, resumeProviderId - 1) : resumeProviderId,
    limit: providerLimit,
    providerIds: input.providerIds,
  });
  const metrics = {
    runId,
    mode,
    startedAt: new Date().toISOString(),
    completedAt: "",
    providerCount: providerIds.length,
    candidateCount: 0,
    eligibleCount: 0,
    projectedCount: 0,
    skippedCount: 0,
    failedCount: 0,
    eventCount: 0,
    exclusions: {} as Record<string, number>,
    nextProviderCursor: resumeProviderId,
    nextCustomerCursor: resumeCustomerId,
    hasMore: false,
  };
  let exhausted = false;

  for (const providerId of providerIds) {
    const customerIds = await listCrmProjectionCustomerIds(
      providerId,
      providerId === resumeProviderId ? resumeCustomerId : 0,
    );
    for (const customerId of customerIds) {
      if (metrics.candidateCount >= relationshipLimit) {
        exhausted = true;
        metrics.hasMore = true;
        metrics.nextProviderCursor = providerId;
        break;
      }
      metrics.candidateCount += 1;
      metrics.nextProviderCursor = providerId;
      metrics.nextCustomerCursor = customerId;
      const inspection = await inspectCrmProjectionCandidate(
        providerId,
        customerId,
        input.includePrivatePilot === true,
        input.allowReservedTestIdentity === true,
      );
      if (!inspection.eligibility.eligible) {
        metrics.skippedCount += 1;
        metrics.exclusions[inspection.eligibility.reason] = (metrics.exclusions[inspection.eligibility.reason] || 0) + 1;
        continue;
      }
      metrics.eligibleCount += 1;
      if (mode === "dry_run") continue;
      const result = await projectCrmRelationshipSafely(providerId, customerId, {
        mode: mode === "repair" ? "repair" : "backfill",
        includePrivatePilot: input.includePrivatePilot,
        allowReservedTestIdentity: input.allowReservedTestIdentity,
        recordOperationalState: input.persistOperationalState !== false,
      });
      if (result.status === "projected") {
        metrics.projectedCount += 1;
        metrics.eventCount += result.eventCount || 0;
      } else if (result.status === "failed") {
        metrics.failedCount += 1;
      } else {
        metrics.skippedCount += 1;
        const reason = result.reason || "projection_skipped";
        metrics.exclusions[reason] = (metrics.exclusions[reason] || 0) + 1;
      }
    }
    if (!exhausted) metrics.nextCustomerCursor = 0;
    if (exhausted) break;
  }

  metrics.completedAt = new Date().toISOString();
  if (input.persistOperationalState !== false) {
    await upsertCrmOperationalSetting("customersProjectionMetrics", JSON.stringify(metrics), actorUserId);
    if (mode !== "dry_run") {
      await upsertCrmOperationalSetting("customersBackfillCursor", JSON.stringify({
        providerId: metrics.nextProviderCursor,
        customerId: metrics.nextCustomerCursor,
      }), actorUserId);
      await upsertCrmOperationalSetting("customersBackfillLastRunId", runId, actorUserId);
    }
  }
  return metrics;
}

export async function reconcileCrmProjection(providerIds: number[], allowReservedTestIdentity = false) {
  const database = await requireDb();
  const uniqueProviderIds = Array.from(new Set(providerIds.filter((id) => Number.isInteger(id) && id > 0)));
  let expectedEligible = 0;
  let missingContacts = 0;
  let staleContacts = 0;
  const exclusions: Record<string, number> = {};

  for (const providerId of uniqueProviderIds) {
    for (const customerId of await listCrmProjectionCustomerIds(providerId)) {
      const inspection = await inspectCrmProjectionCandidate(providerId, customerId, true, allowReservedTestIdentity);
      if (!inspection.eligibility.eligible) {
        exclusions[inspection.eligibility.reason] = (exclusions[inspection.eligibility.reason] || 0) + 1;
        continue;
      }
      expectedEligible += 1;
      const contact = await getCrmContactByCustomer(providerId, customerId);
      if (!contact) {
        missingContacts += 1;
      } else if (inspection.latestSourceAt && (!contact.lastProjectedAt || contact.lastProjectedAt < inspection.latestSourceAt)) {
        staleContacts += 1;
      }
    }
  }

  const providerPredicate = uniqueProviderIds.length > 0 ? inArray(crmContacts.providerId, uniqueProviderIds) : sql`FALSE`;
  const [contactCount, eventCount] = await Promise.all([
    database.select({ count: sql<number>`count(*)` }).from(crmContacts).where(providerPredicate),
    database.select({ count: sql<number>`count(*)` }).from(crmActivityEvents)
      .where(uniqueProviderIds.length > 0 ? inArray(crmActivityEvents.providerId, uniqueProviderIds) : sql`FALSE`),
  ]);
  const actualContacts = Number(contactCount[0]?.count || 0);
  return {
    providerCount: uniqueProviderIds.length,
    expectedEligible,
    actualContacts,
    missingContacts,
    extraContacts: Math.max(0, actualContacts - expectedEligible),
    staleContacts,
    storedEvents: Number(eventCount[0]?.count || 0),
    exclusions,
    checkedAt: new Date().toISOString(),
  };
}

export async function deleteCrmProviderProjection(providerId: number) {
  const database = await requireDb();
  await database.transaction(async (tx) => {
    await tx.delete(crmActivityEvents).where(and(
      eq(crmActivityEvents.providerId, providerId),
      inArray(crmActivityEvents.entityType, ["quote", "booking", "payment", "invoice", "message", "review"]),
    ));
    await tx.delete(crmContactStageHistory).where(and(
      eq(crmContactStageHistory.providerId, providerId),
      inArray(crmContactStageHistory.source, ["system", "repair"]),
    ));
    await tx.update(crmContacts).set({ lastProjectedAt: null }).where(eq(crmContacts.providerId, providerId));
  });
}

export async function rebuildCrmProviderProjection(providerId: number, actorUserId: number, allowReservedTestIdentity = false) {
  await deleteCrmProviderProjection(providerId);
  return runCrmProjectionBatch("repair", {
    providerIds: [providerId],
    providerLimit: 1,
    relationshipLimit: 250,
    includePrivatePilot: true,
    allowReservedTestIdentity,
    persistOperationalState: !allowReservedTestIdentity,
  }, actorUserId);
}
