import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getOrCreateReferralCode,
  getReferralCodeByCode,
  validateReferralCode,
  createReferral,
  getReferralStats,
  getReferralHistory,
  updateReferralCode,
  getReferralCodeByUserId,
} from "./db/referrals";

export const referralRouter = router({
  /**
   * Get or create the current user's referral code.
   */
  getMyCode: protectedProcedure.query(async ({ ctx }) => {
    const code = await getOrCreateReferralCode(ctx.user.id);
    return code;
  }),

  /**
   * Get referral stats for the current user (as referrer).
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    return getReferralStats(ctx.user.id);
  }),

  /**
   * Get referral history for the current user (as referrer).
   */
  getHistory: protectedProcedure.query(async ({ ctx }) => {
    return getReferralHistory(ctx.user.id);
  }),

  /**
   * Validate a referral code (for use during booking).
   */
  validate: protectedProcedure
    .input(z.object({
      code: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await validateReferralCode(input.code, ctx.user.id);
      if (!result.valid) {
        return {
          valid: false,
          error: result.error,
        };
      }
      return {
        valid: true,
        referrerDiscountPercent: result.referralCode!.referrerDiscountPercent,
        refereeDiscountPercent: result.referralCode!.refereeDiscountPercent,
        referralCodeId: result.referralCode!.id,
        referrerId: result.referralCode!.userId,
      };
    }),

  /**
   * Apply a referral code during booking (creates the referral record).
   */
  applyCode: protectedProcedure
    .input(z.object({
      referralCodeId: z.number(),
      referrerId: z.number(),
      bookingId: z.number().optional(),
      discountAmount: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await createReferral({
        referralCodeId: input.referralCodeId,
        referrerId: input.referrerId,
        refereeId: ctx.user.id,
        refereeBookingId: input.bookingId,
        refereeDiscountAmount: input.discountAmount,
      });
      return { success: true };
    }),

  /**
   * Update referral code settings (owner only).
   */
  updateSettings: protectedProcedure
    .input(z.object({
      referrerDiscountPercent: z.number().min(1).max(50).optional(),
      refereeDiscountPercent: z.number().min(1).max(50).optional(),
      maxReferrals: z.number().int().positive().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const code = await getReferralCodeByUserId(ctx.user.id);
      if (!code) throw new TRPCError({ code: "NOT_FOUND", message: "No referral code found" });
      await updateReferralCode(code.id, input);
      return { success: true };
    }),

  /**
   * Public: look up referral code info (for sharing links).
   */
  lookup: publicProcedure
    .input(z.object({
      code: z.string().min(1),
    }))
    .query(async ({ input }) => {
      const refCode = await getReferralCodeByCode(input.code);
      if (!refCode || !refCode.isActive) return null;
      return {
        code: refCode.code,
        refereeDiscountPercent: refCode.refereeDiscountPercent,
      };
    }),
});
