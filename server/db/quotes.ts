import { eq, and, desc, inArray } from "drizzle-orm";
import { quoteRequests } from "../../drizzle/schema";
import { getDb } from "./connection";

// ============================================================================
// QUOTE REQUEST MANAGEMENT
// ============================================================================

export async function createQuoteRequest(data: {
  customerId: number;
  providerId: number;
  serviceId?: number;
  categoryId?: number;
  title: string;
  description: string;
  preferredDate?: string;
  preferredTime?: string;
  locationType?: "mobile" | "fixed_location" | "virtual";
  location?: string;
  attachmentUrls?: string;
  batchId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(quoteRequests).values({
    ...data,
    preferredDate: data.preferredDate || null,
  } as any);
  return { id: result[0].insertId };
}

export async function getQuoteById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db.select().from(quoteRequests).where(eq(quoteRequests.id, id));
  return results[0] || null;
}

export async function getQuotesByCustomer(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quoteRequests)
    .where(eq(quoteRequests.customerId, customerId))
    .orderBy(desc(quoteRequests.createdAt));
}

export async function getQuotesByProvider(providerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quoteRequests)
    .where(eq(quoteRequests.providerId, providerId))
    .orderBy(desc(quoteRequests.createdAt));
}

export async function getPendingQuotesByProvider(providerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quoteRequests)
    .where(and(
      eq(quoteRequests.providerId, providerId),
      eq(quoteRequests.status, "pending")
    ))
    .orderBy(desc(quoteRequests.createdAt));
}

export async function respondToQuote(quoteId: number, data: {
  quotedAmount: string;
  quotedDurationMinutes: number;
  providerNotes?: string;
  validUntil?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(quoteRequests).set({
    quotedAmount: data.quotedAmount,
    quotedDurationMinutes: data.quotedDurationMinutes,
    providerNotes: data.providerNotes || null,
    validUntil: data.validUntil || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
    status: "quoted",
  } as any).where(eq(quoteRequests.id, quoteId));
}

export async function updateQuoteStatus(quoteId: number, status: string, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = { status };
  if (reason) updateData.declineReason = reason;
  await db.update(quoteRequests).set(updateData).where(eq(quoteRequests.id, quoteId));
}

export async function linkQuoteToBooking(quoteId: number, bookingId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(quoteRequests).set({
    status: "booked",
    bookingId,
  } as any).where(eq(quoteRequests.id, quoteId));
}

export async function getQuoteCountByProvider(providerId: number) {
  const db = await getDb();
  if (!db) return { pending: 0, quoted: 0, total: 0 };
  const all = await db.select().from(quoteRequests)
    .where(eq(quoteRequests.providerId, providerId));
  return {
    pending: all.filter(q => q.status === "pending").length,
    quoted: all.filter(q => q.status === "quoted").length,
    total: all.length,
  };
}
