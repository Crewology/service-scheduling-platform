import { eq, and, inArray, gte, lte } from "drizzle-orm";
import { bookingSessions, bookings } from "../../drizzle/schema";
import { getDb } from "./connection";

// ============================================================================
// BOOKING SESSIONS (for multi-day and recurring bookings)
// ============================================================================

export async function createBookingSessions(
  sessions: Array<typeof bookingSessions.$inferInsert>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (sessions.length === 0) return;
  await db.insert(bookingSessions).values(sessions);
}

export async function getSessionsByBookingId(bookingId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(bookingSessions)
    .where(eq(bookingSessions.bookingId, bookingId))
    .orderBy(bookingSessions.sessionDate, bookingSessions.startTime);
}

export async function getSessionsByDateRange(
  providerId: number,
  startDate: string,
  endDate: string
) {
  const db = await getDb();
  if (!db) return [];
  // Join sessions with bookings to filter by provider
  return await db.select({
    session: bookingSessions,
    bookingId: bookings.id,
    bookingStatus: bookings.status,
    bookingType: bookings.bookingType,
  })
    .from(bookingSessions)
    .innerJoin(bookings, eq(bookingSessions.bookingId, bookings.id))
    .where(and(
      eq(bookings.providerId, providerId),
      gte(bookingSessions.sessionDate, startDate),
      lte(bookingSessions.sessionDate, endDate),
      inArray(bookings.status, ["pending", "confirmed", "in_progress"] as any),
      eq(bookingSessions.status, "scheduled"),
    ))
    .orderBy(bookingSessions.sessionDate, bookingSessions.startTime);
}

export async function getSessionById(sessionId: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(bookingSessions)
    .where(eq(bookingSessions.id, sessionId));
  return results[0] || null;
}

export async function createSingleSession(
  data: typeof bookingSessions.$inferInsert
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bookingSessions).values(data);
  return result[0].insertId;
}

export async function rescheduleSession(
  sessionId: number,
  newSessionId: number,
  originalDate: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bookingSessions).set({
    status: "rescheduled" as any,
    rescheduledToSessionId: newSessionId,
    rescheduledFromDate: originalDate,
    rescheduledAt: new Date(),
  }).where(eq(bookingSessions.id, sessionId));
}

export async function updateSessionStatus(
  sessionId: number,
  status: "scheduled" | "completed" | "cancelled" | "rescheduled" | "no_show",
  notes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, any> = { status };
  if (status === "completed") updateData.completedAt = new Date();
  if (status === "cancelled") updateData.cancelledAt = new Date();
  if (notes) updateData.providerNotes = notes;
  await db.update(bookingSessions).set(updateData)
    .where(eq(bookingSessions.id, sessionId));
}

export async function cancelAllSessionsForBooking(bookingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bookingSessions)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(and(
      eq(bookingSessions.bookingId, bookingId),
      eq(bookingSessions.status, "scheduled"),
    ));
}

/**
 * Check for session-level conflicts for a provider on specific dates/times.
 * Returns any conflicting sessions.
 */
export async function checkSessionConflicts(
  providerId: number,
  dates: string[],
  startTime: string,
  endTime: string,
  excludeBookingId?: number
) {
  const db = await getDb();
  if (!db) return [];

  const results = [];
  for (const date of dates) {
    // Check existing single-day bookings
    const existingBookings = await db.select().from(bookings)
      .where(and(
        eq(bookings.providerId, providerId),
        eq(bookings.bookingDate, date),
        inArray(bookings.status, ["pending", "confirmed", "in_progress"] as any),
        ...(excludeBookingId ? [eq(bookings.id, excludeBookingId)] : []),
      ));

    for (const b of existingBookings) {
      if (excludeBookingId && b.id === excludeBookingId) continue;
      if (startTime < b.endTime && endTime > b.startTime) {
        results.push({ date, type: "booking" as const, conflictId: b.id, conflictTime: `${b.startTime}-${b.endTime}` });
      }
    }

    // Check existing sessions
    const existingSessions = await db.select({
      session: bookingSessions,
      bookingProviderId: bookings.providerId,
      bookingStatus: bookings.status,
      parentBookingId: bookings.id,
    })
      .from(bookingSessions)
      .innerJoin(bookings, eq(bookingSessions.bookingId, bookings.id))
      .where(and(
        eq(bookings.providerId, providerId),
        eq(bookingSessions.sessionDate, date),
        eq(bookingSessions.status, "scheduled"),
        inArray(bookings.status, ["pending", "confirmed", "in_progress"] as any),
      ));

    for (const s of existingSessions) {
      if (excludeBookingId && s.parentBookingId === excludeBookingId) continue;
      if (startTime < s.session.endTime && endTime > s.session.startTime) {
        results.push({ date, type: "session" as const, conflictId: s.session.id, conflictTime: `${s.session.startTime}-${s.session.endTime}` });
      }
    }
  }

  return results;
}
