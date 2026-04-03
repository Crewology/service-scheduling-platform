import { eq, and, desc } from "drizzle-orm";
import {
  notifications,
  notificationPreferences,
  type NotificationPreference,
} from "../../drizzle/schema";
import { getDb } from "./connection";

// ============================================================================
// NOTIFICATION MANAGEMENT
// ============================================================================

export async function createNotification(data: typeof notifications.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notifications).values(data);
  return result;
}

export async function getNotificationsByUser(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationRead(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(eq(notifications.id, notificationId));
}

export async function markAllNotificationsAsRead(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

// ============================================================================
// NOTIFICATION PREFERENCES
// ============================================================================

export async function getNotificationPreferences(userId: number): Promise<NotificationPreference | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  return rows[0] || null;
}

export async function upsertNotificationPreferences(
  userId: number,
  prefs: Partial<Omit<NotificationPreference, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<NotificationPreference> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getNotificationPreferences(userId);
  if (existing) {
    await db.update(notificationPreferences)
      .set(prefs)
      .where(eq(notificationPreferences.userId, userId));
  } else {
    await db.insert(notificationPreferences).values({ userId, ...prefs });
  }
  return (await getNotificationPreferences(userId))!;
}

export async function getPreferencesByUnsubscribeToken(token: string): Promise<NotificationPreference | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(notificationPreferences)
    .where(eq(notificationPreferences.unsubscribeToken, token))
    .limit(1);
  return rows[0] || null;
}

export async function unsubscribeAllEmail(token: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const pref = await getPreferencesByUnsubscribeToken(token);
  if (!pref) return false;
  await db.update(notificationPreferences)
    .set({
      emailEnabled: false, bookingEmail: false, reminderEmail: false,
      messageEmail: false, paymentEmail: false, marketingEmail: false,
    })
    .where(eq(notificationPreferences.unsubscribeToken, token));
  return true;
}
