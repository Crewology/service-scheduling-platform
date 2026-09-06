import { eq } from "drizzle-orm";
import { crmOperationalState } from "../../../drizzle/schema";
import {
  CRM_DEFAULT_ROLLOUT_FLAGS,
  CRM_PRIVATE_SETTING_KEYS,
  CRM_ROLLOUT_FLAGS,
  type CrmPrivateSettingKey,
  type CrmRolloutFlag,
} from "../../../shared/crm";
import { requireDb } from "../connection";

function assertPrivateKey(key: string): asserts key is CrmPrivateSettingKey {
  if (!(CRM_PRIVATE_SETTING_KEYS as readonly string[]).includes(key)) {
    throw new Error(`Unsupported private Customers setting: ${key}`);
  }
}

export async function getCrmOperationalSetting(key: CrmPrivateSettingKey): Promise<string | null> {
  assertPrivateKey(key);
  const database = await requireDb();
  const [row] = await database
    .select({ value: crmOperationalState.settingValue })
    .from(crmOperationalState)
    .where(eq(crmOperationalState.settingKey, key))
    .limit(1);
  return row?.value ?? null;
}

export async function upsertCrmOperationalSetting(
  key: CrmPrivateSettingKey,
  value: string,
  updatedByUserId?: number | null,
): Promise<void> {
  assertPrivateKey(key);
  const database = await requireDb();
  const [existing] = await database
    .select({ id: crmOperationalState.id })
    .from(crmOperationalState)
    .where(eq(crmOperationalState.settingKey, key))
    .limit(1);

  if (existing) {
    await database
      .update(crmOperationalState)
      .set({ settingValue: value, updatedByUserId: updatedByUserId ?? null })
      .where(eq(crmOperationalState.id, existing.id));
    return;
  }

  await database.insert(crmOperationalState).values({
    settingKey: key,
    settingValue: value,
    updatedByUserId: updatedByUserId ?? null,
  });
}

export async function getCrmRolloutFlags(): Promise<Record<CrmRolloutFlag, boolean>> {
  const database = await requireDb();
  const keys = Object.values(CRM_ROLLOUT_FLAGS);
  const rows = await database
    .select({ key: crmOperationalState.settingKey, value: crmOperationalState.settingValue })
    .from(crmOperationalState);
  const stored = new Map(rows.map((row) => [row.key, row.value]));

  return keys.reduce<Record<CrmRolloutFlag, boolean>>((result, key) => {
    result[key] = stored.get(key) === "true";
    return result;
  }, { ...CRM_DEFAULT_ROLLOUT_FLAGS });
}

export async function isCrmRolloutEnabled(flag: CrmRolloutFlag): Promise<boolean> {
  return (await getCrmOperationalSetting(flag)) === "true";
}

export async function setCrmRolloutFlag(
  flag: CrmRolloutFlag,
  enabled: boolean,
  updatedByUserId?: number | null,
): Promise<void> {
  await upsertCrmOperationalSetting(flag, enabled ? "true" : "false", updatedByUserId);
}

export async function getCrmPilotProviderIds(): Promise<number[]> {
  const raw = await getCrmOperationalSetting("customersPilotProviderIds");
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.filter((value): value is number => Number.isInteger(value) && value > 0))).slice(0, 500);
  } catch {
    return [];
  }
}

export async function setCrmPilotProviderIds(
  providerIds: number[],
  updatedByUserId?: number | null,
): Promise<void> {
  const normalized = Array.from(new Set(providerIds.filter((value) => Number.isInteger(value) && value > 0)))
    .sort((a, b) => a - b)
    .slice(0, 500);
  await upsertCrmOperationalSetting("customersPilotProviderIds", JSON.stringify(normalized), updatedByUserId);
}
