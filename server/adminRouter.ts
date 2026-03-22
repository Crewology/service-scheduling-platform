import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

// Admin-only procedure that checks if user has admin role
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({ ctx });
});

export const adminRouter = router({
  // Get platform statistics (real data)
  getStats: adminProcedure.query(async () => {
    return await db.getAdminStats();
  }),

  // List all users (with optional pagination)
  listUsers: adminProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(50),
    }).optional())
    .query(async ({ input }) => {
      const allUsers = await db.getAllUsers();
      if (!input) return allUsers;
      const offset = (input.page - 1) * input.limit;
      return allUsers.slice(offset, offset + input.limit);
    }),

  // List all providers
  listProviders: adminProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(50),
    }).optional())
    .query(async ({ input }) => {
      const allProviders = await db.getAllProviders();
      if (!input) return allProviders;
      const offset = (input.page - 1) * input.limit;
      return allProviders.slice(offset, offset + input.limit);
    }),

  // List all bookings (with optional pagination)
  listBookings: adminProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(50),
    }).optional())
    .query(async ({ input }) => {
      const allBookings = await db.getAllBookings();
      if (!input) return allBookings;
      const offset = (input.page - 1) * input.limit;
      return allBookings.slice(offset, offset + input.limit);
    }),

  // Suspend a user (sets deletedAt timestamp)
  suspendUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      const user = await db.getUserById(input.userId);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      if (user.role === "admin") throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot suspend admin users" });
      await db.suspendUser(input.userId);
      return { success: true };
    }),

  // Unsuspend a user
  unsuspendUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      await db.unsuspendUser(input.userId);
      return { success: true };
    }),

  // Verify a provider
  verifyProvider: adminProcedure
    .input(z.object({ providerId: z.number() }))
    .mutation(async ({ input }) => {
      await db.updateProviderVerification(input.providerId, "verified");
      return { success: true };
    }),

  // Reject provider verification
  rejectProvider: adminProcedure
    .input(z.object({ providerId: z.number(), reason: z.string() }))
    .mutation(async ({ input }) => {
      await db.updateProviderVerification(input.providerId, "rejected");
      return { success: true };
    }),

  // Get subscription analytics
  getSubscriptionAnalytics: adminProcedure.query(async () => {
    return await db.getSubscriptionAnalytics();
  }),

  // Get booking source analytics (widget vs direct)
  getBookingSourceAnalytics: adminProcedure.query(async () => {
    return await db.getAdminBookingSourceAnalytics();
  }),

  // Manually trigger reminder processing
  triggerReminders: adminProcedure.mutation(async () => {
    const { processReminders } = await import("./reminderService");
    const result = await processReminders();
    return result;
  }),

  // Update provider verification status (flexible)
  updateProviderVerification: adminProcedure
    .input(z.object({
      providerId: z.number(),
      verificationStatus: z.enum(["pending", "verified", "rejected"]),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await db.updateProviderVerification(input.providerId, input.verificationStatus);
      const provider = await db.getProviderById(input.providerId);
      return provider;
    }),

  // Review Moderation
  listReviews: adminProcedure
    .input(z.object({ flaggedOnly: z.boolean().default(false) }).optional())
    .query(async ({ input }) => {
      return await db.getAllReviewsForAdmin(input?.flaggedOnly ?? false);
    }),

  flagReview: adminProcedure
    .input(z.object({ reviewId: z.number(), reason: z.string() }))
    .mutation(async ({ input }) => {
      await db.flagReview(input.reviewId, input.reason);
      return { success: true };
    }),

  unflagReview: adminProcedure
    .input(z.object({ reviewId: z.number() }))
    .mutation(async ({ input }) => {
      await db.unflagReview(input.reviewId);
      return { success: true };
    }),

  hideReview: adminProcedure
    .input(z.object({ reviewId: z.number() }))
    .mutation(async ({ input }) => {
      await db.hideReview(input.reviewId);
      return { success: true };
    }),

  deleteReview: adminProcedure
    .input(z.object({ reviewId: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteReview(input.reviewId);
      return { success: true };
    }),
});
