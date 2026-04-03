import { eq, and, desc, sql } from "drizzle-orm";
import {
  reviews,
  users,
  serviceProviders,
  type Review,
} from "../../drizzle/schema";
import { getDb } from "./connection";

// ============================================================================
// REVIEW MANAGEMENT
// ============================================================================

export async function createReview(data: typeof reviews.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reviews).values(data);
  return result;
}

export async function getReviewsByProvider(providerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(reviews)
    .where(eq(reviews.providerId, providerId))
    .orderBy(desc(reviews.createdAt));
}

export async function getReviewsByCustomer(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(reviews)
    .where(eq(reviews.customerId, customerId))
    .orderBy(desc(reviews.createdAt));
}

export async function getReviewByBooking(bookingId: number): Promise<Review | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(reviews).where(eq(reviews.bookingId, bookingId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// REVIEW MODERATION
// ============================================================================

export async function flagReview(reviewId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reviews)
    .set({ isFlagged: true, flaggedReason: reason })
    .where(eq(reviews.id, reviewId));
}

export async function unflagReview(reviewId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reviews)
    .set({ isFlagged: false, flaggedReason: null })
    .where(eq(reviews.id, reviewId));
}

export async function hideReview(reviewId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reviews)
    .set({ isFlagged: true, flaggedReason: "HIDDEN_BY_ADMIN" })
    .where(eq(reviews.id, reviewId));
}

export async function deleteReview(reviewId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(reviews).where(eq(reviews.id, reviewId));
}

export async function getAllReviewsForAdmin(flaggedOnly = false) {
  const db = await getDb();
  if (!db) return [];
  const conditions = flaggedOnly ? eq(reviews.isFlagged, true) : undefined;
  return await db.select({
    review: reviews,
    customerName: users.name,
    providerName: serviceProviders.businessName,
  })
    .from(reviews)
    .innerJoin(users, eq(reviews.customerId, users.id))
    .innerJoin(serviceProviders, eq(reviews.providerId, serviceProviders.id))
    .where(conditions)
    .orderBy(desc(reviews.createdAt));
}
