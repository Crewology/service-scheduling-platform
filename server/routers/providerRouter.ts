import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const providerRouter = router({
  create: protectedProcedure
    .input(z.object({
      businessName: z.string(),
      businessType: z.enum(["sole_proprietor", "llc", "corporation", "partnership"]),
      description: z.string().optional(),
      addressLine1: z.string().optional(),
      addressLine2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      serviceRadiusMiles: z.number().optional(),
      acceptsMobile: z.boolean().default(false),
      acceptsFixedLocation: z.boolean().default(true),
      acceptsVirtual: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.getProviderByUserId(ctx.user.id);
      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Provider profile already exists" });
      }
      await db.createServiceProvider({ userId: ctx.user.id, ...input });
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create provider" });
      return provider;
    }),
    
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    return await db.getProviderByUserId(ctx.user.id);
  }),
  
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getProviderById(input.id);
    }),
    
  getMine: protectedProcedure.query(async ({ ctx }) => {
    return await db.getProviderByUserId(ctx.user.id);
  }),
    
  list: publicProcedure
    .input(z.object({
      city: z.string().optional(),
      state: z.string().optional(),
      isActive: z.boolean().optional(),
    }).optional())
    .query(async ({ input }) => {
      return await db.getAllProviders(input || {});
    }),

  listFeatured: publicProcedure.query(async () => {
    return await db.getAllProviders({ isActive: true });
  }),

  update: protectedProcedure
    .input(z.object({
      businessName: z.string().optional(),
      description: z.string().optional(),
      addressLine1: z.string().optional(),
      addressLine2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      serviceRadiusMiles: z.number().optional(),
      acceptsMobile: z.boolean().optional(),
      acceptsFixedLocation: z.boolean().optional(),
      acceptsVirtual: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      await db.updateProviderProfile(provider.id, input);
      const updated = await db.getProviderByUserId(ctx.user.id);
      return updated!;
    }),

  earnings: protectedProcedure.query(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
    return await db.getProviderEarnings(provider.id);
  }),

  analytics: protectedProcedure.query(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
    const [bookingTrends, topServices, customerRetention, bookingSources, refundAnalytics] = await Promise.all([
      db.getBookingTrends(provider.id),
      db.getTopServices(provider.id),
      db.getCustomerRetention(provider.id),
      db.getBookingSourceAnalytics(provider.id),
      db.getRefundAnalytics(provider.id),
    ]);
    return { bookingTrends, topServices, customerRetention, bookingSources, refundAnalytics };
  }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const provider = await db.getProviderBySlug(input.slug);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
      const providerServices = await db.getServicesByProvider(provider.id);
      const providerReviews = await db.getProviderReviewsPublic(provider.id);
      return { provider, services: providerServices, reviews: providerReviews };
    }),

  generateSlug: protectedProcedure.mutation(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
    const baseSlug = provider.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const slug = `${baseSlug}-${provider.id}`;
    await db.updateProviderSlug(provider.id, slug);
    return { slug };
  }),

  updateSlug: protectedProcedure
    .input(z.object({ slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/) }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      const tier = await db.getProviderTier(provider.id);
      if (tier === "free") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Custom profile URLs are available on the Professional plan and above. Upgrade to customize your link." });
      }
      const existing = await db.getProviderBySlug(input.slug);
      if (existing && existing.id !== provider.id) {
        throw new TRPCError({ code: "CONFLICT", message: "This URL is already taken" });
      }
      await db.updateProviderSlug(provider.id, input.slug);
      return { slug: input.slug };
    }),

  getPublicServices: publicProcedure
    .input(z.object({ providerId: z.number() }))
    .query(async ({ input }) => {
      return await db.getServicesByProvider(input.providerId);
    }),

  getCalendarFeedUrl: protectedProcedure
    .query(async ({ ctx }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      const { generateCalendarToken } = await import("../calendarFeed");
      const token = generateCalendarToken(provider.id);
      const origin = ctx.req.headers.origin || ctx.req.headers.host || "";
      const protocol = ctx.req.headers["x-forwarded-proto"] || "https";
      const baseUrl = origin.startsWith("http") ? origin : `${protocol}://${origin}`;
      return {
        feedUrl: `${baseUrl}/api/calendar/${token}/feed.ics`,
        googleCalUrl: `https://calendar.google.com/calendar/r?cid=webcal://${(origin.startsWith("http") ? origin.replace(/^https?:\/\//, "") : origin)}/api/calendar/${token}/feed.ics`,
        token,
      };
    }),
});
