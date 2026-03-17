import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { stripeRouter } from "./stripeRouter";
import { adminRouter } from "./adminRouter";

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
    }))
    .mutation(async ({ ctx, input }) => {
      return { success: true };
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
      
      const subtotal = input.subtotal || (service.basePrice ? service.basePrice : "0.00");
      const subtotalNum = parseFloat(subtotal);
      const platformFee = input.platformFee || (subtotalNum * 0.15).toFixed(2);
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
        subtotal,
        platformFee,
        totalAmount,
        depositAmount,
        remainingAmount,
      });
      
      const booking = await db.getBookingById(bookingId);
      if (!booking) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve created booking" });
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
      return updated!;
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
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
