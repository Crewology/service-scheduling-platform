import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const availabilityRouter = router({
  getSchedule: publicProcedure
    .input(z.object({ providerId: z.number() }))
    .query(async ({ input }) => {
      return await db.getProviderAvailability(input.providerId);
    }),
    
  createSchedule: protectedProcedure
    .input(z.object({
      dayOfWeek: z.number().min(0).max(6),
      startTime: z.string(),
      endTime: z.string(),
      isAvailable: z.boolean().default(true),
      locationType: z.enum(["mobile", "fixed_location", "virtual"]).optional(),
      maxConcurrentBookings: z.number().default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      
      await db.createAvailabilitySchedule({ providerId: provider.id, ...input });
      const schedules = await db.getProviderAvailability(provider.id);
      const created = schedules.find(s => s.dayOfWeek === input.dayOfWeek && s.startTime === input.startTime);
      return created || schedules[schedules.length - 1]!;
    }),
    
  getMySchedule: protectedProcedure.query(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider) return [];
    return await db.getProviderAvailability(provider.id);
  }),
    
  getMyOverrides: protectedProcedure.query(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider) return [];
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return await db.getProviderOverrides(provider.id, startDate, endDate);
  }),
    
  getOverrides: publicProcedure
    .input(z.object({
      providerId: z.number(),
      startDate: z.string(),
      endDate: z.string(),
    }))
    .query(async ({ input }) => {
      return await db.getProviderOverrides(input.providerId, input.startDate, input.endDate);
    }),
    
  createOverride: protectedProcedure
    .input(z.object({
      overrideDate: z.string(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      isAvailable: z.boolean(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      
      await db.createAvailabilityOverride({
        providerId: provider.id,
        overrideDate: new Date(input.overrideDate).toISOString().split('T')[0],
        startTime: input.startTime,
        endTime: input.endTime,
        isAvailable: input.isAvailable,
        reason: input.reason,
      });
      
      return { success: true };
    }),

  deleteSchedule: protectedProcedure
    .input(z.object({ scheduleId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      await db.deleteAvailabilitySchedule(input.scheduleId);
      return { success: true };
    }),

  deleteOverride: protectedProcedure
    .input(z.object({ overrideId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      await db.deleteAvailabilityOverride(input.overrideId);
      return { success: true };
    }),
});
