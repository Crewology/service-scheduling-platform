import { eq, desc, sql } from "drizzle-orm";
import { getDb } from "./connection";
import { eventTemplates } from "../../drizzle/schema";

export async function getEventTemplatesByUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(eventTemplates)
    .where(eq(eventTemplates.userId, userId))
    .orderBy(desc(eventTemplates.updatedAt));
}

export async function getEventTemplateById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [template] = await db
    .select()
    .from(eventTemplates)
    .where(eq(eventTemplates.id, id));
  return template || null;
}

export async function createEventTemplate(data: {
  userId: number;
  name: string;
  eventType?: string;
  defaultVenue?: string;
  serviceGroups: any;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(eventTemplates).values({
    userId: data.userId,
    name: data.name,
    eventType: data.eventType || null,
    defaultVenue: data.defaultVenue || null,
    serviceGroups: data.serviceGroups,
  });
  return { id: result.insertId };
}

export async function updateEventTemplate(
  id: number,
  data: {
    name?: string;
    eventType?: string;
    defaultVenue?: string;
    serviceGroups?: any;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updates: any = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.eventType !== undefined) updates.eventType = data.eventType;
  if (data.defaultVenue !== undefined) updates.defaultVenue = data.defaultVenue;
  if (data.serviceGroups !== undefined) updates.serviceGroups = data.serviceGroups;

  await db.update(eventTemplates).set(updates).where(eq(eventTemplates.id, id));
}

export async function incrementTemplateUsage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(eventTemplates)
    .set({ usageCount: sql`${eventTemplates.usageCount} + 1` })
    .where(eq(eventTemplates.id, id));
}

export async function deleteEventTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(eventTemplates).where(eq(eventTemplates.id, id));
}
