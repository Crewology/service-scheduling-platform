import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getProviderByUserId: vi.fn(),
  getProviderById: vi.fn(),
  uploadVerificationDocument: vi.fn(),
  getProviderDocuments: vi.fn(),
  getProviderTrustProfile: vi.fn(),
  getDocumentById: vi.fn(),
  deleteVerificationDocument: vi.fn(),
  getAllDocumentsForAdmin: vi.fn(),
  getAllPendingDocuments: vi.fn(),
  reviewVerificationDocument: vi.fn(),
  revokeVerificationDocument: vi.fn(),
  syncProviderIdentityCompatibilityStatus: vi.fn(),
  storagePut: vi.fn(),
  storageGet: vi.fn(),
  createAuditEntry: vi.fn(),
  createNotification: vi.fn(),
}));

vi.mock("./db", () => ({
  getProviderByUserId: mocks.getProviderByUserId,
  getProviderById: mocks.getProviderById,
  uploadVerificationDocument: mocks.uploadVerificationDocument,
  getProviderDocuments: mocks.getProviderDocuments,
  getProviderTrustProfile: mocks.getProviderTrustProfile,
  getDocumentById: mocks.getDocumentById,
  deleteVerificationDocument: mocks.deleteVerificationDocument,
  getAllDocumentsForAdmin: mocks.getAllDocumentsForAdmin,
  getAllPendingDocuments: mocks.getAllPendingDocuments,
  reviewVerificationDocument: mocks.reviewVerificationDocument,
  revokeVerificationDocument: mocks.revokeVerificationDocument,
  syncProviderIdentityCompatibilityStatus: mocks.syncProviderIdentityCompatibilityStatus,
}));

vi.mock("./storage", () => ({ storagePut: mocks.storagePut, storageGet: mocks.storageGet }));
vi.mock("./db/auditLog", () => ({ createAuditEntry: mocks.createAuditEntry }));
vi.mock("./db/notifications", () => ({ createNotification: mocks.createNotification }));

import { verificationRouter } from "./verificationRouter";

const providerUser = { id: 10, role: "provider", emailVerified: true };
const adminUser = { id: 1, role: "admin", emailVerified: true };
const otherUser = { id: 99, role: "customer", emailVerified: true };

function caller(user: any) {
  return verificationRouter.createCaller({ user } as any);
}

function document(overrides: Record<string, any> = {}) {
  return {
    id: 77,
    providerId: 22,
    documentType: "identity",
    documentUrl: "https://private-storage.example/evidence",
    documentKey: "verification-docs/22/identity.pdf",
    documentLabel: "Government ID",
    verificationStatus: "pending",
    verifiedBy: null,
    verifiedAt: null,
    rejectionReason: null,
    expirationDate: null,
    revokedBy: null,
    revokedAt: null,
    revocationReason: null,
    createdAt: new Date("2026-09-02T12:00:00.000Z"),
    updatedAt: new Date("2026-09-02T12:00:00.000Z"),
    ...overrides,
  };
}

describe("verification evidence workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProviderByUserId.mockResolvedValue({ id: 22, userId: 10 });
    mocks.getProviderById.mockResolvedValue({ id: 22, userId: 10 });
    mocks.createNotification.mockResolvedValue(undefined);
    mocks.uploadVerificationDocument.mockResolvedValue(77);
    mocks.storagePut.mockResolvedValue({ key: "verification-docs/22/identity.pdf", url: "https://private-storage.example/evidence" });
    mocks.storageGet.mockResolvedValue({ key: "verification-docs/22/identity.pdf", url: "https://signed.example/evidence" });
    mocks.getProviderDocuments.mockResolvedValue([]);
  });

  it("requires a provider and current insurance expiry before uploading", async () => {
    mocks.getProviderByUserId.mockResolvedValueOnce(null);
    await expect(caller(otherUser).upload({
      documentType: "identity", documentLabel: "Government ID", documentData: "YWJj", contentType: "application/pdf",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });

    mocks.getProviderByUserId.mockResolvedValueOnce({ id: 22, userId: 10 });
    await expect(caller(providerUser).upload({
      documentType: "insurance", documentLabel: "Liability policy", documentData: "YWJj", contentType: "application/pdf",
    })).rejects.toThrow("requires an expiration date");
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });

  it("creates an immutable pending evidence record with metadata and an audit entry", async () => {
    const result = await caller(providerUser).upload({
      documentType: "professional_license",
      documentLabel: "Georgia Professional License",
      issuer: "State authority",
      credentialIdentifier: "LIC-123",
      jurisdiction: "Georgia",
      issuedDate: "2026-01-01",
      expirationDate: "2027-01-01",
      documentData: "YWJj",
      contentType: "application/pdf",
    });
    expect(result).toMatchObject({ id: 77, documentType: "professional_license", state: "pending" });
    expect(mocks.uploadVerificationDocument).toHaveBeenCalledWith(expect.objectContaining({
      providerId: 22,
      documentType: "professional_license",
      documentLabel: "Georgia Professional License",
      credentialIdentifier: "LIC-123",
      documentKey: "verification-docs/22/identity.pdf",
      documentUrl: "s3://verification-docs/22/identity.pdf",
    }));
    expect(mocks.syncProviderIdentityCompatibilityStatus).toHaveBeenCalledWith(22);
    expect(mocks.createAuditEntry).toHaveBeenCalledWith(expect.objectContaining({ action: "verification_document_submitted", targetId: 77 }));
  });

  it("never returns storage locations from document lists and uses a protected view URL", async () => {
    mocks.getProviderDocuments.mockResolvedValue([document()]);
    const listed = await caller(providerUser).myDocuments();
    expect(listed[0]).not.toHaveProperty("documentUrl");
    expect(listed[0]).not.toHaveProperty("documentKey");

    mocks.getDocumentById.mockResolvedValue(document());
    const viewed = await caller(providerUser).viewDocument({ documentId: 77 });
    expect(viewed.url).toBe("https://signed.example/evidence");

    mocks.getProviderByUserId.mockResolvedValueOnce(null);
    await expect(caller(otherUser).viewDocument({ documentId: 77 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("retains approved and revoked evidence instead of allowing provider deletion", async () => {
    mocks.getDocumentById.mockResolvedValue(document({ verificationStatus: "approved" }));
    await expect(caller(providerUser).deleteDocument({ documentId: 77 })).rejects.toThrow("retained for audit history");
    expect(mocks.deleteVerificationDocument).not.toHaveBeenCalled();
  });

  it("requires rejection reasons and audits evidence-specific approval", async () => {
    await expect(caller(adminUser).review({ documentId: 77, status: "rejected" })).rejects.toBeTruthy();
    mocks.getDocumentById.mockResolvedValue(document());
    const result = await caller(adminUser).review({ documentId: 77, status: "approved" });
    expect(result.state).toBe("verified");
    expect(mocks.reviewVerificationDocument).toHaveBeenCalledWith(77, "approved", 1, undefined);
    expect(mocks.syncProviderIdentityCompatibilityStatus).toHaveBeenCalledWith(22);
    expect(mocks.createAuditEntry).toHaveBeenCalledWith(expect.objectContaining({ action: "verification_document_approved" }));
    expect(mocks.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: 10,
      notificationType: "verification",
      title: "Evidence approved",
    }));
  });

  it("revokes only approved evidence with a reason and preserves the audit trail", async () => {
    mocks.getDocumentById.mockResolvedValueOnce(document({ verificationStatus: "pending" }));
    await expect(caller(adminUser).revoke({ documentId: 77, reason: "Evidence withdrawn" })).rejects.toThrow("Only approved evidence");

    mocks.getDocumentById.mockResolvedValueOnce(document({ verificationStatus: "approved" }));
    const result = await caller(adminUser).revoke({ documentId: 77, reason: "Evidence withdrawn" });
    expect(result.state).toBe("revoked");
    expect(mocks.revokeVerificationDocument).toHaveBeenCalledWith(77, 1, "Evidence withdrawn");
    expect(mocks.createAuditEntry).toHaveBeenCalledWith(expect.objectContaining({
      action: "verification_document_revoked",
      details: expect.objectContaining({ previousState: "approved", newState: "revoked" }),
    }));
  });
});
