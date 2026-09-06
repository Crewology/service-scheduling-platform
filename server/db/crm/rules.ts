import { and, desc, eq, isNull, or } from "drizzle-orm";
import { crmAutomationRules, crmAutomationRuns } from "../../../drizzle/schema";
import {
  crmRuleConfigurationSchema,
  type CrmRuleAction,
  type CrmRuleConfiguration,
  type CrmRuleKey,
} from "../../../shared/crm";
import { requireDb } from "../connection";
import { buildProviderScopedDedupeKey, requireCrmContactScope, requireCrmRuleScope } from "./scope";

export async function createCrmAutomationRule(input: {
  providerId?: number | null;
  ruleKey: CrmRuleKey;
  version: number;
  actionType: CrmRuleAction;
  enabled?: boolean;
  inactivityDays?: number | null;
  configuration?: CrmRuleConfiguration | null;
  createdByUserId?: number | null;
}) {
  if (!Number.isInteger(input.version) || input.version < 1) throw new Error("Customers rule version is invalid");
  const scopeKey = input.providerId ? `provider:${input.providerId}` : "global";
  const configuration = input.configuration ? crmRuleConfigurationSchema.parse(input.configuration) : null;
  const database = await requireDb();
  const result = await database.insert(crmAutomationRules).values({
    providerId: input.providerId ?? null,
    scopeKey,
    ruleKey: input.ruleKey,
    version: input.version,
    actionType: input.actionType,
    enabled: input.enabled ?? false,
    inactivityDays: input.inactivityDays ?? null,
    configuration,
    createdByUserId: input.createdByUserId ?? null,
  });
  return Number(result[0].insertId);
}

export async function listCrmAutomationRules(providerId: number) {
  const database = await requireDb();
  return database.select().from(crmAutomationRules).where(or(
    isNull(crmAutomationRules.providerId),
    eq(crmAutomationRules.providerId, providerId),
  )).orderBy(desc(crmAutomationRules.version), desc(crmAutomationRules.id));
}

export async function setCrmAutomationRuleEnabled(input: {
  providerId: number;
  ruleId: number;
  enabled: boolean;
}) {
  const database = await requireDb();
  return database.update(crmAutomationRules).set({ enabled: input.enabled }).where(and(
    eq(crmAutomationRules.id, input.ruleId),
    eq(crmAutomationRules.providerId, input.providerId),
  ));
}

export async function recordCrmAutomationRun(input: {
  providerId: number;
  customerId: number;
  contactId: number;
  ruleId: number;
  status: "succeeded" | "failed" | "skipped";
  dedupeKey: string;
  outputTaskId?: number | null;
  outputDraftId?: number | null;
  errorCode?: string | null;
  startedAt: Date;
  finishedAt?: Date | null;
}) {
  const contact = await requireCrmContactScope(input.providerId, input.contactId);
  if (contact.customerId !== input.customerId) throw new Error("Customers automation identity mismatch");
  await requireCrmRuleScope(input.providerId, input.ruleId);
  if (!input.dedupeKey) throw new Error("Customers automation dedupe key is invalid");
  const dedupeKey = buildProviderScopedDedupeKey(input.providerId, input.dedupeKey);
  const database = await requireDb();
  await database.insert(crmAutomationRuns).values({ ...input, dedupeKey }).onDuplicateKeyUpdate({
    set: { dedupeKey },
  });
  const [run] = await database.select().from(crmAutomationRuns).where(and(
    eq(crmAutomationRuns.providerId, input.providerId),
    eq(crmAutomationRuns.dedupeKey, dedupeKey),
  )).limit(1);
  return run;
}
