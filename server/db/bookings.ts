import { eq, and, gte, lte, desc, asc, sql, inArray } from "drizzle-orm";
import {
  bookings,
  services,
  serviceProviders,
  users,
  type Booking,
} from "../../drizzle/schema";
import { getDb } from "./connection";

// ============================================================================
// BOOKING MANAGEMENT
// ============================================================================

export async function createBooking(data: typeof bookings.$inferInsert): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bookings).values(data);
  return result[0].insertId;
}

export async function getBookingById(id: number): Promise<Booking | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getBookingByNumber(bookingNumber: string): Promise<Booking | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(bookings).where(eq(bookings.bookingNumber, bookingNumber)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCustomerBookings(customerId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(bookings.customerId, customerId)];
  if (status && status !== "all") conditions.push(eq(bookings.status, status as any));
  return await db.select().from(bookings)
    .where(and(...conditions))
    .orderBy(desc(bookings.createdAt));
}

export async function getProviderBookings(providerId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(bookings.providerId, providerId)];
  if (status && status !== "all") conditions.push(eq(bookings.status, status as any));
  return await db.select().from(bookings)
    .where(and(...conditions))
    .orderBy(desc(bookings.createdAt));
}

export async function getAllBookings() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(bookings).orderBy(desc(bookings.createdAt));
}

export async function getBookingsByDateRange(providerId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(bookings)
    .where(and(
      eq(bookings.providerId, providerId),
      gte(bookings.bookingDate, startDate),
      lte(bookings.bookingDate, endDate),
      inArray(bookings.status, ["pending", "confirmed", "in_progress"] as any)
    ))
    .orderBy(bookings.bookingDate, bookings.startTime);
}

export async function updateBookingStatus(bookingId: number, status: string, additionalData?: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, any> = { status };
  if (additionalData) {
    Object.assign(updateData, additionalData);
  }
  await db.update(bookings).set(updateData).where(eq(bookings.id, bookingId));
}

// ============================================================================
// CANCELLATION & REFUND HELPERS
// ============================================================================

export async function cancelBooking(bookingId: number, data: {
  cancellationReason: string;
  cancelledBy: "customer" | "provider" | "admin";
  cancelledAt: Date;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  await database.update(bookings)
    .set({
      status: "cancelled",
      cancellationReason: data.cancellationReason,
      cancelledBy: data.cancelledBy,
      cancelledAt: data.cancelledAt,
    } as any)
    .where(eq(bookings.id, bookingId));
}

// ============================================================================
// BOOKING REMINDERS
// ============================================================================

export async function getBookingsNeedingReminders(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  const upcomingBookings = await db.select()
    .from(bookings)
    .where(and(
      eq(bookings.status, "confirmed"),
      eq(bookings.reminderSent, false),
      gte(sql`CONCAT(${bookings.bookingDate}, ' ', ${bookings.startTime})`, in23h.toISOString().replace('T', ' ').slice(0, 19)),
      lte(sql`CONCAT(${bookings.bookingDate}, ' ', ${bookings.startTime})`, in25h.toISOString().replace('T', ' ').slice(0, 19)),
    ));
  return upcomingBookings;
}

export async function markReminderSent(bookingId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(bookings).set({ reminderSent: true }).where(eq(bookings.id, bookingId));
}

export async function getUpcomingBookingsForUser(userId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return await db.select()
    .from(bookings)
    .where(and(
      eq(bookings.customerId, userId),
      eq(bookings.status, "confirmed"),
      gte(sql`CONCAT(${bookings.bookingDate}, ' ', ${bookings.startTime})`, now.toISOString().replace('T', ' ').slice(0, 19)),
    ))
    .orderBy(asc(bookings.bookingDate), asc(bookings.startTime));
}

// ============================================================================
// BOOKING EXPORT HELPERS
// ============================================================================

export async function getCustomerBookingsWithDetails(customerId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(bookings.customerId, customerId)];
  if (status && status !== "all") {
    conditions.push(eq(bookings.status, status as any));
  }
  const results = await db.select({
    id: bookings.id,
    bookingNumber: bookings.bookingNumber,
    bookingDate: bookings.bookingDate,
    startTime: bookings.startTime,
    endTime: bookings.endTime,
    durationMinutes: bookings.durationMinutes,
    status: bookings.status,
    locationType: bookings.locationType,
    subtotal: bookings.subtotal,
    platformFee: bookings.platformFee,
    totalAmount: bookings.totalAmount,
    travelFee: bookings.travelFee,
    customerNotes: bookings.customerNotes,
    createdAt: bookings.createdAt,
    serviceName: services.name,
    providerName: serviceProviders.businessName,
  }).from(bookings)
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .leftJoin(serviceProviders, eq(bookings.providerId, serviceProviders.id))
    .where(and(...conditions))
    .orderBy(desc(bookings.bookingDate));
  return results;
}

// ============================================================================
// CALENDAR FEED HELPERS
// ============================================================================

export async function getProviderCalendarBookings(providerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    id: bookings.id,
    bookingNumber: bookings.bookingNumber,
    bookingDate: bookings.bookingDate,
    startTime: bookings.startTime,
    endTime: bookings.endTime,
    status: bookings.status,
    locationType: bookings.locationType,
    customerNotes: bookings.customerNotes,
    totalAmount: bookings.totalAmount,
    serviceAddressLine1: bookings.serviceAddressLine1,
    serviceCity: bookings.serviceCity,
    serviceState: bookings.serviceState,
    servicePostalCode: bookings.servicePostalCode,
    serviceName: services.name,
    customerName: users.name,
  }).from(bookings)
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .leftJoin(users, eq(bookings.customerId, users.id))
    .where(and(
      eq(bookings.providerId, providerId),
      inArray(bookings.status, ["pending", "confirmed", "in_progress", "completed"] as any)
    ))
    .orderBy(desc(bookings.bookingDate));
}
