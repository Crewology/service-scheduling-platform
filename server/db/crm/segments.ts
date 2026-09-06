import { and, desc, eq } from "drizzle-orm";
import { crmSavedSegments } from "../../../drizzle/schema";
import {
  CRM_MAX_SEGMENT_NAME_LENGTH,
  crmSegmentFiltersSchema,
  type CrmSegmentFilters,
} from "../../../shared/crm";
import { requireDb } from "../connection";

function normalizeSegmentName(name: string) {
  const value = name.trim();
  if (!value || value.length > CRM_MAX_SEGMENT_NAME_LENGTH) throw new Error("Customers segment name is invalid");
  return value;
}

export async function createCrmSavedSegment(input: {
  providerId: number;
  name: string;
  filters: CrmSegmentFilters;
  createdByUserId: number;
}) {
  const database = await requireDb();
  const result = await database.insert(crmSavedSegments).values({
    providerId: input.providerId,
    name: normalizeSegmentName(input.name),
    filters: crmSegmentFiltersSchema.parse(input.filters),
    createdByUserId: input.createdByUserId,
  });
  return Number(result[0].insertId);
}

export async function listCrmSavedSegments(providerId: number) {
  const database = await requireDb();
  return database.select().from(crmSavedSegments)
    .where(eq(crmSavedSegments.providerId, providerId))
    .orderBy(desc(crmSavedSegments.updatedAt), desc(crmSavedSegments.id));
}

export async function updateCrmSavedSegment(input: {
  providerId: number;
  segmentId: number;
  name: string;
  filters: CrmSegmentFilters;
}) {
  const database = await requireDb();
  return database.update(crmSavedSegments).set({
    name: normalizeSegmentName(input.name),
    filters: crmSegmentFiltersSchema.parse(input.filters),
  }).where(and(eq(crmSavedSegments.id, input.segmentId), eq(crmSavedSegments.providerId, input.providerId)));
}

export async function deleteCrmSavedSegment(providerId: number, segmentId: number) {
  const database = await requireDb();
  return database.delete(crmSavedSegments).where(and(
    eq(crmSavedSegments.id, segmentId),
    eq(crmSavedSegments.providerId, providerId),
  ));
}
