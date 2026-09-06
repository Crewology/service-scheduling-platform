import { desc, eq, and } from "drizzle-orm";
import { crmContactStageHistory } from "../../../drizzle/schema";
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
