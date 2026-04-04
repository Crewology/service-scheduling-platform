import { eq, and, asc, desc } from "drizzle-orm";
import { portfolioItems } from "../../drizzle/schema";
import { getDb } from "./connection";

export async function getPortfolioByProvider(providerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(portfolioItems)
    .where(and(eq(portfolioItems.providerId, providerId), eq(portfolioItems.isActive, true)))
    .orderBy(asc(portfolioItems.sortOrder), desc(portfolioItems.createdAt));
}

export async function getPortfolioByProviderAndCategory(providerId: number, categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(portfolioItems)
    .where(and(
      eq(portfolioItems.providerId, providerId),
      eq(portfolioItems.categoryId, categoryId),
      eq(portfolioItems.isActive, true)
    ))
    .orderBy(asc(portfolioItems.sortOrder), desc(portfolioItems.createdAt));
}

export async function createPortfolioItem(data: {
  providerId: number;
  categoryId?: number;
  title?: string;
  description?: string;
  imageUrl: string;
  mediaType?: "image" | "before_after";
  beforeImageUrl?: string;
  sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(portfolioItems).values({
    providerId: data.providerId,
    categoryId: data.categoryId || null,
    title: data.title || null,
    description: data.description || null,
    imageUrl: data.imageUrl,
    mediaType: data.mediaType || "image",
    beforeImageUrl: data.beforeImageUrl || null,
    sortOrder: data.sortOrder || 0,
  });
  return result;
}

export async function updatePortfolioItem(id: number, providerId: number, data: {
  title?: string;
  description?: string;
  categoryId?: number;
  sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(portfolioItems)
    .set(data)
    .where(and(eq(portfolioItems.id, id), eq(portfolioItems.providerId, providerId)));
}

export async function deletePortfolioItem(id: number, providerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(portfolioItems)
    .set({ isActive: false })
    .where(and(eq(portfolioItems.id, id), eq(portfolioItems.providerId, providerId)));
}

export async function getPortfolioItemCount(providerId: number) {
  const db = await getDb();
  if (!db) return 0;
  const items = await db.select().from(portfolioItems)
    .where(and(eq(portfolioItems.providerId, providerId), eq(portfolioItems.isActive, true)));
  return items.length;
}
