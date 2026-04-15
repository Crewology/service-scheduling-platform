import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { notifyOwner } from "./_core/notification";
import { sendNotification } from "./notifications";

export const contactRouter = router({
  /**
   * Submit a contact form (public — no login required)
   */
  submit: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required").max(200),
        email: z.string().email("Please enter a valid email address").max(320),
        subject: z.string().min(1, "Subject is required").max(500),
        category: z.enum(["general", "booking", "payment", "provider", "technical", "other"]),
        message: z.string().min(10, "Message must be at least 10 characters").max(5000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id;

      // Store in database
      const result = await db.createContactSubmission({
        name: input.name,
        email: input.email,
        subject: input.subject,
        category: input.category,
        message: input.message,
        userId: userId,
      });

      // Notify the platform owner
      const categoryLabel = getCategoryLabel(input.category);

      try {
        await notifyOwner({
          title: `New Contact Form: ${input.subject}`,
          content: [
            `**From:** ${input.name} (${input.email})`,
            `**Category:** ${categoryLabel}`,
            `**Subject:** ${input.subject}`,
            ``,
            `**Message:**`,
            input.message,
            ``,
            `---`,
            `Submission ID: #${result.id}`,
            userId ? `Logged-in User ID: ${userId}` : `Guest submission`,
          ].join("\n"),
        });
      } catch (err) {
        console.warn("[Contact] Failed to notify owner:", err);
      }

      // Send confirmation email to the submitter
      try {
        await sendNotification({
          type: "booking_confirmed",
          channel: "email",
          recipient: {
            userId: userId ?? 0,
            email: input.email,
            name: input.name,
          },
          data: {
            customerName: input.name,
            message: [
              `Thank you for contacting OlogyCrew Support!`,
              ``,
              `We've received your message and will get back to you as soon as possible.`,
              ``,
              `**Your submission details:**`,
              `- **Subject:** ${input.subject}`,
              `- **Category:** ${categoryLabel}`,
              `- **Reference #:** ${result.id}`,
              ``,
              `If you need immediate assistance, you can reach us at:`,
              `- **Email:** garychisolm30@gmail.com`,
              `- **Phone:** (678) 525-0891`,
              ``,
              `We typically respond within 24-48 hours.`,
            ].join("\n"),
          },
        });
      } catch (err) {
        console.warn("[Contact] Failed to send confirmation email:", err);
      }

      return { success: true, id: result.id };
    }),

  /**
   * List contact submissions (admin only) — with optional filters
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).optional().default(100),
        status: z.enum(["new", "in_progress", "resolved", "closed"]).optional(),
        category: z.enum(["general", "booking", "payment", "provider", "technical", "other"]).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      if (input?.status || input?.category) {
        return db.getContactSubmissionsFiltered({
          status: input.status,
          category: input.category,
          limit: input.limit,
        });
      }
      return db.getContactSubmissions(input?.limit ?? 100);
    }),

  /**
   * Get a single contact submission by ID (admin only)
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const submission = await db.getContactSubmissionById(input.id);
      if (!submission) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
      }
      return submission;
    }),

  /**
   * Get submission stats (admin only)
   */
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return db.getContactSubmissionStats();
    }),

  /**
   * Update submission status (admin only)
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["new", "in_progress", "resolved", "closed"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      await db.updateContactSubmissionStatus(input.id, input.status);
      return { success: true };
    }),

  /**
   * Reply to a contact submission (admin only)
   * Sends an email to the submitter and stores the reply in the database
   */
  reply: protectedProcedure
    .input(
      z.object({
        submissionId: z.number(),
        message: z.string().min(1, "Reply message is required").max(10000),
        templateId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }

      // Get the original submission
      const submission = await db.getContactSubmissionById(input.submissionId);
      if (!submission) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Submission not found" });
      }

      // Send reply email to the submitter
      let emailSent = false;
      try {
        const result = await sendNotification({
          type: "booking_confirmed", // reuse generic email type
          channel: "email",
          recipient: {
            userId: submission.userId ?? 0,
            email: submission.email,
            name: submission.name,
          },
          data: {
            customerName: submission.name,
            message: [
              `Hello ${submission.name},`,
              ``,
              `Thank you for reaching out to OlogyCrew Support. Here is our response to your inquiry:`,
              ``,
              `---`,
              ``,
              input.message,
              ``,
              `---`,
              ``,
              `**Original inquiry:** ${submission.subject}`,
              `**Reference #:** ${submission.id}`,
              ``,
              `If you have further questions, simply reply to this email or submit a new inquiry at our Help Center.`,
              ``,
              `Best regards,`,
              `OlogyCrew Support Team`,
            ].join("\n"),
          },
        });
        emailSent = result;
      } catch (err) {
        console.warn("[Contact] Failed to send reply email:", err);
      }

      // Store the reply
      const reply = await db.createContactReply({
        submissionId: input.submissionId,
        adminUserId: ctx.user.id,
        message: input.message,
        templateId: input.templateId,
        emailSent,
      });

      // If template was used, increment its usage count
      if (input.templateId) {
        try {
          await db.incrementTemplateUsage(input.templateId);
        } catch (err) {
          console.warn("[Contact] Failed to increment template usage:", err);
        }
      }

      // Auto-update status to in_progress if still "new"
      if (submission.status === "new") {
        await db.updateContactSubmissionStatus(input.submissionId, "in_progress");
      }

      return { success: true, id: reply.id, emailSent };
    }),

  /**
   * Get replies for a submission (admin only)
   */
  getReplies: protectedProcedure
    .input(z.object({ submissionId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return db.getContactReplies(input.submissionId);
    }),

  // ─── Reply Templates ──────────────────────────────────────────────────────

  /**
   * List reply templates (admin only)
   */
  listTemplates: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return db.getReplyTemplates(input?.category);
    }),

  /**
   * Create a reply template (admin only)
   */
  createTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        category: z.enum(["general", "booking", "payment", "provider", "technical", "other"]),
        subject: z.string().min(1).max(500),
        body: z.string().min(1).max(10000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const result = await db.createReplyTemplate({
        ...input,
        createdBy: ctx.user.id,
      });
      return { success: true, id: result.id };
    }),

  /**
   * Update a reply template (admin only)
   */
  updateTemplate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(200).optional(),
        category: z.enum(["general", "booking", "payment", "provider", "technical", "other"]).optional(),
        subject: z.string().min(1).max(500).optional(),
        body: z.string().min(1).max(10000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const { id, ...data } = input;
      await db.updateReplyTemplate(id, data);
      return { success: true };
    }),

  /**
   * Delete a reply template (soft delete — admin only)
   */
  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      await db.deleteReplyTemplate(input.id);
      return { success: true };
    }),
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function getCategoryLabel(category: string): string {
  return {
    general: "General Inquiry",
    booking: "Booking Issue",
    payment: "Payment & Billing",
    provider: "Provider Support",
    technical: "Technical Issue",
    other: "Other",
  }[category] || "Other";
}
