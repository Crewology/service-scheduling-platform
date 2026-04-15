import { getDb } from "./connection";
import { savedProviderFolders, customerFavorites } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

export async function createFolder(userId: number, name: string, color?: string, icon?: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  
  // Get next sort order
  const existing = await db.select({ count: sql<number>`count(*)` })
    .from(savedProviderFolders)
    .where(eq(savedProviderFolders.userId, userId));
  const sortOrder = (existing[0]?.count || 0);
  
  const result = await db.insert(savedProviderFolders).values({
    userId,
    name,
    color: color || "#3b82f6",
    icon: icon || "folder",
    sortOrder,
  });
  return { id: result[0].insertId };
}

export async function getUserFolders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const folders = await db.select()
    .from(savedProviderFolders)
    .where(eq(savedProviderFolders.userId, userId))
    .orderBy(savedProviderFolders.sortOrder);
  
  // Get count of favorites in each folder
  const folderCounts = await db.select({
    folderId: customerFavorites.folderId,
    count: sql<number>`count(*)`,
  })
    .from(customerFavorites)
    .where(eq(customerFavorites.userId, userId))
    .groupBy(customerFavorites.folderId);
  
  const countMap = new Map(folderCounts.map((fc: any) => [fc.folderId, fc.count]));
  
  return folders.map((f: any) => ({
    ...f,
    providerCount: countMap.get(f.id) || 0,
  }));
}

export async function updateFolder(folderId: number, userId: number, data: { name?: string; color?: string; icon?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  
  await db.update(savedProviderFolders)
    .set(data)
    .where(and(
      eq(savedProviderFolders.id, folderId),
      eq(savedProviderFolders.userId, userId),
    ));
  return { success: true };
}

export async function deleteFolder(folderId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  
  // Move all favorites in this folder back to unfiled
  await db.update(customerFavorites)
    .set({ folderId: null })
    .where(and(
      eq(customerFavorites.folderId, folderId),
      eq(customerFavorites.userId, userId),
    ));
  
  await db.delete(savedProviderFolders)
    .where(and(
      eq(savedProviderFolders.id, folderId),
      eq(savedProviderFolders.userId, userId),
    ));
  return { success: true };
}

export async function moveToFolder(favoriteId: number, userId: number, folderId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  
  await db.update(customerFavorites)
    .set({ folderId })
    .where(and(
      eq(customerFavorites.id, favoriteId),
      eq(customerFavorites.userId, userId),
    ));
  return { success: true };
}

export async function bulkMoveToFolder(userId: number, providerIds: number[], folderId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  
  for (const providerId of providerIds) {
    await db.update(customerFavorites)
      .set({ folderId })
      .where(and(
        eq(customerFavorites.userId, userId),
        eq(customerFavorites.providerId, providerId),
      ));
  }
  return { success: true };
}
