import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

export const verificationRouter = router({
  // Provider: Upload a verification document
  upload: protectedProcedure
    .input(z.object({
      documentType: z.enum(["identity", "business_license", "insurance", "background_check"]),
      documentData: z.string(), // base64 encoded
      contentType: z.string().default("application/pdf"),
      expirationDate: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });

      const { storagePut } = await import("./storage");
      const buffer = Buffer.from(input.documentData, "base64");
      const ext = input.contentType.includes("pdf") ? "pdf" : input.contentType.split("/")[1] || "pdf";
      const suffix = Math.random().toString(36).substring(2, 10);
      const fileKey = `verification-docs/${provider.id}/${input.documentType}-${Date.now()}-${suffix}.${ext}`;
      const { url } = await storagePut(fileKey, buffer, input.contentType);

      const docId = await db.uploadVerificationDocument({
        providerId: provider.id,
        documentType: input.documentType,
        documentUrl: url,
        expirationDate: input.expirationDate,
      });

      return { id: docId, url, documentType: input.documentType, status: "pending" };
    }),

  // Provider: List my documents
  myDocuments: protectedProcedure.query(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider) return [];
    return await db.getProviderDocuments(provider.id);
  }),

  // Provider: Delete a verification document
  deleteDocument: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });

      const doc = await db.getDocumentById(input.documentId);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      if (doc.providerId !== provider.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own documents" });
      }

      await db.deleteVerificationDocument(input.documentId);
      return { success: true };
    }),

  // Admin: List all documents (optionally filtered by status)
  listAll: adminProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      return await db.getAllDocumentsForAdmin(input?.status);
    }),

  // Admin: List pending documents
  listPending: adminProcedure.query(async () => {
    return await db.getAllPendingDocuments();
  }),

  // Admin: Review (approve/reject) a document
  review: adminProcedure
    .input(z.object({
      documentId: z.number(),
      status: z.enum(["approved", "rejected"]),
      rejectionReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const doc = await db.getDocumentById(input.documentId);
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });

      await db.reviewVerificationDocument(
        input.documentId,
        input.status,
        ctx.user.id,
        input.rejectionReason,
      );

      // If all documents are approved, auto-verify the provider
      if (input.status === "approved") {
        const allDocs = await db.getProviderDocuments(doc.providerId);
        const allApproved = allDocs.every(d => 
          d.id === input.documentId ? true : d.verificationStatus === "approved"
        );
        if (allApproved && allDocs.length >= 2) {
          await db.updateProviderVerification(doc.providerId, "verified");
        }
      }

      return { success: true, status: input.status };
    }),
});
