import * as db from "./db";
import { sendNotification } from "./notifications";

/**
 * Reminder Service
 * 
 * Processes upcoming bookings and sends 24-hour reminder notifications
 * to both customers and providers. Designed to be called periodically
 * (every 15-30 minutes) via a cron job or interval timer.
 */

export async function processReminders(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  console.log("[ReminderService] Starting reminder check...");
  
  let processed = 0;
  let sent = 0;
  let failed = 0;

  try {
    const bookingsNeedingReminders = await db.getBookingsNeedingReminders();
    console.log(`[ReminderService] Found ${bookingsNeedingReminders.length} bookings needing reminders`);

    for (const booking of bookingsNeedingReminders) {
      processed++;
      
      try {
        // Get related data
        const service = await db.getServiceById(booking.serviceId);
        const customer = await db.getUserById(booking.customerId);
        const provider = await db.getProviderById(booking.providerId);
        const providerUser = provider ? await db.getUserById(provider.userId) : null;

        const notificationData = {
          bookingNumber: booking.bookingNumber,
          serviceName: service?.name || "Service",
          providerName: provider?.businessName || providerUser?.name || "Provider",
          customerName: customer?.name || "Customer",
          date: booking.bookingDate,
          time: booking.startTime,
          location: booking.locationType === "virtual" 
            ? "Virtual / Online" 
            : [booking.serviceAddressLine1, booking.serviceCity, booking.serviceState].filter(Boolean).join(", ") || "See booking details",
        };

        // Send reminder to customer
        if (customer?.email) {
          const customerResult = await sendNotification({
            type: "reminder_24h",
            channel: "email",
            recipient: { 
              userId: customer.id, 
              email: customer.email, 
              name: customer.name || "Customer" 
            },
            data: notificationData,
          });
          
          if (customerResult) {
            sent++;
            console.log(`[ReminderService] Sent 24h reminder to customer ${customer.email} for booking ${booking.bookingNumber}`);
          } else {
            failed++;
            console.warn(`[ReminderService] Failed to send reminder to customer ${customer.email}`);
          }
        }

        // Send reminder to provider
        if (providerUser?.email) {
          const providerResult = await sendNotification({
            type: "reminder_24h",
            channel: "email",
            recipient: { 
              userId: providerUser.id, 
              email: providerUser.email, 
              name: providerUser.name || "Provider" 
            },
            data: {
              ...notificationData,
              // Swap perspective for provider
              customerName: customer?.name || "Customer",
              providerName: provider?.businessName || providerUser?.name || "Provider",
            },
          });
          
          if (providerResult) {
            sent++;
          } else {
            failed++;
          }
        }

        // Create in-app notifications for both customer and provider
        try {
          await db.createNotification({
            userId: booking.customerId,
            notificationType: "reminder_24h",
            title: "Upcoming Appointment Tomorrow",
            message: `Reminder: Your ${notificationData.serviceName} appointment with ${notificationData.providerName} is tomorrow at ${notificationData.time}.`,
            relatedBookingId: booking.id,
          });
          if (providerUser) {
            await db.createNotification({
              userId: providerUser.id,
              notificationType: "reminder_24h",
              title: "Upcoming Appointment Tomorrow",
              message: `Reminder: You have a ${notificationData.serviceName} appointment with ${notificationData.customerName} tomorrow at ${notificationData.time}.`,
              relatedBookingId: booking.id,
            });
          }
        } catch (notifErr) {
          console.warn(`[ReminderService] Failed to create in-app notification for booking ${booking.id}:`, notifErr);
        }

        // Mark reminder as sent regardless of email delivery status
        // to prevent re-sending on next cycle
        await db.markReminderSent(booking.id);
        
      } catch (err) {
        failed++;
        console.error(`[ReminderService] Error processing booking ${booking.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[ReminderService] Fatal error during reminder processing:", err);
  }

  console.log(`[ReminderService] Complete. Processed: ${processed}, Sent: ${sent}, Failed: ${failed}`);
  return { processed, sent, failed };
}

/**
 * Start the reminder service interval timer.
 * Runs every 15 minutes to check for bookings needing reminders.
 */
let reminderInterval: ReturnType<typeof setInterval> | null = null;

export function startReminderService(intervalMs: number = 15 * 60 * 1000): void {
  if (reminderInterval) {
    console.log("[ReminderService] Already running, skipping start");
    return;
  }

  console.log(`[ReminderService] Starting with interval ${intervalMs / 1000 / 60} minutes`);
  
  // Run immediately on start
  processReminders().catch(err => {
    console.error("[ReminderService] Initial run failed:", err);
  });

  // Then run on interval
  reminderInterval = setInterval(() => {
    processReminders().catch(err => {
      console.error("[ReminderService] Scheduled run failed:", err);
    });
  }, intervalMs);
}

export function stopReminderService(): void {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
    console.log("[ReminderService] Stopped");
  }
}
