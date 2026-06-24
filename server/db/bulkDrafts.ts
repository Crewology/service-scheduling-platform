import { eq, desc } from "drizzle-orm";
import { bulkBookingDrafts } from "../../drizzle/schema";
import { getDb } from "./connection";

export async function createBulkDraft(data: {
  userId: number;
  name?: string;
  eventDate?: string;
  eventType?: string;
  eventVenue?: string;
  slots: any[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [result] = await db.insert(bulkBookingDrafts).values({
    userId: data.userId,
    name: data.name || null,
    eventDate: data.eventDate || null,
    eventType: data.eventType || null,
    eventVenue: data.eventVenue || null,
    slots: data.slots,
  });
  return result.insertId;
}

export async function updateBulkDraft(id: number, userId: number, data: {
  name?: string;
  eventDate?: string;
  eventType?: string;
  eventVenue?: string;
  slots: any[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(bulkBookingDrafts)
    .set({
      name: data.name || null,
      eventDate: data.eventDate || null,
      eventType: data.eventType || null,
      eventVenue: data.eventVenue || null,
      slots: data.slots,
    })
    .where(eq(bulkBookingDrafts.id, id));
}

export async function getBulkDraftsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(bulkBookingDrafts)
    .where(eq(bulkBookingDrafts.userId, userId))
    .orderBy(desc(bulkBookingDrafts.updatedAt));
}

export async function getBulkDraftById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [draft] = await db.select().from(bulkBookingDrafts)
    .where(eq(bulkBookingDrafts.id, id));
  return draft;
}

export async function deleteBulkDraft(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(bulkBookingDrafts).where(eq(bulkBookingDrafts.id, id));
}
