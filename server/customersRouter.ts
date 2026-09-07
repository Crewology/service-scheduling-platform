import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { CRM_CONTACT_STAGES, CRM_EVENT_TYPES, CRM_ROLLOUT_FLAGS } from "../shared/crm";
import { protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import {
  getCrmContactReadModel,
  getCrmWorkspaceSummary,
  isCrmRolloutEnabled,
  listCrmContactReadModels,
  listCrmProviderActivity,
} from "./db/crm";
import { getCrmProviderAccess } from "./crm/access";

async function resolveProviderAccess(userId: number) {
  const provider = await db.getProviderByUserId(userId);
  if (!provider) return { provider: null, visible: false, entitlement: null };
  const [access, readUiEnabled] = await Promise.all([
    getCrmProviderAccess(provider.id),
    isCrmRolloutEnabled(CRM_ROLLOUT_FLAGS.readUi),
  ]);
  return {
    provider,
    visible: Boolean(provider.isActive && access.isPilotProvider && readUiEnabled && access.can("customerHistory")),
    entitlement: access.entitlement,
  };
}

const customerReadProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const access = await resolveProviderAccess(ctx.user.id);
  if (!access.provider) throw new TRPCError({ code: "FORBIDDEN", message: "A provider account is required" });
  if (!access.visible) throw new TRPCError({ code: "FORBIDDEN", message: "Customers is not enabled for this provider" });
  return next({ ctx: { ...ctx, provider: access.provider, crmEntitlement: access.entitlement! } });
});

export const customersRouter = router({
  getAccess: protectedProcedure.query(async ({ ctx }) => {
    const access = await resolveProviderAccess(ctx.user.id);
    return {
      visible: access.visible,
      readOnly: true,
      businessName: access.provider?.businessName ?? null,
      effectiveTier: access.entitlement?.effectiveTier ?? "free",
      providerWritesEnabled: false,
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
      return { summary, contacts: null, activity, readOnlyReason: null };
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
      openTasksOnly: input.tab === "follow-ups",
    });
    return {
      summary,
      contacts,
      activity: null,
      readOnlyReason: input.tab === "follow-ups"
        ? "Follow-up tasks and recommendations are not enabled in this read-only pilot."
        : null,
    };
  }),

  getContact: customerReadProcedure.input(z.object({
    contactId: z.number().int().positive(),
    eventLimit: z.number().int().min(1).max(50).default(30),
    beforeEventId: z.number().int().positive().optional(),
  })).query(async ({ ctx, input }) => {
    const result = await getCrmContactReadModel({ providerId: ctx.provider.id, ...input });
    if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Customer relationship not found" });
    return { ...result, readOnly: true, eventTypes: CRM_EVENT_TYPES };
  }),
});
