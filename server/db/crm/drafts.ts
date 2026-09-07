import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { crmContactPreferences, crmContacts, crmMessageDrafts, messages, notificationPreferences, serviceProviders, users } from "../../../drizzle/schema";
import { CRM_MAX_DRAFT_LENGTH } from "../../../shared/crm";
import { evaluateRelationshipMessageConsent } from "../../crm/policies";
import { requireDb } from "../connection";
import { buildProviderScopedDedupeKey, requireCrmContactScope, requireCrmRuleScope, requireCrmTaskScope } from "./scope";

function normalizeDraft(body: string) {
  const value = body.trim();
  if (!value || value.length > CRM_MAX_DRAFT_LENGTH) throw new Error("Customers message draft is invalid");
  return value;
}

export class CrmMessageDraftNotFoundError extends Error {
  constructor() {
    super("Customers message draft not found");
    this.name = "CrmMessageDraftNotFoundError";
  }
}

export class CrmMessageDraftIdempotencyConflictError extends Error {
  constructor() {
    super("Customers message draft idempotency conflict");
    this.name = "CrmMessageDraftIdempotencyConflictError";
  }
}

export type CrmMessageDraftSendBlockReason =
  | "provider_unavailable"
  | "customer_unavailable"
  | "relationship_archived"
  | "global_opt_out"
  | "provider_do_not_contact"
  | "relationship_opt_out"
  | "draft_discarded";

export class CrmMessageDraftSendBlockedError extends Error {
  constructor(public readonly reason: CrmMessageDraftSendBlockReason) {
    super("Customers message draft cannot be sent");
    this.name = "CrmMessageDraftSendBlockedError";
  }
}

export class CrmMessageDraftVersionConflictError extends Error {
  constructor() {
    super("Customers message draft changed before confirmation");
    this.name = "CrmMessageDraftVersionConflictError";
  }
}

async function requireCrmMessageDraftScope(providerId: number, contactId: number, draftId: number) {
  await requireCrmContactScope(providerId, contactId);
  const database = await requireDb();
  const [draft] = await database.select().from(crmMessageDrafts).where(and(
    eq(crmMessageDrafts.id, draftId),
    eq(crmMessageDrafts.providerId, providerId),
    eq(crmMessageDrafts.contactId, contactId),
  )).limit(1);
  if (!draft) throw new CrmMessageDraftNotFoundError();
  return draft;
}

function resolveDraftSendReadiness(input: {
  providerActive: boolean;
  customerAvailable: boolean;
  relationshipArchived: boolean;
  globalRelationshipMessagesEnabled: boolean;
  relationshipMessagesAllowed?: boolean | null;
  doNotContact?: boolean | null;
}): { allowed: true; reason: "allowed" } | { allowed: false; reason: CrmMessageDraftSendBlockReason } {
  if (!input.providerActive) return { allowed: false as const, reason: "provider_unavailable" as const };
  if (!input.customerAvailable) return { allowed: false as const, reason: "customer_unavailable" as const };
  if (input.relationshipArchived) return { allowed: false as const, reason: "relationship_archived" as const };
  const consent = evaluateRelationshipMessageConsent(input);
  return consent.reason === "allowed"
    ? { allowed: true, reason: "allowed" }
    : { allowed: false, reason: consent.reason };
}

export async function getCrmMessageDraftSendReadiness(input: {
  providerId: number;
  contactId: number;
  senderUserId: number;
}) {
  const contact = await requireCrmContactScope(input.providerId, input.contactId);
  const database = await requireDb();
  const [[provider], [customer], [globalPreference], [relationshipPreference]] = await Promise.all([
    database.select({ userId: serviceProviders.userId, isActive: serviceProviders.isActive }).from(serviceProviders).where(and(
      eq(serviceProviders.id, input.providerId),
      eq(serviceProviders.userId, input.senderUserId),
    )).limit(1),
    database.select({ id: users.id }).from(users).where(and(eq(users.id, contact.customerId), isNull(users.deletedAt))).limit(1),
    database.select({ relationshipMessageEnabled: notificationPreferences.relationshipMessageEnabled }).from(notificationPreferences).where(eq(notificationPreferences.userId, contact.customerId)).limit(1),
    database.select({ relationshipMessagesAllowed: crmContactPreferences.relationshipMessagesAllowed, doNotContact: crmContactPreferences.doNotContact }).from(crmContactPreferences).where(and(
      eq(crmContactPreferences.providerId, input.providerId),
      eq(crmContactPreferences.contactId, input.contactId),
    )).limit(1),
  ]);
  const readiness = resolveDraftSendReadiness({
    providerActive: Boolean(provider?.isActive),
    customerAvailable: Boolean(customer),
    relationshipArchived: Boolean(contact.archivedAt || contact.manualStage === "archived"),
    globalRelationshipMessagesEnabled: globalPreference?.relationshipMessageEnabled ?? false,
    relationshipMessagesAllowed: relationshipPreference?.relationshipMessagesAllowed,
    doNotContact: relationshipPreference?.doNotContact,
  });
  return { ...readiness, customerId: contact.customerId };
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
  if (draft && draft.contactId !== input.contactId) throw new CrmMessageDraftIdempotencyConflictError();
  return draft;
}

export async function listCrmMessageDrafts(providerId: number, contactId?: number, states: Array<"draft" | "sent" | "discarded"> = ["draft"]) {
  if (contactId) await requireCrmContactScope(providerId, contactId);
  const database = await requireDb();
  const condition = contactId
    ? and(eq(crmMessageDrafts.providerId, providerId), eq(crmMessageDrafts.contactId, contactId), inArray(crmMessageDrafts.state, states))
    : and(eq(crmMessageDrafts.providerId, providerId), inArray(crmMessageDrafts.state, states));
  return database.select().from(crmMessageDrafts).where(condition)
    .orderBy(desc(crmMessageDrafts.updatedAt), desc(crmMessageDrafts.id));
}

export async function updateCrmMessageDraft(input: {
  providerId: number;
  contactId: number;
  draftId: number;
  body: string;
}) {
  const existing = await requireCrmMessageDraftScope(input.providerId, input.contactId, input.draftId);
  if (existing.state !== "draft") throw new CrmMessageDraftNotFoundError();
  const database = await requireDb();
  await database.update(crmMessageDrafts).set({ body: normalizeDraft(input.body) }).where(and(
    eq(crmMessageDrafts.id, input.draftId),
    eq(crmMessageDrafts.providerId, input.providerId),
    eq(crmMessageDrafts.contactId, input.contactId),
    eq(crmMessageDrafts.state, "draft"),
  ));
  const [updated] = await database.select().from(crmMessageDrafts).where(and(
    eq(crmMessageDrafts.id, input.draftId),
    eq(crmMessageDrafts.providerId, input.providerId),
    eq(crmMessageDrafts.contactId, input.contactId),
    eq(crmMessageDrafts.state, "draft"),
  )).limit(1);
  if (!updated) throw new CrmMessageDraftNotFoundError();
  return updated;
}

export async function discardCrmMessageDraft(providerId: number, contactId: number, draftId: number) {
  const existing = await requireCrmMessageDraftScope(providerId, contactId, draftId);
  if (existing.state !== "draft") throw new CrmMessageDraftNotFoundError();
  const database = await requireDb();
  const discardedAt = new Date();
  await database.update(crmMessageDrafts).set({ state: "discarded", discardedAt }).where(and(
    eq(crmMessageDrafts.id, draftId),
    eq(crmMessageDrafts.providerId, providerId),
    eq(crmMessageDrafts.contactId, contactId),
    eq(crmMessageDrafts.state, "draft"),
  ));
  return { ...existing, state: "discarded" as const, discardedAt };
}

export async function sendCrmMessageDraft(input: {
  providerId: number;
  contactId: number;
  draftId: number;
  senderUserId: number;
  confirmedBody: string;
}) {
  const confirmedBody = normalizeDraft(input.confirmedBody);
  const database = await requireDb();
  return database.transaction(async transaction => {
    const [contact] = await transaction.select().from(crmContacts).where(and(
      eq(crmContacts.id, input.contactId),
      eq(crmContacts.providerId, input.providerId),
    )).limit(1).for("update");
    if (!contact) throw new CrmMessageDraftNotFoundError();

    const [draft] = await transaction.select().from(crmMessageDrafts).where(and(
      eq(crmMessageDrafts.id, input.draftId),
      eq(crmMessageDrafts.providerId, input.providerId),
      eq(crmMessageDrafts.contactId, input.contactId),
    )).limit(1).for("update");
    if (!draft) throw new CrmMessageDraftNotFoundError();

    const conversationId = `conv-${[input.senderUserId, contact.customerId].sort((a, b) => a - b).join("-")}`;
    if (draft.state === "sent" && draft.sentMessageId && draft.sentAt) {
      return { draftId: draft.id, messageId: draft.sentMessageId, conversationId, sentAt: draft.sentAt, alreadySent: true };
    }
    if (draft.state !== "draft") throw new CrmMessageDraftSendBlockedError("draft_discarded");
    if (draft.body !== confirmedBody) throw new CrmMessageDraftVersionConflictError();

    const [[provider], [customer], [globalPreference], [relationshipPreference]] = await Promise.all([
      transaction.select({ isActive: serviceProviders.isActive }).from(serviceProviders).where(and(
        eq(serviceProviders.id, input.providerId),
        eq(serviceProviders.userId, input.senderUserId),
      )).limit(1),
      transaction.select({ id: users.id }).from(users).where(and(eq(users.id, contact.customerId), isNull(users.deletedAt))).limit(1),
      transaction.select({ relationshipMessageEnabled: notificationPreferences.relationshipMessageEnabled }).from(notificationPreferences).where(eq(notificationPreferences.userId, contact.customerId)).limit(1),
      transaction.select({ relationshipMessagesAllowed: crmContactPreferences.relationshipMessagesAllowed, doNotContact: crmContactPreferences.doNotContact }).from(crmContactPreferences).where(and(
        eq(crmContactPreferences.providerId, input.providerId),
        eq(crmContactPreferences.contactId, input.contactId),
      )).limit(1),
    ]);
    const readiness = resolveDraftSendReadiness({
      providerActive: Boolean(provider?.isActive),
      customerAvailable: Boolean(customer),
      relationshipArchived: Boolean(contact.archivedAt || contact.manualStage === "archived"),
      globalRelationshipMessagesEnabled: globalPreference?.relationshipMessageEnabled ?? false,
      relationshipMessagesAllowed: relationshipPreference?.relationshipMessagesAllowed,
      doNotContact: relationshipPreference?.doNotContact,
    });
    if (!readiness.allowed) throw new CrmMessageDraftSendBlockedError(readiness.reason);

    const messageResult = await transaction.insert(messages).values({
      conversationId,
      senderId: input.senderUserId,
      recipientId: contact.customerId,
      messageText: draft.body,
      attachmentUrl: null,
    });
    const messageId = Number(messageResult[0].insertId);
    if (!messageId) throw new Error("Customers message draft send did not create a message");
    const sentAt = new Date();
    await transaction.update(crmMessageDrafts).set({
      state: "sent",
      sentMessageId: messageId,
      approvedByUserId: input.senderUserId,
      approvedAt: sentAt,
      sentAt,
    }).where(and(
      eq(crmMessageDrafts.id, draft.id),
      eq(crmMessageDrafts.providerId, input.providerId),
      eq(crmMessageDrafts.contactId, input.contactId),
      eq(crmMessageDrafts.state, "draft"),
    ));
    return { draftId: draft.id, messageId, conversationId, sentAt, alreadySent: false };
  });
}
