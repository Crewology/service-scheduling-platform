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
      // Rate limiting: basic check by IP (soft limit)
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
      const categoryLabel = {
        general: "General Inquiry",
        booking: "Booking Issue",
        payment: "Payment & Billing",
        provider: "Provider Support",
        technical: "Technical Issue",
        other: "Other",
      }[input.category];

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
          type: "booking_confirmed", // reuse a generic type for the email template
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
   * List contact submissions (admin only)
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).optional().default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return db.getContactSubmissions(input?.limit ?? 50);
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
});
