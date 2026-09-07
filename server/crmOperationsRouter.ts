import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { CRM_ROLLOUT_FLAGS } from "../shared/crm";
import { router, protectedProcedure } from "./_core/trpc";
import { createAuditEntry } from "./db/auditLog";
import { getProviderById } from "./db/providers";
import { getCrmPilotProviderIds, isCrmRolloutEnabled } from "./db/crm";
import {
  getCrmPhase2PrivateStatus,
  rebuildCrmProviderProjection,
  reconcileCrmProjection,
  runCrmProjectionBatch,
  setCrmPhase2PrivateConfig,
} from "./crm/operations";

const ownerProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin" || ctx.user.adminRole !== "super_admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required" });
  }
  return next({ ctx });
});

const providerIdsSchema = z.array(z.number().int().positive()).max(25);

async function requireExistingProviders(providerIds: number[]) {
  for (const providerId of providerIds) {
    if (!await getProviderById(providerId)) {
      throw new TRPCError({ code: "NOT_FOUND", message: `Provider ${providerId} was not found` });
    }
  }
}

async function requirePilotProviders(providerIds: number[]) {
  const pilotIds = await getCrmPilotProviderIds();
  if (providerIds.some((providerId) => !pilotIds.includes(providerId))) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Every provider must be in the private Customers pilot" });
  }
  await requireExistingProviders(providerIds);
}

export const crmOperationsRouter = router({
  getStatus: ownerProcedure.query(() => getCrmPhase2PrivateStatus()),

  configure: ownerProcedure.input(z.object({
    pilotProviderIds: providerIdsSchema.optional(),
    projectionWrites: z.boolean().optional(),
    repairJobs: z.boolean().optional(),
    readUi: z.boolean().optional(),
  })).mutation(async ({ ctx, input }) => {
    if (input.pilotProviderIds) await requireExistingProviders(input.pilotProviderIds);
    const status = await setCrmPhase2PrivateConfig({ ...input, actorUserId: ctx.user.id });
    await createAuditEntry({
      actorId: ctx.user.id,
      action: "update_customers_rollout",
      targetType: "system",
      targetId: 0,
      details: {
        pilotProviderIds: status.pilotProviderIds,
        projectionWrites: status.flags.projectionWrites,
        repairJobs: status.flags.repairJobs,
        readUi: status.flags.readUi,
      },
    });
    return status;
  }),

  dryRun: ownerProcedure.input(z.object({
    providerIds: providerIdsSchema.optional(),
    afterProviderId: z.number().int().nonnegative().optional(),
    afterCustomerId: z.number().int().nonnegative().optional(),
    providerLimit: z.number().int().min(1).max(25).default(10),
    relationshipLimit: z.number().int().min(1).max(250).default(100),
    includePrivatePilot: z.boolean().default(false),
  })).mutation(async ({ ctx, input }) => {
    const result = await runCrmProjectionBatch("dry_run", input, ctx.user.id);
    await createAuditEntry({ actorId: ctx.user.id, action: "run_customers_dry_run", targetType: "system", targetId: 0, details: result });
    return result;
  }),

  runBackfill: ownerProcedure.input(z.object({
    providerIds: providerIdsSchema.min(1),
    afterProviderId: z.number().int().nonnegative().optional(),
    afterCustomerId: z.number().int().nonnegative().optional(),
    providerLimit: z.number().int().min(1).max(25).default(10),
    relationshipLimit: z.number().int().min(1).max(250).default(100),
    confirmation: z.literal("RUN_CUSTOMERS_BACKFILL"),
  })).mutation(async ({ ctx, input }) => {
    if (!await isCrmRolloutEnabled(CRM_ROLLOUT_FLAGS.projectionWrites)) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Customers projection writes are disabled" });
    }
    await requirePilotProviders(input.providerIds);
    const result = await runCrmProjectionBatch("backfill", { ...input, includePrivatePilot: true }, ctx.user.id);
    await createAuditEntry({ actorId: ctx.user.id, action: "run_customers_backfill", targetType: "system", targetId: 0, details: result });
    return result;
  }),

  reconcile: ownerProcedure.input(z.object({ providerIds: providerIdsSchema.optional() })).query(async ({ input }) => {
    const providerIds = input.providerIds ?? await getCrmPilotProviderIds();
    if (providerIds.length === 0) return reconcileCrmProjection([]);
    await requirePilotProviders(providerIds);
    return reconcileCrmProjection(providerIds);
  }),

  repair: ownerProcedure.input(z.object({
    providerIds: providerIdsSchema.min(1),
    relationshipLimit: z.number().int().min(1).max(250).default(100),
    confirmation: z.literal("REPAIR_CUSTOMERS_PROJECTION"),
  })).mutation(async ({ ctx, input }) => {
    if (!await isCrmRolloutEnabled(CRM_ROLLOUT_FLAGS.repairJobs)) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Customers projection repair is disabled" });
    }
    await requirePilotProviders(input.providerIds);
    const result = await runCrmProjectionBatch("repair", { providerIds: input.providerIds, relationshipLimit: input.relationshipLimit, includePrivatePilot: true }, ctx.user.id);
    await createAuditEntry({ actorId: ctx.user.id, action: "run_customers_repair", targetType: "system", targetId: 0, details: result });
    return result;
  }),

  rebuildProvider: ownerProcedure.input(z.object({
    providerId: z.number().int().positive(),
    confirmation: z.literal("REBUILD_CUSTOMERS_PROJECTION"),
  })).mutation(async ({ ctx, input }) => {
    if (!await isCrmRolloutEnabled(CRM_ROLLOUT_FLAGS.repairJobs)) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Customers projection repair is disabled" });
    }
    await requirePilotProviders([input.providerId]);
    const result = await rebuildCrmProviderProjection(input.providerId, ctx.user.id);
    await createAuditEntry({ actorId: ctx.user.id, action: "rebuild_customers_projection", targetType: "provider", targetId: input.providerId, details: result });
    return result;
  }),
});
