import { getDb } from "./db/connection";
import { bookings, reviews, users, serviceProviders, services, notificationPreferences } from "../drizzle/schema";
import { eq, and, lte, isNull, sql } from "drizzle-orm";
import { sendNotification } from "./notifications";
import * as db from "./db";

/**
 * Review Reminder Service
 * 
 * Checks for completed bookings that are 24+ hours old, have no review,
 * and haven't had a review reminder sent yet. Sends email + SMS to the customer
 * prompting them to leave a review.
 * 
 * Runs on an interval (default: every 30 minutes).
 */

export async function getBookingsNeedingReviewReminders(): Promise<any[]> {
  const database = await getDb();
  if (!database) return [];

  const now = new Date();
  // 24 hours ago
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Find completed bookings where:
  // 1. completedAt is at least 24 hours ago
  // 2. reviewReminderSent is false
  // 3. No review exists for this booking
  const completedBookings = await database
    .select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      customerId: bookings.customerId,
      providerId: bookings.providerId,
      serviceId: bookings.serviceId,
      completedAt: bookings.completedAt,
    })
    .from(bookings)
    .leftJoin(reviews, eq(reviews.bookingId, bookings.id))
    .where(
      and(
        eq(bookings.status, "completed"),
        eq(bookings.reviewReminderSent, false),
        lte(bookings.completedAt, twentyFourHoursAgo),
        isNull(reviews.id) // No review exists
      )
    )
    .limit(50); // Process in batches

  return completedBookings;
}

export async function markReviewReminderSent(bookingId: number): Promise<void> {
  const database = await getDb();
  if (!database) return;
  await database
    .update(bookings)
    .set({ reviewReminderSent: true })
    .where(eq(bookings.id, bookingId));
}

export async function processReviewReminders(): Promise<{ processed: number; sent: number; failed: number }> {
  let processed = 0;
  let sent = 0;
  let failed = 0;

  try {
    console.log("[ReviewReminderService] Starting review reminder check...");

    const bookingsNeedingReminders = await getBookingsNeedingReviewReminders();

    if (bookingsNeedingReminders.length === 0) {
      console.log("[ReviewReminderService] No bookings need review reminders");
      return { processed, sent, failed };
    }

    console.log(`[ReviewReminderService] Found ${bookingsNeedingReminders.length} bookings needing review reminders`);

    for (const booking of bookingsNeedingReminders) {
      processed++;

      try {
        // Fetch customer, provider, and service details
        const customer = await db.getUserById(booking.customerId);
        const provider = booking.providerId ? await db.getProviderById(booking.providerId) : null;
        const service = booking.serviceId ? await db.getServiceById(booking.serviceId) : null;
        const providerUser = provider?.userId ? await db.getUserById(provider.userId) : null;

        if (!customer) {
          console.warn(`[ReviewReminderService] Customer not found for booking ${booking.id}`);
          await markReviewReminderSent(booking.id);
          continue;
        }

        // Get customer notification preferences
        const database = await getDb();
        const [customerPrefs] = database
          ? await database
              .select()
              .from(notificationPreferences)
              .where(eq(notificationPreferences.userId, customer.id))
              .limit(1)
          : [undefined];

        const notificationData = {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          serviceName: service?.name || "your service",
          providerName: provider?.businessName || providerUser?.name || "your provider",
          customerName: customer.name || "Valued Customer",
          reviewUrl: `/booking/${booking.id}/review`,
          unsubscribeUrl: customerPrefs?.unsubscribeToken
            ? `/unsubscribe/${customerPrefs.unsubscribeToken}`
            : "/notification-settings",
        };

        // Send email reminder
        if (customer.email && customerPrefs?.emailEnabled !== false && customerPrefs?.reminderEmail !== false) {
          const emailResult = await sendNotification({
            type: "review_reminder",
            channel: "email",
            recipient: {
              userId: customer.id,
              email: customer.email,
              name: customer.name || "Customer",
            },
            data: notificationData,
          });

          if (emailResult) {
            sent++;
            console.log(`[ReviewReminderService] Email sent to ${customer.email} for booking ${booking.bookingNumber}`);
          } else {
            failed++;
            console.warn(`[ReviewReminderService] Failed to send email to ${customer.email}`);
          }
        }

        // Send SMS reminder
        if (customer.phone && customerPrefs?.smsEnabled !== false && customerPrefs?.reminderSms !== false) {
          const smsResult = await sendNotification({
            type: "review_reminder",
            channel: "sms",
            recipient: {
              userId: customer.id,
              phone: customer.phone,
              name: customer.name || "Customer",
            },
            data: notificationData,
          });

          if (smsResult) {
            sent++;
          } else {
            failed++;
          }
        }

        // Create in-app notification
        try {
          await db.createNotification({
            userId: customer.id,
            notificationType: "review_reminder",
            title: "How was your experience?",
            message: `Share your experience with ${notificationData.providerName} for ${notificationData.serviceName}. Your feedback helps the community!`,
            relatedBookingId: booking.id,
          });
        } catch (notifErr) {
          console.warn(`[ReviewReminderService] Failed to create in-app notification for booking ${booking.id}:`, notifErr);
        }

        // Mark reminder as sent
        await markReviewReminderSent(booking.id);
      } catch (err) {
        failed++;
        console.error(`[ReviewReminderService] Error processing booking ${booking.id}:`, err);
        // Still mark as sent to prevent infinite retries
        try {
          await markReviewReminderSent(booking.id);
        } catch (_) {}
      }
    }
  } catch (err) {
    console.error("[ReviewReminderService] Fatal error during review reminder processing:", err);
  }

  console.log(`[ReviewReminderService] Complete. Processed: ${processed}, Sent: ${sent}, Failed: ${failed}`);
  return { processed, sent, failed };
}

/**
 * Start the review reminder service interval timer.
 * Runs every 30 minutes to check for completed bookings needing review reminders.
 */
let reviewReminderInterval: ReturnType<typeof setInterval> | null = null;

export function startReviewReminderService(intervalMs: number = 30 * 60 * 1000): void {
  if (reviewReminderInterval) {
    console.log("[ReviewReminderService] Already running, skipping start");
    return;
  }

  console.log(`[ReviewReminderService] Starting with interval ${intervalMs / 1000 / 60} minutes`);

  // Run after a 2-minute delay on start (to let the server fully initialize)
  setTimeout(() => {
    processReviewReminders().catch((err) => {
      console.error("[ReviewReminderService] Initial run failed:", err);
    });
  }, 2 * 60 * 1000);

  // Then run on interval
  reviewReminderInterval = setInterval(() => {
    processReviewReminders().catch((err) => {
      console.error("[ReviewReminderService] Scheduled run failed:", err);
    });
  }, intervalMs);
}

export function stopReviewReminderService(): void {
  if (reviewReminderInterval) {
    clearInterval(reviewReminderInterval);
    reviewReminderInterval = null;
    console.log("[ReviewReminderService] Stopped");
  }
}
