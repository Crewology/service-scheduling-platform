import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import Stripe from "stripe";
import { ENV } from "./_core/env";
import * as db from "./db";

const stripe = new Stripe(ENV.stripeSecretKey, {
  apiVersion: "2026-01-28.clover",
});

export const stripeRouter = router({
  createCheckoutSession: protectedProcedure
    .input(z.object({
      bookingId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get booking details
      const booking = await db.getBookingById(input.bookingId);
      if (!booking) {
        throw new Error("Booking not found");
      }
      
      // Verify user owns this booking
      if (booking.customerId !== ctx.user.id) {
        throw new Error("Unauthorized");
      }
      
      // Get service and provider details
      const service = await db.getServiceById(booking.serviceId);
      const provider = await db.getProviderById(booking.providerId);
      
      if (!service || !provider) {
        throw new Error("Service or provider not found");
      }
      
      // Determine amount to charge (deposit or full amount)
      const amountToCharge = service.depositRequired 
        ? parseFloat(booking.depositAmount || "0")
        : parseFloat(booking.totalAmount || "0");
      
      if (amountToCharge <= 0) {
        throw new Error("Invalid payment amount");
      }
      
      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: service.name,
                description: `Booking #${booking.bookingNumber} - ${service.depositRequired ? "Deposit Payment" : "Full Payment"}`,
                metadata: {
                  serviceId: service.id.toString(),
                  providerId: provider.id.toString(),
                  bookingId: booking.id.toString(),
                },
              },
              unit_amount: Math.round(amountToCharge * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${ctx.req.headers.origin}/booking/${booking.id}?payment=success`,
        cancel_url: `${ctx.req.headers.origin}/booking/${booking.id}?payment=cancelled`,
        customer_email: ctx.user.email || undefined,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          bookingId: booking.id.toString(),
          customerId: ctx.user.id.toString(),
          providerId: provider.id.toString(),
          serviceId: service.id.toString(),
          bookingNumber: booking.bookingNumber,
          paymentType: service.depositRequired ? "deposit" : "full",
        },
        allow_promotion_codes: true,
      });
      
      return { url: session.url };
    }),
});
