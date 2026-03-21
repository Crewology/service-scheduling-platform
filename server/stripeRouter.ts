import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import Stripe from "stripe";
import { ENV } from "./_core/env";
import * as db from "./db";

const stripe = new Stripe(ENV.stripeSecretKey, {
  apiVersion: "2025-12-18.acacia" as any,
});

const PLATFORM_FEE_RATE = 0.01; // 1% platform fee (revenue comes from subscriptions)

export const stripeRouter = router({
  createCheckoutSession: protectedProcedure
    .input(z.object({
      bookingId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const booking = await db.getBookingById(input.bookingId);
      if (!booking) throw new Error("Booking not found");
      if (booking.customerId !== ctx.user.id) throw new Error("Unauthorized");

      const service = await db.getServiceById(booking.serviceId);
      const provider = await db.getProviderById(booking.providerId);
      if (!service || !provider) throw new Error("Service or provider not found");

      // Determine amount to charge (deposit or full amount)
      const amountToCharge = service.depositRequired
        ? parseFloat(booking.depositAmount || "0")
        : parseFloat(booking.totalAmount || "0");

      if (amountToCharge <= 0) throw new Error("Invalid payment amount");

      const amountInCents = Math.round(amountToCharge * 100);
      const platformFeeInCents = Math.round(amountInCents * PLATFORM_FEE_RATE);

      // Build checkout session options
      const sessionOptions: Stripe.Checkout.SessionCreateParams = {
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
              unit_amount: amountInCents,
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
      };

      // If provider has a connected Stripe account, use destination charges
      // Money goes directly to the provider, platform takes a fee
      if (provider.stripeAccountId && provider.payoutEnabled) {
        sessionOptions.payment_intent_data = {
          application_fee_amount: platformFeeInCents,
          transfer_data: {
            destination: provider.stripeAccountId,
          },
        };
      }

      const session = await stripe.checkout.sessions.create(sessionOptions);
      return { url: session.url };
    }),
});
