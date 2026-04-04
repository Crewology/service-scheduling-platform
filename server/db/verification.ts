import { eq, and, desc } from "drizzle-orm";
import {
  verificationDocuments,
  serviceProviders,
} from "../../drizzle/schema";
import { getDb } from "./connection";

// ============================================================================
// VERIFICATION DOCUMENT MANAGEMENT
// ============================================================================

export async function uploadVerificationDocument(data: {
  providerId: number;
  documentType: "identity" | "business_license" | "insurance" | "background_check";
  documentUrl: string;
  expirationDate?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select()
    .from(verificationDocuments)
    .where(and(
      eq(verificationDocuments.providerId, data.providerId),
      eq(verificationDocuments.documentType, data.documentType)
    ));
  if (existing.length > 0) {
    await db.update(verificationDocuments)
      .set({
        documentUrl: data.documentUrl,
        verificationStatus: "pending",
        expirationDate: data.expirationDate,
        verifiedBy: null, verifiedAt: null, rejectionReason: null,
      })
      .where(eq(verificationDocuments.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(verificationDocuments).values(data);
  return result[0].insertId;
}

export async function getProviderDocuments(providerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select()
    .from(verificationDocuments)
    .where(eq(verificationDocuments.providerId, providerId))
    .orderBy(verificationDocuments.createdAt);
}

export async function getAllPendingDocuments() {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    document: verificationDocuments,
    providerName: serviceProviders.businessName,
    providerSlug: serviceProviders.profileSlug,
  })
    .from(verificationDocuments)
    .innerJoin(serviceProviders, eq(verificationDocuments.providerId, serviceProviders.id))
    .where(eq(verificationDocuments.verificationStatus, "pending"))
    .orderBy(verificationDocuments.createdAt);
}

export async function getAllDocumentsForAdmin(status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = status ? eq(verificationDocuments.verificationStatus, status as any) : undefined;
  return await db.select({
    document: verificationDocuments,
    providerName: serviceProviders.businessName,
    providerSlug: serviceProviders.profileSlug,
  })
    .from(verificationDocuments)
    .innerJoin(serviceProviders, eq(verificationDocuments.providerId, serviceProviders.id))
    .where(conditions)
    .orderBy(desc(verificationDocuments.createdAt));
}

export async function reviewVerificationDocument(
  documentId: number,
  status: "approved" | "rejected",
  adminUserId: number,
  rejectionReason?: string,
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(verificationDocuments)
    .set({
      verificationStatus: status,
      verifiedBy: adminUserId,
      verifiedAt: new Date(),
      rejectionReason: status === "rejected" ? rejectionReason : null,
    })
    .where(eq(verificationDocuments.id, documentId));
}

export async function deleteVerificationDocument(documentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(verificationDocuments).where(eq(verificationDocuments.id, documentId));
}

export async function getDocumentById(documentId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select()
    .from(verificationDocuments)
    .where(eq(verificationDocuments.id, documentId));
  return rows[0];
}
