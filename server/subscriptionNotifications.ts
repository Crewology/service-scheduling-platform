import * as db from "./db";
import type { NotificationType } from "./notifications/types";

export async function createSubscriptionInAppNotice(input: {
  userId: number;
  type: Extract<NotificationType,
    | "subscription_cancelled"
    | "subscription_updated"
    | "subscription_upgraded"
    | "subscription_downgraded"
    | "subscription_paused"
    | "subscription_resumed"
    | "subscription_payment_failed"
    | "subscription_payment_restored"
    | "subscription_renewed">;
  title: string;
  message: string;
  actionUrl: string;
}) {
  try {
    await db.createNotification({
      userId: input.userId,
      notificationType: input.type,
      title: input.title,
      message: input.message,
      actionUrl: input.actionUrl,
    });
  } catch (error) {
    console.error(`[Subscription Notification] Failed to create ${input.type} in-app notice:`, error);
  }
}
