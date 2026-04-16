import webpush from "web-push";
import { getDb } from "../../db/connection";
import { pushSubscriptions } from "../../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import type { Notification, NotificationProvider } from "../types";

// Configure VAPID
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:support@ologycrew.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log("[PushProvider] VAPID configured successfully");
} else {
  console.warn("[PushProvider] VAPID keys not configured — push notifications disabled");
}

/**
 * Map notification types to user-friendly titles and messages
 */
function formatPushPayload(notification: Notification) {
  const { type, data } = notification;

  const titleMap: Record<string, string> = {
    booking_created: "New Booking",
    booking_confirmed: "Booking Confirmed",
    booking_cancelled: "Booking Cancelled",
    booking_completed: "Booking Completed",
    payment_received: "Payment Received",
    payment_failed: "Payment Failed",
    message_received: "New Message",
    review_received: "New Review",
    reminder_24h: "Booking Reminder",
    reminder_1h: "Booking Starting Soon",
    quote_request_new: "New Quote Request",
    quote_response_received: "Quote Response",
    quote_accepted: "Quote Accepted",
    quote_declined: "Quote Declined",
    session_completed: "Session Completed",
    session_cancelled: "Session Cancelled",
    session_rescheduled: "Session Rescheduled",
    review_reminder: "Leave a Review",
  };

  const bodyMap: Record<string, string> = {
    booking_created: `Booking ${data.bookingNumber || ""} has been created for ${data.serviceName || "your service"}.`,
    booking_confirmed: `Your booking ${data.bookingNumber || ""} has been confirmed.`,
    booking_cancelled: `Booking ${data.bookingNumber || ""} has been cancelled.`,
    booking_completed: `Booking ${data.bookingNumber || ""} is complete. How was your experience?`,
    payment_received: `Payment of ${data.amount || ""} received for ${data.serviceName || "your service"}.`,
    payment_failed: `Payment failed for booking ${data.bookingNumber || ""}. Please update your payment method.`,
    message_received: `${data.customerName || data.providerName || "Someone"} sent you a message.`,
    review_received: `${data.customerName || "A customer"} left a review for ${data.serviceName || "your service"}.`,
    reminder_24h: `Reminder: Your booking ${data.bookingNumber || ""} is tomorrow at ${data.time || ""}.`,
    reminder_1h: `Your booking ${data.bookingNumber || ""} starts in 1 hour!`,
    quote_request_new: `New quote request from ${data.customerName || "a customer"}.`,
    quote_response_received: `${data.providerName || "A provider"} responded to your quote request.`,
    quote_accepted: `Your quote has been accepted by ${data.customerName || "the customer"}.`,
    quote_declined: `Your quote was declined.`,
    session_completed: `Session for ${data.serviceName || "your service"} is complete.`,
    session_cancelled: `A session has been cancelled.`,
    session_rescheduled: `A session has been rescheduled.`,
    review_reminder: `How was your recent service? Leave a review to help others.`,
  };

  const urlMap: Record<string, string> = {
    booking_created: `/my-bookings`,
    booking_confirmed: `/my-bookings`,
    booking_cancelled: `/my-bookings`,
    booking_completed: `/my-bookings`,
    payment_received: `/my-bookings`,
    payment_failed: `/my-bookings`,
    message_received: `/messages`,
    review_received: `/provider/dashboard`,
    reminder_24h: `/my-bookings`,
    reminder_1h: `/my-bookings`,
    quote_request_new: `/provider/dashboard`,
    quote_response_received: `/my-quotes`,
    quote_accepted: `/provider/dashboard`,
    quote_declined: `/my-quotes`,
    review_reminder: data.bookingId ? `/review/${data.bookingId}` : `/my-bookings`,
  };

  return {
    title: titleMap[type] || "OlogyCrew",
    body: data.message || bodyMap[type] || "You have a new notification.",
    url: urlMap[type] || "/",
    tag: `${type}-${data.bookingId || data.bookingNumber || Date.now()}`,
    actions: [
      { action: "view", title: "View" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };
}

export class PushProvider implements NotificationProvider {
  name = "push";

  supports(channel: string): boolean {
    return channel === "push";
  }

  async send(notification: Notification): Promise<boolean> {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.warn("[PushProvider] VAPID not configured, skipping push");
      return false;
    }

    const userId = notification.recipient.userId;

    // Get all active subscriptions for this user
    const db = await getDb();
    if (!db) {
      console.error("[PushProvider] Database not available");
      return false;
    }

    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.isActive, true)
        )
      );

    if (subscriptions.length === 0) {
      console.log(`[PushProvider] No active subscriptions for user ${userId}`);
      return false;
    }

    const payload = JSON.stringify(formatPushPayload(notification));
    let successCount = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload,
          { TTL: 60 * 60 } // 1 hour TTL
        );

        // Update last used timestamp
        await db!
          .update(pushSubscriptions)
          .set({ lastUsedAt: new Date() })
          .where(eq(pushSubscriptions.id, sub.id));

        successCount++;
      } catch (error: any) {
        // Handle expired/invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`[PushProvider] Subscription ${sub.id} expired, deactivating`);
          await db!
            .update(pushSubscriptions)
            .set({ isActive: false })
            .where(eq(pushSubscriptions.id, sub.id));
        } else {
          console.error(`[PushProvider] Failed to send to subscription ${sub.id}:`, error.message);
        }
      }
    }

    console.log(`[PushProvider] Sent to ${successCount}/${subscriptions.length} devices for user ${userId}`);
    return successCount > 0;
  }
}

/**
 * Send push notification directly to a user (convenience function)
 */
export async function sendPushToUser(
  userId: number,
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;

  const db = await getDb();
  if (!db) return false;

  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.isActive, true)
      )
    );

  if (subscriptions.length === 0) return false;

  const payloadStr = JSON.stringify({
    ...payload,
    icon: "https://d2xsxph8kpxj0f.cloudfront.net/310519663275372790/QD7eHrqop9F5cN2Q4sYGpD/android-chrome-192x192_3e2c5d17.png",
    actions: [
      { action: "view", title: "View" },
      { action: "dismiss", title: "Dismiss" },
    ],
  });

  let success = false;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payloadStr,
        { TTL: 60 * 60 }
      );
      success = true;
    } catch (error: any) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        await db
          .update(pushSubscriptions)
          .set({ isActive: false })
          .where(eq(pushSubscriptions.id, sub.id));
      }
    }
  }

  return success;
}
