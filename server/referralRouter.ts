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
  getReferralCreditBalance,
  getReferralCreditHistory,
  spendReferralCredits,
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

      // Send referral email notifications (non-blocking)
      try {
        const { sendNotification } = await import("./notifications");
        const { getUserById } = await import("./db/users");
        const referrer = await getUserById(input.referrerId);
        const referee = ctx.user;

        // Get the referral code for discount info
        const refCode = await getReferralCodeByCode(
          (await getReferralCodeByUserId(input.referrerId))?.code || ""
        );

        // Email to referrer: someone signed up using their code
        if (referrer?.email) {
          await sendNotification({
            type: "referral_signup",
            channel: "email",
            recipient: { userId: referrer.id, email: referrer.email, name: referrer.name || "User" },
            data: {
              referrerName: referrer.name || "User",
              refereeName: referee.name || "New User",
            },
          });
        }

        // Email to referee: welcome with referral info
        if (referee.email) {
          await sendNotification({
            type: "referral_welcome",
            channel: "email",
            recipient: { userId: referee.id, email: referee.email, name: referee.name || "User" },
            data: {
              refereeName: referee.name || "User",
              referrerName: referrer?.name || "A friend",
              discountPercent: refCode?.refereeDiscountPercent || 10,
            },
          });
        }
      } catch (emailErr) {
        console.error("[Referral] Email notification failed (non-blocking):", emailErr);
      }

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
   * Get the current user's referral credit balance.
   */
  getCreditBalance: protectedProcedure.query(async ({ ctx }) => {
    const balance = await getReferralCreditBalance(ctx.user.id);
    return { balance };
  }),

  /**
   * Get the current user's referral credit history.
   */
  getCreditHistory: protectedProcedure.query(async ({ ctx }) => {
    return getReferralCreditHistory(ctx.user.id);
  }),

  /**
   * Spend referral credits on a booking.
   */
  spendCredits: protectedProcedure
    .input(z.object({
      bookingId: z.number(),
      maxAmount: z.number().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      const spent = await spendReferralCredits(ctx.user.id, input.bookingId, input.maxAmount);
      return { spent };
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
