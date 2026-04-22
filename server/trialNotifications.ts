import { sendNotification, sendMultiChannelNotification } from "./notifications";
import type { NotificationType } from "./notifications/types";
import * as db from "./db";

/**
 * Trial Milestone Notification System
 * 
 * Sends email/SMS notifications at key trial milestones:
 * - Trial started (immediately)
 * - 7 days remaining
 * - 3 days remaining
 * - 1 day remaining (urgent)
 * - Trial expired
 * 
 * Uses the notifications table to track which milestones have been sent,
 * preventing duplicate emails.
 */

// Map of days remaining to notification type
const MILESTONE_MAP: Record<number, NotificationType> = {
  7: "trial_7_days",
  3: "trial_3_days",
  1: "trial_1_day",
  0: "trial_expired",
};

interface TrialNotificationContext {
  providerId: number;
  userId: number;
  email?: string;
  providerName: string;
  daysRemaining: number;
  trialEndsAt: Date;
  upgradeUrl?: string;
  dashboardUrl?: string;
}

/**
 * Check if a specific trial milestone notification has already been sent
 */
async function hasMilestoneSent(userId: number, notificationType: string): Promise<boolean> {
  try {
    const existing = await db.getNotificationsByType(userId, notificationType);
    return existing.length > 0;
  } catch {
    return false;
  }
}

/**
 * Record that a milestone notification was sent
 */
async function recordMilestoneSent(
  userId: number,
  notificationType: string,
  title: string,
  message: string
): Promise<void> {
  try {
    await db.createNotification({
      userId,
      notificationType,
      title,
      message,
      isRead: false,
      isSentEmail: true,
      isSentSms: false,
    });
  } catch (err) {
    console.error(`[TrialNotifications] Failed to record milestone:`, err);
  }
}

/**
 * Send the trial started notification
 */
export async function sendTrialStartedNotification(ctx: TrialNotificationContext): Promise<boolean> {
  const notificationType: NotificationType = "trial_started";

  // Check if already sent
  if (await hasMilestoneSent(ctx.userId, notificationType)) {
    console.log(`[TrialNotifications] trial_started already sent for user ${ctx.userId}`);
    return false;
  }

  const trialEndDate = ctx.trialEndsAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const sent = await sendNotification({
    type: notificationType,
    channel: "email",
    recipient: {
      userId: ctx.userId,
      email: ctx.email,
      name: ctx.providerName,
    },
    data: {
      providerName: ctx.providerName,
      trialEndDate,
      dashboardUrl: ctx.dashboardUrl || "/provider/dashboard",
    },
  });

  if (sent) {
    await recordMilestoneSent(
      ctx.userId,
      notificationType,
      "Welcome to Your 14-Day Professional Trial!",
      `Your Professional trial has started and ends on ${trialEndDate}.`
    );
    console.log(`[TrialNotifications] trial_started sent to user ${ctx.userId}`);
  }

  return sent;
}

/**
 * Check and send milestone notifications based on days remaining.
 * Called during checkTrialStatus to send the right email at each milestone.
 * 
 * Milestones: 7 days, 3 days, 1 day, expired (0 days)
 */
export async function checkAndSendTrialMilestoneNotification(
  ctx: TrialNotificationContext
): Promise<{ sent: boolean; milestone: string | null }> {
  const { daysRemaining } = ctx;

  // Determine which milestone(s) should have been sent
  // We check from most urgent to least urgent
  const milestones = [0, 1, 3, 7];
  let targetMilestone: number | null = null;

  for (const milestone of milestones) {
    if (daysRemaining <= milestone) {
      targetMilestone = milestone;
      break;
    }
  }

  if (targetMilestone === null) {
    // No milestone reached yet (more than 7 days remaining)
    return { sent: false, milestone: null };
  }

  const notificationType = MILESTONE_MAP[targetMilestone];
  if (!notificationType) {
    return { sent: false, milestone: null };
  }

  // Check if this specific milestone was already sent
  if (await hasMilestoneSent(ctx.userId, notificationType)) {
    return { sent: false, milestone: notificationType };
  }

  const trialEndDate = ctx.trialEndsAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Get provider stats for the 7-day email
  let providerStats: { servicesCreated?: number; bookingsReceived?: number; reviewsReceived?: number } = {};
  if (notificationType === "trial_7_days") {
    try {
      const serviceCount = await db.getActiveServiceCount(ctx.providerId);
      providerStats = {
        servicesCreated: serviceCount,
      };
    } catch {
      // Stats are optional, continue without them
    }
  }

  const upgradeUrl = ctx.upgradeUrl || "/provider/subscription";

  // Send via email (primary) and SMS if available
  const channels: ("email" | "sms")[] = ctx.email ? ["email"] : [];

  let sent = false;
  if (channels.length > 0) {
    const result = await sendMultiChannelNotification(
      {
        type: notificationType,
        recipient: {
          userId: ctx.userId,
          email: ctx.email,
          name: ctx.providerName,
        },
        data: {
          providerName: ctx.providerName,
          trialEndDate,
          upgradeUrl,
          // unsubscribeUrl removed — email footer handles unsubscribe link automatically
          ...providerStats,
        },
      },
      channels
    );
    sent = Object.values(result).some(Boolean);
  }

  // Record in notifications table regardless of send success
  const titles: Record<string, string> = {
    trial_7_days: "7 Days Left on Your Professional Trial",
    trial_3_days: "Only 3 Days Left on Your Trial",
    trial_1_day: "Last Day — Trial Expires Tomorrow",
    trial_expired: "Your Professional Trial Has Ended",
  };

  const messages: Record<string, string> = {
    trial_7_days: `You have 7 days remaining on your Professional trial. Upgrade to keep your features.`,
    trial_3_days: `Only 3 days left! Your Professional trial ends on ${trialEndDate}.`,
    trial_1_day: `Your Professional trial expires tomorrow. Upgrade now to keep your features.`,
    trial_expired: `Your Professional trial has ended. Your account has been moved to the Free tier.`,
  };

  await recordMilestoneSent(
    ctx.userId,
    notificationType,
    titles[notificationType] || "Trial Update",
    messages[notificationType] || "Your trial status has changed."
  );

  console.log(`[TrialNotifications] ${notificationType} sent to user ${ctx.userId} (sent=${sent})`);
  return { sent, milestone: notificationType };
}

/**
 * Get all trial milestone notifications sent to a user
 */
export async function getTrialNotificationHistory(userId: number): Promise<string[]> {
  const types = ["trial_started", "trial_7_days", "trial_3_days", "trial_1_day", "trial_expired"];
  const sent: string[] = [];

  for (const type of types) {
    if (await hasMilestoneSent(userId, type)) {
      sent.push(type);
    }
  }

  return sent;
}
