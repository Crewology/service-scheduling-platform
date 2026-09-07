import { and, asc, desc, eq, inArray, isNull, like, lt, or, sql } from "drizzle-orm";
import { crmActivityEvents, crmContacts, users } from "../../../drizzle/schema";
import { CRM_CONTACT_STAGES, type CrmContactStage } from "../../../shared/crm";
import { requireDb } from "../connection";
import { requireCrmContactScope } from "./scope";

const effectiveStage = sql<CrmContactStage>`COALESCE(${crmContacts.manualStage}, ${crmContacts.derivedStage})`;

function eventSourceHref(event: { entityType: string; entityId: number; metadata: unknown }) {
  const metadata = (event.metadata && typeof event.metadata === "object")
    ? event.metadata as Record<string, unknown>
    : {};
  if (event.entityType === "booking") return `/booking/${event.entityId}/detail`;
  if (event.entityType === "quote") return "/provider/quotes";
  if (event.entityType === "invoice") return "/provider/invoices";
  if (event.entityType === "payment") return "/provider/dashboard?tab=finances";
  if (event.entityType === "review") return "/provider/reviews";
  if (event.entityType === "message") {
    const bookingId = typeof metadata.bookingId === "number" ? metadata.bookingId : null;
    return bookingId ? `/messages/${bookingId}` : "/messages";
  }
  return null;
}

export async function getCrmWorkspaceSummary(providerId: number) {
  const database = await requireDb();
  const [row] = await database.select({
    total: sql<number>`count(*)`,
    leads: sql<number>`sum(case when ${effectiveStage} in ('lead', 'quoted') then 1 else 0 end)`,
    customers: sql<number>`sum(case when ${effectiveStage} in ('booked', 'customer', 'repeat_customer', 'dormant') then 1 else 0 end)`,
    repeatCustomers: sql<number>`sum(case when ${effectiveStage} = 'repeat_customer' then 1 else 0 end)`,
    needsResponse: sql<number>`sum(case when ${crmContacts.lastInboundAt} is not null and (${crmContacts.lastOutboundAt} is null or ${crmContacts.lastInboundAt} > ${crmContacts.lastOutboundAt}) then 1 else 0 end)`,
    followUps: sql<number>`sum(case when ${crmContacts.openTaskCount} > 0 then 1 else 0 end)`,
  }).from(crmContacts).where(eq(crmContacts.providerId, providerId));
  return {
    total: Number(row?.total || 0),
    leads: Number(row?.leads || 0),
    customers: Number(row?.customers || 0),
    repeatCustomers: Number(row?.repeatCustomers || 0),
    needsResponse: Number(row?.needsResponse || 0),
    followUps: Number(row?.followUps || 0),
  };
}

export async function listCrmContactReadModels(input: {
  providerId: number;
  stages?: CrmContactStage[];
  search?: string;
  limit?: number;
  offset?: number;
  needsResponseOnly?: boolean;
  openTasksOnly?: boolean;
  sort?: "attention" | "recent" | "value" | "name";
}) {
  const database = await requireDb();
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 50);
  const offset = Math.max(input.offset ?? 0, 0);
  const search = input.search?.trim();
  const conditions = [eq(crmContacts.providerId, input.providerId), isNull(users.deletedAt)];
  if (input.stages?.length) conditions.push(inArray(effectiveStage, input.stages));
  if (search) {
    const pattern = `%${search.slice(0, 100)}%`;
    conditions.push(or(like(users.name, pattern), like(users.email, pattern))!);
  }
  if (input.needsResponseOnly) {
    conditions.push(sql`${crmContacts.lastInboundAt} is not null and (${crmContacts.lastOutboundAt} is null or ${crmContacts.lastInboundAt} > ${crmContacts.lastOutboundAt})`);
  }
  if (input.openTasksOnly) conditions.push(sql`${crmContacts.openTaskCount} > 0`);
  const where = and(...conditions);
  const order = input.sort === "value"
    ? [desc(crmContacts.capturedValueCents), desc(crmContacts.lastInteractionAt)]
    : input.sort === "name"
      ? [asc(users.name), desc(crmContacts.id)]
      : input.sort === "recent"
        ? [desc(crmContacts.lastInteractionAt), desc(crmContacts.id)]
        : [desc(sql`${crmContacts.lastInboundAt} is not null and (${crmContacts.lastOutboundAt} is null or ${crmContacts.lastInboundAt} > ${crmContacts.lastOutboundAt})`), desc(crmContacts.openTaskCount), desc(crmContacts.lastInteractionAt), desc(crmContacts.id)];

  const baseSelection = {
    id: crmContacts.id,
    customerId: crmContacts.customerId,
    derivedStage: crmContacts.derivedStage,
    manualStage: crmContacts.manualStage,
    effectiveStage,
    firstInteractionAt: crmContacts.firstInteractionAt,
    lastInteractionAt: crmContacts.lastInteractionAt,
    lastInboundAt: crmContacts.lastInboundAt,
    lastOutboundAt: crmContacts.lastOutboundAt,
    nextBookingAt: crmContacts.nextBookingAt,
    completedBookingCount: crmContacts.completedBookingCount,
    cancelledBookingCount: crmContacts.cancelledBookingCount,
    noShowCount: crmContacts.noShowCount,
    capturedValueCents: crmContacts.capturedValueCents,
    openTaskCount: crmContacts.openTaskCount,
    customerName: users.name,
    customerEmail: users.email,
    customerPhotoUrl: users.profilePhotoUrl,
  };
  const [items, countRows] = await Promise.all([
    database.select(baseSelection).from(crmContacts)
      .innerJoin(users, eq(users.id, crmContacts.customerId))
      .where(where).orderBy(...order).limit(limit).offset(offset),
    database.select({ count: sql<number>`count(*)` }).from(crmContacts)
      .innerJoin(users, eq(users.id, crmContacts.customerId)).where(where),
  ]);
  const contactIds = items.map((item) => item.id);
  const latestEvents = contactIds.length
    ? await database.select().from(crmActivityEvents).where(and(
      eq(crmActivityEvents.providerId, input.providerId),
      inArray(crmActivityEvents.contactId, contactIds),
    )).orderBy(desc(crmActivityEvents.occurredAt), desc(crmActivityEvents.id))
    : [];
  const latestByContact = new Map<number, typeof latestEvents[number]>();
  for (const event of latestEvents) if (!latestByContact.has(event.contactId)) latestByContact.set(event.contactId, event);
  return {
    items: items.map((item) => {
      const latestEvent = latestByContact.get(item.id);
      return {
        ...item,
        needsResponse: Boolean(item.lastInboundAt && (!item.lastOutboundAt || item.lastInboundAt > item.lastOutboundAt)),
        latestEvent: latestEvent ? {
          id: latestEvent.id,
          eventType: latestEvent.eventType,
          summary: latestEvent.summary,
          occurredAt: latestEvent.occurredAt,
          sourceHref: eventSourceHref(latestEvent),
        } : null,
      };
    }),
    total: Number(countRows[0]?.count || 0),
    limit,
    offset,
    hasMore: offset + items.length < Number(countRows[0]?.count || 0),
  };
}

export async function listCrmProviderActivity(input: {
  providerId: number;
  eventTypes?: string[];
  limit?: number;
  beforeId?: number;
}) {
  const database = await requireDb();
  const limit = Math.min(Math.max(input.limit ?? 30, 1), 50);
  const allowedEventTypes = input.eventTypes?.filter((value) => value.length > 0).slice(0, 20) ?? [];
  const conditions = [eq(crmActivityEvents.providerId, input.providerId), isNull(users.deletedAt)];
  if (input.beforeId) conditions.push(lt(crmActivityEvents.id, input.beforeId));
  if (allowedEventTypes.length) conditions.push(inArray(crmActivityEvents.eventType, allowedEventTypes as typeof crmActivityEvents.eventType.enumValues));
  const rows = await database.select({
    id: crmActivityEvents.id,
    contactId: crmActivityEvents.contactId,
    customerId: crmActivityEvents.customerId,
    customerName: users.name,
    customerPhotoUrl: users.profilePhotoUrl,
    eventType: crmActivityEvents.eventType,
    entityType: crmActivityEvents.entityType,
    entityId: crmActivityEvents.entityId,
    summary: crmActivityEvents.summary,
    metadata: crmActivityEvents.metadata,
    occurredAt: crmActivityEvents.occurredAt,
  }).from(crmActivityEvents)
    .innerJoin(users, eq(users.id, crmActivityEvents.customerId))
    .where(and(...conditions)).orderBy(desc(crmActivityEvents.occurredAt), desc(crmActivityEvents.id)).limit(limit + 1);
  const hasMore = rows.length > limit;
  return {
    items: rows.slice(0, limit).map((event) => ({ ...event, sourceHref: eventSourceHref(event) })),
    hasMore,
    nextCursor: hasMore ? rows[limit - 1]?.id ?? null : null,
  };
}

export async function getCrmContactReadModel(input: {
  providerId: number;
  contactId: number;
  eventLimit?: number;
  beforeEventId?: number;
}) {
  await requireCrmContactScope(input.providerId, input.contactId);
  const database = await requireDb();
  const [contact] = await database.select({
    id: crmContacts.id,
    customerId: crmContacts.customerId,
    derivedStage: crmContacts.derivedStage,
    manualStage: crmContacts.manualStage,
    effectiveStage,
    firstInteractionAt: crmContacts.firstInteractionAt,
    lastInteractionAt: crmContacts.lastInteractionAt,
    lastInboundAt: crmContacts.lastInboundAt,
    lastOutboundAt: crmContacts.lastOutboundAt,
    nextBookingAt: crmContacts.nextBookingAt,
    completedBookingCount: crmContacts.completedBookingCount,
    cancelledBookingCount: crmContacts.cancelledBookingCount,
    noShowCount: crmContacts.noShowCount,
    capturedValueCents: crmContacts.capturedValueCents,
    openTaskCount: crmContacts.openTaskCount,
    customerName: users.name,
    customerEmail: users.email,
    customerPhotoUrl: users.profilePhotoUrl,
  }).from(crmContacts).innerJoin(users, eq(users.id, crmContacts.customerId)).where(and(
    eq(crmContacts.id, input.contactId),
    eq(crmContacts.providerId, input.providerId),
    isNull(users.deletedAt),
  )).limit(1);
  if (!contact) return null;
  const eventLimit = Math.min(Math.max(input.eventLimit ?? 30, 1), 50);
  const eventConditions = [
    eq(crmActivityEvents.providerId, input.providerId),
    eq(crmActivityEvents.contactId, input.contactId),
  ];
  if (input.beforeEventId) eventConditions.push(lt(crmActivityEvents.id, input.beforeEventId));
  const rows = await database.select().from(crmActivityEvents)
    .where(and(...eventConditions)).orderBy(desc(crmActivityEvents.occurredAt), desc(crmActivityEvents.id)).limit(eventLimit + 1);
  const hasMore = rows.length > eventLimit;
  return {
    contact: {
      ...contact,
      needsResponse: Boolean(contact.lastInboundAt && (!contact.lastOutboundAt || contact.lastInboundAt > contact.lastOutboundAt)),
    },
    events: rows.slice(0, eventLimit).map((event) => ({ ...event, sourceHref: eventSourceHref(event) })),
    hasMore,
    nextCursor: hasMore ? rows[eventLimit - 1]?.id ?? null : null,
  };
}

export { CRM_CONTACT_STAGES };
