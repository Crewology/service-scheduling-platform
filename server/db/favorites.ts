import { eq, and, desc } from "drizzle-orm";
import { customerFavorites, serviceProviders, users, providerCategories, serviceCategories } from "../../drizzle/schema";
import { getDb } from "./connection";

export async function addFavorite(userId: number, providerId: number) {
  const db = await getDb();
  if (!db) return null;
  const existing = await db
    .select()
    .from(customerFavorites)
    .where(and(eq(customerFavorites.userId, userId), eq(customerFavorites.providerId, providerId)))
    .limit(1);
  if (existing.length > 0) return existing[0];
  
  const [result] = await db.insert(customerFavorites).values({ userId, providerId });
  return { id: result.insertId, userId, providerId };
}

export async function removeFavorite(userId: number, providerId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(customerFavorites)
    .where(and(eq(customerFavorites.userId, userId), eq(customerFavorites.providerId, providerId)));
}

export async function isFavorited(userId: number, providerId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select({ id: customerFavorites.id })
    .from(customerFavorites)
    .where(and(eq(customerFavorites.userId, userId), eq(customerFavorites.providerId, providerId)))
    .limit(1);
  return result.length > 0;
}

export async function getUserFavorites(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const favorites = await db
    .select({
      favoriteId: customerFavorites.id,
      favoritedAt: customerFavorites.createdAt,
      providerId: serviceProviders.id,
      businessName: serviceProviders.businessName,
      description: serviceProviders.description,
      city: serviceProviders.city,
      state: serviceProviders.state,
      averageRating: serviceProviders.averageRating,
      totalReviews: serviceProviders.totalReviews,
      profileSlug: serviceProviders.profileSlug,
      isActive: serviceProviders.isActive,
      profilePhotoUrl: users.profilePhotoUrl,
      userName: users.name,
    })
    .from(customerFavorites)
    .innerJoin(serviceProviders, eq(customerFavorites.providerId, serviceProviders.id))
    .innerJoin(users, eq(serviceProviders.userId, users.id))
    .where(eq(customerFavorites.userId, userId))
    .orderBy(desc(customerFavorites.createdAt));

  const providerIds = favorites.map((f: any) => f.providerId);
  if (providerIds.length === 0) return [];

  const allCategories = await db
    .select({
      providerId: providerCategories.providerId,
      categoryId: serviceCategories.id,
      categoryName: serviceCategories.name,
    })
    .from(providerCategories)
    .innerJoin(serviceCategories, eq(providerCategories.categoryId, serviceCategories.id))
    .where(eq(providerCategories.isActive, true));

  const categoryMap = new Map<number, { id: number; name: string }[]>();
  for (const cat of allCategories) {
    if (!providerIds.includes(cat.providerId)) continue;
    if (!categoryMap.has(cat.providerId)) categoryMap.set(cat.providerId, []);
    categoryMap.get(cat.providerId)!.push({ id: cat.categoryId, name: cat.categoryName });
  }

  return favorites.map((f: any) => ({
    ...f,
    categories: categoryMap.get(f.providerId) || [],
  }));
}

export async function getFavoriteCount(providerId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db
    .select({ id: customerFavorites.id })
    .from(customerFavorites)
    .where(eq(customerFavorites.providerId, providerId));
  return result.length;
}
