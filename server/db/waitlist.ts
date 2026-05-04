import { eq, and, sql, asc } from "drizzle-orm";
import { waitlistEntries } from "../../drizzle/schema";
import { getDb } from "./connection";

// ============================================================================
// WAITLIST MANAGEMENT
// ============================================================================

/**
 * Get the next position for a waitlist entry (max position + 1)
 */
export async function getNextWaitlistPosition(
  serviceId: number,
  bookingDate: string,
  startTime: string
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select({ maxPos: sql<number>`COALESCE(MAX(${waitlistEntries.position}), 0)` })
    .from(waitlistEntries)
    .where(
      and(
        eq(waitlistEntries.serviceId, serviceId),
        sql`${waitlistEntries.bookingDate} = ${bookingDate}`,
        eq(waitlistEntries.startTime, startTime),
        eq(waitlistEntries.status, "waiting")
      )
    );
  return (result[0]?.maxPos || 0) + 1;
}

/**
 * Add a user to the waitlist for a specific time slot
 */
export async function joinWaitlist(data: {
  userId: number;
  serviceId: number;
  providerId: number;
  bookingDate: string;
  startTime: string;
  endTime?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const position = await getNextWaitlistPosition(data.serviceId, data.bookingDate, data.startTime);
  // Compute endTime from startTime if not provided (default 60 min)
  const endTime = data.endTime || (() => {
    const [h, m] = data.startTime.split(":").map(Number);
    const endMinutes = h * 60 + m + 60;
    return `${String(Math.floor(endMinutes / 60) % 24).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
  })();
  const result = await db.insert(waitlistEntries).values({
    userId: data.userId,
    serviceId: data.serviceId,
    providerId: data.providerId,
    bookingDate: new Date(data.bookingDate),
    startTime: data.startTime,
    endTime,
    position,
    status: "waiting",
  });
  return result[0].insertId;
}

/**
 * Check if a user is already on the waitlist for a specific slot
 */
export async function isUserOnWaitlist(
  userId: number,
  serviceId: number,
  bookingDate: string,
  startTime: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select({ id: waitlistEntries.id })
    .from(waitlistEntries)
    .where(
      and(
        eq(waitlistEntries.userId, userId),
        eq(waitlistEntries.serviceId, serviceId),
        sql`${waitlistEntries.bookingDate} = ${bookingDate}`,
        eq(waitlistEntries.startTime, startTime),
        eq(waitlistEntries.status, "waiting")
      )
    )
    .limit(1);
  return result.length > 0;
}

/**
 * Remove a user from the waitlist (cancel their entry)
 */
export async function leaveWaitlist(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .update(waitlistEntries)
    .set({ status: "cancelled" })
    .where(and(eq(waitlistEntries.id, id), eq(waitlistEntries.userId, userId)));
  return (result[0] as any).affectedRows > 0;
}

/**
 * Get all waitlist entries for a user
 */
export async function getUserWaitlistEntries(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(waitlistEntries)
    .where(and(eq(waitlistEntries.userId, userId), eq(waitlistEntries.status, "waiting")))
    .orderBy(asc(waitlistEntries.createdAt));
}

/**
 * Get the next person on the waitlist for a specific slot (first in line)
 */
export async function getNextOnWaitlist(
  serviceId: number,
  bookingDate: string,
  startTime: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(waitlistEntries)
    .where(
      and(
        eq(waitlistEntries.serviceId, serviceId),
        sql`${waitlistEntries.bookingDate} = ${bookingDate}`,
        eq(waitlistEntries.startTime, startTime),
        eq(waitlistEntries.status, "waiting")
      )
    )
    .orderBy(asc(waitlistEntries.position))
    .limit(1);
  return result[0] || null;
}

/**
 * Mark a waitlist entry as notified
 */
export async function markWaitlistNotified(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours to book
  await db
    .update(waitlistEntries)
    .set({ status: "notified", notifiedAt: new Date(), expiresAt })
    .where(eq(waitlistEntries.id, id));
}

/**
 * Mark a waitlist entry as booked (user successfully booked after notification)
 */
export async function markWaitlistBooked(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(waitlistEntries)
    .set({ status: "booked" })
    .where(eq(waitlistEntries.id, id));
}

/**
 * Expire waitlist notifications that have passed their expiry time
 */
export async function expireOldNotifications(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .update(waitlistEntries)
    .set({ status: "expired" })
    .where(
      and(
        eq(waitlistEntries.status, "notified"),
        sql`${waitlistEntries.expiresAt} < NOW()`
      )
    );
  return (result[0] as any).affectedRows;
}

/**
 * Get waitlist count for a specific slot
 */
export async function getWaitlistCount(
  serviceId: number,
  bookingDate: string,
  startTime: string
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(waitlistEntries)
    .where(
      and(
        eq(waitlistEntries.serviceId, serviceId),
        sql`${waitlistEntries.bookingDate} = ${bookingDate}`,
        eq(waitlistEntries.startTime, startTime),
        eq(waitlistEntries.status, "waiting")
      )
    );
  return result[0]?.count || 0;
}

/**
 * Get waitlist entries for a provider's services
 */
export async function getProviderWaitlistEntries(providerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(waitlistEntries)
    .where(
      and(
        eq(waitlistEntries.providerId, providerId),
        eq(waitlistEntries.status, "waiting")
      )
    )
    .orderBy(sql`${waitlistEntries.bookingDate} ASC`, asc(waitlistEntries.startTime), asc(waitlistEntries.position));
}

/**
 * Provider removes a user from their waitlist (sets status to cancelled)
 */
export async function providerRemoveFromWaitlist(id: number, providerId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .update(waitlistEntries)
    .set({ status: "cancelled" })
    .where(and(eq(waitlistEntries.id, id), eq(waitlistEntries.providerId, providerId)));
  return (result[0] as any).affectedRows > 0;
}
