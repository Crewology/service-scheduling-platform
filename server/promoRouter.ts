import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

export const promoRouter = router({
  // Provider: create a promo code
  create: protectedProcedure
    .input(z.object({
      code: z.string().min(3).max(50).transform(v => v.toUpperCase().replace(/[^A-Z0-9]/g, "")),
      description: z.string().optional(),
      discountType: z.enum(["percentage", "fixed"]),
      discountValue: z.number().positive(),
      minOrderAmount: z.number().min(0).optional(),
      maxDiscountAmount: z.number().positive().optional(),
      maxRedemptions: z.number().int().positive().optional(),
      maxRedemptionsPerUser: z.number().int().positive().default(1),
      validUntil: z.string().optional(), // ISO date string
      appliesToAllServices: z.boolean().default(true),
      serviceIds: z.array(z.number()).optional(),
      codeType: z.enum(["promo", "referral"]).default("promo"),
    }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });

      // Check for duplicate code
      const existing = await db.getPromoCodeByCode(input.code);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "A promo code with this name already exists" });

      // Validate percentage
      if (input.discountType === "percentage" && input.discountValue > 100) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Percentage discount cannot exceed 100%" });
      }

      const promo = await db.createPromoCode({
        providerId: provider.id,
        code: input.code,
        description: input.description,
        discountType: input.discountType,
        discountValue: input.discountValue.toString(),
        minOrderAmount: input.minOrderAmount?.toString(),
        maxDiscountAmount: input.maxDiscountAmount?.toString(),
        maxRedemptions: input.maxRedemptions,
        maxRedemptionsPerUser: input.maxRedemptionsPerUser,
        validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
        appliesToAllServices: input.appliesToAllServices,
        serviceIds: input.serviceIds ? JSON.stringify(input.serviceIds) : undefined,
        codeType: input.codeType,
      });

      return promo;
    }),

  // Provider: list their promo codes
  list: protectedProcedure
    .query(async ({ ctx }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      return await db.getPromoCodesByProvider(provider.id);
    }),

  // Provider: update a promo code
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      description: z.string().optional(),
      maxRedemptions: z.number().int().positive().optional(),
      maxRedemptionsPerUser: z.number().int().positive().optional(),
      validUntil: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      
      const promo = await db.getPromoCodeById(input.id);
      if (!promo || promo.providerId !== provider.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Promo code not found" });
      }

      const updateData: any = {};
      if (input.description !== undefined) updateData.description = input.description;
      if (input.maxRedemptions !== undefined) updateData.maxRedemptions = input.maxRedemptions;
      if (input.maxRedemptionsPerUser !== undefined) updateData.maxRedemptionsPerUser = input.maxRedemptionsPerUser;
      if (input.validUntil !== undefined) updateData.validUntil = input.validUntil ? new Date(input.validUntil) : null;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      await db.updatePromoCode(input.id, updateData);
      return await db.getPromoCodeById(input.id);
    }),

  // Provider: delete a promo code
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      
      const promo = await db.getPromoCodeById(input.id);
      if (!promo || promo.providerId !== provider.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Promo code not found" });
      }

      await db.deletePromoCode(input.id);
      return { success: true };
    }),

  // Provider: view redemptions for a promo code
  getRedemptions: protectedProcedure
    .input(z.object({ promoCodeId: z.number() }))
    .query(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      
      const promo = await db.getPromoCodeById(input.promoCodeId);
      if (!promo || promo.providerId !== provider.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Promo code not found" });
      }

      return await db.getPromoRedemptionsByPromo(input.promoCodeId);
    }),

  // Customer: validate a promo code before booking
  validate: protectedProcedure
    .input(z.object({
      code: z.string(),
      serviceId: z.number().optional(),
      orderAmount: z.number().positive(),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const promo = await db.validatePromoCode(input.code, ctx.user.id, input.serviceId);
        const discount = db.calculatePromoDiscount(promo, input.orderAmount);
        return {
          valid: true,
          promoCodeId: promo.id,
          code: promo.code,
          discountType: promo.discountType,
          discountValue: promo.discountValue,
          discountAmount: discount,
          finalAmount: Math.max(0, input.orderAmount - discount),
          description: promo.description,
        };
      } catch (error) {
        return {
          valid: false,
          error: (error as Error).message,
          promoCodeId: null,
          code: input.code,
          discountType: null,
          discountValue: null,
          discountAmount: 0,
          finalAmount: input.orderAmount,
          description: null,
        };
      }
    }),

  // Customer: apply a promo code to a booking (called during booking creation)
  redeem: protectedProcedure
    .input(z.object({
      code: z.string(),
      bookingId: z.number(),
      orderAmount: z.number().positive(),
      serviceId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const promo = await db.validatePromoCode(input.code, ctx.user.id, input.serviceId);
      const discount = db.calculatePromoDiscount(promo, input.orderAmount);
      
      if (discount <= 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Promo code does not apply to this order" });
      }

      await db.createPromoRedemption({
        promoCodeId: promo.id,
        userId: ctx.user.id,
        bookingId: input.bookingId,
        discountAmount: discount.toString(),
      });

      return {
        success: true,
        discountAmount: discount,
        finalAmount: Math.max(0, input.orderAmount - discount),
      };
    }),
});
