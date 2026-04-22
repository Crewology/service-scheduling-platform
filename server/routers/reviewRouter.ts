import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const reviewRouter = router({
  listByProvider: publicProcedure
    .input(z.object({ 
      providerId: z.number(),
      page: z.number().default(1),
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      const allReviews = await db.getReviewsByProviderId(input.providerId);
      const offset = (input.page - 1) * input.limit;
      return allReviews.slice(offset, offset + input.limit);
    }),
  
  addResponse: protectedProcedure
    .input(z.object({
      reviewId: z.number(),
      responseText: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const review = await db.getReviewById(input.reviewId);
      if (!review) throw new TRPCError({ code: "NOT_FOUND", message: "Review not found" });
      
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider || provider.id !== review.providerId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the provider can respond" });
      }
      
      await db.addReviewResponse(input.reviewId, input.responseText);
      const updated = await db.getReviewById(input.reviewId);
      return updated!;
    }),
  
  create: protectedProcedure
    .input(z.object({
      bookingId: z.number(),
      providerId: z.number().optional(),
      rating: z.number().min(1).max(5),
      reviewText: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const booking = await db.getBookingById(input.bookingId);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      if (booking.customerId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Only the customer can review" });
      if (booking.status !== "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "Can only review completed bookings" });
      
      const existing = await db.getReviewByBookingId(input.bookingId);
      if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Review already exists" });
      
      const providerId = input.providerId || booking.providerId;
      await db.createReview({
        bookingId: input.bookingId,
        customerId: ctx.user.id,
        providerId,
        rating: input.rating,
        reviewText: input.reviewText,
      });
      
      const created = await db.getReviewByBookingId(input.bookingId);

      // Recalculate provider trust score after new review
      try {
        await db.updateProviderTrustScore(providerId);
      } catch (trustErr) {
        console.error("[TrustScore] Recalculation after review failed (non-blocking):", trustErr);
      }

      return created!;
    }),
});
