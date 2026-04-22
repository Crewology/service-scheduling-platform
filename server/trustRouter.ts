import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";

export const trustRouter = router({
  /**
   * Get the trust score for a specific provider (public)
   */
  getProviderTrust: publicProcedure
    .input(z.object({ providerId: z.number() }))
    .query(async ({ input }) => {
      const trust = await db.getProviderTrustScore(input.providerId);
      return trust;
    }),

  /**
   * Get my trust score (for the logged-in provider)
   */
  getMyTrustScore: protectedProcedure.query(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider) return null;

    const trust = await db.getProviderTrustScore(provider.id);
    return trust;
  }),

  /**
   * Recalculate my trust score (for the logged-in provider)
   */
  recalculateMyTrust: protectedProcedure.mutation(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Provider profile not found" });
    }

    const result = await db.updateProviderTrustScore(provider.id);
    if (!result) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to calculate trust score" });
    }

    return result;
  }),

  /**
   * Get trust score breakdown with tips for improvement (for the logged-in provider)
   */
  getMyTrustBreakdown: protectedProcedure.query(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider) return null;

    const input = await db.gatherTrustScoreInput(provider.id);
    if (!input) return null;

    const { calculateTrustScore } = await import("../shared/trustScore");
    const result = calculateTrustScore(input);

    // Generate improvement tips based on what's missing
    const tips: { category: string; tip: string; points: number }[] = [];

    if (!input.hasProfilePhoto) {
      tips.push({ category: "profile", tip: "Add a profile photo", points: 5 });
    }
    if (!input.hasDescription) {
      tips.push({ category: "profile", tip: "Write a detailed business description", points: 5 });
    }
    if (!input.hasAddress) {
      tips.push({ category: "profile", tip: "Add your business address", points: 4 });
    }
    if (input.activeServiceCount < 3) {
      const needed = 3 - input.activeServiceCount;
      tips.push({ category: "profile", tip: `Add ${needed} more service${needed > 1 ? "s" : ""} to your profile`, points: needed > 1 ? 5 : 3 });
    }
    if (!input.hasPortfolioItems) {
      tips.push({ category: "profile", tip: "Add portfolio items to showcase your work", points: 0 });
    }
    if (input.stripeAccountStatus !== "active") {
      tips.push({ category: "payment", tip: "Complete your Stripe payment setup", points: 8 });
    }
    if (!input.stripeOnboardingComplete) {
      tips.push({ category: "payment", tip: "Finish Stripe onboarding verification", points: 6 });
    }
    if (!input.payoutEnabled) {
      tips.push({ category: "payment", tip: "Enable payouts on your Stripe account", points: 6 });
    }
    if (input.totalCompletedBookings < 5) {
      tips.push({ category: "bookings", tip: "Complete more bookings to build your track record", points: 12 });
    }
    if (input.totalReviews < 3) {
      tips.push({ category: "reviews", tip: "Ask satisfied customers to leave reviews", points: 8 });
    }

    return {
      ...result,
      tips: tips.sort((a, b) => b.points - a.points).slice(0, 5),
    };
  }),

  /**
   * Admin: Recalculate all provider trust scores
   */
  recalculateAll: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
    }
    const count = await db.recalculateAllTrustScores();
    return { updated: count };
  }),
});
