import { and, eq, isNull, or } from "drizzle-orm";
import { crmAutomationRules, crmContacts, crmTasks } from "../../../drizzle/schema";
import { requireDb } from "../connection";

export class CrmContactNotFoundError extends Error {
  constructor() {
    super("Customers relationship not found");
    this.name = "CrmContactNotFoundError";
  }
}

export function buildProviderScopedDedupeKey(providerId: number, value: string) {
  const key = `${providerId}:${value}`;
  if (key.length > 191) throw new Error("Customers dedupe key is too long");
  return key;
}

export async function requireCrmContactScope(providerId: number, contactId: number) {
  const database = await requireDb();
  const [contact] = await database
    .select()
    .from(crmContacts)
    .where(and(eq(crmContacts.id, contactId), eq(crmContacts.providerId, providerId)))
    .limit(1);
  if (!contact) throw new CrmContactNotFoundError();
  return contact;
}

export async function requireCrmRuleScope(providerId: number, ruleId: number) {
  const database = await requireDb();
  const [rule] = await database.select().from(crmAutomationRules).where(and(
    eq(crmAutomationRules.id, ruleId),
    or(isNull(crmAutomationRules.providerId), eq(crmAutomationRules.providerId, providerId)),
  )).limit(1);
  if (!rule) throw new Error("Customers automation rule not found");
  return rule;
}

export async function requireCrmTaskScope(providerId: number, contactId: number, taskId: number) {
  const database = await requireDb();
  const [task] = await database.select().from(crmTasks).where(and(
    eq(crmTasks.id, taskId),
    eq(crmTasks.providerId, providerId),
    eq(crmTasks.contactId, contactId),
  )).limit(1);
  if (!task) throw new Error("Customers task not found");
  return task;
}
