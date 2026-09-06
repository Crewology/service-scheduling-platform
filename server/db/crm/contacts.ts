import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { crmContacts } from "../../../drizzle/schema";
import type { CrmContactStage } from "../../../shared/crm";
import { requireDb } from "../connection";
import { requireCrmContactScope } from "./scope";

type DerivedStage = Exclude<CrmContactStage, "archived">;

export type UpsertCrmContactInput = {
  providerId: number;
  customerId: number;
  derivedStage: DerivedStage;
  firstInteractionAt: Date;
  lastInteractionAt: Date;
  lastInboundAt?: Date | null;
  lastOutboundAt?: Date | null;
  nextBookingAt?: Date | null;
  completedBookingCount?: number;
  cancelledBookingCount?: number;
  noShowCount?: number;
  capturedValueCents?: number;
  openTaskCount?: number;
  lastProjectedAt?: Date | null;
};

export async function upsertCrmContact(input: UpsertCrmContactInput) {
  const database = await requireDb();
  await database.insert(crmContacts).values({
    ...input,
    completedBookingCount: input.completedBookingCount ?? 0,
    cancelledBookingCount: input.cancelledBookingCount ?? 0,
    noShowCount: input.noShowCount ?? 0,
    capturedValueCents: input.capturedValueCents ?? 0,
    openTaskCount: input.openTaskCount ?? 0,
  }).onDuplicateKeyUpdate({
    set: {
      derivedStage: input.derivedStage,
      lastInteractionAt: input.lastInteractionAt,
      lastInboundAt: input.lastInboundAt ?? null,
      lastOutboundAt: input.lastOutboundAt ?? null,
      nextBookingAt: input.nextBookingAt ?? null,
      completedBookingCount: input.completedBookingCount ?? 0,
      cancelledBookingCount: input.cancelledBookingCount ?? 0,
      noShowCount: input.noShowCount ?? 0,
      capturedValueCents: input.capturedValueCents ?? 0,
      openTaskCount: input.openTaskCount ?? 0,
      lastProjectedAt: input.lastProjectedAt ?? null,
    },
  });
  const [contact] = await database.select().from(crmContacts).where(and(
    eq(crmContacts.providerId, input.providerId),
    eq(crmContacts.customerId, input.customerId),
  )).limit(1);
  return contact;
}

export async function getCrmContactById(providerId: number, contactId: number) {
  return requireCrmContactScope(providerId, contactId);
}

export async function getCrmContactByCustomer(providerId: number, customerId: number) {
  const database = await requireDb();
  const [contact] = await database.select().from(crmContacts).where(and(
    eq(crmContacts.providerId, providerId),
    eq(crmContacts.customerId, customerId),
  )).limit(1);
  return contact ?? null;
}

export async function listCrmContacts(input: {
  providerId: number;
  stages?: CrmContactStage[];
  limit?: number;
  offset?: number;
}) {
  const database = await requireDb();
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const stageFilters = input.stages ?? [];
  const effectiveStage = sql<CrmContactStage>`COALESCE(${crmContacts.manualStage}, ${crmContacts.derivedStage})`;
  const condition = stageFilters.length > 0
    ? and(eq(crmContacts.providerId, input.providerId), inArray(effectiveStage, stageFilters))
    : eq(crmContacts.providerId, input.providerId);
  return database.select().from(crmContacts)
    .where(condition)
    .orderBy(desc(crmContacts.lastInteractionAt), desc(crmContacts.id))
    .limit(limit)
    .offset(Math.max(input.offset ?? 0, 0));
}

export async function setCrmManualStage(input: {
  providerId: number;
  contactId: number;
  stage: CrmContactStage | null;
  actorUserId: number;
}) {
  const contact = await requireCrmContactScope(input.providerId, input.contactId);
  const archived = input.stage === "archived";
  const database = await requireDb();
  await database.update(crmContacts).set({
    manualStage: input.stage,
    archivedAt: archived ? new Date() : null,
    archivedByUserId: archived ? input.actorUserId : null,
  }).where(and(eq(crmContacts.id, input.contactId), eq(crmContacts.providerId, input.providerId)));
  return { ...contact, manualStage: input.stage, archivedAt: archived ? new Date() : null };
}
