import { and, desc, eq, sql } from "drizzle-orm";
import { crmActivityEvents } from "../../../drizzle/schema";
import {
  parseCrmEventMetadata,
  type CrmEntityType,
  type CrmEventType,
} from "../../../shared/crm";
import { requireDb } from "../connection";
import { requireCrmContactScope } from "./scope";

export function buildCrmEventKey(input: {
  providerId: number;
  eventType: CrmEventType;
  entityType: CrmEntityType;
  entityId: number;
  occurrence?: string | number;
}) {
  return [input.providerId, input.eventType, input.entityType, input.entityId, input.occurrence ?? "current"].join(":");
}

export async function appendCrmActivityEvent(input: {
  eventKey: string;
  providerId: number;
  customerId: number;
  contactId: number;
  eventType: CrmEventType;
  entityType: CrmEntityType;
  entityId: number;
  summary: string;
  metadata: unknown;
  occurredAt: Date;
  projectedAt?: Date | null;
}) {
  const contact = await requireCrmContactScope(input.providerId, input.contactId);
  if (contact.customerId !== input.customerId) throw new Error("Customers relationship identity mismatch");
  if (input.eventKey.length > 191) throw new Error("Customers event key is too long");
  if (!input.eventKey.startsWith(`${input.providerId}:`)) throw new Error("Customers event key must be provider scoped");
  if (!input.summary.trim() || input.summary.length > 255) throw new Error("Customers event summary is invalid");
  const metadata = parseCrmEventMetadata(input.eventType, input.entityType, input.metadata);
  const database = await requireDb();
  await database.insert(crmActivityEvents).values({ ...input, metadata }).onDuplicateKeyUpdate({
    set: { eventKey: sql`${crmActivityEvents.eventKey}` },
  });
  const [event] = await database.select().from(crmActivityEvents)
    .where(and(eq(crmActivityEvents.providerId, input.providerId), eq(crmActivityEvents.eventKey, input.eventKey))).limit(1);
  return event;
}

export async function listCrmActivityEvents(providerId: number, contactId: number, limit = 50) {
  await requireCrmContactScope(providerId, contactId);
  const database = await requireDb();
  return database.select().from(crmActivityEvents)
    .where(and(eq(crmActivityEvents.providerId, providerId), eq(crmActivityEvents.contactId, contactId)))
    .orderBy(desc(crmActivityEvents.occurredAt), desc(crmActivityEvents.id))
    .limit(Math.min(Math.max(limit, 1), 100));
}
