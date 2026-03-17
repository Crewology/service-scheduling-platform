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

  // Suspend a user
  suspendUser: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
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
});
