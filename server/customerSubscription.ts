/**
 * Customer Subscription Tiers & Helpers
 * 
 * Controls saved provider limits and premium perks for customers/bookers.
 * Free: 10 saved providers
 * Pro ($9.99/mo): 50 saved providers + priority booking + folders
 * Business ($24.99/mo): Unlimited saved providers + bulk quotes + analytics
 */

export type CustomerTier = "free" | "pro" | "business";

export interface CustomerTierConfig {
  name: string;
  tier: CustomerTier;
  monthlyPrice: number;
  yearlyPrice: number;
  savedProviderLimit: number; // -1 = unlimited
  features: string[];
  perks: {
    priorityBooking: boolean;
    bulkQuoteRequests: boolean;
    bookingAnalytics: boolean;
    savedProviderFolders: boolean;
    dedicatedSupport: boolean;
  };
}

export const CUSTOMER_TIERS: Record<CustomerTier, CustomerTierConfig> = {
  free: {
    name: "Free",
    tier: "free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    savedProviderLimit: 10,
    features: [
      "Save up to 10 providers",
      "Book any service",
      "Message providers",
      "Leave reviews",
      "Quote requests",
    ],
    perks: {
      priorityBooking: false,
      bulkQuoteRequests: false,
      bookingAnalytics: false,
      savedProviderFolders: false,
      dedicatedSupport: false,
    },
  },
  pro: {
    name: "Pro",
    tier: "pro",
    monthlyPrice: 9.99,
    yearlyPrice: 95.88, // ~$7.99/mo
    savedProviderLimit: 50,
    features: [
      "Save up to 50 providers",
      "Priority booking requests",
      "Organize providers into folders",
      "Book any service",
      "Message providers",
      "Leave reviews",
      "Quote requests",
    ],
    perks: {
      priorityBooking: true,
      bulkQuoteRequests: false,
      bookingAnalytics: false,
      savedProviderFolders: true,
      dedicatedSupport: false,
    },
  },
  business: {
    name: "Business",
    tier: "business",
    monthlyPrice: 24.99,
    yearlyPrice: 239.88, // ~$19.99/mo
    savedProviderLimit: -1, // unlimited
    features: [
      "Unlimited saved providers",
      "Priority booking requests",
      "Organize providers into folders",
      "Bulk quote requests",
      "Booking analytics & spending reports",
      "Dedicated support",
      "Book any service",
      "Message providers",
      "Leave reviews",
    ],
    perks: {
      priorityBooking: true,
      bulkQuoteRequests: true,
      bookingAnalytics: true,
      savedProviderFolders: true,
      dedicatedSupport: true,
    },
  },
};

export const CUSTOMER_STRIPE_PRODUCT_NAME = "OlogyCrew Customer Subscription";

export function getCustomerSavedLimit(tier: CustomerTier): number {
  return CUSTOMER_TIERS[tier].savedProviderLimit;
}

export function canCustomerSaveMore(tier: CustomerTier, currentCount: number): boolean {
  const limit = CUSTOMER_TIERS[tier].savedProviderLimit;
  if (limit === -1) return true; // unlimited
  return currentCount < limit;
}
