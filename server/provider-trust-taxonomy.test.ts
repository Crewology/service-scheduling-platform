import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveEvidenceSignal, resolveProviderTrustProfile, type VerificationEvidenceLike } from "../shared/providerTrust";

const now = new Date("2026-09-02T12:00:00.000Z");

function evidence(overrides: Partial<VerificationEvidenceLike> = {}): VerificationEvidenceLike {
  return {
    id: 1,
    documentType: "identity",
    verificationStatus: "pending",
    documentLabel: "Government ID",
    createdAt: new Date("2026-09-01T12:00:00.000Z"),
    ...overrides,
  };
}

describe("provider trust taxonomy", () => {
  it("does not treat an uploaded or pending document as verified", () => {
    const signal = resolveEvidenceSignal([evidence()], "identity", now);
    expect(signal.state).toBe("pending");
  });

  it("does not convert two unrelated approved documents into blanket provider verification", () => {
    const profile = resolveProviderTrustProfile({
      documents: [
        evidence({ id: 1, documentType: "business_license", verificationStatus: "approved", verifiedAt: now }),
        evidence({ id: 2, documentType: "insurance", verificationStatus: "approved", verifiedAt: now, expirationDate: "2027-09-01" }),
      ],
      completedBookings: 0,
      bookingLinkedReviews: 0,
      averageRating: 0,
      trustLevel: "trusted",
      now,
    });
    expect(profile.identityReviewed).toBe(false);
    expect(profile.compatibilityVerificationStatus).toBe("pending");
    expect(profile.publicEvidence.map(signal => signal.type)).toEqual(["business_license", "insurance"]);
    expect(profile.standing.label).toBe("Established");
    expect(profile.standing.isCredentialVerification).toBe(false);
  });

  it("uses current approved evidence while a newer replacement is pending", () => {
    const signal = resolveEvidenceSignal([
      evidence({ id: 10, verificationStatus: "approved", verifiedAt: "2026-01-01T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z" }),
      evidence({ id: 11, verificationStatus: "pending", createdAt: "2026-09-02T00:00:00.000Z" }),
    ], "identity", now);
    expect(signal.state).toBe("verified");
    expect(signal.documentId).toBe(10);
  });

  it("expires insurance evidence and does not publish it", () => {
    const document = evidence({
      documentType: "insurance",
      verificationStatus: "approved",
      verifiedAt: "2025-01-01T00:00:00.000Z",
      expirationDate: "2026-08-31",
    });
    expect(resolveEvidenceSignal([document], "insurance", now).state).toBe("expired");
    const profile = resolveProviderTrustProfile({
      documents: [document], completedBookings: 0, bookingLinkedReviews: 0, averageRating: 0, now,
    });
    expect(profile.publicEvidence).toHaveLength(0);
  });

  it("keeps date-only evidence current through the stated expiration day", () => {
    const signal = resolveEvidenceSignal([
      evidence({ documentType: "insurance", verificationStatus: "approved", verifiedAt: now, expirationDate: "2026-09-02" }),
    ], "insurance", now);
    expect(signal.state).toBe("verified");
  });

  it("expires background-check evidence one year after review when no earlier expiry is supplied", () => {
    const signal = resolveEvidenceSignal([
      evidence({ documentType: "background_check", verificationStatus: "approved", verifiedAt: "2025-08-31T00:00:00.000Z" }),
    ], "background_check", now);
    expect(signal.state).toBe("expired");
  });

  it("keeps revoked evidence explicit and out of public evidence", () => {
    const profile = resolveProviderTrustProfile({
      documents: [evidence({ verificationStatus: "revoked", revocationReason: "Identity evidence withdrawn" })],
      completedBookings: 2,
      bookingLinkedReviews: 1,
      averageRating: 5,
      now,
    });
    expect(profile.evidence.identity.state).toBe("revoked");
    expect(profile.compatibilityVerificationStatus).toBe("rejected");
    expect(profile.publicEvidence).toHaveLength(0);
  });

  it("does not fall back to a superseded approval after the current evidence is revoked", () => {
    const signal = resolveEvidenceSignal([
      evidence({ id: 1, verificationStatus: "approved", verifiedAt: "2026-01-01", createdAt: "2026-01-01" }),
      evidence({ id: 2, verificationStatus: "revoked", createdAt: "2026-08-01", revocationReason: "Credential withdrawn" }),
    ], "identity", now);
    expect(signal.state).toBe("revoked");
    expect(signal.documentId).toBe(2);
  });

  it("publishes only non-sensitive evidence metadata", () => {
    const profile = resolveProviderTrustProfile({
      documents: [evidence({
        verificationStatus: "approved",
        verifiedAt: now,
        issuer: "State authority",
        credentialIdentifier: "SECRET-123",
      })],
      completedBookings: 3,
      bookingLinkedReviews: 2,
      averageRating: 4.5,
      now,
    });
    const published = profile.publicEvidence[0] as any;
    expect(published.label).toBe("Identity reviewed");
    expect(published.documentId).toBeUndefined();
    expect(published.reason).toBeUndefined();
    expect(published.credentialIdentifier).toBeUndefined();
    expect(profile.activity.reviewsLabel).toContain("completed OlogyCrew bookings");
  });

  it("suppresses all verification, rating, review, and completed-work signals for official demos", () => {
    const profile = resolveProviderTrustProfile({
      documents: [evidence({ verificationStatus: "approved", verifiedAt: now })],
      isOfficial: true,
      completedBookings: 50,
      bookingLinkedReviews: 20,
      averageRating: 5,
      trustLevel: "top_pro",
      now,
    });
    expect(profile.isOfficialDemo).toBe(true);
    expect(profile.publicEvidence).toHaveLength(0);
    expect(profile.identityReviewed).toBe(false);
    expect(profile.activity).toMatchObject({ completedBookings: 0, bookingLinkedReviews: 0, averageRating: 0 });
  });

  it("removes count-based and direct blanket verification paths from production routers", () => {
    const verificationRouter = readFileSync(new URL("./verificationRouter.ts", import.meta.url), "utf8");
    const adminRouter = readFileSync(new URL("./adminRouter.ts", import.meta.url), "utf8");
    const publicApi = readFileSync(new URL("./publicApiRouter.ts", import.meta.url), "utf8");
    expect(verificationRouter).not.toContain("allDocs.length >= 2");
    expect(verificationRouter).not.toContain("updateProviderVerification(doc.providerId, \"verified\")");
    expect(adminRouter).toContain("Blanket provider verification is retired");
    expect(publicApi).toContain("verifiedMeaning");
    expect(publicApi).toContain("evidenceReviewed: trustProfile.publicEvidence");
  });
});
