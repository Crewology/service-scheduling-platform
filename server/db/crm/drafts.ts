import { and, desc, eq } from "drizzle-orm";
import { crmMessageDrafts } from "../../../drizzle/schema";
import { CRM_MAX_DRAFT_LENGTH } from "../../../shared/crm";
import { requireDb } from "../connection";
import { buildProviderScopedDedupeKey, requireCrmContactScope, requireCrmRuleScope, requireCrmTaskScope } from "./scope";

function normalizeDraft(body: string) {
  const value = body.trim();
  if (!value || value.length > CRM_MAX_DRAFT_LENGTH) throw new Error("Customers message draft is invalid");
  return value;
}

export async function createCrmMessageDraft(input: {
  providerId: number;
  contactId: number;
  body: string;
  ruleId?: number | null;
  taskId?: number | null;
  dedupeKey?: string | null;
}) {
  const contact = await requireCrmContactScope(input.providerId, input.contactId);
  if (input.ruleId) await requireCrmRuleScope(input.providerId, input.ruleId);
  if (input.taskId) await requireCrmTaskScope(input.providerId, input.contactId, input.taskId);
  const dedupeKey = input.dedupeKey ? buildProviderScopedDedupeKey(input.providerId, input.dedupeKey) : null;
  const database = await requireDb();
  await database.insert(crmMessageDrafts).values({
    providerId: input.providerId,
    customerId: contact.customerId,
    contactId: input.contactId,
    body: normalizeDraft(input.body),
    ruleId: input.ruleId ?? null,
    taskId: input.taskId ?? null,
    dedupeKey,
  }).onDuplicateKeyUpdate({ set: { dedupeKey } });

  const [draft] = dedupeKey
    ? await database.select().from(crmMessageDrafts).where(and(
      eq(crmMessageDrafts.providerId, input.providerId),
      eq(crmMessageDrafts.dedupeKey, dedupeKey),
    )).limit(1)
    : await database.select().from(crmMessageDrafts).where(and(
      eq(crmMessageDrafts.providerId, input.providerId),
      eq(crmMessageDrafts.contactId, input.contactId),
    )).orderBy(desc(crmMessageDrafts.id)).limit(1);
  return draft;
}

export async function listCrmMessageDrafts(providerId: number, contactId?: number) {
  if (contactId) await requireCrmContactScope(providerId, contactId);
  const database = await requireDb();
  const condition = contactId
    ? and(eq(crmMessageDrafts.providerId, providerId), eq(crmMessageDrafts.contactId, contactId))
    : eq(crmMessageDrafts.providerId, providerId);
  return database.select().from(crmMessageDrafts).where(condition)
    .orderBy(desc(crmMessageDrafts.createdAt), desc(crmMessageDrafts.id));
}

export async function updateCrmMessageDraft(input: {
  providerId: number;
  draftId: number;
  body: string;
}) {
  const database = await requireDb();
  return database.update(crmMessageDrafts).set({ body: normalizeDraft(input.body) }).where(and(
    eq(crmMessageDrafts.id, input.draftId),
    eq(crmMessageDrafts.providerId, input.providerId),
    eq(crmMessageDrafts.state, "draft"),
  ));
}

export async function discardCrmMessageDraft(providerId: number, draftId: number) {
  const database = await requireDb();
  return database.update(crmMessageDrafts).set({ state: "discarded", discardedAt: new Date() }).where(and(
    eq(crmMessageDrafts.id, draftId),
    eq(crmMessageDrafts.providerId, providerId),
    eq(crmMessageDrafts.state, "draft"),
  ));
}
