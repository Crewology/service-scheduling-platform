import { and, desc, eq, isNull } from "drizzle-orm";
import { crmContactNotes } from "../../../drizzle/schema";
import { CRM_MAX_NOTE_LENGTH } from "../../../shared/crm";
import { requireDb } from "../connection";
import { requireCrmContactScope } from "./scope";

function normalizeNote(body: string) {
  const value = body.trim();
  if (!value || value.length > CRM_MAX_NOTE_LENGTH) throw new Error("Customers note is invalid");
  return value;
}

export async function createCrmContactNote(input: {
  providerId: number;
  contactId: number;
  authorUserId: number;
  body: string;
}) {
  const contact = await requireCrmContactScope(input.providerId, input.contactId);
  const database = await requireDb();
  const result = await database.insert(crmContactNotes).values({
    providerId: input.providerId,
    customerId: contact.customerId,
    contactId: input.contactId,
    authorUserId: input.authorUserId,
    body: normalizeNote(input.body),
  });
  return Number(result[0].insertId);
}

export async function listCrmContactNotes(providerId: number, contactId: number) {
  await requireCrmContactScope(providerId, contactId);
  const database = await requireDb();
  return database.select().from(crmContactNotes).where(and(
    eq(crmContactNotes.providerId, providerId),
    eq(crmContactNotes.contactId, contactId),
    isNull(crmContactNotes.deletedAt),
  )).orderBy(desc(crmContactNotes.createdAt), desc(crmContactNotes.id));
}

export async function updateCrmContactNote(input: {
  providerId: number;
  noteId: number;
  authorUserId: number;
  body: string;
}) {
  const database = await requireDb();
  return database.update(crmContactNotes).set({ body: normalizeNote(input.body) }).where(and(
    eq(crmContactNotes.id, input.noteId),
    eq(crmContactNotes.providerId, input.providerId),
    eq(crmContactNotes.authorUserId, input.authorUserId),
    isNull(crmContactNotes.deletedAt),
  ));
}

export async function softDeleteCrmContactNote(providerId: number, noteId: number, authorUserId: number) {
  const database = await requireDb();
  return database.update(crmContactNotes).set({ deletedAt: new Date() }).where(and(
    eq(crmContactNotes.id, noteId),
    eq(crmContactNotes.providerId, providerId),
    eq(crmContactNotes.authorUserId, authorUserId),
    isNull(crmContactNotes.deletedAt),
  ));
}
