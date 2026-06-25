import { eq } from "drizzle-orm";
import { getDb } from "./connection";
import { platformSettings } from "../../drizzle/schema";

/**
 * Default platform settings (used when no value is stored in DB)
 */
const DEFAULTS: Record<string, string> = {
  contact_phone: "(678) 525-0891",
  contact_email: "info@ologycrew.com",
  contact_address: "",
  business_hours: "Mon-Fri 9:00 AM - 6:00 PM EST",
  support_email: "support@ologycrew.com",
};

/**
 * Get a single platform setting by key
 */
export async function getPlatformSetting(key: string): Promise<string> {
  const db = await getDb();
  if (!db) return DEFAULTS[key] || "";
  const result = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.settingKey, key))
    .limit(1);
  if (result.length > 0) return result[0].settingValue;
  return DEFAULTS[key] || "";
}

/**
 * Get all platform settings as a key-value map
 */
export async function getAllPlatformSettings(): Promise<Record<string, string>> {
  const db = await getDb();
  const settings = { ...DEFAULTS };
  if (!db) return settings;
  const rows = await db.select().from(platformSettings);
  for (const row of rows) {
    settings[row.settingKey] = row.settingValue;
  }
  return settings;
}

/**
 * Upsert a platform setting
 */
export async function upsertPlatformSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await db
    .select()
    .from(platformSettings)
    .where(eq(platformSettings.settingKey, key))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(platformSettings)
      .set({ settingValue: value })
      .where(eq(platformSettings.settingKey, key));
  } else {
    await db.insert(platformSettings).values({ settingKey: key, settingValue: value });
  }
}

/**
 * Bulk upsert multiple settings at once
 */
export async function bulkUpsertPlatformSettings(settings: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(settings)) {
    await upsertPlatformSetting(key, value);
  }
}
