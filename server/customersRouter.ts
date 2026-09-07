import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  CRM_CONTACT_STAGES,
  CRM_EVENT_TYPES,
  CRM_MAX_DRAFT_LENGTH,
  CRM_MAX_NOTE_LENGTH,
  CRM_ROLLOUT_FLAGS,
  CRM_TASK_STATES,
} from "../shared/crm";
import { protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import {
  getCrmContactReadModel,
  getCrmWorkspaceSummary,
  isCrmRolloutEnabled,
  listCrmContactReadModels,
  listCrmContactNotes,
  listCrmProviderActivity,
  listCrmTaskReadModels,
  createCrmContactNote,
  createCrmTask,
  updateCrmTask,
  updateCrmTaskState,
  appendCrmActivityEvent,
  buildCrmEventKey,
  CrmContactNotFoundError,
  CrmMessageDraftIdempotencyConflictError,
  CrmMessageDraftNotFoundError,
  createCrmMessageDraft,
  discardCrmMessageDraft,
  listCrmMessageDrafts,
  transitionCrmManualStage,
  updateCrmMessageDraft,
} from "./db/crm";
import { getCrmProviderAccess } from "./crm/access";

async function resolveProviderAccess(userId: number) {
  const provider = await db.getProviderByUserId(userId);
  if (!provider) return { provider: null, access: null, visible: false, notesEnabled: false, followUpsEnabled: false, stageOverridesEnabled: false, draftsEnabled: false, entitlement: null };
  const [access, readUiEnabled, providerWritesEnabled] = await Promise.all([
    getCrmProviderAccess(provider.id),
    isCrmRolloutEnabled(CRM_ROLLOUT_FLAGS.readUi),
    isCrmRolloutEnabled(CRM_ROLLOUT_FLAGS.providerWrites),
  ]);
  const visible = Boolean(provider.isActive && access.isPilotProvider && readUiEnabled && access.can("customerHistory"));
  return {
    provider,
    access,
    visible,
    notesEnabled: Boolean(visible && providerWritesEnabled && access.can("crmNotes")),
    followUpsEnabled: Boolean(visible && providerWritesEnabled && access.can("crmFollowUps")),
    stageOverridesEnabled: Boolean(visible && providerWritesEnabled && access.can("crmStageOverrides")),
    draftsEnabled: Boolean(visible && providerWritesEnabled && access.can("crmDrafts")),
    entitlement: access.entitlement,
  };
}

const customerReadProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const access = await resolveProviderAccess(ctx.user.id);
  if (!access.provider) throw new TRPCError({ code: "FORBIDDEN", message: "A provider account is required" });
  if (!access.visible) throw new TRPCError({ code: "FORBIDDEN", message: "Customers is not enabled for this provider" });
  return next({ ctx: { ...ctx, provider: access.provider, crmEntitlement: access.entitlement!, crmAccess: access } });
});

const customerNoteWriteProcedure = customerReadProcedure.use(async ({ ctx, next }) => {
  if (!ctx.crmAccess.notesEnabled) throw new TRPCError({ code: "FORBIDDEN", message: "Private customer notes are not enabled for this provider" });
  return next({ ctx });
});

const customerFollowUpWriteProcedure = customerReadProcedure.use(async ({ ctx, next }) => {
  if (!ctx.crmAccess.followUpsEnabled) throw new TRPCError({ code: "FORBIDDEN", message: "Customer follow-ups are not enabled for this provider" });
  return next({ ctx });
});

const customerStageWriteProcedure = customerReadProcedure.use(async ({ ctx, next }) => {
  if (!ctx.crmAccess.stageOverridesEnabled) throw new TRPCError({ code: "FORBIDDEN", message: "Manual relationship stages are not enabled for this provider" });
  return next({ ctx });
});

const customerDraftWriteProcedure = customerReadProcedure.use(async ({ ctx, next }) => {
  if (!ctx.crmAccess.draftsEnabled) throw new TRPCError({ code: "FORBIDDEN", message: "Relationship message drafts are not enabled for this provider" });
  return next({ ctx });
});

function translateDraftError(error: unknown): never {
  if (error instanceof CrmContactNotFoundError || error instanceof CrmMessageDraftNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Relationship message draft not found" });
  }
  if (error instanceof CrmMessageDraftIdempotencyConflictError) {
    throw new TRPCError({ code: "CONFLICT", message: "This draft request was already used for another relationship" });
  }
  throw error;
}

const optionalDueDate = z.coerce.date().nullable().optional().refine(
  value => value == null || value.getTime() >= Date.now() - 5 * 60_000,
  "Follow-up due date cannot be in the past",
);

async function appendTaskEventSafely(input: {
  providerId: number;
  task: { id: number; customerId: number; contactId: number; taskType: string; createdAt: Date; updatedAt: Date };
  eventType: "task.created" | "task.completed" | "task.dismissed";
  summary: string;
  occurredAt?: Date;
}) {
  try {
    const occurredAt = input.occurredAt ?? (input.eventType === "task.created" ? input.task.createdAt : input.task.updatedAt);
    await appendCrmActivityEvent({
      providerId: input.providerId,
      customerId: input.task.customerId,
      contactId: input.task.contactId,
      eventType: input.eventType,
      entityType: "task",
      entityId: input.task.id,
      eventKey: buildCrmEventKey({ providerId: input.providerId, eventType: input.eventType, entityType: "task", entityId: input.task.id, occurrence: occurredAt.getTime() }),
      summary: input.summary,
      metadata: { taskId: input.task.id, taskType: input.task.taskType },
      occurredAt,
      projectedAt: null,
    });
  } catch (error) {
    console.error("[Customers] Task activity append failed", {
      providerId: input.providerId,
      taskId: input.task.id,
      eventType: input.eventType,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function appendStageEventSafely(input: {
  providerId: number;
  customerId: number;
  contactId: number;
  historyId: number;
  previousStage: (typeof CRM_CONTACT_STAGES)[number];
  nextStage: (typeof CRM_CONTACT_STAGES)[number];
  reason: string;
  summary: string;
  changedAt: Date;
}) {
  try {
    await appendCrmActivityEvent({
      providerId: input.providerId,
      customerId: input.customerId,
      contactId: input.contactId,
      eventType: "contact.stage_changed",
      entityType: "contact",
      entityId: input.contactId,
      eventKey: buildCrmEventKey({
        providerId: input.providerId,
        eventType: "contact.stage_changed",
        entityType: "contact",
        entityId: input.contactId,
        occurrence: input.historyId,
      }),
      summary: input.summary,
      metadata: {
        previousStage: input.previousStage,
        nextStage: input.nextStage,
        reason: input.reason,
      },
      occurredAt: input.changedAt,
      projectedAt: null,
    });
  } catch (error) {
    console.error("[Customers] Stage activity append failed", {
      providerId: input.providerId,
      contactId: input.contactId,
      historyId: input.historyId,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export const customersRouter = router({
  getAccess: protectedProcedure.query(async ({ ctx }) => {
    const access = await resolveProviderAccess(ctx.user.id);
    return {
      visible: access.visible,
      readOnly: !(access.notesEnabled || access.followUpsEnabled || access.stageOverridesEnabled || access.draftsEnabled),
      businessName: access.provider?.businessName ?? null,
      effectiveTier: access.entitlement?.effectiveTier ?? "free",
      providerWritesEnabled: access.notesEnabled || access.followUpsEnabled || access.stageOverridesEnabled || access.draftsEnabled,
      notesEnabled: access.notesEnabled,
      followUpsEnabled: access.followUpsEnabled,
      stageOverridesEnabled: access.stageOverridesEnabled,
      draftsEnabled: access.draftsEnabled,
      recommendationsEnabled: false,
      draftSendingEnabled: false,
    };
  }),

  getWorkspace: customerReadProcedure.input(z.object({
    tab: z.enum(["leads", "customers", "follow-ups", "activity"]).default("leads"),
    search: z.string().trim().max(100).optional(),
    stage: z.enum(CRM_CONTACT_STAGES).optional(),
    sort: z.enum(["attention", "recent", "value", "name"]).default("attention"),
    limit: z.number().int().min(1).max(50).default(25),
    offset: z.number().int().min(0).default(0),
    beforeEventId: z.number().int().positive().optional(),
  })).query(async ({ ctx, input }) => {
    const summary = await getCrmWorkspaceSummary(ctx.provider.id);
    if (input.tab === "activity") {
      const activity = await listCrmProviderActivity({
        providerId: ctx.provider.id,
        limit: input.limit,
        beforeId: input.beforeEventId,
      });
      return { summary, contacts: null, activity, tasks: null, readOnlyReason: null };
    }
    if (input.tab === "follow-ups") {
      const tasks = ctx.crmAccess.followUpsEnabled
        ? await listCrmTaskReadModels({ providerId: ctx.provider.id, limit: 200 })
        : [];
      return {
        summary,
        contacts: null,
        activity: null,
        tasks,
        readOnlyReason: ctx.crmAccess.followUpsEnabled ? null : "Follow-up tools are not available with the provider's current access.",
      };
    }
    const defaultStages = input.tab === "leads"
      ? (["lead", "quoted"] as const)
      : input.tab === "customers"
        ? (["booked", "customer", "repeat_customer", "dormant"] as const)
        : undefined;
    const contacts = await listCrmContactReadModels({
      providerId: ctx.provider.id,
      stages: input.stage ? [input.stage] : defaultStages ? [...defaultStages] : undefined,
      search: input.search,
      sort: input.sort,
      limit: input.limit,
      offset: input.offset,
    });
    return {
      summary,
      contacts,
      activity: null,
      tasks: null,
      readOnlyReason: null,
    };
  }),

  getContact: customerReadProcedure.input(z.object({
    contactId: z.number().int().positive(),
    eventLimit: z.number().int().min(1).max(50).default(30),
    beforeEventId: z.number().int().positive().optional(),
  })).query(async ({ ctx, input }) => {
    let result;
    try {
      result = await getCrmContactReadModel({ providerId: ctx.provider.id, ...input });
    } catch (error) {
      if (error instanceof CrmContactNotFoundError) throw new TRPCError({ code: "NOT_FOUND", message: "Customer relationship not found" });
      throw error;
    }
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Customer relationship not found" });
    const [notes, tasks, drafts] = await Promise.all([
      ctx.crmAccess.notesEnabled ? listCrmContactNotes(ctx.provider.id, input.contactId) : Promise.resolve([]),
      ctx.crmAccess.followUpsEnabled ? listCrmTaskReadModels({ providerId: ctx.provider.id, contactId: input.contactId, limit: 100 }) : Promise.resolve([]),
      ctx.crmAccess.draftsEnabled ? listCrmMessageDrafts(ctx.provider.id, input.contactId, ["draft"]) : Promise.resolve([]),
    ]);
    return { ...result, notes, tasks, drafts, readOnly: !(ctx.crmAccess.notesEnabled || ctx.crmAccess.followUpsEnabled || ctx.crmAccess.stageOverridesEnabled || ctx.crmAccess.draftsEnabled), eventTypes: CRM_EVENT_TYPES };
  }),

  createDraft: customerDraftWriteProcedure.input(z.object({
    contactId: z.number().int().positive(),
    body: z.string().trim().min(1).max(CRM_MAX_DRAFT_LENGTH),
    requestId: z.string().uuid(),
  })).mutation(async ({ ctx, input }) => {
    try {
      const draft = await createCrmMessageDraft({
        providerId: ctx.provider.id,
        contactId: input.contactId,
        body: input.body,
        dedupeKey: `manual-draft:${ctx.user.id}:${input.requestId}`,
        ruleId: null,
        taskId: null,
      });
      if (!draft) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Relationship message draft could not be created" });
      return draft;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      return translateDraftError(error);
    }
  }),

  updateDraft: customerDraftWriteProcedure.input(z.object({
    contactId: z.number().int().positive(),
    draftId: z.number().int().positive(),
    body: z.string().trim().min(1).max(CRM_MAX_DRAFT_LENGTH),
  })).mutation(async ({ ctx, input }) => {
    try {
      return await updateCrmMessageDraft({ providerId: ctx.provider.id, ...input });
    } catch (error) {
      return translateDraftError(error);
    }
  }),

  discardDraft: customerDraftWriteProcedure.input(z.object({
    contactId: z.number().int().positive(),
    draftId: z.number().int().positive(),
  })).mutation(async ({ ctx, input }) => {
    try {
      return await discardCrmMessageDraft(ctx.provider.id, input.contactId, input.draftId);
    } catch (error) {
      return translateDraftError(error);
    }
  }),

  setRelationshipStage: customerStageWriteProcedure.input(z.object({
    contactId: z.number().int().positive(),
    stage: z.enum(CRM_CONTACT_STAGES).nullable(),
  })).mutation(async ({ ctx, input }) => {
    const requestedLabel = input.stage?.replaceAll("_", " ") ?? "automatic";
    const reason = input.stage
      ? `Provider set relationship stage to ${requestedLabel}`
      : "Provider resumed automatic relationship stage";
    let transition;
    try {
      transition = await transitionCrmManualStage({
        providerId: ctx.provider.id,
        contactId: input.contactId,
        stage: input.stage,
        actorUserId: ctx.user.id,
        reason,
      });
    } catch (error) {
      if (error instanceof CrmContactNotFoundError) throw new TRPCError({ code: "NOT_FOUND", message: "Customer relationship not found" });
      throw error;
    }
    if (transition.stateChanged && transition.historyId) {
      await appendStageEventSafely({
        providerId: ctx.provider.id,
        customerId: transition.contact.customerId,
        contactId: input.contactId,
        historyId: transition.historyId,
        previousStage: transition.previousStage,
        nextStage: transition.nextStage,
        reason,
        summary: input.stage
          ? `Relationship stage changed to ${transition.nextStage.replaceAll("_", " ")}`
          : `Automatic relationship stage restored as ${transition.nextStage.replaceAll("_", " ")}`,
        changedAt: transition.changedAt,
      });
    }
    return {
      contactId: input.contactId,
      derivedStage: transition.contact.derivedStage,
      manualStage: transition.contact.manualStage,
      effectiveStage: transition.nextStage,
      changed: transition.stateChanged,
    };
  }),

  createNote: customerNoteWriteProcedure.input(z.object({
    contactId: z.number().int().positive(),
    body: z.string().trim().min(1).max(CRM_MAX_NOTE_LENGTH),
  })).mutation(async ({ ctx, input }) => {
    const noteId = await createCrmContactNote({
      providerId: ctx.provider.id,
      contactId: input.contactId,
      authorUserId: ctx.user.id,
      body: input.body,
    });
    return { success: true, noteId };
  }),

  createFollowUp: customerFollowUpWriteProcedure.input(z.object({
    contactId: z.number().int().positive(),
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(1_000).nullable().optional(),
    dueAt: optionalDueDate,
    requestId: z.string().uuid(),
  })).mutation(async ({ ctx, input }) => {
    const task = await createCrmTask({
      providerId: ctx.provider.id,
      contactId: input.contactId,
      taskType: "manual_follow_up",
      title: input.title,
      description: input.description,
      dueAt: input.dueAt,
      dedupeKey: `manual-follow-up:${ctx.user.id}:${input.requestId}`,
      createdByUserId: ctx.user.id,
    });
    if (!task) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Follow-up could not be created" });
    await appendTaskEventSafely({
      providerId: ctx.provider.id,
      task,
      eventType: "task.created",
      summary: "Manual follow-up created",
    });
    return task;
  }),

  updateFollowUp: customerFollowUpWriteProcedure.input(z.object({
    contactId: z.number().int().positive(),
    taskId: z.number().int().positive(),
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().max(1_000).nullable().optional(),
    dueAt: optionalDueDate,
  }).refine(value => value.title !== undefined || value.description !== undefined || value.dueAt !== undefined, "No follow-up changes were supplied")).mutation(async ({ ctx, input }) => {
    return updateCrmTask({ providerId: ctx.provider.id, ...input });
  }),

  setFollowUpState: customerFollowUpWriteProcedure.input(z.object({
    contactId: z.number().int().positive(),
    taskId: z.number().int().positive(),
    state: z.enum(CRM_TASK_STATES).refine(value => value !== "snoozed", "Snoozing is not enabled in this release"),
  })).mutation(async ({ ctx, input }) => {
    const transition = await updateCrmTaskState({ providerId: ctx.provider.id, ...input });
    const task = transition.task;
    if (transition.stateChanged && (input.state === "completed" || input.state === "dismissed")) {
      const eventType = input.state === "completed" ? "task.completed" : "task.dismissed";
      await appendTaskEventSafely({
        providerId: ctx.provider.id,
        task,
        eventType,
        summary: input.state === "completed" ? "Follow-up completed" : "Follow-up cancelled",
        occurredAt: transition.transitionAt,
      });
    }
    return task;
  }),
});
