import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { stripeRouter } from "./stripeRouter";
import { stripeConnectRouter } from "./stripeConnectRouter";
import { adminRouter } from "./adminRouter";
import { subscriptionRouter } from "./subscriptionRouter";
import { widgetRouter } from "./widgetRouter";
import { promoRouter } from "./promoRouter";

// ============================================================================
// AUTHENTICATION & USER MANAGEMENT
// ============================================================================

const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),
  
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
  
  updateProfile: protectedProcedure
    .input(z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      profilePhotoUrl: z.string().optional(),
      email: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.updateUserProfile(ctx.user.id, input);
      const updated = await db.getUserById(ctx.user.id);
      return updated!;
    }),
});

// ============================================================================
// SERVICE PROVIDER MANAGEMENT
// ============================================================================

const providerRouter = router({
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

  // Public profile by slug (no auth required)
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const provider = await db.getProviderBySlug(input.slug);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
      const providerServices = await db.getServicesByProvider(provider.id);
      const providerReviews = await db.getProviderReviewsPublic(provider.id);
      return { provider, services: providerServices, reviews: providerReviews };
    }),

  // Generate a profile slug from business name
  generateSlug: protectedProcedure.mutation(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
    const baseSlug = provider.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const slug = `${baseSlug}-${provider.id}`;
    await db.updateProviderSlug(provider.id, slug);
    return { slug };
  }),

  // Update profile slug
  updateSlug: protectedProcedure
    .input(z.object({ slug: z.string().min(3).max(100).regex(/^[a-z0-9-]+$/) }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      // Tier gating: only Basic+ can customize slug
      const tier = await db.getProviderTier(provider.id);
      if (tier === "free") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Custom profile URLs are available on the Professional plan and above. Upgrade to customize your link." });
      }
      // Check slug uniqueness
      const existing = await db.getProviderBySlug(input.slug);
      if (existing && existing.id !== provider.id) {
        throw new TRPCError({ code: "CONFLICT", message: "This URL is already taken" });
      }
      await db.updateProviderSlug(provider.id, input.slug);
      return { slug: input.slug };
    }),

  // Get public services for a provider by ID (no auth)
  getPublicServices: publicProcedure
    .input(z.object({ providerId: z.number() }))
    .query(async ({ input }) => {
      return await db.getServicesByProvider(input.providerId);
    }),

  // Calendar sync
  getCalendarFeedUrl: protectedProcedure
    .query(async ({ ctx }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      const { generateCalendarToken } = await import("./calendarFeed");
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

// ============================================================================
// SERVICE CATEGORY MANAGEMENT
// ============================================================================

const categoryRouter = router({
  list: publicProcedure.query(async () => {
    return await db.getAllCategories();
  }),
  
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getCategoryById(input.id);
    }),
    
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      return await db.getCategoryBySlug(input.slug);
    }),
});

// ============================================================================
// SERVICE MANAGEMENT
// ============================================================================

const serviceRouter = router({
  create: protectedProcedure
    .input(z.object({
      categoryId: z.number(),
      name: z.string(),
      description: z.string().optional(),
      serviceType: z.enum(["mobile", "fixed_location", "virtual", "hybrid"]),
      pricingModel: z.enum(["fixed", "hourly", "package", "custom_quote"]),
      basePrice: z.union([z.number(), z.string()]).optional(),
      hourlyRate: z.union([z.number(), z.string()]).optional(),
      durationMinutes: z.number().optional(),
      depositRequired: z.boolean().default(false),
      depositType: z.enum(["fixed", "percentage"]).optional(),
      depositAmount: z.union([z.number(), z.string()]).optional(),
      depositPercentage: z.union([z.number(), z.string()]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider to create services" });
      }
      // Subscription tier gating: check service limit
      const existingServices = await db.getServicesByProviderId(provider.id);
      const subscription = await db.getProviderSubscription(provider.id);
      const tier = ((subscription?.tier as import("./products").SubscriptionTier) || "free");
      const { canProviderAddService, SUBSCRIPTION_TIERS } = await import("./products");
      if (!canProviderAddService(tier, existingServices.length)) {
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: `Your ${SUBSCRIPTION_TIERS[tier].name} plan allows up to ${SUBSCRIPTION_TIERS[tier].limits.maxServices} services. Upgrade your plan to add more.` 
        });
      }
      await db.createService({
        providerId: provider.id,
        categoryId: input.categoryId,
        name: input.name,
        description: input.description,
        serviceType: input.serviceType,
        pricingModel: input.pricingModel,
        basePrice: input.basePrice?.toString(),
        hourlyRate: input.hourlyRate?.toString(),
        durationMinutes: input.durationMinutes,
        depositRequired: input.depositRequired,
        depositType: input.depositType,
        depositAmount: input.depositAmount?.toString(),
        depositPercentage: input.depositPercentage?.toString(),
      });
      const providerServices = await db.getServicesByProviderId(provider.id);
      const created = providerServices.find(s => s.name === input.name);
      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve created service" });
      return created;
    }),
    
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getServiceById(input.id);
    }),
    
  listByProvider: publicProcedure
    .input(z.object({ providerId: z.number() }))
    .query(async ({ input }) => {
      return await db.getServicesByProviderId(input.providerId);
    }),
    
  listByCategory: publicProcedure
    .input(z.object({ categoryId: z.number() }))
    .query(async ({ input }) => {
      return await db.getServicesByCategory(input.categoryId);
    }),
    
  search: publicProcedure
    .input(z.object({ 
      query: z.string().optional(),
      keyword: z.string().optional(),
      categoryId: z.number().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      sortBy: z.enum(["price", "rating", "distance"]).optional(),
    }))
    .query(async ({ input }) => {
      const searchTerm = input.query || input.keyword || "";
      return await db.searchServices(searchTerm);
    }),
    
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider) return [];
    return await db.getServicesByProviderId(provider.id);
  }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      categoryId: z.number().optional(),
      serviceType: z.enum(["mobile", "fixed_location", "virtual", "hybrid"]).optional(),
      pricingModel: z.enum(["fixed", "hourly", "package", "custom_quote"]).optional(),
      basePrice: z.union([z.number(), z.string()]).optional(),
      hourlyRate: z.union([z.number(), z.string()]).optional(),
      durationMinutes: z.number().optional(),
      depositRequired: z.boolean().optional(),
      depositType: z.enum(["fixed", "percentage"]).optional(),
      depositAmount: z.union([z.number(), z.string()]).optional(),
      depositPercentage: z.union([z.number(), z.string()]).optional(),
      cancellationPolicy: z.string().optional(),
      specialRequirements: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      const service = await db.getServiceById(input.id);
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });
      if (service.providerId !== provider.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your service" });
      const { id, ...updateData } = input;
      const cleanData: Record<string, any> = {};
      for (const [key, value] of Object.entries(updateData)) {
        if (value !== undefined) {
          cleanData[key] = ["basePrice", "hourlyRate", "depositAmount", "depositPercentage"].includes(key) ? value.toString() : value;
        }
      }
      await db.updateService(input.id, cleanData);
      const updated = await db.getServiceById(input.id);
      return updated!;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      const service = await db.getServiceById(input.id);
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });
      if (service.providerId !== provider.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your service" });
      await db.deleteService(input.id);
      return { success: true };
    }),

  // Photo management
  getPhotos: publicProcedure
    .input(z.object({ serviceId: z.number() }))
    .query(async ({ input }) => {
      return await db.getServicePhotos(input.serviceId);
    }),

  uploadPhoto: protectedProcedure
    .input(z.object({
      serviceId: z.number(),
      photoData: z.string(), // base64 encoded
      contentType: z.string().default("image/jpeg"),
      caption: z.string().optional(),
      isPrimary: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      const service = await db.getServiceById(input.serviceId);
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });
      if (service.providerId !== provider.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your service" });

      // Check photo limit (5 per service)
      const existingPhotos = await db.getServicePhotos(input.serviceId);
      if (existingPhotos.length >= 5) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Maximum 5 photos per service" });
      }

      // Check tier-based limits
      const tier = await db.getProviderTier(provider.id);
      if (tier === "free" && existingPhotos.length >= 2) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Free tier allows up to 2 photos per service. Upgrade to Basic or Premium for more." });
      }

      const { storagePut } = await import("./storage");
      const buffer = Buffer.from(input.photoData, "base64");
      const ext = input.contentType.split("/")[1] || "jpg";
      const suffix = Math.random().toString(36).substring(2, 10);
      const fileKey = `service-photos/${input.serviceId}/${Date.now()}-${suffix}.${ext}`;
      const { url } = await storagePut(fileKey, buffer, input.contentType);

      await db.addServicePhoto({
        serviceId: input.serviceId,
        photoUrl: url,
        caption: input.caption,
        sortOrder: existingPhotos.length,
        isPrimary: input.isPrimary || existingPhotos.length === 0,
      });

      return { url, success: true };
    }),

  deletePhoto: protectedProcedure
    .input(z.object({ photoId: z.number(), serviceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      const service = await db.getServiceById(input.serviceId);
      if (!service || service.providerId !== provider.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your service" });
      await db.deleteServicePhoto(input.photoId);
      return { success: true };
    }),

  setPrimaryPhoto: protectedProcedure
    .input(z.object({ photoId: z.number(), serviceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      const service = await db.getServiceById(input.serviceId);
      if (!service || service.providerId !== provider.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your service" });
      await db.setServicePrimaryPhoto(input.serviceId, input.photoId);
      return { success: true };
    }),

});

// ============================================================================
// BOOKING MANAGEMENT
// ============================================================================

const bookingRouter = router({
  create: protectedProcedure
    .input(z.object({
      serviceId: z.number(),
      providerId: z.number().optional(),
      bookingDate: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      durationMinutes: z.number().optional(),
      locationType: z.enum(["mobile", "fixed_location", "virtual"]),
      serviceAddressLine1: z.string().optional(),
      serviceAddressLine2: z.string().optional(),
      serviceCity: z.string().optional(),
      serviceState: z.string().optional(),
      servicePostalCode: z.string().optional(),
      customerNotes: z.string().optional(),
      bookingSource: z.enum(["direct", "embed_widget", "provider_page", "api"]).default("direct"),
      promoCodeId: z.number().optional(),
      subtotal: z.string().optional(),
      platformFee: z.string().optional(),
      totalAmount: z.string().optional(),
      depositAmount: z.string().optional(),
      remainingAmount: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = await db.getServiceById(input.serviceId);
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });
      
      const bookingNumber = `SKL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      let subtotal = input.subtotal || (service.basePrice ? service.basePrice : "0.00");
      let subtotalNum = parseFloat(subtotal);

      // Apply promo code discount if provided
      let promoDiscount = 0;
      if (input.promoCodeId) {
        const promoResult = await db.validatePromoCodeById(input.promoCodeId, input.serviceId, subtotalNum);
        if (promoResult && promoResult.valid) {
          promoDiscount = promoResult.discountAmount;
          subtotalNum = Math.max(0, subtotalNum - promoDiscount);
          subtotal = subtotalNum.toFixed(2);
        }
      }

      const platformFee = input.platformFee || (subtotalNum * 0.01).toFixed(2);
      const totalAmount = input.totalAmount || (subtotalNum + parseFloat(platformFee)).toFixed(2);
      const depositAmount = input.depositAmount || (service.depositRequired 
        ? (service.depositType === "fixed" 
            ? (service.depositAmount || "0.00")
            : (parseFloat(totalAmount) * (parseFloat(service.depositPercentage || "0") / 100)).toFixed(2))
        : "0.00");
      const remainingAmount = input.remainingAmount || (parseFloat(totalAmount) - parseFloat(depositAmount)).toFixed(2);
      const providerId = input.providerId || service.providerId;
      
      const bookingId = await db.createBooking({
        bookingNumber,
        customerId: ctx.user.id,
        providerId,
        serviceId: input.serviceId,
        bookingDate: new Date(input.bookingDate).toISOString().split('T')[0],
        startTime: input.startTime,
        endTime: input.endTime,
        durationMinutes: input.durationMinutes || service.durationMinutes || 60,
        status: "pending",
        locationType: input.locationType,
        serviceAddressLine1: input.serviceAddressLine1,
        serviceAddressLine2: input.serviceAddressLine2,
        serviceCity: input.serviceCity,
        serviceState: input.serviceState,
        servicePostalCode: input.servicePostalCode,
        customerNotes: input.customerNotes,
        bookingSource: input.bookingSource,
        subtotal,
        platformFee,
        totalAmount,
        depositAmount,
        remainingAmount,
      });
      
      const booking = await db.getBookingById(bookingId);
      if (!booking) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve created booking" });

      // Record promo code redemption
      if (input.promoCodeId && promoDiscount > 0) {
        try {
          await db.redeemPromoCode(input.promoCodeId, ctx.user.id, bookingId, promoDiscount);
        } catch (e) {
          console.error("[Booking] Failed to record promo redemption:", e);
        }
      }

      // Send booking created notification to provider
      try {
        const { sendNotification } = await import("./notifications");
        const providerData = await db.getProviderById(providerId);
        const providerUser = providerData ? await db.getUserById(providerData.userId) : null;
        if (providerUser?.email) {
          await sendNotification({
            type: "booking_created",
            channel: "email",
            recipient: { userId: providerUser.id, email: providerUser.email, name: providerUser.name || "Provider" },
            data: {
              bookingNumber,
              serviceName: service.name,
              customerName: ctx.user.name || "Customer",
              date: input.bookingDate,
              time: input.startTime,
              providerName: providerData?.businessName || providerUser.name || "Provider",
            },
          });
        }
        // Send confirmation to customer
        if (ctx.user.email) {
          await sendNotification({
            type: "booking_confirmed",
            channel: "email",
            recipient: { userId: ctx.user.id, email: ctx.user.email, name: ctx.user.name || "Customer" },
            data: {
              bookingNumber,
              serviceName: service.name,
              providerName: providerData?.businessName || "Provider",
              customerName: ctx.user.name || "Customer",
              date: input.bookingDate,
              time: input.startTime,
              amount: totalAmount,
            },
          });
        }
      } catch (err) {
        console.error("[Booking] Notification send failed (non-blocking):", err);
      }

      return booking;
    }),
    
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const booking = await db.getBookingById(input.id);
      if (!booking) return null;
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (booking.customerId !== ctx.user.id && booking.providerId !== provider?.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return booking;
    }),
    
  myBookings: protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return await db.getCustomerBookings(ctx.user.id, input.status);
    }),
    
  providerBookings: protectedProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      return await db.getProviderBookings(provider.id, input.status);
    }),
    
  listForProvider: protectedProcedure.query(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider) return [];
    return await db.getProviderBookings(provider.id);
  }),
    
  listMine: protectedProcedure.query(async ({ ctx }) => {
    return await db.getCustomerBookings(ctx.user.id);
  }),
    
  listByDateRange: publicProcedure
    .input(z.object({
      providerId: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      if (input.startDate && input.endDate) {
        return await db.getBookingsByDateRange(input.providerId, input.startDate, input.endDate);
      }
      return await db.getProviderBookings(input.providerId);
    }),
    
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show", "refunded"]),
      cancellationReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const booking = await db.getBookingById(input.id);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (booking.customerId !== ctx.user.id && booking.providerId !== provider?.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      
      const additionalData: any = {};
      if (input.status === "cancelled") {
        additionalData.cancellationReason = input.cancellationReason;
        additionalData.cancelledBy = booking.customerId === ctx.user.id ? "customer" : "provider";
      }
      
      await db.updateBookingStatus(input.id, input.status, additionalData);
      const updated = await db.getBookingById(input.id);

      // Send notifications based on status change
      try {
        const { sendNotification } = await import("./notifications");
        const service = await db.getServiceById(booking.serviceId);
        const customer = await db.getUserById(booking.customerId);
        const providerData = await db.getProviderById(booking.providerId);
        const providerUser = providerData ? await db.getUserById(providerData.userId) : null;

        if (input.status === "confirmed" && customer?.email) {
          await sendNotification({
            type: "booking_confirmed",
            channel: "email",
            recipient: { userId: customer.id, email: customer.email, name: customer.name || "Customer" },
            data: {
              bookingNumber: booking.bookingNumber,
              serviceName: service?.name || "Service",
              providerName: providerData?.businessName || providerUser?.name || "Provider",
              customerName: customer.name || "Customer",
              date: booking.bookingDate,
              time: booking.startTime,
              amount: booking.totalAmount || "0.00",
            },
          });
        }

        if (input.status === "completed" && customer?.email) {
          await sendNotification({
            type: "booking_completed",
            channel: "email",
            recipient: { userId: customer.id, email: customer.email, name: customer.name || "Customer" },
            data: {
              bookingNumber: booking.bookingNumber,
              serviceName: service?.name || "Service",
              providerName: providerData?.businessName || providerUser?.name || "Provider",
              customerName: customer.name || "Customer",
            },
          });
        }
      } catch (err) {
        console.error("[BookingStatus] Notification send failed (non-blocking):", err);
      }

      return updated!;
    }),

  // Cancellation with automated refund calculation
  cancel: protectedProcedure
    .input(z.object({
      bookingId: z.number(),
      reason: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const booking = await db.getBookingById(input.bookingId);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });

      const provider = await db.getProviderByUserId(ctx.user.id);
      const isCustomer = booking.customerId === ctx.user.id;
      const isProvider = provider && booking.providerId === provider.id;
      const isAdmin = ctx.user.role === "admin";
      if (!isCustomer && !isProvider && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      if (["completed", "cancelled", "refunded"].includes(booking.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot cancel a booking that is already " + booking.status });
      }

      const cancelledBy = isCustomer ? "customer" as const : isProvider ? "provider" as const : "admin" as const;

      // Calculate refund based on cancellation timing
      const service = await db.getServiceById(booking.serviceId);
      const bookingDateTime = new Date(`${booking.bookingDate}T${booking.startTime}`);
      const hoursUntilBooking = (bookingDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
      const totalPaid = parseFloat(booking.totalAmount || "0");

      let refundPercentage = 0;
      let refundReason = "";

      if (cancelledBy === "provider" || cancelledBy === "admin") {
        // Provider/admin cancellation = full refund
        refundPercentage = 100;
        refundReason = `Cancelled by ${cancelledBy}: ${input.reason}`;
      } else {
        // Customer cancellation — time-based refund tiers
        if (hoursUntilBooking >= 48) {
          refundPercentage = 100;
          refundReason = "Full refund: cancelled 48+ hours before appointment";
        } else if (hoursUntilBooking >= 24) {
          refundPercentage = 75;
          refundReason = "75% refund: cancelled 24-48 hours before appointment";
        } else if (hoursUntilBooking >= 4) {
          refundPercentage = 50;
          refundReason = "50% refund: cancelled 4-24 hours before appointment";
        } else {
          refundPercentage = 0;
          refundReason = "No refund: cancelled less than 4 hours before appointment";
        }
      }

      const refundAmount = (totalPaid * refundPercentage / 100).toFixed(2);

      // Process Stripe refund if payment exists
      const payment = await db.getPaymentByBookingId(input.bookingId);
      let stripeRefundId: string | undefined;

      if (payment?.stripePaymentIntentId && parseFloat(refundAmount) > 0) {
        try {
          const Stripe = (await import("stripe")).default;
          const { ENV } = await import("./_core/env");
          const stripe = new Stripe(ENV.stripeSecretKey, { apiVersion: "2025-12-18.acacia" as any });
          const refund = await stripe.refunds.create({
            payment_intent: payment.stripePaymentIntentId,
            amount: Math.round(parseFloat(refundAmount) * 100),
            reason: cancelledBy === "provider" ? "requested_by_customer" : "requested_by_customer",
          });
          stripeRefundId = refund.id;

          await db.updatePaymentRefund(payment.id, {
            status: "refunded",
            refundAmount,
            refundReason,
            stripeRefundId,
            refundedAt: new Date(),
          });
        } catch (err: any) {
          console.error("[Cancellation] Stripe refund failed:", err.message);
          // Still cancel the booking even if refund fails
        }
      }

      // Cancel the booking
      await db.cancelBooking(input.bookingId, {
        cancellationReason: input.reason,
        cancelledBy,
        cancelledAt: new Date(),
      });

      // Send notifications
      const { sendNotification } = await import("./notifications");
      const customer = await db.getUserById(booking.customerId);
      const providerData = await db.getProviderById(booking.providerId);
      const providerUser = providerData ? await db.getUserById(providerData.userId) : null;

      if (customer?.email) {
        await sendNotification({
          type: "booking_cancelled",
          channel: "email",
          recipient: { userId: customer.id, email: customer.email, name: customer.name || "Customer" },
          data: {
            bookingNumber: booking.bookingNumber,
            serviceName: service?.name || "Service",
            cancelledBy,
            refundAmount,
            refundPercentage: refundPercentage.toString(),
            reason: input.reason,
          },
        });
      }

      if (providerUser?.email && cancelledBy === "customer") {
        await sendNotification({
          type: "booking_cancelled",
          channel: "email",
          recipient: { userId: providerUser.id, email: providerUser.email, name: providerUser.name || "Provider" },
          data: {
            bookingNumber: booking.bookingNumber,
            serviceName: service?.name || "Service",
            cancelledBy,
            reason: input.reason,
          },
        });
      }

      const updated = await db.getBookingById(input.bookingId);
      return {
        booking: updated!,
        refundAmount,
        refundPercentage,
        refundReason,
        stripeRefundId,
      };
    }),
});

// ============================================================================
// REVIEW MANAGEMENT
// ============================================================================

const reviewRouter = router({
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
      return created!;
    }),
});

// ============================================================================
// MESSAGING
// ============================================================================

const messageRouter = router({
  send: protectedProcedure
    .input(z.object({
      recipientId: z.number(),
      messageText: z.string(),
      bookingId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ids = [ctx.user.id, input.recipientId].sort((a, b) => a - b);
      const conversationId = `conv-${ids[0]}-${ids[1]}`;
      
      await db.createMessage({
        conversationId,
        senderId: ctx.user.id,
        recipientId: input.recipientId,
        messageText: input.messageText,
        bookingId: input.bookingId,
      });
      
      const msgs = await db.getConversationMessages(conversationId);
      return msgs[msgs.length - 1]!;
    }),
    
  getConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ input }) => {
      return await db.getConversationMessages(input.conversationId);
    }),
    
  myConversations: protectedProcedure.query(async ({ ctx }) => {
    return await db.getUserConversations(ctx.user.id);
  }),
  
  listByBooking: protectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .query(async ({ ctx, input }) => {
      const booking = await db.getBookingById(input.bookingId);
      if (!booking) return [];
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (booking.customerId !== ctx.user.id && booking.providerId !== provider?.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return await db.getMessagesByBooking(input.bookingId);
    }),
  
  markAsRead: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.markMessagesAsRead(input.conversationId, ctx.user.id);
      return { success: true };
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return await db.getUnreadMessageCount(ctx.user.id);
  }),
});

// ============================================================================
// NOTIFICATIONS
// ============================================================================

const notificationRouter = router({
  list: protectedProcedure
    .input(z.object({ unreadOnly: z.boolean().default(false) }))
    .query(async ({ ctx, input }) => {
      return await db.getUserNotifications(ctx.user.id, input.unreadOnly);
    }),
    
  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.markNotificationAsRead(input.notificationId);
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await db.markAllNotificationsAsRead(ctx.user.id);
    return { success: true };
  }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const notifications = await db.getUserNotifications(ctx.user.id, true);
    return { count: notifications.length };
  }),

  // Notification preferences
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    return await db.getNotificationPreferences(ctx.user.id);
  }),

  updatePreferences: protectedProcedure
    .input(z.object({
      emailEnabled: z.boolean().optional(),
      smsEnabled: z.boolean().optional(),
      pushEnabled: z.boolean().optional(),
      bookingEmail: z.boolean().optional(),
      reminderEmail: z.boolean().optional(),
      messageEmail: z.boolean().optional(),
      paymentEmail: z.boolean().optional(),
      marketingEmail: z.boolean().optional(),
      bookingSms: z.boolean().optional(),
      reminderSms: z.boolean().optional(),
      messageSms: z.boolean().optional(),
      paymentSms: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await db.upsertNotificationPreferences(ctx.user.id, input);
    }),

  // Public unsubscribe endpoint (no auth required)
  unsubscribe: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const success = await db.unsubscribeAllEmail(input.token);
      return { success };
    }),

  // Get preferences by unsubscribe token (public, for unsubscribe page)
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const prefs = await db.getPreferencesByUnsubscribeToken(input.token);
      if (!prefs) return null;
      return {
        emailEnabled: prefs.emailEnabled,
        bookingEmail: prefs.bookingEmail,
        reminderEmail: prefs.reminderEmail,
        messageEmail: prefs.messageEmail,
        paymentEmail: prefs.paymentEmail,
        marketingEmail: prefs.marketingEmail,
      };
    }),
});

// ============================================================================
// AVAILABILITY MANAGEMENT
// ============================================================================

const availabilityRouter = router({
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

// ============================================================================
// MAIN APP ROUTER
// ============================================================================

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  provider: providerRouter,
  category: categoryRouter,
  service: serviceRouter,
  booking: bookingRouter,
  review: reviewRouter,
  message: messageRouter,
  notification: notificationRouter,
  availability: availabilityRouter,
  stripe: stripeRouter,
  stripeConnect: stripeConnectRouter,
  subscription: subscriptionRouter,
  admin: adminRouter,
  widget: widgetRouter,
  promo: promoRouter,
});

export type AppRouter = typeof appRouter;
