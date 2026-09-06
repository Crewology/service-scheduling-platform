import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { crmTasks } from "../../../drizzle/schema";
import type { CrmTaskState, CrmTaskType } from "../../../shared/crm";
import { requireDb } from "../connection";
import { buildProviderScopedDedupeKey, requireCrmContactScope, requireCrmRuleScope } from "./scope";

export async function createCrmTask(input: {
  providerId: number;
  contactId: number;
  taskType: CrmTaskType;
  title: string;
  description?: string | null;
  dueAt?: Date | null;
  ruleId?: number | null;
  dedupeKey?: string | null;
  createdByUserId?: number | null;
}) {
  const contact = await requireCrmContactScope(input.providerId, input.contactId);
  if (input.ruleId) await requireCrmRuleScope(input.providerId, input.ruleId);
  const title = input.title.trim();
  if (!title || title.length > 255) throw new Error("Customers task title is invalid");
  const dedupeKey = input.dedupeKey ? buildProviderScopedDedupeKey(input.providerId, input.dedupeKey) : null;
  const database = await requireDb();
  await database.insert(crmTasks).values({
    providerId: input.providerId,
    customerId: contact.customerId,
    contactId: input.contactId,
    taskType: input.taskType,
    title,
    description: input.description?.trim() || null,
    dueAt: input.dueAt ?? null,
    ruleId: input.ruleId ?? null,
    dedupeKey,
    createdByUserId: input.createdByUserId ?? null,
  }).onDuplicateKeyUpdate({ set: { dedupeKey } });

  if (dedupeKey) {
    const [task] = await database.select().from(crmTasks).where(and(
      eq(crmTasks.providerId, input.providerId),
      eq(crmTasks.dedupeKey, dedupeKey),
    )).limit(1);
    return task;
  }
  const [task] = await database.select().from(crmTasks).where(and(
    eq(crmTasks.providerId, input.providerId),
    eq(crmTasks.contactId, input.contactId),
  )).orderBy(desc(crmTasks.id)).limit(1);
  return task;
}

export async function listCrmTasks(input: {
  providerId: number;
  contactId?: number;
  states?: CrmTaskState[];
  limit?: number;
}) {
  if (input.contactId) await requireCrmContactScope(input.providerId, input.contactId);
  const database = await requireDb();
  const conditions = [eq(crmTasks.providerId, input.providerId)];
  if (input.contactId) conditions.push(eq(crmTasks.contactId, input.contactId));
  if (input.states?.length) conditions.push(inArray(crmTasks.state, input.states));
  return database.select().from(crmTasks)
    .where(and(...conditions))
    .orderBy(asc(crmTasks.dueAt), desc(crmTasks.createdAt), desc(crmTasks.id))
    .limit(Math.min(Math.max(input.limit ?? 100, 1), 200));
}

export async function updateCrmTaskState(input: {
  providerId: number;
  taskId: number;
  state: CrmTaskState;
  snoozedUntil?: Date | null;
}) {
  const database = await requireDb();
  const now = new Date();
  return database.update(crmTasks).set({
    state: input.state,
    snoozedUntil: input.state === "snoozed" ? input.snoozedUntil ?? null : null,
    completedAt: input.state === "completed" ? now : null,
    dismissedAt: input.state === "dismissed" ? now : null,
  }).where(and(eq(crmTasks.id, input.taskId), eq(crmTasks.providerId, input.providerId)));
}
