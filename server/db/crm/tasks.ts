import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { crmContacts, crmTasks, users } from "../../../drizzle/schema";
import type { CrmTaskState, CrmTaskType } from "../../../shared/crm";
import { requireDb } from "../connection";
import { buildProviderScopedDedupeKey, requireCrmContactScope, requireCrmRuleScope, requireCrmTaskScope } from "./scope";

async function refreshCrmOpenTaskCount(providerId: number, contactId: number) {
  const database = await requireDb();
  const [row] = await database.select({ count: sql<number>`count(*)` }).from(crmTasks).where(and(
    eq(crmTasks.providerId, providerId),
    eq(crmTasks.contactId, contactId),
    inArray(crmTasks.state, ["open", "snoozed"]),
  ));
  await database.update(crmContacts).set({ openTaskCount: Number(row?.count || 0) }).where(and(
    eq(crmContacts.id, contactId),
    eq(crmContacts.providerId, providerId),
  ));
}

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
    if (!task) throw new Error("Customers task idempotency lookup failed");
    if (task.contactId !== input.contactId) throw new Error("Customers task idempotency conflict");
    await refreshCrmOpenTaskCount(input.providerId, task.contactId);
    return task;
  }
  const [task] = await database.select().from(crmTasks).where(and(
    eq(crmTasks.providerId, input.providerId),
    eq(crmTasks.contactId, input.contactId),
  )).orderBy(desc(crmTasks.id)).limit(1);
  await refreshCrmOpenTaskCount(input.providerId, input.contactId);
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
  contactId: number;
  taskId: number;
  state: CrmTaskState;
  snoozedUntil?: Date | null;
}) {
  const task = await requireCrmTaskScope(input.providerId, input.contactId, input.taskId);
  if (task.state === input.state) return { task, stateChanged: false, transitionAt: task.updatedAt };
  const database = await requireDb();
  const now = new Date();
  await database.update(crmTasks).set({
    state: input.state,
    snoozedUntil: input.state === "snoozed" ? input.snoozedUntil ?? null : null,
    completedAt: input.state === "completed" ? now : null,
    dismissedAt: input.state === "dismissed" ? now : null,
  }).where(and(eq(crmTasks.id, input.taskId), eq(crmTasks.providerId, input.providerId)));
  await refreshCrmOpenTaskCount(input.providerId, task.contactId);
  return {
    task: await requireCrmTaskScope(input.providerId, task.contactId, input.taskId),
    stateChanged: true,
    transitionAt: now,
  };
}

export async function updateCrmTask(input: {
  providerId: number;
  contactId: number;
  taskId: number;
  title?: string;
  description?: string | null;
  dueAt?: Date | null;
}) {
  await requireCrmTaskScope(input.providerId, input.contactId, input.taskId);
  const title = input.title?.trim();
  if (input.title !== undefined && (!title || title.length > 255)) throw new Error("Customers task title is invalid");
  const database = await requireDb();
  await database.update(crmTasks).set({
    ...(title !== undefined ? { title } : {}),
    ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
    ...(input.dueAt !== undefined ? { dueAt: input.dueAt } : {}),
  }).where(and(
    eq(crmTasks.id, input.taskId),
    eq(crmTasks.providerId, input.providerId),
    eq(crmTasks.contactId, input.contactId),
  ));
  return requireCrmTaskScope(input.providerId, input.contactId, input.taskId);
}

export async function listCrmTaskReadModels(input: {
  providerId: number;
  contactId?: number;
  states?: CrmTaskState[];
  limit?: number;
}) {
  if (input.contactId) await requireCrmContactScope(input.providerId, input.contactId);
  const database = await requireDb();
  const conditions = [eq(crmTasks.providerId, input.providerId), isNull(users.deletedAt)];
  if (input.contactId) conditions.push(eq(crmTasks.contactId, input.contactId));
  if (input.states?.length) conditions.push(inArray(crmTasks.state, input.states));
  return database.select({
    id: crmTasks.id,
    contactId: crmTasks.contactId,
    customerId: crmTasks.customerId,
    customerName: users.name,
    customerEmail: users.email,
    taskType: crmTasks.taskType,
    state: crmTasks.state,
    title: crmTasks.title,
    description: crmTasks.description,
    dueAt: crmTasks.dueAt,
    snoozedUntil: crmTasks.snoozedUntil,
    completedAt: crmTasks.completedAt,
    dismissedAt: crmTasks.dismissedAt,
    createdByUserId: crmTasks.createdByUserId,
    createdAt: crmTasks.createdAt,
    updatedAt: crmTasks.updatedAt,
  }).from(crmTasks)
    .innerJoin(crmContacts, and(eq(crmContacts.id, crmTasks.contactId), eq(crmContacts.providerId, input.providerId)))
    .innerJoin(users, eq(users.id, crmTasks.customerId))
    .where(and(...conditions))
    .orderBy(asc(crmTasks.dueAt), desc(crmTasks.createdAt), desc(crmTasks.id))
    .limit(Math.min(Math.max(input.limit ?? 100, 1), 200));
}
