import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const bookingRouter = router({
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
      referralCodeId: z.number().optional(),
      subtotal: z.string().optional(),
      platformFee: z.string().optional(),
      totalAmount: z.string().optional(),
      depositAmount: z.string().optional(),
      remainingAmount: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = await db.getServiceById(input.serviceId);
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });

      // PRIORITY 1: Double-booking prevention
      const providerId = input.providerId || service.providerId;
      const existingBookings = await db.getBookingsByDateRange(
        providerId,
        input.bookingDate,
        input.bookingDate
      );
      const hasConflict = existingBookings.some((b: any) => {
        if (["cancelled", "refunded", "no_show"].includes(b.status)) return false;
        return input.startTime < b.endTime && input.endTime > b.startTime;
      });
      if (hasConflict) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This time slot is no longer available. Another booking already exists for this time. Please choose a different time.",
        });
      }

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

      // Note: Referral recording is handled by the frontend calling referral.applyCode
      // after booking creation, since the referralRouter has the full referrer info.

      // Send booking created notification to provider
      try {
        const { sendNotification } = await import("../notifications");
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

  getDetail: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const booking = await db.getBookingById(input.id);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (booking.customerId !== ctx.user.id && booking.providerId !== provider?.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      const [customer, service, providerInfo, payment, messages, review] = await Promise.all([
        db.getUserById(booking.customerId),
        booking.serviceId ? db.getServiceById(booking.serviceId) : null,
        db.getProviderById(booking.providerId),
        db.getPaymentByBookingId(booking.id),
        db.getMessagesByBooking(booking.id),
        db.getReviewByBookingId(booking.id),
      ]);
      return {
        booking,
        customer: customer ? { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone } : null,
        service: service ? { id: service.id, name: service.name, categoryId: service.categoryId } : null,
        provider: providerInfo ? { id: providerInfo.id, businessName: providerInfo.businessName } : null,
        payment: payment || null,
        messages: messages || [],
        review: review || null,
      };
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

      try {
        const { sendNotification } = await import("../notifications");
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

      const service = await db.getServiceById(booking.serviceId);
      const bookingDateTime = new Date(`${booking.bookingDate}T${booking.startTime}`);
      const hoursUntilBooking = (bookingDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
      const totalPaid = parseFloat(booking.totalAmount || "0");

      let refundPercentage = 0;
      let refundReason = "";

      if (cancelledBy === "provider" || cancelledBy === "admin") {
        refundPercentage = 100;
        refundReason = `Cancelled by ${cancelledBy}: ${input.reason}`;
      } else {
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

      const payment = await db.getPaymentByBookingId(input.bookingId);
      let stripeRefundId: string | undefined;

      if (payment?.stripePaymentIntentId && parseFloat(refundAmount) > 0) {
        try {
          const Stripe = (await import("stripe")).default;
          const { ENV } = await import("../_core/env");
          const stripe = new Stripe(ENV.stripeSecretKey, { apiVersion: "2025-12-18.acacia" as any });
          const refund = await stripe.refunds.create({
            payment_intent: payment.stripePaymentIntentId,
            amount: Math.round(parseFloat(refundAmount) * 100),
            reason: "requested_by_customer",
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
        }
      }

      await db.cancelBooking(input.bookingId, {
        cancellationReason: input.reason,
        cancelledBy,
        cancelledAt: new Date(),
      });

      const { sendNotification } = await import("../notifications");
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

  // Check for schedule conflicts before confirming a booking
  checkConflicts: protectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .query(async ({ ctx, input }) => {
      const booking = await db.getBookingById(input.bookingId);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });

      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider || booking.providerId !== provider.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const conflicts = await db.checkProviderConflicts(
        booking.providerId,
        booking.bookingDate,
        booking.startTime,
        booking.endTime,
        booking.id
      );

      return {
        hasConflicts: conflicts.length > 0,
        conflicts: conflicts.map((c: any) => ({
          id: c.id,
          bookingNumber: c.bookingNumber,
          bookingDate: c.bookingDate,
          startTime: c.startTime,
          endTime: c.endTime,
          status: c.status,
          serviceName: c.serviceName || "Unknown Service",
        })),
      };
    }),

  // Check conflicts for a specific date/time range (used before booking creation)
  checkTimeConflicts: protectedProcedure
    .input(z.object({
      providerId: z.number(),
      bookingDate: z.string(),
      startTime: z.string(),
      endTime: z.string(),
    }))
    .query(async ({ input }) => {
      const conflicts = await db.checkProviderConflicts(
        input.providerId,
        input.bookingDate,
        input.startTime,
        input.endTime
      );

      return {
        hasConflicts: conflicts.length > 0,
        conflictCount: conflicts.length,
        conflicts: conflicts.map((c: any) => ({
          id: c.id,
          bookingNumber: c.bookingNumber,
          startTime: c.startTime,
          endTime: c.endTime,
          status: c.status,
          serviceName: c.serviceName || "Unknown Service",
        })),
      };
    }),
});
