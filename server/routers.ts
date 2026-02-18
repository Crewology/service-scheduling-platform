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
      const userId = ctx.user.id;
      // Update user profile logic would go here
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
      // Check if user already has a provider profile
      const existing = await db.getProviderByUserId(ctx.user.id);
      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Provider profile already exists" });
      }
      
      await db.createServiceProvider({
        userId: ctx.user.id,
        ...input,
      });
      
      return { success: true };
    }),
    
  getMyProfile: protectedProcedure.query(async ({ ctx }) => {
    return await db.getProviderByUserId(ctx.user.id);
  }),
  
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getProviderById(input.id);
    }),
    
  getMine: protectedProcedure
    .query(async ({ ctx }) => {
      return await db.getProviderByUserId(ctx.user.id);
    }),
    
  list: publicProcedure
    .input(z.object({
      city: z.string().optional(),
      state: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      return await db.getAllProviders(input);
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
      basePrice: z.number().optional(),
      hourlyRate: z.number().optional(),
      durationMinutes: z.number().optional(),
      depositRequired: z.boolean().default(false),
      depositType: z.enum(["fixed", "percentage"]).optional(),
      depositAmount: z.number().optional(),
      depositPercentage: z.number().optional(),
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
      
      return { success: true };
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
      keyword: z.string().optional(),
      categoryId: z.number().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      sortBy: z.enum(["price", "rating", "distance"]).optional(),
    }))
    .query(async ({ input }) => {
      // For now, use simple search. TODO: Implement advanced filtering in db.ts
      return await db.searchServices(input.keyword || "");
    }),
    
  listMine: protectedProcedure
    .query(async ({ ctx }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) {
        return [];
      }
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
      bookingDate: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      locationType: z.enum(["mobile", "fixed_location", "virtual"]),
      serviceAddressLine1: z.string().optional(),
      serviceCity: z.string().optional(),
      serviceState: z.string().optional(),
      servicePostalCode: z.string().optional(),
      customerNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = await db.getServiceById(input.serviceId);
      if (!service) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });
      }
      
      // Generate booking number
      const bookingNumber = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      // Calculate pricing
      const subtotal = service.basePrice ? parseFloat(service.basePrice) : 0;
      const platformFee = subtotal * 0.15; // 15% platform fee
      const totalAmount = subtotal + platformFee;
      
      const depositAmount = service.depositRequired 
        ? (service.depositType === "fixed" 
            ? parseFloat(service.depositAmount || "0") 
            : totalAmount * (parseFloat(service.depositPercentage || "0") / 100))
        : 0;
      
      const remainingAmount = totalAmount - depositAmount;
      
      const bookingId = await db.createBooking({
        bookingNumber,
        customerId: ctx.user.id,
        providerId: service.providerId,
        serviceId: input.serviceId,
        bookingDate: new Date(input.bookingDate).toISOString().split('T')[0],
        startTime: input.startTime,
        endTime: input.endTime,
        durationMinutes: service.durationMinutes || 60,
        status: "pending",
        locationType: input.locationType,
        serviceAddressLine1: input.serviceAddressLine1,
        serviceCity: input.serviceCity,
        serviceState: input.serviceState,
        servicePostalCode: input.servicePostalCode,
        customerNotes: input.customerNotes,
        subtotal: subtotal.toString(),
        platformFee: platformFee.toString(),
        totalAmount: totalAmount.toString(),
        depositAmount: depositAmount.toString(),
        remainingAmount: remainingAmount.toString(),
      });
      
      return { success: true, bookingNumber, id: bookingId };
    }),
    
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const booking = await db.getBookingById(input.id);
      if (!booking) return null;
      
      // Check if user has access to this booking
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (booking.customerId !== ctx.user.id && booking.providerId !== provider?.id) {
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
      if (!provider) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      }
      
      return await db.getProviderBookings(provider.id, input.status);
    }),
    
  listForProvider: protectedProcedure
    .query(async ({ ctx }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) {
        return [];
      }
      return await db.getProviderBookings(provider.id);
    }),
    
  listMine: protectedProcedure
    .query(async ({ ctx }) => {
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
      bookingId: z.number(),
      status: z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled", "no_show", "refunded"]),
      cancellationReason: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const booking = await db.getBookingById(input.bookingId);
      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }
      
      const provider = await db.getProviderByUserId(ctx.user.id);
      
      // Check authorization
      if (booking.customerId !== ctx.user.id && booking.providerId !== provider?.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      
      const additionalData: any = {};
      if (input.status === "cancelled") {
        additionalData.cancellationReason = input.cancellationReason;
        additionalData.cancelledBy = booking.customerId === ctx.user.id ? "customer" : "provider";
      }
      
      await db.updateBookingStatus(input.bookingId, input.status, additionalData);
      
      return { success: true };
    }),
});

// ============================================================================
// REVIEW MANAGEMENT
// ============================================================================

const reviewRouter = router({
  listByProvider: publicProcedure
    .input(z.object({ providerId: z.number() }))
    .query(async ({ input }) => {
      const reviews = await db.getReviewsByProviderId(input.providerId);
      return reviews;
    }),
  
  addResponse: protectedProcedure
    .input(z.object({
      reviewId: z.number(),
      response: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const review = await db.getReviewById(input.reviewId);
      if (!review) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Review not found" });
      }
      
      // Check if user is the provider for this review
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider || provider.id !== review.providerId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the provider can respond" });
      }
      
      await db.addReviewResponse(input.reviewId, input.response);
      return { success: true };
    }),
  
  create: protectedProcedure
    .input(z.object({
      bookingId: z.number(),
      rating: z.number().min(1).max(5),
      reviewText: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const booking = await db.getBookingById(input.bookingId);
      if (!booking) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      }
      
      if (booking.customerId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the customer can review" });
      }
      
      if (booking.status !== "completed") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Can only review completed bookings" });
      }
      
      // Check if review already exists
      const existing = await db.getReviewByBookingId(input.bookingId);
      if (existing) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Review already exists" });
      }
      
      await db.createReview({
        bookingId: input.bookingId,
        customerId: ctx.user.id,
        providerId: booking.providerId,
        rating: input.rating,
        reviewText: input.reviewText,
      });
      
      return { success: true };
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
      // Generate conversation ID (sorted user IDs for consistency)
      const ids = [ctx.user.id, input.recipientId].sort();
      const conversationId = `conv-${ids[0]}-${ids[1]}`;
      
      await db.createMessage({
        conversationId,
        senderId: ctx.user.id,
        recipientId: input.recipientId,
        messageText: input.messageText,
        bookingId: input.bookingId,
      });
      
      return { success: true };
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
      
      // Verify user has access to this booking
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (booking.customerId !== ctx.user.id && booking.providerId !== provider?.id) {
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
      locationType: z.enum(["mobile", "fixed_location", "virtual"]).optional(),
      maxConcurrentBookings: z.number().default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      }
      
      await db.createAvailabilitySchedule({
        providerId: provider.id,
        ...input,
      });
      
      return { success: true };
    }),
    
  getMySchedule: protectedProcedure
    .query(async ({ ctx }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) {
        return [];
      }
      return await db.getProviderAvailability(provider.id);
    }),
    
  getMyOverrides: protectedProcedure
    .query(async ({ ctx }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) {
        return [];
      }
      // Get overrides for next 90 days
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
      if (!provider) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      }
      
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
