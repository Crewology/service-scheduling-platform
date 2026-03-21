import { Request, Response } from "express";
import Stripe from "stripe";
import { ENV } from "./_core/env";
import * as db from "./db";
import { sendNotification } from "./notifications";

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

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancelled(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
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

  // Send email notifications
  const customer = await db.getUserById(booking.customerId);
  const provider = await db.getProviderById(booking.providerId);
  const service = await db.getServiceById(booking.serviceId);
  
  if (customer && customer.email) {
    await sendNotification({
      type: paymentType === "deposit" ? "payment_received" : "booking_confirmed",
      channel: "email",
      recipient: {
        userId: customer.id,
        email: customer.email,
        name: customer.name || "Customer",
      },
      data: {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        serviceName: service?.name || "Service",
        providerName: provider?.businessName || "Provider",
        amount: paymentType === "deposit" ? booking.depositAmount || "0" : booking.totalAmount || "0",
        date: booking.bookingDate,
        time: booking.startTime,
        bookingUrl: `${ENV.forgeApiUrl}/booking/${booking.id}`,
      },
    });
  }
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
  
  // Find the booking associated with this charge via payment_intent
  const paymentIntentId = typeof charge.payment_intent === "string" 
    ? charge.payment_intent 
    : charge.payment_intent?.id;
  
  if (!paymentIntentId) {
    console.log("[Stripe] No payment_intent on refund charge");
    return;
  }

  // Find booking by searching payments table
  // The refund was already processed by the cancel procedure, so just log it
  console.log(`[Stripe] Refund confirmed for payment_intent: ${paymentIntentId}, amount: ${charge.amount_refunded}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const providerId = subscription.metadata?.providerId;
  const tier = subscription.metadata?.tier as "basic" | "premium" | undefined;
  
  if (!providerId || !tier) {
    console.error("[Stripe] Missing providerId or tier in subscription metadata");
    return;
  }

  const status = subscription.status === "active" ? "active" 
    : subscription.status === "trialing" ? "trialing"
    : subscription.status === "past_due" ? "past_due"
    : "incomplete";

  await db.upsertProviderSubscription({
    providerId: parseInt(providerId),
    tier,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id || "",
    status,
    currentPeriodStart: new Date(subscription.start_date * 1000),
    currentPeriodEnd: subscription.ended_at ? new Date(subscription.ended_at * 1000) : undefined,
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  console.log(`[Stripe] Subscription ${subscription.id} updated for provider ${providerId}: ${tier} (${status})`);
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const providerId = subscription.metadata?.providerId;
  if (!providerId) return;

  await db.upsertProviderSubscription({
    providerId: parseInt(providerId),
    tier: "free",
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id || "",
    status: "cancelled",
  });

  console.log(`[Stripe] Subscription cancelled for provider ${providerId}`);

  // Notify provider
  const provider = await db.getProviderById(parseInt(providerId));
  if (provider) {
    const user = await db.getUserById(provider.userId);
    if (user?.email) {
      await sendNotification({
        type: "subscription_cancelled",
        channel: "email",
        recipient: { userId: user.id, email: user.email, name: user.name || "Provider" },
        data: { businessName: provider.businessName },
      });
    }
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  console.log(`[Stripe] Invoice payment failed for customer: ${customerId}`);
  // The subscription status will be updated via customer.subscription.updated event
}
