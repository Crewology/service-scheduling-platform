export const PROVIDER_EVIDENCE_TYPES = [
  "identity",
  "business_license",
  "professional_license",
  "insurance",
  "background_check",
] as const;

export type ProviderEvidenceType = typeof PROVIDER_EVIDENCE_TYPES[number];
export type EvidenceSignalState = "not_submitted" | "pending" | "verified" | "rejected" | "expired" | "revoked";

export interface VerificationEvidenceLike {
  id: number;
  documentType: ProviderEvidenceType;
  verificationStatus: "pending" | "approved" | "rejected" | "revoked";
  documentLabel?: string | null;
  issuer?: string | null;
  jurisdiction?: string | null;
  issuedDate?: string | null;
  expirationDate?: string | null;
  verifiedAt?: Date | string | null;
  createdAt: Date | string;
  rejectionReason?: string | null;
  revokedAt?: Date | string | null;
  revocationReason?: string | null;
}

export interface EvidenceSignal {
  type: ProviderEvidenceType;
  label: string;
  state: EvidenceSignalState;
  documentId: number | null;
  reviewedAt: Date | null;
  expiresAt: Date | null;
  issuer: string | null;
  jurisdiction: string | null;
  reason: string | null;
  publicExplanation: string;
}

const EVIDENCE_LABELS: Record<ProviderEvidenceType, string> = {
  identity: "Identity reviewed",
  business_license: "Business registration reviewed",
  professional_license: "Professional license reviewed",
  insurance: "Insurance reviewed",
  background_check: "Background check reviewed",
};

const EVIDENCE_EXPLANATIONS: Record<ProviderEvidenceType, string> = {
  identity: "OlogyCrew reviewed government identity evidence. This does not verify service quality or guarantee safety.",
  business_license: "OlogyCrew reviewed business registration evidence. This does not verify every service or business claim.",
  professional_license: "OlogyCrew reviewed professional license evidence for the displayed jurisdiction and validity period.",
  insurance: "OlogyCrew reviewed insurance evidence that was current on the displayed date. Coverage and exclusions may vary.",
  background_check: "OlogyCrew reviewed submitted background-screening evidence. This is not continuous monitoring or a safety guarantee.",
};

function asDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function effectiveExpiry(document: VerificationEvidenceLike) {
  const supplied = asDate(document.expirationDate ? `${document.expirationDate}T23:59:59.999Z` : null);
  if (supplied) return supplied;
  if (document.documentType === "background_check" && document.verifiedAt) {
    const reviewed = asDate(document.verifiedAt);
    return reviewed ? new Date(reviewed.getTime() + 365 * 86_400_000) : null;
  }
  return null;
}

export function resolveEvidenceSignal(
  documents: VerificationEvidenceLike[],
  type: ProviderEvidenceType,
  now = new Date(),
): EvidenceSignal {
  const matching = documents
    .filter(document => document.documentType === type)
    .sort((a, b) => {
      const dateDifference = asDate(b.createdAt)!.getTime() - asDate(a.createdAt)!.getTime();
      return dateDifference || b.id - a.id;
    });
  const newest = matching[0];

  if (!newest) {
    return {
      type,
      label: EVIDENCE_LABELS[type],
      state: "not_submitted",
      documentId: null,
      reviewedAt: null,
      expiresAt: null,
      issuer: null,
      jurisdiction: null,
      reason: null,
      publicExplanation: EVIDENCE_EXPLANATIONS[type],
    };
  }

  if (newest.verificationStatus === "revoked" || newest.verificationStatus === "approved") {
    const expiresAt = effectiveExpiry(newest);
    const state: EvidenceSignalState = newest.verificationStatus === "revoked"
      ? "revoked"
      : expiresAt && expiresAt < now ? "expired" : "verified";
    return {
      type,
      label: EVIDENCE_LABELS[type],
      state,
      documentId: newest.id,
      reviewedAt: asDate(newest.verifiedAt),
      expiresAt,
      issuer: newest.issuer || null,
      jurisdiction: newest.jurisdiction || null,
      reason: state === "revoked" ? newest.revocationReason || null : null,
      publicExplanation: EVIDENCE_EXPLANATIONS[type],
    };
  }

  const currentApproved = matching.slice(1).find(document => {
    if (document.verificationStatus !== "approved") return false;
    const expiresAt = effectiveExpiry(document);
    return !expiresAt || expiresAt >= now;
  });
  const selected = currentApproved || newest;

  const expiresAt = effectiveExpiry(selected);
  const state: EvidenceSignalState = selected.verificationStatus === "approved"
    ? expiresAt && expiresAt < now ? "expired" : "verified"
    : selected.verificationStatus;

  return {
    type,
    label: EVIDENCE_LABELS[type],
    state,
    documentId: selected.id,
    reviewedAt: asDate(selected.verifiedAt),
    expiresAt,
    issuer: selected.issuer || null,
    jurisdiction: selected.jurisdiction || null,
    reason: state === "rejected" ? selected.rejectionReason || null : state === "revoked" ? selected.revocationReason || null : null,
    publicExplanation: EVIDENCE_EXPLANATIONS[type],
  };
}

const STANDING_LABELS: Record<string, { label: string; explanation: string }> = {
  new: { label: "New", explanation: "Recently joined OlogyCrew." },
  rising: { label: "Building History", explanation: "Building profile completeness and OlogyCrew activity." },
  trusted: { label: "Established", explanation: "Has established profile and OlogyCrew activity signals." },
  top_pro: { label: "Top Activity", explanation: "Has strong profile and OlogyCrew activity signals." },
};

export function resolveProviderTrustProfile(input: {
  documents: VerificationEvidenceLike[];
  isOfficial?: boolean;
  completedBookings: number;
  bookingLinkedReviews: number;
  averageRating: number;
  trustLevel?: string | null;
  now?: Date;
}) {
  const now = input.now || new Date();
  const completedBookings = input.isOfficial ? 0 : Math.max(0, input.completedBookings);
  const bookingLinkedReviews = input.isOfficial ? 0 : Math.max(0, input.bookingLinkedReviews);
  const averageRating = input.isOfficial || bookingLinkedReviews === 0 ? 0 : Math.max(0, input.averageRating);
  const allSignals = Object.fromEntries(
    PROVIDER_EVIDENCE_TYPES.map(type => [type, resolveEvidenceSignal(input.documents, type, now)]),
  ) as Record<ProviderEvidenceType, EvidenceSignal>;
  const evidence = input.isOfficial
    ? Object.fromEntries(PROVIDER_EVIDENCE_TYPES.map(type => [type, { ...allSignals[type], state: "not_submitted" as const, documentId: null }])) as Record<ProviderEvidenceType, EvidenceSignal>
    : allSignals;
  const publicEvidence = PROVIDER_EVIDENCE_TYPES
    .map(type => evidence[type])
    .filter(signal => signal.state === "verified")
    .map(({ documentId: _documentId, reason: _reason, ...signal }) => signal);
  const standing = STANDING_LABELS[input.trustLevel || "new"] || STANDING_LABELS.new;

  return {
    evidence,
    publicEvidence,
    identityReviewed: evidence.identity.state === "verified",
    compatibilityVerificationStatus: evidence.identity.state === "verified"
      ? "verified" as const
      : evidence.identity.state === "rejected" || evidence.identity.state === "revoked"
      ? "rejected" as const
      : "pending" as const,
    activity: {
      completedBookings,
      bookingLinkedReviews,
      averageRating,
      completedBookingsLabel: completedBookings > 0
        ? `${completedBookings} booking${completedBookings === 1 ? "" : "s"} completed through OlogyCrew`
        : "New on OlogyCrew",
      reviewsLabel: bookingLinkedReviews > 0
        ? `${bookingLinkedReviews} review${bookingLinkedReviews === 1 ? "" : "s"} from completed OlogyCrew bookings`
        : "No booking-linked reviews yet",
    },
    standing: {
      level: input.trustLevel || "new",
      ...standing,
      isCredentialVerification: false,
    },
    isOfficialDemo: !!input.isOfficial,
    publicExplanation: input.isOfficial
      ? "Official OlogyCrew demo profile. Demo profiles do not carry provider verification claims."
      : "Evidence review, OlogyCrew activity, customer reviews, and provider standing are separate signals; none guarantees service quality, safety, or suitability.",
  };
}
