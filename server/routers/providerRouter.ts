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
      categoryIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.getProviderByUserId(ctx.user.id);
      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Provider profile already exists" });
      }
      const { categoryIds, ...providerData } = input;
      await db.createServiceProvider({ userId: ctx.user.id, ...providerData });
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create provider" });
      
      // Auto-generate slug
      const baseSlug = provider.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const slug = `${baseSlug}-${provider.id}`;
      await db.updateProviderSlug(provider.id, slug);

      // Add categories if provided
      if (categoryIds && categoryIds.length > 0) {
        await db.setProviderCategories(provider.id, categoryIds);
      }
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
    const providers = await db.getAllProviders({ isActive: true });
    // Get top 8 providers by rating, with their categories and profile photos
    const sorted = providers
      .filter((p: any) => parseFloat(p.averageRating || "0") > 0 || p.totalReviews > 0)
      .sort((a: any, b: any) => parseFloat(b.averageRating || "0") - parseFloat(a.averageRating || "0"))
      .slice(0, 8);
    // If fewer than 8 rated providers, fill with recently created active providers
    if (sorted.length < 8) {
      const remaining = providers
        .filter((p: any) => !sorted.find((s: any) => s.id === p.id))
        .slice(0, 8 - sorted.length);
      sorted.push(...remaining);
    }
    // Enrich with categories and profile photo
    const enriched = await Promise.all(
      sorted.slice(0, 8).map(async (provider: any) => {
        const categories = await db.getProviderCategories(provider.id);
        const user = await db.getUserById(provider.userId);
        return {
          ...provider,
          profilePhotoUrl: user?.profilePhotoUrl || null,
          categories: categories.map((c: any) => ({ id: c.categoryId, name: c.categoryName })),
        };
      })
    );
    return enriched;
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

  // ============================================================================
  // PROFILE PHOTO
  // ============================================================================

  uploadProfilePhoto: protectedProcedure
    .input(z.object({
      photoData: z.string(), // base64
      contentType: z.string().default("image/jpeg"),
    }))
    .mutation(async ({ ctx, input }) => {
      const { storagePut } = await import("../storage");
      const buffer = Buffer.from(input.photoData, "base64");
      const ext = input.contentType.split("/")[1] || "jpg";
      const suffix = Math.random().toString(36).substring(2, 10);
      const fileKey = `profile-photos/${ctx.user.id}/${Date.now()}-${suffix}.${ext}`;
      const { url } = await storagePut(fileKey, buffer, input.contentType);
      
      // Update user profile photo
      await db.updateUserProfile(ctx.user.id, { profilePhotoUrl: url });
      return { url };
    }),

  // ============================================================================
  // MULTI-CATEGORY MANAGEMENT
  // ============================================================================

  getMyCategories: protectedProcedure.query(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider) return [];
    const providerCats = await db.getProviderCategories(provider.id);
    // Enrich with category details
    const allCategories = await db.getAllCategories();
    const categoryMap = new Map(allCategories.map(c => [c.id, c]));
    return providerCats.map(pc => ({
      ...pc,
      category: categoryMap.get(pc.categoryId),
    }));
  }),

  setMyCategories: protectedProcedure
    .input(z.object({ categoryIds: z.array(z.number()).min(1, "Select at least one category") }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      await db.setProviderCategories(provider.id, input.categoryIds);
      return { success: true, count: input.categoryIds.length };
    }),

  addCategory: protectedProcedure
    .input(z.object({ categoryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      await db.addProviderCategory(provider.id, input.categoryId);
      return { success: true };
    }),

  removeCategory: protectedProcedure
    .input(z.object({ categoryId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      await db.removeProviderCategory(provider.id, input.categoryId);
      return { success: true };
    }),

  // ============================================================================
  // EARNINGS & ANALYTICS
  // ============================================================================

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

  // ============================================================================
  // PUBLIC PROFILE
  // ============================================================================

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const provider = await db.getProviderBySlug(input.slug);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
      const [providerServices, providerReviews, providerCats] = await Promise.all([
        db.getServicesByProvider(provider.id),
        db.getProviderReviewsPublic(provider.id),
        db.getProviderCategories(provider.id),
      ]);
      // Enrich categories
      const allCategories = await db.getAllCategories();
      const categoryMap = new Map(allCategories.map(c => [c.id, c]));
      const categories = providerCats.map(pc => categoryMap.get(pc.categoryId)).filter(Boolean);
      
      // Get user info for profile photo
      const user = await db.getUserById(provider.userId);
      
      return { 
        provider, 
        services: providerServices, 
        reviews: providerReviews, 
        categories,
        profilePhoto: user?.profilePhotoUrl || null,
      };
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

  // ============================================================================
  // PORTFOLIO MANAGEMENT
  // ============================================================================

  getPortfolio: protectedProcedure
    .query(async ({ ctx }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
      return await db.getPortfolioByProvider(provider.id);
    }),

  getPublicPortfolio: publicProcedure
    .input(z.object({ providerId: z.number() }))
    .query(async ({ input }) => {
      return await db.getPortfolioByProvider(input.providerId);
    }),

  addPortfolioItem: protectedProcedure
    .input(z.object({
      categoryId: z.number().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      imageUrl: z.string(),
      mediaType: z.enum(["image", "before_after"]).default("image"),
      beforeImageUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
      const count = await db.getPortfolioItemCount(provider.id);
      if (count >= 50) throw new TRPCError({ code: "BAD_REQUEST", message: "Maximum 50 portfolio items allowed" });
      await db.createPortfolioItem({ providerId: provider.id, ...input });
      return { success: true };
    }),

  updatePortfolioItem: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      categoryId: z.number().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
      const { id, ...data } = input;
      await db.updatePortfolioItem(id, provider.id, data);
      return { success: true };
    }),

  deletePortfolioItem: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
      await db.deletePortfolioItem(input.id, provider.id);
      return { success: true };
    }),

  uploadPortfolioPhoto: protectedProcedure
    .input(z.object({
      base64: z.string(),
      mimeType: z.string(),
      fileName: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
      const { storagePut } = await import("../storage");
      const buffer = Buffer.from(input.base64, "base64");
      const suffix = Math.random().toString(36).slice(2, 10);
      const key = `portfolio/${provider.id}/${suffix}-${input.fileName}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url };
    }),

  listByCategory: publicProcedure
    .input(z.object({ categoryId: z.number() }))
    .query(async ({ input }) => {
      // Get all providers who have this category in their provider_categories
      const providerCats = await db.getProvidersByCategory(input.categoryId);
      const providerIds = providerCats.map((pc: any) => pc.providerId);
      if (providerIds.length === 0) return [];
      // Fetch full provider details
      const providers = await Promise.all(
        providerIds.map(async (id: number) => {
          const provider = await db.getProviderById(id);
          if (!provider || !provider.isActive) return null;
          // Get profile photo
          const user = await db.getUserById(provider.userId);
          return { ...provider, profilePhotoUrl: user?.profilePhotoUrl || null };
        })
      );
      return providers.filter(Boolean);
    }),

  getNextAvailable: publicProcedure
    .input(z.object({ providerId: z.number(), days: z.number().default(7) }))
    .query(async ({ input }) => {
      const schedule = await db.getAvailabilityByProvider(input.providerId);
      if (!schedule || schedule.length === 0) return { slots: [], hasAvailability: false };

      // Get overrides for the next N days
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + input.days);
      const todayStr = today.toISOString().split("T")[0];
      const endStr = endDate.toISOString().split("T")[0];
      const overrides = await db.getAvailabilityOverrides(input.providerId, todayStr, endStr);

      // Build a map of overrides by date
      const overrideMap = new Map<string, any>();
      for (const o of overrides) {
        overrideMap.set(o.overrideDate, o);
      }

      // Compute next available slots
      const slots: { date: string; dayName: string; startTime: string; endTime: string }[] = [];
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      for (let d = 0; d < input.days && slots.length < 3; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() + d);
        const dateStr = date.toISOString().split("T")[0];
        const dayOfWeek = date.getDay();

        // Check override first
        const override = overrideMap.get(dateStr);
        if (override && !override.isAvailable) continue;

        // Find schedule for this day
        const daySchedules = schedule.filter((s: any) => s.dayOfWeek === dayOfWeek && s.isAvailable);
        for (const s of daySchedules) {
          if (slots.length >= 3) break;
          slots.push({
            date: dateStr,
            dayName: dayNames[dayOfWeek],
            startTime: s.startTime,
            endTime: s.endTime,
          });
        }
      }

      return { slots, hasAvailability: slots.length > 0 };
    }),
});
