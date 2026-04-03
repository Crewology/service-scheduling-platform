import { eq, and, desc, asc, sql, or, like, inArray } from "drizzle-orm";
import {
  serviceCategories,
  services,
  servicePhotos,
  providerCategories,
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

export async function getProviderCategories(providerId: number): Promise<ProviderCategory[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(providerCategories)
    .where(and(eq(providerCategories.providerId, providerId), eq(providerCategories.isActive, true)))
    .orderBy(providerCategories.createdAt);
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
  return await db.select().from(services)
    .where(and(
      eq(services.isActive, true),
      or(like(services.name, term), like(services.description, term))
    ))
    .orderBy(services.name)
    .limit(50);
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
