import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ENV } from "./_core/env";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createAuditEntry } from "./db/auditLog";
import {
  acknowledgeTermsNotice,
  createTermsDraft,
  getPendingTermsNotice,
  getPublicTermsVersion,
  getTermsAudienceUsers,
  getTermsDeliverySummary,
  getTermsVersionById,
  listTermsVersions,
  markTermsNoticeShown,
  publishTermsVersion,
  updateTermsDraft,
} from "./db/terms";
import { deliverTermsUpdate } from "./termsNotifications";

const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const isOwner = ctx.user.openId === ENV.ownerOpenId;
  const isSuperAdmin = ctx.user.role === "admin" && ctx.user.adminRole === "super_admin";
  if (!isOwner && !isSuperAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Only the platform owner or a super admin can manage Terms updates" });
  }
  return next({ ctx });
});

const termsDraftInput = z.object({
  version: z.string().trim().min(3).max(50).regex(/^[A-Za-z0-9._-]+$/, "Use letters, numbers, periods, underscores, or hyphens"),
  title: z.string().trim().min(3).max(255),
  summary: z.string().trim().min(20).max(4000),
  content: z.string().trim().min(500).max(100_000),
  audience: z.enum(["all", "customers", "providers"]),
  acceptanceMode: z.enum(["notice", "explicit"]),
  effectiveAt: z.date(),
  materialArbitrationChanges: z.boolean(),
  arbitrationSection: z.string().trim().max(50).nullable(),
  optOutDeadline: z.date().nullable(),
  contactEmail: z.string().trim().email().max(320),
  companyAddress: z.string().trim().min(10).max(500),
}).superRefine((input, context) => {
  if (input.materialArbitrationChanges && (!input.arbitrationSection || !input.optOutDeadline)) {
    context.addIssue({ code: "custom", message: "Arbitration section and opt-out deadline are required when material arbitration changes are enabled" });
  }
  if (input.optOutDeadline && input.optOutDeadline > input.effectiveAt) {
    context.addIssue({ code: "custom", path: ["optOutDeadline"], message: "The opt-out deadline cannot be after the Terms effective date" });
  }
});

function publicVersion(record: NonNullable<Awaited<ReturnType<typeof getPublicTermsVersion>>>) {
  return {
    version: record.version,
    title: record.title,
    summary: record.summary,
    content: record.content,
    status: record.status,
    acceptanceMode: record.acceptanceMode,
    effectiveAt: record.effectiveAt,
    materialArbitrationChanges: record.materialArbitrationChanges,
    arbitrationSection: record.arbitrationSection,
    optOutDeadline: record.optOutDeadline,
    contactEmail: record.contactEmail,
    companyAddress: record.companyAddress,
    publishedAt: record.publishedAt,
  };
}

export const termsRouter = router({
  history: publicProcedure.query(async () => {
    const versions = await listTermsVersions();
    return [
      ...versions
        .filter((version) => version.status !== "draft")
        .map((version) => ({ version: version.version, title: version.title, status: version.status, effectiveAt: version.effectiveAt, publishedAt: version.publishedAt })),
      { version: "2026-06-24", title: "OlogyCrew Terms of Service", status: "superseded" as const, effectiveAt: new Date("2026-06-24T12:00:00.000Z"), publishedAt: new Date("2026-06-24T12:00:00.000Z") },
    ];
  }),

  current: publicProcedure
    .input(z.object({ version: z.string().trim().max(50).optional() }).optional())
    .query(async ({ input }) => {
      const record = await getPublicTermsVersion(input?.version);
      return record ? publicVersion(record) : null;
    }),

  pendingNotice: protectedProcedure.query(async ({ ctx }) => {
    const record = await getPendingTermsNotice(ctx.user.id);
    if (!record) return null;
    return {
      noticeId: record.notice.id,
      version: publicVersion(record.version),
      shownAt: record.notice.shownAt,
    };
  }),

  markShown: protectedProcedure
    .input(z.object({ noticeId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await markTermsNoticeShown(ctx.user.id, input.noticeId);
      return { success: true } as const;
    }),

  acknowledge: protectedProcedure
    .input(z.object({ noticeId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const version = await acknowledgeTermsNotice(ctx.user.id, input.noticeId);
      if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Terms notice not found" });
      return { success: true, version: version.version, acceptanceMode: version.acceptanceMode } as const;
    }),

  adminList: ownerProcedure.query(async () => {
    const versions = await listTermsVersions();
    return Promise.all(versions.map(async (version) => ({
      ...version,
      recipientCount: (await getTermsAudienceUsers(version.audience)).length,
      delivery: version.status === "draft" ? null : await getTermsDeliverySummary(version.id),
    })));
  }),

  adminGet: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const version = await getTermsVersionById(input.id);
      if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Terms version not found" });
      return { ...version, recipientCount: (await getTermsAudienceUsers(version.audience)).length, delivery: version.status === "draft" ? null : await getTermsDeliverySummary(version.id) };
    }),

  createDraft: ownerProcedure
    .input(termsDraftInput)
    .mutation(async ({ ctx, input }) => {
      if (input.effectiveAt <= new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a future effective date before creating the update" });
      }
      try {
        const id = await createTermsDraft({ ...input, createdBy: ctx.user.id });
        await createAuditEntry({ actorId: ctx.user.id, action: "create_terms_draft", targetType: "terms_version", targetId: id, details: { version: input.version, audience: input.audience, effectiveAt: input.effectiveAt.toISOString() } });
        return { id };
      } catch (error) {
        if (error instanceof Error && /unique|duplicate/i.test(error.message)) {
          throw new TRPCError({ code: "CONFLICT", message: "That Terms version identifier already exists" });
        }
        throw error;
      }
    }),

  updateDraft: ownerProcedure
    .input(termsDraftInput.safeExtend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getTermsVersionById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Terms version not found" });
      if (existing.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "Published Terms versions are immutable" });
      if (input.effectiveAt <= new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a future effective date" });
      const { id, ...changes } = input;
      const version = await updateTermsDraft(id, changes);
      await createAuditEntry({ actorId: ctx.user.id, action: "update_terms_draft", targetType: "terms_version", targetId: id, details: { version: changes.version, audience: changes.audience, effectiveAt: changes.effectiveAt.toISOString() } });
      return version;
    }),

  publish: ownerProcedure
    .input(z.object({ id: z.number().int().positive(), confirmation: z.literal("PUBLISH") }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getTermsVersionById(input.id);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Terms version not found" });
      if (existing.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "Only a draft Terms version can be published" });
      if (existing.effectiveAt <= new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "The effective date must still be in the future" });
      const published = await publishTermsVersion(input.id, ctx.user.id);
      const delivery = await deliverTermsUpdate(published.version);
      await createAuditEntry({ actorId: ctx.user.id, action: "publish_terms_version", targetType: "terms_version", targetId: input.id, details: { version: published.version.version, recipients: delivery.total, sent: delivery.sent, failed: delivery.failed, skipped: delivery.skipped } });
      return { version: publicVersion(published.version), delivery };
    }),

  retryDelivery: ownerProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const version = await getTermsVersionById(input.id);
      if (!version || version.status !== "published") throw new TRPCError({ code: "BAD_REQUEST", message: "Only the current published Terms version can retry failed delivery" });
      const delivery = await deliverTermsUpdate(version, false);
      await createAuditEntry({ actorId: ctx.user.id, action: "retry_terms_delivery", targetType: "terms_version", targetId: input.id, details: { failed: delivery.failed, sent: delivery.sent } });
      return delivery;
    }),
});
