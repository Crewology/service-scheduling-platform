import { eq, and, gte, lte, desc, asc, sql } from "drizzle-orm";
import {
  availabilitySchedules,
  availabilityOverrides,
} from "../../drizzle/schema";
import { getDb } from "./connection";

// ============================================================================
// AVAILABILITY MANAGEMENT
// ============================================================================

export async function createAvailabilitySchedule(data: typeof availabilitySchedules.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(availabilitySchedules).values(data);
  return result;
}

/**
 * Replace all weekly schedule entries for a provider in one atomic operation.
 * Deletes all existing entries, then inserts the new set.
 * This prevents duplicate accumulation from repeated saves.
 */
export async function replaceWeeklySchedule(
  providerId: number,
  entries: Array<{ dayOfWeek: number; startTime: string; endTime: string; isAvailable?: boolean; locationType?: "mobile" | "fixed_location" | "virtual" | null; maxConcurrentBookings?: number }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete all existing schedule entries for this provider
  await db.delete(availabilitySchedules).where(eq(availabilitySchedules.providerId, providerId));
  
  // Insert new entries if any
  if (entries.length > 0) {
    await db.insert(availabilitySchedules).values(
      entries.map(entry => ({
        providerId,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        isAvailable: entry.isAvailable ?? true,
        locationType: entry.locationType,
        maxConcurrentBookings: entry.maxConcurrentBookings ?? 1,
      }))
    );
  }
  
  return { success: true };
}

export async function getAvailabilityByProvider(providerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(availabilitySchedules)
    .where(eq(availabilitySchedules.providerId, providerId))
    .orderBy(availabilitySchedules.dayOfWeek);
}

export async function getAvailabilityOverrides(providerId: number, startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(availabilityOverrides.providerId, providerId)];
  if (startDate) conditions.push(gte(availabilityOverrides.overrideDate, startDate));
  if (endDate) conditions.push(lte(availabilityOverrides.overrideDate, endDate));
  return await db.select().from(availabilityOverrides)
    .where(and(...conditions))
    .orderBy(availabilityOverrides.overrideDate);
}

export async function createAvailabilityOverride(data: typeof availabilityOverrides.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(availabilityOverrides).values(data);
  return result;
}

export async function deleteAvailabilitySchedule(scheduleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(availabilitySchedules).where(eq(availabilitySchedules.id, scheduleId));
}

export async function deleteAvailabilityOverride(overrideId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(availabilityOverrides).where(eq(availabilityOverrides.id, overrideId));
}
