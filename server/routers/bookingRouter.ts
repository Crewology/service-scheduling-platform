import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { formatTimeForDisplay } from "@shared/timeSlots";

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

      // PRIORITY 0: Check availability overrides (blocked dates)
      const providerId = input.providerId || service.providerId;
      const overrides = await db.getAvailabilityOverrides(providerId, input.bookingDate, input.bookingDate);
      const dateOverride = overrides.find((o: any) => o.overrideDate === input.bookingDate);
      if (dateOverride && !dateOverride.isAvailable) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This provider is unavailable on ${input.bookingDate}${dateOverride.reason ? ` (${dateOverride.reason})` : ""}. Please choose a different date.`,
        });
      }
      // If override has custom hours, check if booking falls within those hours
      if (dateOverride && dateOverride.isAvailable && dateOverride.startTime && dateOverride.endTime) {
        if (input.startTime < dateOverride.startTime || input.endTime > dateOverride.endTime) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `This provider has modified hours on ${input.bookingDate} (${dateOverride.startTime} - ${dateOverride.endTime}). Please adjust your booking time.`,
          });
        }
      }

      // PRIORITY 1: Double-booking prevention with group class capacity support
      const existingBookings = await db.getBookingsByDateRange(
        providerId,
        input.bookingDate,
        input.bookingDate
      );
      const overlappingBookings = existingBookings.filter((b: any) => {
        if (["cancelled", "refunded", "no_show"].includes(b.status)) return false;
        return input.startTime < b.endTime && input.endTime > b.startTime;
      });

      // For group classes, check capacity; for individual services, any overlap = conflict
      const maxCapacity = service.maxCapacity || 1;
      const isGroupClass = service.isGroupClass || false;

      if (isGroupClass) {
        // Count bookings for this exact time slot (same service)
        const sameSlotBookings = overlappingBookings.filter(
          (b: any) => b.serviceId === input.serviceId && b.startTime === input.startTime
        );
        if (sameSlotBookings.length >= maxCapacity) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `This class is full (${maxCapacity} spots). Please choose a different time or join the waitlist.`,
          });
        }
      } else {
        // Individual service: any overlap is a conflict
        if (overlappingBookings.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This time slot is no longer available. Another booking already exists for this time. Please choose a different time.",
          });
        }
      }

      const bookingNumber = `OC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
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

      // Send booking created notification to provider (email + push)
      try {
        const { sendNotification } = await import("../notifications");
        const { sendPushNotification } = await import("../notifications/pushHelper");
        const providerData = await db.getProviderById(providerId);
        const providerUser = providerData ? await db.getUserById(providerData.userId) : null;
        if (providerUser?.email) {
          await sendNotification({
            type: "booking_created",
            channel: "email",
            recipient: { userId: providerUser.id, email: providerUser.email, name: providerUser.name || "Provider" },
            data: {
              bookingId,
              bookingNumber,
              serviceName: service.name,
              customerName: ctx.user.name || "Customer",
              date: input.bookingDate,
              time: formatTimeForDisplay(input.startTime),
              providerName: providerData?.businessName || providerUser.name || "Provider",
            },
          });
        }
        // Push to provider
        if (providerUser) {
          sendPushNotification("booking_created", { userId: providerUser.id, name: providerUser.name || "Provider" }, {
            bookingNumber, serviceName: service.name, customerName: ctx.user.name || "Customer",
            date: input.bookingDate, time: formatTimeForDisplay(input.startTime),
          });
        }
        if (ctx.user.email) {
          await sendNotification({
            type: "booking_confirmed",
            channel: "email",
            recipient: { userId: ctx.user.id, email: ctx.user.email, name: ctx.user.name || "Customer" },
            data: {
              bookingId,
              bookingNumber,
              serviceName: service.name,
              providerName: providerData?.businessName || "Provider",
              customerName: ctx.user.name || "Customer",
              date: input.bookingDate,
              time: formatTimeForDisplay(input.startTime),
              amount: totalAmount,
            },
          });
        }
        // Push to customer
        sendPushNotification("booking_confirmed", { userId: ctx.user.id, name: ctx.user.name || "Customer" }, {
          bookingNumber, serviceName: service.name, providerName: providerData?.businessName || "Provider",
          date: input.bookingDate, time: formatTimeForDisplay(input.startTime), amount: totalAmount,
        });
         // Create in-app notifications (triggers SSE push automatically)
        if (providerUser) {
          await db.createNotification({
            userId: providerUser.id,
            notificationType: "booking_created",
            title: "New Booking Request",
            message: `${ctx.user.name || "A customer"} booked ${service.name} for ${input.bookingDate} at ${formatTimeForDisplay(input.startTime)}`,
            actionUrl: `/provider/dashboard`,
            relatedBookingId: bookingId,
          });
        }
        await db.createNotification({
          userId: ctx.user.id,
          notificationType: "booking_confirmed",
          title: "Booking Confirmed",
          message: `Your booking for ${service.name} on ${input.bookingDate} at ${formatTimeForDisplay(input.startTime)} has been submitted`,
          actionUrl: `/booking/${bookingId}/detail`,
          relatedBookingId: bookingId,
        });
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
        const { sendPushNotification } = await import("../notifications/pushHelper");
        const service = await db.getServiceById(booking.serviceId);
        const customer = await db.getUserById(booking.customerId);
        const providerData = await db.getProviderById(booking.providerId);
        const providerUser = providerData ? await db.getUserById(providerData.userId) : null;

        const notifData = {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          serviceName: service?.name || "Service",
          providerName: providerData?.businessName || providerUser?.name || "Provider",
          customerName: customer?.name || "Customer",
          date: booking.bookingDate,
          time: formatTimeForDisplay(booking.startTime),
          amount: booking.totalAmount || "0.00",
        };

        if (input.status === "confirmed" && customer?.email) {
          await sendNotification({
            type: "booking_confirmed",
            channel: "email",
            recipient: { userId: customer.id, email: customer.email, name: customer.name || "Customer" },
            data: notifData,
          });
        }
        if (input.status === "confirmed" && customer) {
          sendPushNotification("booking_confirmed", { userId: customer.id, name: customer.name || "Customer" }, notifData);
        }

        if (input.status === "completed" && customer?.email) {
          await sendNotification({
            type: "booking_completed",
            channel: "email",
            recipient: { userId: customer.id, email: customer.email, name: customer.name || "Customer" },
            data: notifData,
          });
        }
        if (input.status === "completed" && customer) {
          sendPushNotification("booking_completed", { userId: customer.id, name: customer.name || "Customer" }, notifData);
        }
        // Create in-app notifications for status changes (triggers SSE push automatically)
        const statusMessages: Record<string, { title: string; message: string; type: string }> = {
          confirmed: {
            title: "Booking Confirmed",
            message: `Your booking ${booking.bookingNumber} for ${service?.name || "Service"} has been confirmed`,
            type: "booking_confirmed",
          },
          completed: {
            title: "Booking Completed",
            message: `Your booking ${booking.bookingNumber} for ${service?.name || "Service"} has been marked as completed`,
            type: "booking_completed",
          },
          cancelled: {
            title: "Booking Cancelled",
            message: `Booking ${booking.bookingNumber} for ${service?.name || "Service"} has been cancelled`,
            type: "booking_cancelled",
          },
          in_progress: {
            title: "Booking In Progress",
            message: `Your booking ${booking.bookingNumber} for ${service?.name || "Service"} is now in progress`,
            type: "booking_in_progress",
          },
        };
        const statusMsg = statusMessages[input.status];
        if (statusMsg && customer) {
          await db.createNotification({
            userId: customer.id,
            notificationType: statusMsg.type,
            title: statusMsg.title,
            message: statusMsg.message,
            actionUrl: `/booking/${booking.id}/detail`,
            relatedBookingId: booking.id,
          });
        }
        // Notify provider about customer-initiated status changes
        if (statusMsg && providerUser && booking.customerId === ctx.user.id) {
          await db.createNotification({
            userId: providerUser.id,
            notificationType: statusMsg.type,
            title: statusMsg.title,
            message: `Booking ${booking.bookingNumber} status changed to ${input.status}`,
            actionUrl: `/provider/dashboard`,
            relatedBookingId: booking.id,
          });
        }
        // Referral reward fulfillment: when booking completes, check if customer was referred
        if (input.status === "completed" && customer) {
          try {
            const { fulfillReferralAndNotify } = await import("../referralFulfillment");
            await fulfillReferralAndNotify(booking.id, customer, service?.name || "Service");
          } catch (refErr) {
            console.error("[Referral] Fulfillment failed (non-blocking):", refErr);
          }
        }
        // Recalculate provider trust score on booking completion
        if (input.status === "completed") {
          try {
            await db.updateProviderTrustScore(booking.providerId);
          } catch (trustErr) {
            console.error("[TrustScore] Recalculation failed (non-blocking):", trustErr);
          }
        }
        // Notify next person on waitlist if a group class booking is cancelled
        if (input.status === "cancelled" && service?.isGroupClass) {
          try {
            const { notifyNextOnWaitlist } = await import("./waitlistRouter");
            const bookingDateStr = typeof booking.bookingDate === "string"
              ? booking.bookingDate
              : new Date(booking.bookingDate).toISOString().split("T")[0];
            await notifyNextOnWaitlist(
              booking.serviceId,
              bookingDateStr,
              booking.startTime,
              service.name
            );
          } catch (wErr) {
            console.error("[Waitlist] Notification failed (non-blocking):", wErr);
          }
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
      const { sendPushNotification } = await import("../notifications/pushHelper");
      const customer = await db.getUserById(booking.customerId);
      const providerData = await db.getProviderById(booking.providerId);
      const providerUser = providerData ? await db.getUserById(providerData.userId) : null;

      const cancelData = {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        serviceName: service?.name || "Service",
        cancelledBy,
        refundAmount,
        refundPercentage: refundPercentage.toString(),
        reason: input.reason,
      };

      if (customer?.email) {
        await sendNotification({
          type: "booking_cancelled",
          channel: "email",
          recipient: { userId: customer.id, email: customer.email, name: customer.name || "Customer" },
          data: cancelData,
        });
      }
      // Push to customer
      if (customer) {
        sendPushNotification("booking_cancelled", { userId: customer.id, name: customer.name || "Customer" }, cancelData);
      }

      if (providerUser?.email && cancelledBy === "customer") {
        await sendNotification({
          type: "booking_cancelled",
          channel: "email",
          recipient: { userId: providerUser.id, email: providerUser.email, name: providerUser.name || "Provider" },
          data: cancelData,
        });
      }
      // Push to provider on customer cancellation
      if (providerUser && cancelledBy === "customer") {
        sendPushNotification("booking_cancelled", { userId: providerUser.id, name: providerUser.name || "Provider" }, cancelData);
      }

      // Create in-app notifications for cancellation (triggers SSE push automatically)
      try {
        if (customer) {
          await db.createNotification({
            userId: customer.id,
            notificationType: "booking_cancelled",
            title: "Booking Cancelled",
            message: `Booking ${booking.bookingNumber} for ${service?.name || "Service"} has been cancelled. ${parseFloat(refundAmount) > 0 ? `Refund: $${refundAmount}` : "No refund applicable."}`,
            actionUrl: `/booking/${booking.id}/detail`,
            relatedBookingId: booking.id,
          });
        }
        if (providerUser && cancelledBy === "customer") {
          await db.createNotification({
            userId: providerUser.id,
            notificationType: "booking_cancelled",
            title: "Booking Cancelled by Customer",
            message: `${customer?.name || "Customer"} cancelled booking ${booking.bookingNumber} for ${service?.name || "Service"}`,
            actionUrl: `/provider/dashboard`,
            relatedBookingId: booking.id,
          });
        }
      } catch (err) {
        console.error("[Cancellation] In-app notification failed (non-blocking):", err);
      }

      // Notify next person on waitlist if this was a group class
      if (service?.isGroupClass) {
        try {
          const { notifyNextOnWaitlist } = await import("./waitlistRouter");
          const bookingDateStr = typeof booking.bookingDate === "string"
            ? booking.bookingDate
            : new Date(booking.bookingDate).toISOString().split("T")[0];
          await notifyNextOnWaitlist(
            booking.serviceId,
            bookingDateStr,
            booking.startTime,
            service.name
          );
        } catch (err) {
          console.error("[Cancellation] Waitlist notification failed (non-blocking):", err);
        }
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

  // ============================================================================
  // MULTI-DAY RANGE BOOKING
  // ============================================================================
  createMultiDay: protectedProcedure
    .input(z.object({
      serviceId: z.number(),
      providerId: z.number().optional(),
      startDate: z.string(), // YYYY-MM-DD
      endDate: z.string(),   // YYYY-MM-DD
      startTime: z.string(), // HH:MM
      endTime: z.string(),   // HH:MM
      durationMinutes: z.number().optional(),
      locationType: z.enum(["mobile", "fixed_location", "virtual"]),
      serviceAddressLine1: z.string().optional(),
      serviceAddressLine2: z.string().optional(),
      serviceCity: z.string().optional(),
      serviceState: z.string().optional(),
      servicePostalCode: z.string().optional(),
      customerNotes: z.string().optional(),
      bookingSource: z.enum(["direct", "embed_widget", "provider_page", "api"]).default("direct"),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = await db.getServiceById(input.serviceId);
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });

      const providerId = input.providerId || service.providerId;

      // Calculate all dates in the range
      const dates: string[] = [];
      const start = new Date(input.startDate + "T12:00:00");
      const end = new Date(input.endDate + "T12:00:00");
      if (end < start) throw new TRPCError({ code: "BAD_REQUEST", message: "End date must be after start date" });
      
      const current = new Date(start);
      while (current <= end) {
        dates.push(current.toISOString().split("T")[0]);
        current.setDate(current.getDate() + 1);
      }
      const totalDays = dates.length;
      if (totalDays > 30) throw new TRPCError({ code: "BAD_REQUEST", message: "Multi-day bookings cannot exceed 30 days" });

      // Check availability overrides (blocked dates)
      const overrides = await db.getAvailabilityOverrides(providerId, dates[0], dates[dates.length - 1]);
      const blockedDates = overrides.filter((o: any) => !o.isAvailable).map((o: any) => o.overrideDate);
      if (blockedDates.length > 0) {
        const blockedInRange = dates.filter(d => blockedDates.includes(d));
        if (blockedInRange.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Provider is unavailable on ${blockedInRange.length} date(s): ${blockedInRange.slice(0, 5).join(", ")}${blockedInRange.length > 5 ? " and more" : ""}. Please adjust your dates.`,
          });
        }
      }

      // Check conflicts for all dates
      const conflicts = await db.checkSessionConflicts(providerId, dates, input.startTime, input.endTime);
      if (conflicts.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Scheduling conflicts found on ${conflicts.length} date(s): ${conflicts.map(c => c.date).join(", ")}. Please choose different dates or times.`,
        });
      }

      // Calculate pricing
      const perDayPrice = parseFloat(service.basePrice || service.hourlyRate || "0");
      const subtotal = (perDayPrice * totalDays).toFixed(2);
      const platformFee = (parseFloat(subtotal) * 0.01).toFixed(2);
      const totalAmount = (parseFloat(subtotal) + parseFloat(platformFee)).toFixed(2);
      const depositAmount = service.depositRequired
        ? (service.depositType === "fixed"
            ? (service.depositAmount || "0.00")
            : (parseFloat(totalAmount) * (parseFloat(service.depositPercentage || "0") / 100)).toFixed(2))
        : "0.00";
      const remainingAmount = (parseFloat(totalAmount) - parseFloat(depositAmount)).toFixed(2);

      const bookingNumber = `OC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const bookingId = await db.createBooking({
        bookingNumber,
        customerId: ctx.user.id,
        providerId,
        serviceId: input.serviceId,
        bookingDate: input.startDate,
        startTime: input.startTime,
        endTime: input.endTime,
        durationMinutes: input.durationMinutes || service.durationMinutes || 60,
        status: "pending",
        bookingType: "multi_day",
        endDate: input.endDate,
        totalDays,
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

      // Create individual sessions for each day
      const sessions = dates.map((date, idx) => ({
        bookingId,
        sessionDate: date,
        startTime: input.startTime,
        endTime: input.endTime,
        sessionNumber: idx + 1,
        status: "scheduled" as const,
      }));
      await db.createBookingSessions(sessions);

      const booking = await db.getBookingById(bookingId);

      // Send notification
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
              bookingId,
              bookingNumber,
              serviceName: service.name,
              customerName: ctx.user.name || "Customer",
              date: `${input.startDate} to ${input.endDate} (${totalDays} days)`,
              time: formatTimeForDisplay(input.startTime),
              providerName: providerData?.businessName || providerUser.name || "Provider",
            },
          });
        }
      } catch (err) {
        console.error("[Booking] Multi-day notification failed (non-blocking):", err);
      }

      return booking;
    }),

  // ============================================================================
  // RECURRING BOOKING
  // ============================================================================
  createRecurring: protectedProcedure
    .input(z.object({
      serviceId: z.number(),
      providerId: z.number().optional(),
      startDate: z.string(), // First session date YYYY-MM-DD
      startTime: z.string(),
      endTime: z.string(),
      durationMinutes: z.number().optional(),
      frequency: z.enum(["weekly", "biweekly"]),
      daysOfWeek: z.array(z.number().min(0).max(6)), // 0=Sun, 1=Mon, ..., 6=Sat
      totalWeeks: z.number().min(1).max(52),
      locationType: z.enum(["mobile", "fixed_location", "virtual"]),
      serviceAddressLine1: z.string().optional(),
      serviceAddressLine2: z.string().optional(),
      serviceCity: z.string().optional(),
      serviceState: z.string().optional(),
      servicePostalCode: z.string().optional(),
      customerNotes: z.string().optional(),
      bookingSource: z.enum(["direct", "embed_widget", "provider_page", "api"]).default("direct"),
    }))
    .mutation(async ({ ctx, input }) => {
      const service = await db.getServiceById(input.serviceId);
      if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });

      if (input.daysOfWeek.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Please select at least one day of the week" });
      }

      const providerId = input.providerId || service.providerId;

      // Generate all session dates
      const sessionDates: string[] = [];
      const startDate = new Date(input.startDate + "T12:00:00");
      const weekIncrement = input.frequency === "biweekly" ? 2 : 1;
      
      for (let week = 0; week < input.totalWeeks; week++) {
        for (const dayOfWeek of input.daysOfWeek) {
          const sessionDate = new Date(startDate);
          // Move to the correct week
          sessionDate.setDate(sessionDate.getDate() + (week * weekIncrement * 7));
          // Move to the correct day of the week
          const currentDay = sessionDate.getDay();
          const diff = dayOfWeek - currentDay;
          sessionDate.setDate(sessionDate.getDate() + diff);
          // Only include dates on or after the start date
          if (sessionDate >= startDate) {
            sessionDates.push(sessionDate.toISOString().split("T")[0]);
          }
        }
      }

      // Remove duplicates and sort
      const uniqueDates = Array.from(new Set(sessionDates)).sort();
      if (uniqueDates.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No valid session dates could be generated with the selected options" });
      }
      if (uniqueDates.length > 200) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Too many sessions. Please reduce the number of weeks or days per week." });
      }

      // Check availability overrides (blocked dates)
      const overrides = await db.getAvailabilityOverrides(providerId, uniqueDates[0], uniqueDates[uniqueDates.length - 1]);
      const blockedDates = overrides.filter((o: any) => !o.isAvailable).map((o: any) => o.overrideDate);
      const blockedInRange = uniqueDates.filter(d => blockedDates.includes(d));
      if (blockedInRange.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Provider is unavailable on ${blockedInRange.length} date(s): ${blockedInRange.slice(0, 5).join(", ")}${blockedInRange.length > 5 ? " and more" : ""}. Please adjust your schedule or remove those dates.`,
        });
      }

      // Check conflicts for all session dates
      const conflicts = await db.checkSessionConflicts(providerId, uniqueDates, input.startTime, input.endTime);
      if (conflicts.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Scheduling conflicts found on ${conflicts.length} date(s): ${conflicts.slice(0, 5).map(c => c.date).join(", ")}${conflicts.length > 5 ? " and more" : ""}. Please adjust your schedule.`,
        });
      }

      // Calculate pricing
      const perSessionPrice = parseFloat(service.basePrice || service.hourlyRate || "0");
      const totalSessions = uniqueDates.length;
      const subtotal = (perSessionPrice * totalSessions).toFixed(2);
      const platformFee = (parseFloat(subtotal) * 0.01).toFixed(2);
      const totalAmount = (parseFloat(subtotal) + parseFloat(platformFee)).toFixed(2);
      const depositAmount = service.depositRequired
        ? (service.depositType === "fixed"
            ? (service.depositAmount || "0.00")
            : (parseFloat(totalAmount) * (parseFloat(service.depositPercentage || "0") / 100)).toFixed(2))
        : "0.00";
      const remainingAmount = (parseFloat(totalAmount) - parseFloat(depositAmount)).toFixed(2);

      const bookingNumber = `OC-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const lastDate = uniqueDates[uniqueDates.length - 1];

      const bookingId = await db.createBooking({
        bookingNumber,
        customerId: ctx.user.id,
        providerId,
        serviceId: input.serviceId,
        bookingDate: uniqueDates[0],
        startTime: input.startTime,
        endTime: input.endTime,
        durationMinutes: input.durationMinutes || service.durationMinutes || 60,
        status: "pending",
        bookingType: "recurring",
        endDate: lastDate,
        totalDays: totalSessions,
        recurrenceFrequency: input.frequency,
        recurrenceDaysOfWeek: JSON.stringify(input.daysOfWeek),
        recurrenceTotalWeeks: input.totalWeeks,
        recurrenceTotalSessions: totalSessions,
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

      // Create individual sessions
      const sessions = uniqueDates.map((date, idx) => ({
        bookingId,
        sessionDate: date,
        startTime: input.startTime,
        endTime: input.endTime,
        sessionNumber: idx + 1,
        status: "scheduled" as const,
      }));
      await db.createBookingSessions(sessions);

      const booking = await db.getBookingById(bookingId);

      // Send notification
      try {
        const { sendNotification } = await import("../notifications");
        const providerData = await db.getProviderById(providerId);
        const providerUser = providerData ? await db.getUserById(providerData.userId) : null;
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const daysStr = input.daysOfWeek.map(d => dayNames[d]).join(", ");
        if (providerUser?.email) {
          await sendNotification({
            type: "booking_created",
            channel: "email",
            recipient: { userId: providerUser.id, email: providerUser.email, name: providerUser.name || "Provider" },
            data: {
              bookingId,
              bookingNumber,
              serviceName: service.name,
              customerName: ctx.user.name || "Customer",
              date: `Recurring ${input.frequency}: ${daysStr} for ${input.totalWeeks} weeks (${totalSessions} sessions)`,
              time: formatTimeForDisplay(input.startTime),
              providerName: providerData?.businessName || providerUser.name || "Provider",
            },
          });
        }
      } catch (err) {
        console.error("[Booking] Recurring notification failed (non-blocking):", err);
      }

      return booking;
    }),

  // Get sessions for a booking
  getSessions: protectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .query(async ({ ctx, input }) => {
      const booking = await db.getBookingById(input.bookingId);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (booking.customerId !== ctx.user.id && booking.providerId !== provider?.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return await db.getSessionsByBookingId(input.bookingId);
    }),

  // Update a single session status
  updateSessionStatus: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      bookingId: z.number(),
      status: z.enum(["scheduled", "completed", "cancelled", "no_show"]),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const booking = await db.getBookingById(input.bookingId);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (booking.providerId !== provider?.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the provider can update session status" });
      }
      const session = await db.getSessionById(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      await db.updateSessionStatus(input.sessionId, input.status, input.notes);

      // Send notification to customer about session status change
      try {
        const { sendNotification } = await import("../notifications");
        const { sendPushNotification } = await import("../notifications/pushHelper");
        const customer = await db.getUserById(booking.customerId);
        const service = booking.serviceId ? await db.getServiceById(booking.serviceId) : null;
        const providerData = await db.getProviderById(booking.providerId);
        const sessionData = {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          sessionDate: session.sessionDate,
          sessionNumber: session.sessionNumber,
          serviceName: service?.name || "Service",
          providerName: providerData?.businessName || "Provider",
          customerName: customer?.name || "Customer",
          notes: input.notes,
        };
        if (customer?.email && (input.status === "completed" || input.status === "cancelled")) {
          await sendNotification({
            type: input.status === "completed" ? "session_completed" : "session_cancelled",
            channel: "email",
            recipient: { userId: customer.id, email: customer.email, name: customer.name || "Customer" },
            data: sessionData,
          });
        }
        // Push notification for session status
        if (customer && (input.status === "completed" || input.status === "cancelled")) {
          sendPushNotification(
            input.status === "completed" ? "session_completed" : "session_cancelled",
            { userId: customer.id, name: customer.name || "Customer" },
            sessionData
          );
        }
      } catch (err) {
        console.error("[SessionStatus] Notification failed (non-blocking):", err);
      }

      return { success: true };
    }),

  // Reschedule a specific session within a recurring/multi-day booking
  rescheduleSession: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      bookingId: z.number(),
      newDate: z.string(),
      newStartTime: z.string(),
      newEndTime: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const booking = await db.getBookingById(input.bookingId);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });

      // Both customer and provider can reschedule
      const provider = await db.getProviderByUserId(ctx.user.id);
      const isCustomer = booking.customerId === ctx.user.id;
      const isProvider = provider && booking.providerId === provider.id;
      if (!isCustomer && !isProvider && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      const session = await db.getSessionById(input.sessionId);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      if (session.bookingId !== input.bookingId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Session does not belong to this booking" });
      }
      if (session.status !== "scheduled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only scheduled sessions can be rescheduled" });
      }

      // Check for conflicts on the new date/time
      const conflicts = await db.checkSessionConflicts(
        booking.providerId,
        [input.newDate],
        input.newStartTime,
        input.newEndTime,
        booking.id
      );
      if (conflicts.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "The new time slot conflicts with an existing booking or session.",
        });
      }

      // Create a new session with the rescheduled date/time
      const newSessionId = await db.createSingleSession({
        bookingId: input.bookingId,
        sessionDate: input.newDate,
        startTime: input.newStartTime,
        endTime: input.newEndTime,
        sessionNumber: session.sessionNumber,
        status: "scheduled",
      });

      // Mark the old session as rescheduled
      await db.rescheduleSession(input.sessionId, newSessionId, session.sessionDate);

      // Send notification
      try {
        const { sendNotification } = await import("../notifications");
        const { sendPushNotification } = await import("../notifications/pushHelper");
        const customer = await db.getUserById(booking.customerId);
        const service = booking.serviceId ? await db.getServiceById(booking.serviceId) : null;
        const providerData = await db.getProviderById(booking.providerId);
        const providerUser = providerData ? await db.getUserById(providerData.userId) : null;
        const notifyTarget = isCustomer ? providerUser : customer;
        const rescheduleData = {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          sessionNumber: session.sessionNumber,
          originalDate: session.sessionDate,
          newDate: input.newDate,
          newStartTime: input.newStartTime,
          newEndTime: input.newEndTime,
          serviceName: service?.name || "Service",
          providerName: providerData?.businessName || "Provider",
          customerName: customer?.name || "Customer",
          rescheduledBy: isCustomer ? "customer" : "provider",
        };
        if (notifyTarget?.email) {
          await sendNotification({
            type: "session_rescheduled",
            channel: "email",
            recipient: { userId: notifyTarget.id, email: notifyTarget.email, name: notifyTarget.name || "User" },
            data: rescheduleData,
          });
        }
        // Push to the other party
        if (notifyTarget) {
          sendPushNotification("session_rescheduled", { userId: notifyTarget.id, name: notifyTarget.name || "User" }, rescheduleData);
        }
      } catch (err) {
        console.error("[SessionReschedule] Notification failed (non-blocking):", err);
      }

      return { success: true, newSessionId };
    }),

  // ============================================================================
  // PROVIDER CALENDAR VIEW
  // ============================================================================

  calendarEvents: protectedProcedure
    .input(z.object({
      month: z.number().min(1).max(12).optional(),
      year: z.number().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });

      // Get all bookings for this provider with service/customer details
      const calendarBookings = await db.getProviderCalendarBookings(provider.id);

      // Also get sessions for recurring/multi-day bookings
      const bookingIds = calendarBookings.map((b: any) => b.id);
      const allSessions: any[] = [];
      for (const bookingId of bookingIds) {
        const sessions = await db.getSessionsByBookingId(bookingId);
        if (sessions.length > 0) {
          allSessions.push(...sessions.map((s: any) => ({
            ...s,
            bookingId,
            parentBooking: calendarBookings.find((b: any) => b.id === bookingId),
          })));
        }
      }

      // Get availability overrides for the next 90 days
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 90);
      const todayStr = today.toISOString().split("T")[0];
      const endStr = endDate.toISOString().split("T")[0];
      const overrides = await db.getAvailabilityOverrides(provider.id, todayStr, endStr);

      return {
        bookings: calendarBookings,
        sessions: allSessions,
        overrides: overrides || [],
      };
    }),
});
