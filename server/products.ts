/**
 * SkillLink Pricing & Subscription Configuration
 * 
 * Revenue model: Provider subscriptions + 1% transaction fee
 * Providers pay monthly subscriptions for premium features.
 * The platform takes only 1% of each booking transaction.
 */

// ─── Transaction Fee ──────────────────────────────────────────────────────────

export const PLATFORM_FEE_PERCENTAGE = 0.01; // 1% platform fee on all bookings

// ─── Subscription Tiers ───────────────────────────────────────────────────────

export type SubscriptionTier = "free" | "basic" | "premium";

export interface TierConfig {
  name: string;
  tier: SubscriptionTier;
  monthlyPrice: number; // USD
  yearlyPrice: number;  // USD (annual billing discount)
  features: string[];
  limits: {
    maxServices: number;
    maxPhotosPerService: number;
    prioritySearch: boolean;
    customBranding: boolean;
    analyticsAccess: boolean;
    premiumSupport: boolean;
    featuredListing: boolean;
    customSlug: boolean;
  };
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, TierConfig> = {
  free: {
    name: "Starter",
    tier: "free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "Up to 3 active services",
      "2 photos per service",
      "Basic public profile",
      "Standard search placement",
      "Booking management",
      "Customer messaging",
    ],
    limits: {
      maxServices: 3,
      maxPhotosPerService: 2,
      prioritySearch: false,
      customBranding: false,
      analyticsAccess: false,
      premiumSupport: false,
      featuredListing: false,
      customSlug: false,
    },
  },
  basic: {
    name: "Professional",
    tier: "basic",
    monthlyPrice: 19.99,
    yearlyPrice: 191.88, // ~$16/mo
    features: [
      "Up to 10 active services",
      "5 photos per service",
      "Custom profile URL slug",
      "Priority search placement",
      "Business analytics dashboard",
      "Booking management",
      "Customer messaging",
      "Email notifications",
    ],
    limits: {
      maxServices: 10,
      maxPhotosPerService: 5,
      prioritySearch: true,
      customBranding: false,
      analyticsAccess: true,
      premiumSupport: false,
      featuredListing: false,
      customSlug: true,
    },
  },
  premium: {
    name: "Business",
    tier: "premium",
    monthlyPrice: 49.99,
    yearlyPrice: 479.88, // ~$40/mo
    features: [
      "Unlimited active services",
      "5 photos per service",
      "Custom profile URL slug",
      "Featured listing badge",
      "Top search placement",
      "Full analytics suite",
      "Custom branding on profile",
      "Priority customer support",
      "Booking management",
      "Customer messaging",
      "Email & SMS notifications",
    ],
    limits: {
      maxServices: 999, // effectively unlimited
      maxPhotosPerService: 5,
      prioritySearch: true,
      customBranding: true,
      analyticsAccess: true,
      premiumSupport: true,
      featuredListing: true,
      customSlug: true,
    },
  },
};

// ─── Stripe Price IDs ─────────────────────────────────────────────────────────
// These will be created dynamically on first use via the subscription router

export const STRIPE_PRODUCT_NAME = "SkillLink Provider Subscription";

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

export function getTrialDays(): number {
  return 14;
}
