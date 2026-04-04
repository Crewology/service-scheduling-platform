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
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider) return null;
    const user = await db.getUserById(ctx.user.id);
    return {
      ...provider,
      profilePhotoUrl: user?.profilePhotoUrl || null,
    };
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

  // ========================================================================
  // FAVORITES
  // ========================================================================
  toggleFavorite: protectedProcedure
    .input(z.object({ providerId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const already = await db.isFavorited(ctx.user.id, input.providerId);
      if (already) {
        await db.removeFavorite(ctx.user.id, input.providerId);
        return { favorited: false };
      } else {
        await db.addFavorite(ctx.user.id, input.providerId);
        return { favorited: true };
      }
    }),

  checkFavorite: protectedProcedure
    .input(z.object({ providerId: z.number() }))
    .query(async ({ ctx, input }) => {
      return { favorited: await db.isFavorited(ctx.user.id, input.providerId) };
    }),

  myFavorites: protectedProcedure
    .query(async ({ ctx }) => {
      return db.getUserFavorites(ctx.user.id);
    }),

  // ========================================================================
  // SERVICE PACKAGES
  // ========================================================================
  createPackage: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      packagePrice: z.string(),
      originalPrice: z.string(),
      durationMinutes: z.number().optional(),
      imageUrl: z.string().optional(),
      serviceIds: z.array(z.number()).min(2, "A package must include at least 2 services"),
    }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
      return db.createPackage({ providerId: provider.id, ...input });
    }),

  updatePackage: protectedProcedure
    .input(z.object({
      packageId: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      packagePrice: z.string().optional(),
      originalPrice: z.string().optional(),
      durationMinutes: z.number().optional(),
      imageUrl: z.string().optional(),
      serviceIds: z.array(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
      const { packageId, ...data } = input;
      return db.updatePackage(packageId, provider.id, data);
    }),

  deletePackage: protectedProcedure
    .input(z.object({ packageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
      await db.deletePackage(input.packageId, provider.id);
      return { success: true };
    }),

  myPackages: protectedProcedure
    .query(async ({ ctx }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) return [];
      return db.getPackagesByProvider(provider.id);
    }),

  getPublicPackages: publicProcedure
    .input(z.object({ providerId: z.number() }))
    .query(async ({ input }) => {
      return db.getPublicPackagesByProvider(input.providerId);
    }),

  // ========================================================================
  // RESPONSE TIME
  // ========================================================================
  getResponseTime: publicProcedure
    .input(z.object({ providerId: z.number() }))
    .query(async ({ input }) => {
      // Compute average response time from messages where provider is the recipient
      const provider = await db.getProviderById(input.providerId);
      if (!provider) return { avgMinutes: null, label: "Unknown" };
      
      const { getDb } = await import("../db/connection");
      const dbConn = await getDb();
      if (!dbConn) return { avgMinutes: null, label: "Unknown" };
      
      const { messages } = await import("../../drizzle/schema");
      const { eq, and, isNotNull, sql } = await import("drizzle-orm");
      
      // Get conversations where provider received messages and responded
      // We look at pairs: customer message → provider reply in same conversation
      const providerUserId = provider.userId;
      
      const received = await dbConn
        .select({
          conversationId: messages.conversationId,
          receivedAt: messages.createdAt,
        })
        .from(messages)
        .where(and(
          eq(messages.recipientId, providerUserId),
        ))
        .orderBy(messages.createdAt)
        .limit(100);
      
      const sent = await dbConn
        .select({
          conversationId: messages.conversationId,
          sentAt: messages.createdAt,
        })
        .from(messages)
        .where(eq(messages.senderId, providerUserId))
        .orderBy(messages.createdAt)
        .limit(100);
      
      // For each received message, find the next sent message in the same conversation
      const responseTimes: number[] = [];
      for (const recv of received) {
        const reply = sent.find(
          (s: any) => s.conversationId === recv.conversationId && s.sentAt > recv.receivedAt
        );
        if (reply) {
          const diffMs = new Date(reply.sentAt).getTime() - new Date(recv.receivedAt).getTime();
          const diffMin = diffMs / 60000;
          if (diffMin > 0 && diffMin < 1440) { // Only count responses within 24h
            responseTimes.push(diffMin);
          }
        }
      }
      
      if (responseTimes.length === 0) {
        return { avgMinutes: null, label: "New provider" };
      }
      
      const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      let label = "";
      if (avg < 15) label = "Responds within 15 min";
      else if (avg < 60) label = `Responds within ${Math.round(avg)} min`;
      else if (avg < 120) label = "Responds within 1 hour";
      else if (avg < 240) label = "Responds within a few hours";
      else label = "Responds within a day";
      
      return { avgMinutes: Math.round(avg), label };
    }),

  // ============================================================================
  // QUOTE REQUESTS
  // ============================================================================

  requestQuote: protectedProcedure
    .input(z.object({
      providerId: z.number(),
      serviceId: z.number().optional(),
      categoryId: z.number().optional(),
      title: z.string().min(5, "Title must be at least 5 characters"),
      description: z.string().min(20, "Please describe your needs in at least 20 characters"),
      preferredDate: z.string().optional(),
      preferredTime: z.string().optional(),
      locationType: z.enum(["mobile", "fixed_location", "virtual"]).optional(),
      location: z.string().optional(),
      attachmentUrls: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await db.createQuoteRequest({
        customerId: ctx.user.id,
        providerId: input.providerId,
        serviceId: input.serviceId,
        categoryId: input.categoryId,
        title: input.title,
        description: input.description,
        preferredDate: input.preferredDate,
        preferredTime: input.preferredTime,
        locationType: input.locationType,
        location: input.location,
        attachmentUrls: input.attachmentUrls ? JSON.stringify(input.attachmentUrls) : undefined,
      });
      return result;
    }),

  myQuotes: protectedProcedure
    .query(async ({ ctx }) => {
      return db.getQuotesByCustomer(ctx.user.id);
    }),

  providerQuotes: protectedProcedure
    .query(async ({ ctx }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
      const quotes = await db.getQuotesByProvider(provider.id);
      // Enrich with customer and service names
      const enriched = await Promise.all(quotes.map(async (q) => {
        const customer = await db.getUserById(q.customerId);
        return {
          ...q,
          customerName: customer?.name || customer?.firstName || "Customer",
          customerEmail: customer?.email,
        };
      }));
      return enriched;
    }),

  respondToQuote: protectedProcedure
    .input(z.object({
      quoteId: z.number(),
      quotedAmount: z.string(),
      quotedDurationMinutes: z.number().min(15),
      providerNotes: z.string().optional(),
      validDays: z.number().default(7),
    }))
    .mutation(async ({ ctx, input }) => {
      const quote = await db.getQuoteById(input.quoteId);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found" });
      
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider || quote.providerId !== provider.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      if (quote.status !== "pending") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Quote has already been responded to" });
      }

      await db.respondToQuote(input.quoteId, {
        quotedAmount: input.quotedAmount,
        quotedDurationMinutes: input.quotedDurationMinutes,
        providerNotes: input.providerNotes,
        validUntil: new Date(Date.now() + input.validDays * 24 * 60 * 60 * 1000),
      });
      return { success: true };
    }),

  updateQuoteStatus: protectedProcedure
    .input(z.object({
      quoteId: z.number(),
      status: z.enum(["accepted", "declined"]),
      reason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const quote = await db.getQuoteById(input.quoteId);
      if (!quote) throw new TRPCError({ code: "NOT_FOUND", message: "Quote not found" });
      
      // Customer can accept/decline a quoted price
      // Provider can decline a pending request
      const isCustomer = quote.customerId === ctx.user.id;
      const provider = await db.getProviderByUserId(ctx.user.id);
      const isProvider = provider && quote.providerId === provider.id;
      
      if (!isCustomer && !isProvider) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      if (isCustomer && input.status === "accepted" && quote.status !== "quoted") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Can only accept a quoted price" });
      }

      await db.updateQuoteStatus(input.quoteId, input.status, input.reason);
      return { success: true };
    }),

  quoteCount: protectedProcedure
    .query(async ({ ctx }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) return { pending: 0, quoted: 0, total: 0 };
      return db.getQuoteCountByProvider(provider.id);
    }),
});
