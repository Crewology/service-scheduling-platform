import { Request, Response } from "express";
import Stripe from "stripe";
import { ENV } from "./_core/env";
import * as db from "./db";
import { sendNotification } from "./notifications";
import { sendPushNotification } from "./notifications/pushHelper";

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
        // bookingUrl removed — templates now use bookingId directly
      },
    });
  }
  // Push notification for payment success
  if (customer) {
    sendPushNotification(
      paymentType === "deposit" ? "payment_received" : "booking_confirmed",
      { userId: customer.id, name: customer.name || "Customer" },
      {
        bookingNumber: booking.bookingNumber,
        serviceName: service?.name || "Service",
        providerName: provider?.businessName || "Provider",
        amount: paymentType === "deposit" ? booking.depositAmount || "0" : booking.totalAmount || "0",
        date: booking.bookingDate,
        time: booking.startTime,
      }
    );
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log("[Stripe] Payment succeeded:", paymentIntent.id);
  // Additional payment success handling if needed
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log("[Stripe] Payment failed:", paymentIntent.id);

  // Find the booking associated with this payment intent
  const payment = await db.getPaymentByStripePaymentIntentId(paymentIntent.id);
  if (!payment || !payment.bookingId) {
    console.log(`[Stripe] No booking found for failed payment_intent: ${paymentIntent.id}`);
    return;
  }

  const booking = await db.getBookingById(payment.bookingId);
  if (!booking) return;

  const customer = await db.getUserById(booking.customerId);
  const service = await db.getServiceById(booking.serviceId);
  const provider = await db.getProviderById(booking.providerId);

  // Send payment failure notification to customer via email
  if (customer?.email) {
    await sendNotification({
      type: "payment_failed",
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
        customerName: customer.name || "Customer",
        amount: booking.totalAmount || "0",
        // paymentUrl removed — templates now use bookingId directly
      },
    });
    console.log(`[Stripe] Payment failure notification sent to customer ${customer.id} for booking ${booking.bookingNumber}`);
  }
  // Push notification for payment failure
  if (customer) {
    sendPushNotification("payment_failed", { userId: customer.id, name: customer.name || "Customer" }, {
      bookingNumber: booking.bookingNumber,
      serviceName: service?.name || "Service",
      amount: booking.totalAmount || "0",
    });
  }

  // Also create an in-app notification
  try {
    await db.createNotification({
      userId: customer!.id,
      notificationType: "payment",
      title: "Payment Failed",
      message: `Your payment for booking #${booking.bookingNumber} could not be processed. Please try again.`,
      relatedBookingId: booking.id,
    });
  } catch (err) {
    console.error("[Stripe] Failed to create in-app notification for payment failure:", err);
  }
}

async function handleRefund(charge: Stripe.Charge) {
  console.log("[Stripe] Refund processed:", charge.id);
  
  const paymentIntentId = typeof charge.payment_intent === "string" 
    ? charge.payment_intent 
    : charge.payment_intent?.id;
  
  if (!paymentIntentId) {
    console.log("[Stripe] No payment_intent on refund charge");
    return;
  }

  // Find the payment record by Stripe payment intent ID
  const payment = await db.getPaymentByStripePaymentIntentId(paymentIntentId);
  if (!payment) {
    console.log(`[Stripe] No local payment record for payment_intent: ${paymentIntentId}`);
    return;
  }

  const refundAmountDollars = (charge.amount_refunded / 100).toFixed(2);

  // Update payment record if not already marked as refunded
  if (payment.status !== "refunded") {
    await db.updatePaymentRefund(payment.id, {
      status: "refunded",
      refundAmount: refundAmountDollars,
      refundReason: "Refund confirmed by Stripe webhook",
      refundedAt: new Date(),
    });
    console.log(`[Stripe] Payment ${payment.id} marked as refunded: $${refundAmountDollars}`);
  }

  // Send refund confirmation notification to customer
  const booking = payment.bookingId ? await db.getBookingById(payment.bookingId) : null;
  if (booking) {
    const customer = await db.getUserById(booking.customerId);
    if (customer?.email) {
      await sendNotification({
        type: "refund_processed",
        channel: "email",
        recipient: { userId: customer.id, email: customer.email, name: customer.name || "Customer" },
        data: {
          bookingNumber: booking.bookingNumber,
          refundAmount: refundAmountDollars,
          originalAmount: booking.totalAmount || "0",
        },
      });
    }
  }

  console.log(`[Stripe] Refund confirmed for payment_intent: ${paymentIntentId}, amount: $${refundAmountDollars}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const subscriptionType = subscription.metadata?.type;
  const stripeStatus = subscription.status === "active" ? "active"
    : subscription.status === "trialing" ? "trialing"
    : subscription.status === "past_due" ? "past_due"
    : "incomplete";
  const stripeCustomerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id || "";

  // Handle customer subscriptions
  if (subscriptionType === "customer_subscription") {
    const userId = subscription.metadata?.userId;
    const tier = subscription.metadata?.tier as "pro" | "business" | undefined;
    if (!userId || !tier) {
      console.error("[Stripe] Missing userId or tier in customer subscription metadata");
      return;
    }
    await db.upsertCustomerSubscription({
      userId: parseInt(userId),
      tier,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId,
      status: stripeStatus,
      currentPeriodStart: new Date(subscription.start_date * 1000),
      currentPeriodEnd: subscription.ended_at ? new Date(subscription.ended_at * 1000) : undefined,
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    });
    console.log(`[Stripe] Customer subscription ${subscription.id} updated for user ${userId}: ${tier} (${stripeStatus})`);
    return;
  }

  // Handle provider subscriptions (existing logic)
  const providerId = subscription.metadata?.providerId;
  const tier = subscription.metadata?.tier as "basic" | "premium" | undefined;
  
  if (!providerId || !tier) {
    console.error("[Stripe] Missing providerId or tier in subscription metadata");
    return;
  }

  await db.upsertProviderSubscription({
    providerId: parseInt(providerId),
    tier,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId,
    status: stripeStatus,
    currentPeriodStart: new Date(subscription.start_date * 1000),
    currentPeriodEnd: subscription.ended_at ? new Date(subscription.ended_at * 1000) : undefined,
    trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  console.log(`[Stripe] Subscription ${subscription.id} updated for provider ${providerId}: ${tier} (${stripeStatus})`);
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  const subscriptionType = subscription.metadata?.type;
  const stripeCustomerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id || "";

  // Handle customer subscription cancellation
  if (subscriptionType === "customer_subscription") {
    const userId = subscription.metadata?.userId;
    if (!userId) return;
    await db.upsertCustomerSubscription({
      userId: parseInt(userId),
      tier: "free",
      stripeSubscriptionId: subscription.id,
      stripeCustomerId,
      status: "cancelled",
    });
    console.log(`[Stripe] Customer subscription cancelled for user ${userId}`);
    return;
  }

  // Handle provider subscription cancellation (existing logic)
  const providerId = subscription.metadata?.providerId;
  if (!providerId) return;

  await db.upsertProviderSubscription({
    providerId: parseInt(providerId),
    tier: "free",
    stripeSubscriptionId: subscription.id,
    stripeCustomerId,
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
