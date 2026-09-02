/**
 * OlogyCrew Pricing & Subscription Configuration
 * 
 * Revenue model: Provider subscriptions + 1% transaction fee
 * Providers pay monthly subscriptions for premium features.
 * The platform takes only 1% of each booking transaction.
 */

// ─── Transaction Fee ──────────────────────────────────────────────────────────

export const PLATFORM_FEE_PERCENTAGE = 0.01; // 1% platform fee on all bookings

// ─── Subscription Tiers ───────────────────────────────────────────────────────

import {
  PROVIDER_PLANS,
  TRIAL_DAYS,
  type ProviderPlanConfig,
  type ProviderTier,
} from "../shared/entitlements";

export type SubscriptionTier = ProviderTier;
export type TierConfig = ProviderPlanConfig;
export const SUBSCRIPTION_TIERS = PROVIDER_PLANS;

// ─── Stripe Price IDs ─────────────────────────────────────────────────────────
// These will be created dynamically on first use via the subscription router

export const STRIPE_PRODUCT_NAME = "OlogyCrew Provider Subscription";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function calculatePlatformFee(subtotal: number): number {
  return subtotal * PLATFORM_FEE_PERCENTAGE;
}

export function calculateDepositAmount(
  totalAmount: number,
  depositType: "fixed" | "percentage",
  depositAmount?: string,
  depositPercentage?: string
): number {
  if (depositType === "fixed") {
    return parseFloat(depositAmount || "0");
  } else {
    return totalAmount * (parseFloat(depositPercentage || "0") / 100);
  }
}

export function calculateBookingTotal(servicePrice: number): {
  subtotal: number;
  platformFee: number;
  total: number;
} {
  const subtotal = servicePrice;
  const platformFee = calculatePlatformFee(subtotal);
  const total = subtotal + platformFee;
  return { subtotal, platformFee, total };
}

export function getTierLimits(tier: SubscriptionTier) {
  return SUBSCRIPTION_TIERS[tier].limits;
}

export function canProviderAddService(tier: SubscriptionTier, currentCount: number): boolean {
  return currentCount < SUBSCRIPTION_TIERS[tier].limits.maxServices;
}

export function canProviderAddPhoto(tier: SubscriptionTier, currentCount: number): boolean {
  return currentCount < SUBSCRIPTION_TIERS[tier].limits.maxPhotosPerService;
}

export function canProviderAddCategory(tier: SubscriptionTier, currentCount: number): boolean {
  return currentCount < SUBSCRIPTION_TIERS[tier].limits.maxCategories;
}

export function getTrialDays(): number {
  return TRIAL_DAYS;
}
