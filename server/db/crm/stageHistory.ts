import { desc, eq, and } from "drizzle-orm";
import { crmContacts, crmContactStageHistory } from "../../../drizzle/schema";
import type { CrmContactStage } from "../../../shared/crm";
import { requireDb } from "../connection";
import { requireCrmContactScope } from "./scope";

export async function appendCrmStageHistory(input: {
  providerId: number;
  contactId: number;
  previousStage?: CrmContactStage | null;
  nextStage: CrmContactStage;
  source: "system" | "provider" | "repair";
  reason: string;
  actorUserId?: number | null;
}) {
  const contact = await requireCrmContactScope(input.providerId, input.contactId);
  const reason = input.reason.trim();
  if (!reason || reason.length > 255) throw new Error("Customers stage reason is invalid");
  const database = await requireDb();
  const result = await database.insert(crmContactStageHistory).values({
    providerId: input.providerId,
    customerId: contact.customerId,
    contactId: input.contactId,
    previousStage: input.previousStage ?? null,
    nextStage: input.nextStage,
    source: input.source,
    reason,
    actorUserId: input.actorUserId ?? null,
  });
  return Number(result[0].insertId);
}

export async function listCrmStageHistory(providerId: number, contactId: number) {
  await requireCrmContactScope(providerId, contactId);
  const database = await requireDb();
  return database.select().from(crmContactStageHistory).where(and(
    eq(crmContactStageHistory.providerId, providerId),
    eq(crmContactStageHistory.contactId, contactId),
  )).orderBy(desc(crmContactStageHistory.createdAt), desc(crmContactStageHistory.id));
}

export async function transitionCrmManualStage(input: {
  providerId: number;
  contactId: number;
  stage: CrmContactStage | null;
  actorUserId: number;
  reason: string;
}) {
  const contact = await requireCrmContactScope(input.providerId, input.contactId);
  const reason = input.reason.trim();
  if (!reason || reason.length > 255) throw new Error("Customers stage reason is invalid");

  const previousStage = contact.manualStage ?? contact.derivedStage;
  const nextStage = input.stage ?? contact.derivedStage;
  if (contact.manualStage === input.stage) {
    return {
      contact,
      previousStage,
      nextStage,
      historyId: null,
      stateChanged: false,
      changedAt: contact.updatedAt,
    };
  }

  const database = await requireDb();
  const changedAt = new Date();
  const archived = input.stage === "archived";
  return database.transaction(async transaction => {
    await transaction.update(crmContacts).set({
      manualStage: input.stage,
      archivedAt: archived ? changedAt : null,
      archivedByUserId: archived ? input.actorUserId : null,
    }).where(and(
      eq(crmContacts.id, input.contactId),
      eq(crmContacts.providerId, input.providerId),
    ));

    const historyResult = await transaction.insert(crmContactStageHistory).values({
      providerId: input.providerId,
      customerId: contact.customerId,
      contactId: input.contactId,
      previousStage,
      nextStage,
      source: "provider",
      reason,
      actorUserId: input.actorUserId,
    });

    return {
      contact: {
        ...contact,
        manualStage: input.stage,
        archivedAt: archived ? changedAt : null,
        archivedByUserId: archived ? input.actorUserId : null,
      },
      previousStage,
      nextStage,
      historyId: Number(historyResult[0].insertId),
      stateChanged: true,
      changedAt,
    };
  });
}
