import { eq, sql, and, isNull } from "drizzle-orm";
import { getDb } from "./connection";
import { serviceProviders, users, services, portfolioItems, bookings } from "../../drizzle/schema";
import { calculateTrustScore, type TrustScoreInput, type TrustScoreResult } from "../../shared/trustScore";

/**
 * Gather all data needed to compute a provider's trust score
 */
export async function gatherTrustScoreInput(providerId: number): Promise<TrustScoreInput | null> {
  const db = await getDb();
  if (!db) return null;

  // Get provider profile
  const [provider] = await db
    .select()
    .from(serviceProviders)
    .where(eq(serviceProviders.id, providerId))
    .limit(1);

  if (!provider) return null;

  // Get user for profile photo
  const [user] = await db
    .select({ profilePhotoUrl: users.profilePhotoUrl })
    .from(users)
    .where(eq(users.id, provider.userId))
    .limit(1);

  // Count active services
  const [serviceCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(services)
    .where(
      and(
        eq(services.providerId, providerId),
        eq(services.isActive, true),
        isNull(services.deletedAt)
      )
    );

  // Count portfolio items
  const [portfolioCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(portfolioItems)
    .where(
      and(
        eq(portfolioItems.providerId, providerId),
        eq(portfolioItems.isActive, true)
      )
    );

  // Count completed bookings
  const [bookingCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(bookings)
    .where(
      and(
        eq(bookings.providerId, providerId),
        eq(bookings.status, "completed")
      )
    );

  return {
    hasProfilePhoto: !!(user?.profilePhotoUrl),
    hasDescription: !!(provider.description && provider.description.length > 10),
    hasAddress: !!(provider.city && provider.state),
    hasBusinessType: !!provider.businessType,
    activeServiceCount: Number(serviceCount?.count ?? 0),
    hasPortfolioItems: Number(portfolioCount?.count ?? 0) > 0,
    stripeAccountStatus: provider.stripeAccountStatus,
    stripeOnboardingComplete: provider.stripeOnboardingComplete,
    payoutEnabled: provider.payoutEnabled,
    totalCompletedBookings: Number(bookingCount?.count ?? 0),
    averageRating: parseFloat(provider.averageRating?.toString() ?? "0"),
    totalReviews: provider.totalReviews,
    accountCreatedAt: provider.createdAt,
    lastActiveAt: provider.updatedAt,
  };
}

/**
 * Calculate and persist the trust score for a provider
 */
export async function updateProviderTrustScore(providerId: number): Promise<TrustScoreResult | null> {
  const input = await gatherTrustScoreInput(providerId);
  if (!input) return null;

  const result = calculateTrustScore(input);
  const db = await getDb();
  if (!db) return null;

  await db
    .update(serviceProviders)
    .set({
      trustScore: result.score,
      trustLevel: result.level,
      trustScoreUpdatedAt: new Date(),
    })
    .where(eq(serviceProviders.id, providerId));

  return result;
}

/**
 * Get the current trust score for a provider (from DB, no recalculation)
 */
export async function getProviderTrustScore(providerId: number) {
  const db = await getDb();
  if (!db) return null;

  const [provider] = await db
    .select({
      trustScore: serviceProviders.trustScore,
      trustLevel: serviceProviders.trustLevel,
      trustScoreUpdatedAt: serviceProviders.trustScoreUpdatedAt,
    })
    .from(serviceProviders)
    .where(eq(serviceProviders.id, providerId))
    .limit(1);

  return provider ?? null;
}

/**
 * Recalculate trust scores for all active providers
 * Useful for batch updates (e.g., nightly cron)
 */
export async function recalculateAllTrustScores(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const providers = await db
    .select({ id: serviceProviders.id })
    .from(serviceProviders)
    .where(
      and(
        eq(serviceProviders.isActive, true),
        isNull(serviceProviders.deletedAt)
      )
    );

  let updated = 0;
  for (const p of providers) {
    const result = await updateProviderTrustScore(p.id);
    if (result) updated++;
  }
  return updated;
}
