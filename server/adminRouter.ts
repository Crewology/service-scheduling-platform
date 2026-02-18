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
  // Get platform statistics
  getStats: adminProcedure.query(async () => {
    const db_instance = await db.getDb();
    if (!db_instance) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    }

    // TODO: Implement actual stats queries
    return {
      totalUsers: 0,
      newUsersThisMonth: 0,
      totalProviders: 0,
      pendingVerifications: 0,
      totalBookings: 0,
      bookingsThisMonth: 0,
      totalRevenue: 0,
      revenueThisMonth: 0,
    };
  }),

  // List all users
  listUsers: adminProcedure.query(async () => {
    return await db.getAllUsers();
  }),

  // List all providers
  listProviders: adminProcedure.query(async () => {
    return await db.getAllProviders();
  }),

  // List all bookings
  listBookings: adminProcedure.query(async () => {
    return await db.getAllBookings();
  }),

  // Suspend a user
  suspendUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      // TODO: Implement user suspension logic
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
      // TODO: Send notification to provider with rejection reason
      return { success: true };
    }),
});
