import { Request, Response } from "express";
import Stripe from "stripe";
import { ENV } from "./_core/env";
import * as db from "./db";

const stripe = new Stripe(ENV.stripeSecretKey, {
  apiVersion: "2026-01-28.clover",
});

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    return res.status(400).send("Missing stripe-signature header");
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      ENV.stripeWebhookSecret
    );
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  console.log("[Stripe Webhook] Event received:", event.type);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentSucceeded(paymentIntent);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(paymentIntent);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(charge);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("[Stripe Webhook] Error processing event:", error);
    res.status(500).send(`Webhook processing error: ${error.message}`);
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("[Stripe] Checkout completed:", session.id);

  const bookingId = session.metadata?.bookingId;
  const paymentType = session.metadata?.paymentType;

  if (!bookingId) {
    console.error("[Stripe] No bookingId in session metadata");
    return;
  }

  const booking = await db.getBookingById(parseInt(bookingId));
  if (!booking) {
    console.error("[Stripe] Booking not found:", bookingId);
    return;
  }

  // Update booking with payment information
  if (paymentType === "deposit") {
    await db.updateBookingStatus(parseInt(bookingId), booking.status, {
      depositPaidAt: new Date().toISOString(),
      stripePaymentIntentId: session.payment_intent as string,
    });
    console.log(`[Stripe] Deposit payment recorded for booking ${bookingId}`);
  } else {
    await db.updateBookingStatus(parseInt(bookingId), "confirmed", {
      paidAt: new Date().toISOString(),
      stripePaymentIntentId: session.payment_intent as string,
    });
    console.log(`[Stripe] Full payment recorded for booking ${bookingId}`);
  }

  // TODO: Send email notification to customer and provider
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log("[Stripe] Payment succeeded:", paymentIntent.id);
  // Additional payment success handling if needed
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log("[Stripe] Payment failed:", paymentIntent.id);
  // TODO: Notify customer of payment failure
}

async function handleRefund(charge: Stripe.Charge) {
  console.log("[Stripe] Refund processed:", charge.id);
  // TODO: Update booking status and notify customer
}
