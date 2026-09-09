export type CrmIdentitySnapshot = {
  openId: string;
  email: string | null;
  loginMethod: string | null;
  providerId?: number;
  businessName?: string;
};

const RESERVED_CRM_PROVIDER_IDS = new Set([1_680_002]);
const RESERVED_CRM_BUSINESS_NAMES = new Set(["prattis test"]);

export function isReservedCrmIdentity(user: CrmIdentitySnapshot): boolean {
  return (user.providerId !== undefined && RESERVED_CRM_PROVIDER_IDS.has(user.providerId))
    || (user.businessName !== undefined && RESERVED_CRM_BUSINESS_NAMES.has(user.businessName.trim().toLowerCase()))
    || user.loginMethod === "test"
    || user.email?.toLowerCase().endsWith("@example.invalid") === true
    || user.openId.startsWith("test-")
    || user.openId.startsWith("test_");
}
