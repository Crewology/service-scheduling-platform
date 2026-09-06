import { and, eq } from "drizzle-orm";
import { crmContactPreferences } from "../../../drizzle/schema";
import { requireDb } from "../connection";
import { requireCrmContactScope } from "./scope";

export async function getCrmContactPreference(providerId: number, contactId: number) {
  await requireCrmContactScope(providerId, contactId);
  const database = await requireDb();
  const [preference] = await database.select().from(crmContactPreferences).where(and(
    eq(crmContactPreferences.providerId, providerId),
    eq(crmContactPreferences.contactId, contactId),
  )).limit(1);
  return preference ?? null;
}

export async function upsertCrmContactPreference(input: {
  providerId: number;
  contactId: number;
  relationshipMessagesAllowed?: boolean | null;
  doNotContact: boolean;
  reason?: string | null;
  source: "customer" | "provider" | "system";
  updatedByUserId?: number | null;
}) {
  const contact = await requireCrmContactScope(input.providerId, input.contactId);
  const database = await requireDb();
  await database.insert(crmContactPreferences).values({
    providerId: input.providerId,
    customerId: contact.customerId,
    contactId: input.contactId,
    relationshipMessagesAllowed: input.relationshipMessagesAllowed ?? null,
    doNotContact: input.doNotContact,
    reason: input.reason?.trim().slice(0, 255) || null,
    source: input.source,
    updatedByUserId: input.updatedByUserId ?? null,
  }).onDuplicateKeyUpdate({ set: {
    relationshipMessagesAllowed: input.relationshipMessagesAllowed ?? null,
    doNotContact: input.doNotContact,
    reason: input.reason?.trim().slice(0, 255) || null,
    source: input.source,
    updatedByUserId: input.updatedByUserId ?? null,
  }});
}
