import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { createAuditEntry } from "./db/auditLog";
import { PROVIDER_EVIDENCE_TYPES, resolveEvidenceSignal } from "../shared/providerTrust";
import { createNotification } from "./db/notifications";

const evidenceType = z.enum(PROVIDER_EVIDENCE_TYPES);
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const allowedContentTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

function withoutStorageLocation<T extends { documentUrl: string; documentKey?: string | null }>(document: T) {
  const { documentUrl: _documentUrl, documentKey: _documentKey, ...safe } = document;
  return safe;
}

function validateEvidenceDates(type: string, expirationDate?: string) {
  if (type === "insurance" && !expirationDate) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Insurance evidence requires an expiration date" });
  }
  if (expirationDate && expirationDate < new Date().toISOString().slice(0, 10)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Expiration date must be today or later" });
  }
}

async function notifyEvidenceDecision(document: any, state: "approved" | "rejected" | "revoked", reason?: string) {
  try {
    const provider = await db.getProviderById(document.providerId);
    if (!provider) return;
    const label = document.documentLabel || document.documentType.replaceAll("_", " ");
    const title = state === "approved" ? "Evidence approved" : state === "rejected" ? "Evidence needs attention" : "Evidence revoked";
    const message = state === "approved"
      ? `${label} was reviewed and approved. The specific signal will appear while the evidence remains current.`
      : `${label} was ${state}.${reason ? ` Reason: ${reason}` : ""} Submit replacement evidence when ready.`;
    await createNotification({
      userId: provider.userId,
      notificationType: "verification",
      title,
      message,
      actionUrl: "/provider/dashboard?tab=more",
    });
  } catch (error) {
    console.error("[Verification] Unable to create evidence decision notification:", error);
  }
}

export const verificationRouter = router({
  upload: protectedProcedure
    .input(z.object({
      documentType: evidenceType,
      documentLabel: z.string().trim().min(2).max(255),
      issuer: z.string().trim().max(255).optional(),
      credentialIdentifier: z.string().trim().max(255).optional(),
      jurisdiction: z.string().trim().max(100).optional(),
      issuedDate: dateOnly.optional(),
      expirationDate: dateOnly.optional(),
      documentData: z.string().min(1),
      contentType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      if (!allowedContentTypes.has(input.contentType)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only PDF, JPG, and PNG files are accepted" });
      }
      validateEvidenceDates(input.documentType, input.expirationDate);

      const buffer = Buffer.from(input.documentData, "base64");
      if (!buffer.length || buffer.length > 10 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Document must be under 10MB" });
      }
      const { storagePut } = await import("./storage");
      const ext = input.contentType === "application/pdf" ? "pdf" : input.contentType === "image/png" ? "png" : "jpg";
      const suffix = Math.random().toString(36).substring(2, 10);
      const fileKey = `verification-docs/${provider.id}/${input.documentType}-${Date.now()}-${suffix}.${ext}`;
      const stored = await storagePut(fileKey, buffer, input.contentType);
      const documentId = await db.uploadVerificationDocument({
        providerId: provider.id,
        documentType: input.documentType,
        documentUrl: `s3://${stored.key}`,
        documentKey: stored.key,
        documentLabel: input.documentLabel,
        issuer: input.issuer,
        credentialIdentifier: input.credentialIdentifier,
        jurisdiction: input.jurisdiction,
        issuedDate: input.issuedDate,
        expirationDate: input.expirationDate,
      });
      await db.syncProviderIdentityCompatibilityStatus(provider.id);
      await createAuditEntry({
        actorId: ctx.user.id,
        action: "verification_document_submitted",
        targetType: "document",
        targetId: Number(documentId),
        details: { providerId: provider.id, evidenceType: input.documentType, newState: "pending" },
      });
      return { id: documentId, documentType: input.documentType, state: "pending" as const };
    }),

  myDocuments: protectedProcedure.query(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider) return [];
    const documents = await db.getProviderDocuments(provider.id);
    return documents.map(document => ({
      ...withoutStorageLocation(document),
      state: resolveEvidenceSignal([document as any], document.documentType).state,
    }));
  }),

  myTrustProfile: protectedProcedure.query(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider) return null;
    return db.getProviderTrustProfile(provider.id);
  }),

  viewDocument: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const document = await db.getDocumentById(input.documentId);
      if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (ctx.user.role !== "admin" && provider?.id !== document.providerId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You cannot view this document" });
      }
      if (document.documentKey) {
        const { storageGet } = await import("./storage");
        return storageGet(document.documentKey);
      }
      return { key: null, url: document.documentUrl };
    }),

  deleteDocument: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      const document = await db.getDocumentById(input.documentId);
      if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      if (document.providerId !== provider.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own documents" });
      }
      if (document.verificationStatus === "approved" || document.verificationStatus === "revoked") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Reviewed evidence is retained for audit history; submit replacement evidence instead" });
      }
      await db.deleteVerificationDocument(input.documentId);
      await db.syncProviderIdentityCompatibilityStatus(provider.id);
      await createAuditEntry({
        actorId: ctx.user.id,
        action: "verification_document_deleted",
        targetType: "document",
        targetId: input.documentId,
        details: { providerId: provider.id, evidenceType: document.documentType, previousState: document.verificationStatus },
      });
      return { success: true };
    }),

  listAll: adminProcedure
    .input(z.object({ status: z.enum(["pending", "approved", "rejected", "revoked"]).optional() }).optional())
    .query(async ({ input }) => {
      const items = await db.getAllDocumentsForAdmin(input?.status);
      return items.map(item => ({
        ...item,
        document: {
          ...withoutStorageLocation(item.document),
          state: resolveEvidenceSignal([item.document as any], item.document.documentType).state,
        },
      }));
    }),

  listPending: adminProcedure.query(async () => {
    const items = await db.getAllPendingDocuments();
    return items.map(item => ({ ...item, document: withoutStorageLocation(item.document) }));
  }),

  review: adminProcedure
    .input(z.object({
      documentId: z.number(),
      status: z.enum(["approved", "rejected"]),
      rejectionReason: z.string().trim().min(5).max(1000).optional(),
    }).superRefine((value, ctx) => {
      if (value.status === "rejected" && !value.rejectionReason) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rejectionReason"], message: "Rejection reason is required" });
      }
    }))
    .mutation(async ({ ctx, input }) => {
      const document = await db.getDocumentById(input.documentId);
      if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      if (document.verificationStatus === "revoked") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Revoked evidence cannot be reviewed again; the provider must submit replacement evidence" });
      }
      validateEvidenceDates(document.documentType, document.expirationDate || undefined);
      const previousState = document.verificationStatus;
      await db.reviewVerificationDocument(input.documentId, input.status, ctx.user.id, input.rejectionReason);
      await db.syncProviderIdentityCompatibilityStatus(document.providerId);
      await createAuditEntry({
        actorId: ctx.user.id,
        action: input.status === "approved" ? "verification_document_approved" : "verification_document_rejected",
        targetType: "document",
        targetId: input.documentId,
        details: {
          providerId: document.providerId,
          evidenceType: document.documentType,
          previousState,
          newState: input.status,
          reason: input.rejectionReason,
        },
      });
      await notifyEvidenceDecision(document, input.status, input.rejectionReason);
      return { success: true, state: input.status === "approved" ? "verified" as const : "rejected" as const };
    }),

  revoke: adminProcedure
    .input(z.object({ documentId: z.number(), reason: z.string().trim().min(5).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const document = await db.getDocumentById(input.documentId);
      if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      if (document.verificationStatus !== "approved") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only approved evidence can be revoked" });
      }
      await db.revokeVerificationDocument(input.documentId, ctx.user.id, input.reason);
      await db.syncProviderIdentityCompatibilityStatus(document.providerId);
      await createAuditEntry({
        actorId: ctx.user.id,
        action: "verification_document_revoked",
        targetType: "document",
        targetId: input.documentId,
        details: {
          providerId: document.providerId,
          evidenceType: document.documentType,
          previousState: "approved",
          newState: "revoked",
          reason: input.reason,
        },
      });
      await notifyEvidenceDecision(document, "revoked", input.reason);
      return { success: true, state: "revoked" as const };
    }),
});
