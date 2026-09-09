import { getProviderSubscription } from "../db/payments";
import { and, asc, eq, isNull } from "drizzle-orm";
import { serviceProviders, users } from "../../drizzle/schema";
import { requireDb } from "../db/connection";
import { getCrmAudienceMode, getCrmPilotProviderIds, isCrmRolloutEnabled } from "../db/crm/operationalState";
import { providerHasFeature, resolveProviderEntitlement, type ProviderFeature } from "../../shared/entitlements";
import type { CrmRolloutFlag } from "../../shared/crm";
import { isReservedCrmIdentity } from "./identity";
import { getProviderAudienceIdentity } from "../db/providers";

export async function getCrmProviderAccess(providerId: number) {
  const [subscription, identity] = await Promise.all([
    getProviderSubscription(providerId),
    getProviderAudienceIdentity(providerId),
  ]);
  const entitlement = resolveProviderEntitlement(subscription);
  const [audienceMode, pilotProviderIds] = await Promise.all([
    getCrmAudienceMode(),
    getCrmPilotProviderIds(),
  ]);
  const isPilotProvider = pilotProviderIds.includes(providerId);
  const providerEligibleForAudience = !!identity
    && identity.isActive
    && !identity.providerDeletedAt
    && !identity.userDeletedAt
    && !identity.isOfficial
    && !isReservedCrmIdentity(identity);
  const isAudienceProvider = audienceMode === "lifecycle_entitled"
    ? providerEligibleForAudience && providerHasFeature(entitlement.effectiveTier, "customerHistory")
    : isPilotProvider;

  return {
    entitlement,
    audienceMode,
    isAudienceProvider,
    providerEligibleForAudience,
    isPilotProvider,
    can(feature: ProviderFeature) {
      return providerHasFeature(entitlement.effectiveTier, feature);
    },
  };
}

export async function listCrmAudienceProviderIds(): Promise<number[]> {
  const audienceMode = await getCrmAudienceMode();
  if (audienceMode === "pilot") return getCrmPilotProviderIds();

  const database = await requireDb();
  const rows = await database
    .select({
      id: serviceProviders.id,
      businessName: serviceProviders.businessName,
      isOfficial: serviceProviders.isOfficial,
      openId: users.openId,
      email: users.email,
      loginMethod: users.loginMethod,
    })
    .from(serviceProviders)
    .innerJoin(users, eq(users.id, serviceProviders.userId))
    .where(and(
      eq(serviceProviders.isActive, true),
      isNull(serviceProviders.deletedAt),
      isNull(users.deletedAt),
    ))
    .orderBy(asc(serviceProviders.id));
  const eligibleRows = rows.filter(row => !row.isOfficial && !isReservedCrmIdentity({ ...row, providerId: row.id }));
  const accessRows = await Promise.all(eligibleRows.map(async ({ id }) => ({
    id,
    access: await getCrmProviderAccess(id),
  })));
  return accessRows
    .filter(({ access }) => access.isAudienceProvider && access.can("customerHistory"))
    .map(({ id }) => id);
}

export async function requireCrmRollout(flag: CrmRolloutFlag): Promise<void> {
  if (!(await isCrmRolloutEnabled(flag))) {
    throw new Error("Customers capability is not enabled");
  }
}
