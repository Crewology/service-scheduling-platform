export const RESERVED_INTERNAL_PROVIDER_IDS = new Set([1_680_002]);
export const RESERVED_INTERNAL_PROVIDER_NAMES = new Set(["prattis test"]);

export type AdminIdentityLike = {
  email?: string | null;
  loginMethod?: string | null;
  openId?: string | null;
  deletedAt?: Date | string | null;
  providerId?: number | null;
  providerBusinessName?: string | null;
  providerIsOfficial?: boolean | number | null;
  providerIsActive?: boolean | number | null;
  providerDeletedAt?: Date | string | null;
};

export function hasExactEmailDomain(email: string | null | undefined, domain: string) {
  const normalized = email?.trim().toLowerCase();
  return normalized?.endsWith(`@${domain.toLowerCase()}`) === true;
}

export function isReservedInternalIdentity(identity: AdminIdentityLike) {
  const openId = identity.openId?.trim().toLowerCase() || "";
  const businessName = identity.providerBusinessName?.trim().toLowerCase() || "";
  return hasExactEmailDomain(identity.email, "test.com")
    || hasExactEmailDomain(identity.email, "example.invalid")
    || identity.loginMethod === "test"
    || openId.startsWith("test-")
    || openId.startsWith("test_")
    || (identity.providerId != null && RESERVED_INTERNAL_PROVIDER_IDS.has(identity.providerId))
    || RESERVED_INTERNAL_PROVIDER_NAMES.has(businessName);
}

export function isReportableAdminIdentity(identity: AdminIdentityLike) {
  return !identity.providerIsOfficial && !isReservedInternalIdentity(identity);
}

export function isActiveReportableAdminUser(identity: AdminIdentityLike) {
  return !identity.deletedAt && isReportableAdminIdentity(identity);
}

export function isActiveReportableAdminProvider(identity: AdminIdentityLike) {
  return !identity.deletedAt
    && !identity.providerDeletedAt
    && Boolean(identity.providerIsActive)
    && isReportableAdminIdentity(identity);
}
