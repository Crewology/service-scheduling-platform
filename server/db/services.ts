import { eq, and, desc, asc, sql, or, like, inArray } from "drizzle-orm";
import {
  serviceCategories,
  services,
  servicePhotos,
  serviceProviders,
  providerCategories,
  providerSubscriptions,
  users,
  type Service,
  type ProviderCategory,
} from "../../drizzle/schema";
import { getDb } from "./connection";

// ============================================================================
// SERVICE CATEGORY MANAGEMENT
// ============================================================================

export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(serviceCategories)
    .where(eq(serviceCategories.isActive, true))
    .orderBy(asc(serviceCategories.sortOrder));
}

export async function getCategoryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(serviceCategories).where(eq(serviceCategories.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCategoryBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(serviceCategories).where(eq(serviceCategories.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================================================
// PROVIDER-CATEGORY MANAGEMENT (multi-category support)
// ============================================================================

export async function getProviderCategories(providerId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: providerCategories.id,
    providerId: providerCategories.providerId,
    categoryId: providerCategories.categoryId,
    isActive: providerCategories.isActive,
    createdAt: providerCategories.createdAt,
    categoryName: serviceCategories.name,
  }).from(providerCategories)
    .innerJoin(serviceCategories, eq(providerCategories.categoryId, serviceCategories.id))
    .where(and(eq(providerCategories.providerId, providerId), eq(providerCategories.isActive, true)))
    .orderBy(providerCategories.createdAt);
  return rows;
}

export async function addProviderCategory(providerId: number, categoryId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Use INSERT IGNORE to handle duplicates gracefully
  try {
    await db.insert(providerCategories).values({ providerId, categoryId });
  } catch (err: any) {
    // If duplicate, just ignore
    if (err?.code === 'ER_DUP_ENTRY' || err?.message?.includes('Duplicate')) return;
    throw err;
  }
}

export async function addProviderCategories(providerId: number, categoryIds: number[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (categoryIds.length === 0) return;
  for (const categoryId of categoryIds) {
    await addProviderCategory(providerId, categoryId);
  }
}

export async function removeProviderCategory(providerId: number, categoryId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(providerCategories)
    .where(and(eq(providerCategories.providerId, providerId), eq(providerCategories.categoryId, categoryId)));
}

export async function setProviderCategories(providerId: number, categoryIds: number[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Remove all existing
  await db.delete(providerCategories).where(eq(providerCategories.providerId, providerId));
  // Add new ones
  if (categoryIds.length > 0) {
    await db.insert(providerCategories).values(
      categoryIds.map(categoryId => ({ providerId, categoryId }))
    );
  }
}

export async function getProvidersByCategory(categoryId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ providerId: providerCategories.providerId })
    .from(providerCategories)
    .where(and(eq(providerCategories.categoryId, categoryId), eq(providerCategories.isActive, true)));
  return rows.map(r => r.providerId);
}

// ============================================================================
// SERVICE MANAGEMENT
// ============================================================================

export async function createService(data: typeof services.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(services).values(data);
  return result;
}

export async function getServiceById(id: number): Promise<Service | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(services).where(eq(services.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getServicesByProviderId(providerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(services)
    .where(and(eq(services.providerId, providerId), eq(services.isActive, true)))
    .orderBy(services.name);
}

export async function getServicesByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(services)
    .where(and(eq(services.categoryId, categoryId), eq(services.isActive, true)))
    .orderBy(services.name);
}

export async function searchServices(searchTerm: string) {
  const db = await getDb();
  if (!db) return [];
  const term = `%${searchTerm}%`;
  // Search services by name/description AND by provider business name
  // Priority ranking: trust score (primary) + subscription tier boost (secondary)
  const tierBoost = sql<number>`CASE 
    WHEN ${providerSubscriptions.tier} = 'premium' AND ${providerSubscriptions.status} IN ('active', 'trialing') THEN 30
    WHEN ${providerSubscriptions.tier} = 'basic' AND ${providerSubscriptions.status} IN ('active', 'trialing') THEN 15
    ELSE 0
  END`;
  const rankScore = sql<number>`(COALESCE(${serviceProviders.trustScore}, 0) + ${tierBoost})`;

  const rows = await db
    .select({
      id: services.id,
      providerId: services.providerId,
      categoryId: services.categoryId,
      name: services.name,
      description: services.description,
      serviceType: services.serviceType,
      pricingModel: services.pricingModel,
      basePrice: services.basePrice,
      hourlyRate: services.hourlyRate,
      durationMinutes: services.durationMinutes,
      depositRequired: services.depositRequired,
      depositType: services.depositType,
      depositAmount: services.depositAmount,
      depositPercentage: services.depositPercentage,
      cancellationPolicy: services.cancellationPolicy,
      specialRequirements: services.specialRequirements,
      bufferTimeMinutes: services.bufferTimeMinutes,
      isActive: services.isActive,
      createdAt: services.createdAt,
      updatedAt: services.updatedAt,
      deletedAt: services.deletedAt,
      businessName: serviceProviders.businessName,
      providerSlug: serviceProviders.profileSlug,
      trustScore: serviceProviders.trustScore,
      trustLevel: serviceProviders.trustLevel,
    })
    .from(services)
    .innerJoin(serviceProviders, eq(services.providerId, serviceProviders.id))
    .leftJoin(providerSubscriptions, eq(serviceProviders.id, providerSubscriptions.providerId))
    .where(and(
      eq(services.isActive, true),
      eq(serviceProviders.isActive, true),
      or(
        like(services.name, term),
        like(services.description, term),
        like(serviceProviders.businessName, term)
      )
    ))
    .orderBy(
      desc(serviceProviders.isOfficial),
      desc(rankScore),
      desc(serviceProviders.averageRating)
    )
    .limit(50);
  return rows;
}

/**
 * Search providers by business name. Returns enriched provider objects
 * with categories and profile photo for display in search results.
 */
export async function searchProviders(searchTerm: string) {
  const db = await getDb();
  if (!db) return [];
  const term = `%${searchTerm}%`;
  // Priority ranking: trust score (primary) + subscription tier boost (secondary)
  const tierBoost = sql<number>`CASE 
    WHEN ${providerSubscriptions.tier} = 'premium' AND ${providerSubscriptions.status} IN ('active', 'trialing') THEN 30
    WHEN ${providerSubscriptions.tier} = 'basic' AND ${providerSubscriptions.status} IN ('active', 'trialing') THEN 15
    ELSE 0
  END`;
  const rankScore = sql<number>`(COALESCE(${serviceProviders.trustScore}, 0) + ${tierBoost})`;

  const rows = await db
    .select({
      id: serviceProviders.id,
      userId: serviceProviders.userId,
      businessName: serviceProviders.businessName,
      description: serviceProviders.description,
      city: serviceProviders.city,
      state: serviceProviders.state,
      averageRating: serviceProviders.averageRating,
      totalReviews: serviceProviders.totalReviews,
      totalBookings: serviceProviders.totalBookings,
      profileSlug: serviceProviders.profileSlug,
      isOfficial: serviceProviders.isOfficial,
      isFeatured: serviceProviders.isFeatured,
      verificationStatus: serviceProviders.verificationStatus,
      profilePhotoUrl: users.profilePhotoUrl,
      trustScore: serviceProviders.trustScore,
      trustLevel: serviceProviders.trustLevel,
    })
    .from(serviceProviders)
    .innerJoin(users, eq(serviceProviders.userId, users.id))
    .leftJoin(providerSubscriptions, eq(serviceProviders.id, providerSubscriptions.providerId))
    .where(and(
      eq(serviceProviders.isActive, true),
      or(
        like(serviceProviders.businessName, term),
        like(serviceProviders.description, term)
      )
    ))
    .orderBy(
      desc(serviceProviders.isOfficial),
      desc(rankScore),
      desc(serviceProviders.averageRating)
    )
    .limit(10);
  return rows;
}

export async function getServicesByProvider(providerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(services)
    .where(and(eq(services.providerId, providerId), eq(services.isActive, true)))
    .orderBy(services.name);
}

// ============================================================================
// SERVICE UPDATE & DELETE
// ============================================================================

export async function updateService(serviceId: number, data: {
  name?: string;
  description?: string;
  categoryId?: number;
  serviceType?: string;
  pricingModel?: string;
  basePrice?: string;
  hourlyRate?: string;
  durationMinutes?: number;
  depositRequired?: boolean;
  depositType?: string;
  depositAmount?: string;
  depositPercentage?: string;
  cancellationPolicy?: string;
  specialRequirements?: string;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) updateData[key] = value;
  }
  if (Object.keys(updateData).length === 0) return;
  await db.update(services).set(updateData).where(eq(services.id, serviceId));
}

export async function deleteService(serviceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(services)
    .set({ isActive: false, deletedAt: new Date() })
    .where(eq(services.id, serviceId));
}

export async function getActiveServiceCount(providerId: number): Promise<number> {
  const database = await getDb();
  if (!database) return 0;
  const result = await database
    .select({ count: sql<number>`COUNT(*)` })
    .from(services)
    .where(and(eq(services.providerId, providerId), eq(services.isActive, true)));
  return result[0]?.count || 0;
}

// ============================================================================
// SERVICE PHOTO HELPERS
// ============================================================================

export async function addServicePhoto(data: {
  serviceId: number;
  photoUrl: string;
  caption?: string;
  sortOrder?: number;
  isPrimary?: boolean;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  await database.insert(servicePhotos).values({
    serviceId: data.serviceId,
    photoUrl: data.photoUrl,
    caption: data.caption || null,
    sortOrder: data.sortOrder || 0,
    isPrimary: data.isPrimary || false,
  });
}

export async function getServicePhotos(serviceId: number) {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(servicePhotos)
    .where(eq(servicePhotos.serviceId, serviceId))
    .orderBy(servicePhotos.sortOrder);
}

export async function getPhotosForServices(serviceIds: number[]) {
  if (serviceIds.length === 0) return [];
  const database = await getDb();
  if (!database) return [];
  return database.select().from(servicePhotos)
    .where(inArray(servicePhotos.serviceId, serviceIds))
    .orderBy(servicePhotos.sortOrder);
}

export async function deleteServicePhoto(photoId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  await database.delete(servicePhotos).where(eq(servicePhotos.id, photoId));
}

export async function updateServicePhotoOrder(photoId: number, sortOrder: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  await database.update(servicePhotos).set({ sortOrder }).where(eq(servicePhotos.id, photoId));
}

export async function setServicePrimaryPhoto(serviceId: number, photoId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  await database.update(servicePhotos).set({ isPrimary: false }).where(eq(servicePhotos.serviceId, serviceId));
  await database.update(servicePhotos).set({ isPrimary: true }).where(eq(servicePhotos.id, photoId));
}
