import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

/**
 * Widget Router — public endpoints for embeddable booking widgets.
 * All procedures are public (no auth required) since widgets run on external sites.
 */
export const widgetRouter = router({
  // Get provider info for widget header
  getProviderInfo: publicProcedure
    .input(z.object({ providerId: z.number() }))
    .query(async ({ input }) => {
      const provider = await db.getProviderById(input.providerId);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
      return {
        id: provider.id,
        businessName: provider.businessName,
        city: provider.city,
        state: provider.state,
        profileSlug: provider.profileSlug,
        trustLevel: provider.trustLevel || 'new',
      };
    }),

  // Get services for a provider (for widget service selector)
  getProviderServices: publicProcedure
    .input(z.object({ providerId: z.number() }))
    .query(async ({ input }) => {
      const services = await db.getServicesByProvider(input.providerId);
      return services.map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        basePrice: s.basePrice,
        hourlyRate: s.hourlyRate,
        durationMinutes: s.durationMinutes,
        pricingModel: s.pricingModel,
        isActive: s.isActive,
      })).filter((s: any) => s.isActive);
    }),

  // Get a single service for direct service widget
  getService: publicProcedure
    .input(z.object({ serviceId: z.number() }))
    .query(async ({ input }) => {
      const service = await db.getServiceById(input.serviceId);
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });
      const provider = await db.getProviderById(service.providerId);
      return {
        service: {
          id: service.id,
          name: service.name,
          description: service.description,
          basePrice: service.basePrice,
          hourlyRate: service.hourlyRate,
          durationMinutes: service.durationMinutes,
          pricingModel: service.pricingModel,
        },
        provider: provider ? {
          id: provider.id,
          businessName: provider.businessName,
          city: provider.city,
          state: provider.state,
        } : null,
      };
    }),

  // Get availability schedule for widget calendar
  getAvailability: publicProcedure
    .input(z.object({
      providerId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const schedule = await db.getProviderAvailability(input.providerId);
      const start = input.startDate || new Date().toISOString().split("T")[0];
      const end = input.endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const overrides = await db.getProviderOverrides(input.providerId, start, end);
      return { schedule, overrides };
    }),

  // Get existing bookings for conflict checking
  getBookedSlots: publicProcedure
    .input(z.object({
      providerId: z.number(),
      date: z.string(),
    }))
    .query(async ({ input }) => {
      const bookings = await db.getBookingsByDateRange(input.providerId, input.date, input.date);
      return bookings
        .filter((b: any) => ["pending", "confirmed", "in_progress"].includes(b.status))
        .map((b: any) => ({
          bookingDate: b.bookingDate,
          bookingTime: b.bookingTime,
          status: b.status,
        }));
    }),

  // Get widget configuration for a provider
  getWidgetConfig: publicProcedure
    .input(z.object({ providerId: z.number() }))
    .query(async ({ input }) => {
      const provider = await db.getProviderById(input.providerId);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
      const services = await db.getServicesByProvider(input.providerId);
      const activeServices = services.filter((s: any) => s.isActive);
      return {
        providerId: provider.id,
        businessName: provider.businessName,
        serviceCount: activeServices.length,
        hasAvailability: true,
      };
    }),
});
