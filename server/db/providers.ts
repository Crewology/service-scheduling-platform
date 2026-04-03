import { eq, and, desc, gte, sql, isNotNull } from "drizzle-orm";
import {
  serviceProviders,
  reviews,
  bookings,
  services,
  type ServiceProvider,
} from "../../drizzle/schema";
import { getDb } from "./connection";

// ============================================================================
// SERVICE PROVIDER MANAGEMENT
// ============================================================================

export async function createServiceProvider(data: typeof serviceProviders.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(serviceProviders).values(data);
  return result;
}

export async function getProviderByUserId(userId: number): Promise<ServiceProvider | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(serviceProviders).where(eq(serviceProviders.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProviderById(id: number): Promise<ServiceProvider | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(serviceProviders).where(eq(serviceProviders.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllProviders(filters?: { city?: string; state?: string; isActive?: boolean }) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(serviceProviders);
  const conditions = [];
  if (filters?.city) conditions.push(eq(serviceProviders.city, filters.city));
  if (filters?.state) conditions.push(eq(serviceProviders.state, filters.state));
  if (filters?.isActive !== undefined) conditions.push(eq(serviceProviders.isActive, filters.isActive));
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  return await query.orderBy(desc(serviceProviders.averageRating));
}

export async function updateProviderRating(providerId: number) {
  const db = await getDb();
  if (!db) return;
  const providerReviews = await db.select().from(reviews).where(eq(reviews.providerId, providerId));
  if (providerReviews.length === 0) {
    await db.update(serviceProviders)
      .set({ averageRating: "0.00", totalReviews: 0 })
      .where(eq(serviceProviders.id, providerId));
    return;
  }
  const totalRating = providerReviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = (totalRating / providerReviews.length).toFixed(2);
  await db.update(serviceProviders)
    .set({ averageRating, totalReviews: providerReviews.length })
    .where(eq(serviceProviders.id, providerId));
}

export async function updateProviderVerification(providerId: number, status: "pending" | "verified" | "rejected") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(serviceProviders)
    .set({ verificationStatus: status })
    .where(eq(serviceProviders.id, providerId));
}

// ============================================================================
// PROVIDER PROFILE UPDATE
// ============================================================================

export async function updateProviderProfile(providerId: number, data: {
  businessName?: string;
  description?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  serviceRadiusMiles?: number;
  acceptsMobile?: boolean;
  acceptsFixedLocation?: boolean;
  acceptsVirtual?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) updateData[key] = value;
  }
  if (Object.keys(updateData).length === 0) return;
  await db.update(serviceProviders).set(updateData).where(eq(serviceProviders.id, providerId));
}

// ============================================================================
// PROVIDER EARNINGS
// ============================================================================

export async function getProviderEarnings(providerId: number) {
  const db = await getDb();
  if (!db) return { totalEarnings: 0, thisMonthEarnings: 0, pendingPayouts: 0, completedBookings: 0 };
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [totalResult, monthResult, pendingResult, completedResult] = await Promise.all([
    db.select({ total: sql<number>`COALESCE(SUM(CAST(${bookings.subtotal} AS DECIMAL(10,2))), 0)` })
      .from(bookings)
      .where(and(eq(bookings.providerId, providerId), eq(bookings.status, "completed" as any))),
    db.select({ total: sql<number>`COALESCE(SUM(CAST(${bookings.subtotal} AS DECIMAL(10,2))), 0)` })
      .from(bookings)
      .where(and(eq(bookings.providerId, providerId), eq(bookings.status, "completed" as any), gte(bookings.createdAt, firstOfMonth))),
    db.select({ total: sql<number>`COALESCE(SUM(CAST(${bookings.subtotal} AS DECIMAL(10,2))), 0)` })
      .from(bookings)
      .where(and(eq(bookings.providerId, providerId), eq(bookings.status, "confirmed" as any))),
    db.select({ count: sql<number>`COUNT(*)` })
      .from(bookings)
      .where(and(eq(bookings.providerId, providerId), eq(bookings.status, "completed" as any))),
  ]);
  return {
    totalEarnings: totalResult[0]?.total ?? 0,
    thisMonthEarnings: monthResult[0]?.total ?? 0,
    pendingPayouts: pendingResult[0]?.total ?? 0,
    completedBookings: completedResult[0]?.count ?? 0,
  };
}

// ============================================================================
// STRIPE CONNECT HELPERS
// ============================================================================

export async function updateProviderStripeAccount(providerId: number, data: {
  stripeAccountId?: string;
  stripeAccountStatus?: string;
  stripeOnboardingComplete?: boolean;
  payoutEnabled?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, any> = {};
  if (data.stripeAccountId !== undefined) updateData.stripeAccountId = data.stripeAccountId;
  if (data.stripeAccountStatus !== undefined) updateData.stripeAccountStatus = data.stripeAccountStatus;
  if (data.stripeOnboardingComplete !== undefined) updateData.stripeOnboardingComplete = data.stripeOnboardingComplete;
  if (data.payoutEnabled !== undefined) updateData.payoutEnabled = data.payoutEnabled;
  await db.update(serviceProviders).set(updateData).where(eq(serviceProviders.id, providerId));
}

// ============================================================================
// PUBLIC PROFILE HELPERS
// ============================================================================

export async function getProviderBySlug(slug: string): Promise<ServiceProvider | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(serviceProviders)
    .where(eq(serviceProviders.profileSlug, slug))
    .limit(1);
  return rows[0];
}

export async function updateProviderSlug(providerId: number, slug: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(serviceProviders)
    .set({ profileSlug: slug })
    .where(eq(serviceProviders.id, providerId));
}

export async function getProviderReviewsPublic(providerId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reviews)
    .where(and(eq(reviews.providerId, providerId), eq(reviews.isFlagged, false)))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);
}

// ============================================================================
// LOCATION-BASED SEARCH
// ============================================================================

export async function searchProvidersByLocation(lat: number, lng: number, radiusMiles: number, categoryId?: number) {
  const db = await getDb();
  if (!db) return [];
  const allProviders = await db.select()
    .from(serviceProviders)
    .where(and(eq(serviceProviders.isActive, true), isNotNull(serviceProviders.city)));
  return allProviders;
}

export async function geocodeProviderAddress(providerId: number, lat: number, lng: number) {
  return { providerId, lat, lng };
}
