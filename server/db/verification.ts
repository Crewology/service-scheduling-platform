import { and, desc, eq, sql } from "drizzle-orm";
import {
  verificationDocuments,
  serviceProviders,
  bookings,
  reviews,
} from "../../drizzle/schema";
import { getDb } from "./connection";
import { resolveEvidenceSignal, resolveProviderTrustProfile, type ProviderEvidenceType } from "../../shared/providerTrust";

export async function uploadVerificationDocument(data: {
  providerId: number;
  documentType: ProviderEvidenceType;
  documentUrl: string;
  documentKey?: string;
  documentLabel?: string;
  issuer?: string;
  credentialIdentifier?: string;
  jurisdiction?: string;
  issuedDate?: string;
  expirationDate?: string;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const result = await database.insert(verificationDocuments).values(data);
  return result[0].insertId;
}

export async function getProviderDocuments(providerId: number) {
  const database = await getDb();
  if (!database) return [];
  return database.select()
    .from(verificationDocuments)
    .where(eq(verificationDocuments.providerId, providerId))
    .orderBy(desc(verificationDocuments.createdAt), desc(verificationDocuments.id));
}

export async function getAllPendingDocuments() {
  const database = await getDb();
  if (!database) return [];
  return database.select({
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
  const database = await getDb();
  if (!database) return [];
  const conditions = status ? eq(verificationDocuments.verificationStatus, status as any) : undefined;
  return database.select({
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
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  await database.update(verificationDocuments)
    .set({
      verificationStatus: status,
      verifiedBy: adminUserId,
      verifiedAt: new Date(),
      rejectionReason: status === "rejected" ? rejectionReason : null,
      revokedBy: null,
      revokedAt: null,
      revocationReason: null,
    })
    .where(eq(verificationDocuments.id, documentId));
}

export async function revokeVerificationDocument(documentId: number, adminUserId: number, reason: string) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  await database.update(verificationDocuments)
    .set({
      verificationStatus: "revoked",
      revokedBy: adminUserId,
      revokedAt: new Date(),
      revocationReason: reason,
    })
    .where(eq(verificationDocuments.id, documentId));
}

export async function deleteVerificationDocument(documentId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  await database.delete(verificationDocuments).where(eq(verificationDocuments.id, documentId));
}

export async function getDocumentById(documentId: number) {
  const database = await getDb();
  if (!database) return undefined;
  const rows = await database.select()
    .from(verificationDocuments)
    .where(eq(verificationDocuments.id, documentId));
  return rows[0];
}

export async function syncProviderIdentityCompatibilityStatus(providerId: number) {
  const database = await getDb();
  if (!database) return;
  const documents = await getProviderDocuments(providerId);
  const identity = resolveEvidenceSignal(documents as any, "identity");
  const verificationStatus = identity.state === "verified"
    ? "verified" as const
    : identity.state === "rejected" || identity.state === "revoked"
    ? "rejected" as const
    : "pending" as const;
  await database.update(serviceProviders)
    .set({ verificationStatus })
    .where(eq(serviceProviders.id, providerId));
}

export async function getProviderTrustProfile(providerId: number) {
  const database = await getDb();
  if (!database) return null;
  const [provider] = await database.select({
    isOfficial: serviceProviders.isOfficial,
    trustLevel: serviceProviders.trustLevel,
  }).from(serviceProviders).where(eq(serviceProviders.id, providerId)).limit(1);
  if (!provider) return null;

  const documents = await getProviderDocuments(providerId);
  const [completed] = await database.select({ count: sql<number>`COUNT(*)` })
    .from(bookings)
    .where(and(eq(bookings.providerId, providerId), eq(bookings.status, "completed")));
  const [reviewStats] = await database.select({
    count: sql<number>`COUNT(*)`,
    average: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
  }).from(reviews)
    .innerJoin(bookings, eq(reviews.bookingId, bookings.id))
    .where(and(
      eq(reviews.providerId, providerId),
      eq(reviews.isVerifiedBooking, true),
      eq(bookings.status, "completed"),
    ));

  return resolveProviderTrustProfile({
    documents: documents as any,
    isOfficial: provider.isOfficial,
    trustLevel: provider.trustLevel,
    completedBookings: Number(completed?.count || 0),
    bookingLinkedReviews: Number(reviewStats?.count || 0),
    averageRating: Number(reviewStats?.average || 0),
  });
}
