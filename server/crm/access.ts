import { getProviderSubscription } from "../db/payments";
import { getCrmPilotProviderIds, isCrmRolloutEnabled } from "../db/crm/operationalState";
import { providerHasFeature, resolveProviderEntitlement, type ProviderFeature } from "../../shared/entitlements";
import type { CrmRolloutFlag } from "../../shared/crm";

export async function getCrmProviderAccess(providerId: number) {
  const subscription = await getProviderSubscription(providerId);
  const entitlement = resolveProviderEntitlement(subscription);
  const pilotProviderIds = await getCrmPilotProviderIds();

  return {
    entitlement,
    isPilotProvider: pilotProviderIds.includes(providerId),
    can(feature: ProviderFeature) {
      return providerHasFeature(entitlement.effectiveTier, feature);
    },
  };
}

export async function requireCrmRollout(flag: CrmRolloutFlag): Promise<void> {
  if (!(await isCrmRolloutEnabled(flag))) {
    throw new Error("Customers capability is not enabled");
  }
}
