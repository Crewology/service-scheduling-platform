import { Request, Response } from "express";
import Stripe from "stripe";
import { ENV } from "./_core/env";
import * as db from "./db";
import * as promotionDb from "./db/promotions";
import { sendNotification } from "./notifications";
import { sendPushNotification } from "./notifications/pushHelper";
import { executePartnerTransfer } from "./partnerSplit";

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

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice);
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

  // Handle promotion payments
  if (session.metadata?.type === "promotion") {
    await handlePromotionPayment(session);
    return;
  }

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

  // Partner revenue split: transfer 40% of the platform fee to partner
  // The platform fee is 1% of the booking amount
  const bookingAmount = paymentType === "deposit"
    ? parseFloat(booking.depositAmount || "0")
    : parseFloat(booking.totalAmount || "0");
  const platformFee = bookingAmount * 0.01; // 1% platform fee

  if (platformFee > 0) {
    try {
      const splitResult = await executePartnerTransfer({
        totalRevenue: platformFee,
        sourceType: "booking_platform_fee",
        sourceId: session.payment_intent as string || session.id,
        sourceDescription: `Booking #${booking.bookingNumber} platform fee (1% of $${bookingAmount.toFixed(2)}) - ${service?.name || "Service"} by ${provider?.businessName || "Provider"}`,
      });
      if (splitResult.success) {
        console.log(`[Partner Split] Booking ${booking.bookingNumber}: platform fee $${platformFee.toFixed(2)}, partner share $${splitResult.amount}`);
      } else {
        console.error(`[Partner Split] Failed for booking ${booking.bookingNumber}: ${splitResult.error}`);
      }
    } catch (err: any) {
      console.error(`[Partner Split] Error processing booking fee split: ${err.message}`);
    }
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

  // Get previous tier to detect upgrades
  const existingSub = await db.getProviderSubscription(parseInt(providerId));
  const previousTier = existingSub?.tier || "free";

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

  // Send upgrade notification if tier changed upward
  const tierOrder: Record<string, number> = { free: 0, basic: 1, premium: 2 };
  if (stripeStatus === "active" && tierOrder[tier] > tierOrder[previousTier]) {
    const provider = await db.getProviderById(parseInt(providerId));
    if (provider) {
      const user = await db.getUserById(provider.userId);
      if (user?.email) {
        const { SUBSCRIPTION_TIERS } = await import("./products");
        await sendNotification({
          type: "subscription_upgraded",
          channel: "email",
          recipient: { userId: user.id, email: user.email, name: user.name || undefined },
          data: {
            tier: SUBSCRIPTION_TIERS[tier].name,
            previousTier: SUBSCRIPTION_TIERS[previousTier as keyof typeof SUBSCRIPTION_TIERS]?.name || previousTier,
            businessName: provider.businessName || undefined,
            amount: String(SUBSCRIPTION_TIERS[tier].monthlyPrice),
          },
        });
      }
    }
  }

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

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Only process subscription invoices (not one-time payments)
  const subscriptionDetails = invoice.parent?.subscription_details;
  if (!subscriptionDetails) {
    // Check billing_reason as fallback for subscription-related invoices
    const isSubscription = invoice.billing_reason && [
      "subscription_create", "subscription_cycle", "subscription_update", "subscription_threshold"
    ].includes(invoice.billing_reason);
    if (!isSubscription) {
      console.log("[Stripe] Invoice is not subscription-related, skipping partner split");
      return;
    }
  }

  const amountPaid = (invoice.amount_paid || 0) / 100; // Convert cents to dollars
  if (amountPaid <= 0) {
    console.log("[Stripe] Invoice amount is zero (trial/free), skipping partner split");
    return;
  }

  // Get subscription ID from parent details
  const subscriptionId = subscriptionDetails
    ? (typeof subscriptionDetails.subscription === "string"
      ? subscriptionDetails.subscription
      : subscriptionDetails.subscription?.id)
    : null;

  // Try to get subscription metadata to determine type
  let sourceType: "provider_subscription" | "customer_subscription" = "provider_subscription";
  let sourceDescription = "";

  try {
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const subType = subscription.metadata?.type;
      const tier = subscription.metadata?.tier;

      if (subType === "customer_subscription") {
        sourceType = "customer_subscription";
        const userId = subscription.metadata?.userId;
        sourceDescription = `Customer subscription (${tier || "unknown"} tier, user ${userId || "unknown"}) - Invoice ${invoice.id}`;
      } else {
        sourceType = "provider_subscription";
        const providerId = subscription.metadata?.providerId;
        sourceDescription = `Provider subscription (${tier || "unknown"} tier, provider ${providerId || "unknown"}) - Invoice ${invoice.id}`;
      }
    } else {
      sourceDescription = `Subscription payment - Invoice ${invoice.id}`;
    }
  } catch (err: any) {
    console.warn(`[Stripe] Could not retrieve subscription ${subscriptionId}: ${err.message}`);
    sourceDescription = `Subscription payment - Invoice ${invoice.id}`;
  }

  // Execute the 40% partner transfer
  const result = await executePartnerTransfer({
    totalRevenue: amountPaid,
    sourceType,
    sourceId: invoice.id,
    sourceDescription,
  });

  if (result.success) {
    console.log(`[Partner Split] Subscription invoice ${invoice.id}: $${amountPaid} total, $${result.amount} transferred to partner`);
  } else {
    console.error(`[Partner Split] Failed for invoice ${invoice.id}: ${result.error}`);
  }
}

// --- Promotion Payment Handler ---

const TIER_DURATION_HOURS: Record<string, number> = {
  quick_boost: 24,
  category_spotlight: 168,
  homepage_feature: 168,
  smart_bundle: 168,
};

async function handlePromotionPayment(session: Stripe.Checkout.Session) {
  const promotionId = session.metadata?.promotionId;
  const tier = session.metadata?.tier;

  if (!promotionId) {
    console.error("[Stripe Promotion] No promotionId in session metadata");
    return;
  }

  console.log(`[Stripe Promotion] Activating promotion ${promotionId} (tier: ${tier})`);

  const durationHours = TIER_DURATION_HOURS[tier || ""] || 168;
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + durationHours * 60 * 60 * 1000);

  await promotionDb.activatePromotion(parseInt(promotionId), startDate, endDate);

  // Store payment intent ID if available
  if (session.payment_intent) {
    await promotionDb.updatePromotionPaymentIntent(
      parseInt(promotionId),
      session.payment_intent as string
    );
  }

  console.log(`[Stripe Promotion] Promotion ${promotionId} activated: ${startDate.toISOString()} → ${endDate.toISOString()}`);
}
