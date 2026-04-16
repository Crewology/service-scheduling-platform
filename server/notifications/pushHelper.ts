/**
 * Push Notification Helper
 * 
 * Convenience functions to automatically send push notifications
 * alongside existing email/SMS notifications. Checks user preferences
 * before sending.
 */

import { sendNotification } from "./index";
import type { NotificationType, NotificationRecipient, NotificationData } from "./types";

/**
 * Send a push notification to a user alongside other channels.
 * Safe to call — silently returns false if push is not available or user has no subscription.
 */
export async function sendPushNotification(
  type: NotificationType,
  recipient: NotificationRecipient,
  data: NotificationData
): Promise<boolean> {
  try {
    return await sendNotification({
      type,
      channel: "push",
      recipient,
      data,
    });
  } catch (error) {
    console.error("[PushHelper] Failed to send push notification:", error);
    return false;
  }
}

/**
 * Send notification to all available channels (email + push, optionally SMS).
 * This is the recommended way to notify users — it ensures push is always included.
 */
export async function notifyAllChannels(params: {
  type: NotificationType;
  recipient: NotificationRecipient;
  data: NotificationData;
  includeSms?: boolean;
}): Promise<{ email: boolean; push: boolean; sms: boolean }> {
  const { type, recipient, data, includeSms } = params;
  
  const results = await Promise.allSettled([
    // Email
    recipient.email
      ? sendNotification({ type, channel: "email", recipient, data })
      : Promise.resolve(false),
    // Push (always try — provider handles subscription check)
    sendNotification({ type, channel: "push", recipient, data }),
    // SMS (only if explicitly requested and phone available)
    includeSms && recipient.phone
      ? sendNotification({ type, channel: "sms", recipient, data })
      : Promise.resolve(false),
  ]);

  return {
    email: results[0].status === "fulfilled" ? results[0].value : false,
    push: results[1].status === "fulfilled" ? results[1].value : false,
    sms: results[2].status === "fulfilled" ? results[2].value : false,
  };
}
