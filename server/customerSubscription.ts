/**
 * Customer Subscription Tiers & Helpers
 * 
 * Controls saved provider limits and premium perks for customers/bookers.
 * Free: 5 saved providers
 * Pro ($12/mo): 50 saved providers + priority booking + folders
 * Business ($20/mo): Unlimited saved providers + bulk quotes + analytics
 */

import { CUSTOMER_PLANS, type CustomerPlanConfig, type CustomerTier } from "../shared/entitlements";

export type { CustomerPlanConfig, CustomerTier };
export const CUSTOMER_TIERS = CUSTOMER_PLANS;

export const CUSTOMER_STRIPE_PRODUCT_NAME = "OlogyCrew Customer Subscription";

export function getCustomerSavedLimit(tier: CustomerTier): number {
  return CUSTOMER_TIERS[tier].savedProviderLimit;
}

export function canCustomerSaveMore(tier: CustomerTier, currentCount: number): boolean {
  const limit = CUSTOMER_TIERS[tier].savedProviderLimit;
  if (limit === -1) return true; // unlimited
  return currentCount < limit;
}
