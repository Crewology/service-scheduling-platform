export type ProviderTier = "free" | "basic" | "premium";
export type CustomerTier = "free" | "pro" | "business";
export type BillingInterval = "month" | "year";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "cancelled" | "incomplete" | "paused";

export type ProviderFeature =
  | "bookingManagement"
  | "customerMessaging"
  | "transactionalEmail"
  | "paymentCollection"
  | "invoicing"
  | "prioritySearch"
  | "analyticsAccess"
  | "customSlug"
  | "customBranding"
  | "featuredListing"
  | "smsNotifications"
  | "premiumSupport"
  | "customerHistory"
  | "crmNotes"
  | "crmFollowUps"
  | "crmDrafts"
  | "crmStageOverrides"
  | "crmSegments"
  | "crmRetentionAnalytics"
  | "crmAdvancedAnalytics"
  | "crmAutomationControls";

export type CustomerFeature =
  | "directBooking"
  | "quoteRequests"
  | "messaging"
  | "reviews"
  | "priorityBooking"
  | "savedProviderFolders"
  | "bulkQuoteRequests"
  | "bookingAnalytics"
  | "bookingExports"
  | "dedicatedSupport";

export interface ProviderPlanConfig {
  name: string;
  tier: ProviderTier;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  limits: {
    maxServices: number;
    maxCategories: number;
    maxPhotosPerService: number;
    prioritySearch: boolean;
    customBranding: boolean;
    analyticsAccess: boolean;
    premiumSupport: boolean;
    featuredListing: boolean;
    customSlug: boolean;
  };
  entitlements: Record<ProviderFeature, boolean>;
}

export interface CustomerPlanConfig {
  name: string;
  tier: CustomerTier;
  monthlyPrice: number;
  yearlyPrice: number;
  savedProviderLimit: number;
  features: string[];
  perks: {
    priorityBooking: boolean;
    bulkQuoteRequests: boolean;
    bookingAnalytics: boolean;
    savedProviderFolders: boolean;
    dedicatedSupport: boolean;
  };
  entitlements: Record<CustomerFeature, boolean>;
}

const commonProviderEntitlements = {
  bookingManagement: true,
  customerMessaging: true,
  transactionalEmail: true,
} as const;

export const PROVIDER_PLANS: Record<ProviderTier, ProviderPlanConfig> = {
  free: {
    name: "Starter",
    tier: "free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "1 service category",
      "Up to 3 active services",
      "1 photo per service",
      "Basic public profile",
      "Standard search placement",
      "Booking management",
      "Customer messaging",
      "Email notifications",
    ],
    limits: {
      maxServices: 3,
      maxCategories: 1,
      maxPhotosPerService: 1,
      prioritySearch: false,
      customBranding: false,
      analyticsAccess: false,
      premiumSupport: false,
      featuredListing: false,
      customSlug: false,
    },
    entitlements: {
      ...commonProviderEntitlements,
      paymentCollection: false,
      invoicing: false,
      prioritySearch: false,
      analyticsAccess: false,
      customSlug: false,
      customBranding: false,
      featuredListing: false,
      smsNotifications: false,
      premiumSupport: false,
      customerHistory: true,
      crmNotes: false,
      crmFollowUps: false,
      crmDrafts: false,
      crmStageOverrides: false,
      crmSegments: false,
      crmRetentionAnalytics: false,
      crmAdvancedAnalytics: false,
      crmAutomationControls: false,
    },
  },
  basic: {
    name: "Pro",
    tier: "basic",
    monthlyPrice: 12,
    yearlyPrice: 120.96,
    features: [
      "Up to 5 service categories",
      "Up to 10 active services",
      "3 photos per service",
      "Stripe payment collection",
      "Invoicing & receipts",
      "Custom profile URL slug",
      "Priority search placement",
      "Business analytics dashboard",
      "Booking management",
      "Customer messaging",
      "Email notifications",
    ],
    limits: {
      maxServices: 10,
      maxCategories: 5,
      maxPhotosPerService: 3,
      prioritySearch: true,
      customBranding: false,
      analyticsAccess: true,
      premiumSupport: false,
      featuredListing: false,
      customSlug: true,
    },
    entitlements: {
      ...commonProviderEntitlements,
      paymentCollection: true,
      invoicing: true,
      prioritySearch: true,
      analyticsAccess: true,
      customSlug: true,
      customBranding: false,
      featuredListing: false,
      smsNotifications: false,
      premiumSupport: false,
      customerHistory: true,
      crmNotes: true,
      crmFollowUps: true,
      crmDrafts: true,
      crmStageOverrides: true,
      crmSegments: false,
      crmRetentionAnalytics: true,
      crmAdvancedAnalytics: false,
      crmAutomationControls: false,
    },
  },
  premium: {
    name: "Business",
    tier: "premium",
    monthlyPrice: 20,
    yearlyPrice: 192,
    features: [
      "Unlimited service categories",
      "Unlimited active services",
      "5 photos per service",
      "Stripe payment collection",
      "Invoicing & receipts",
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
      maxServices: 999,
      maxCategories: 999,
      maxPhotosPerService: 5,
      prioritySearch: true,
      customBranding: true,
      analyticsAccess: true,
      premiumSupport: true,
      featuredListing: true,
      customSlug: true,
    },
    entitlements: {
      ...commonProviderEntitlements,
      paymentCollection: true,
      invoicing: true,
      prioritySearch: true,
      analyticsAccess: true,
      customSlug: true,
      customBranding: true,
      featuredListing: true,
      smsNotifications: true,
      premiumSupport: true,
      customerHistory: true,
      crmNotes: true,
      crmFollowUps: true,
      crmDrafts: true,
      crmStageOverrides: true,
      crmSegments: true,
      crmRetentionAnalytics: true,
      crmAdvancedAnalytics: true,
      crmAutomationControls: true,
    },
  },
};

export const CUSTOMER_PLANS: Record<CustomerTier, CustomerPlanConfig> = {
  free: {
    name: "Individual",
    tier: "free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    savedProviderLimit: 5,
    features: ["Save up to 5 providers", "Book any service", "Message providers", "Leave reviews", "Quote requests"],
    perks: { priorityBooking: false, bulkQuoteRequests: false, bookingAnalytics: false, savedProviderFolders: false, dedicatedSupport: false },
    entitlements: { directBooking: true, quoteRequests: true, messaging: true, reviews: true, priorityBooking: false, savedProviderFolders: false, bulkQuoteRequests: false, bookingAnalytics: false, bookingExports: false, dedicatedSupport: false },
  },
  pro: {
    name: "Coordinator",
    tier: "pro",
    monthlyPrice: 12,
    yearlyPrice: 120.96,
    savedProviderLimit: 50,
    features: ["Save up to 50 providers", "Priority booking requests", "Organize providers into folders", "Book any service", "Message providers", "Leave reviews", "Quote requests"],
    perks: { priorityBooking: true, bulkQuoteRequests: false, bookingAnalytics: false, savedProviderFolders: true, dedicatedSupport: false },
    entitlements: { directBooking: true, quoteRequests: true, messaging: true, reviews: true, priorityBooking: true, savedProviderFolders: true, bulkQuoteRequests: false, bookingAnalytics: false, bookingExports: false, dedicatedSupport: false },
  },
  business: {
    name: "Manager",
    tier: "business",
    monthlyPrice: 20,
    yearlyPrice: 192,
    savedProviderLimit: -1,
    features: ["Unlimited saved providers", "Priority booking requests", "Organize providers into folders", "Bulk quote requests", "Booking analytics & spending reports", "Dedicated support", "Book any service", "Message providers", "Leave reviews"],
    perks: { priorityBooking: true, bulkQuoteRequests: true, bookingAnalytics: true, savedProviderFolders: true, dedicatedSupport: true },
    entitlements: { directBooking: true, quoteRequests: true, messaging: true, reviews: true, priorityBooking: true, savedProviderFolders: true, bulkQuoteRequests: true, bookingAnalytics: true, bookingExports: true, dedicatedSupport: true },
  },
};

export interface SubscriptionSnapshot<TTier extends string> {
  tier?: TTier | null;
  status?: SubscriptionStatus | string | null;
  trialEndsAt?: Date | string | null;
  currentPeriodEnd?: Date | string | null;
  cancelAtPeriodEnd?: boolean | null;
  stripeSubscriptionId?: string | null;
  stripeCustomerId?: string | null;
}

export type EffectiveSubscriptionState =
  | "free"
  | "trialing"
  | "active"
  | "cancelling"
  | "past_due_grace"
  | "past_due_suspended"
  | "paused"
  | "incomplete"
  | "cancelled"
  | "trial_expired";

export interface EffectiveEntitlement<TTier extends string> {
  configuredTier: TTier;
  effectiveTier: TTier;
  state: EffectiveSubscriptionState;
  hasPaidAccess: boolean;
  isTrialing: boolean;
  isScheduledToCancel: boolean;
  requiresBillingAction: boolean;
  canManageBilling: boolean;
  accessEndsAt: Date | null;
}

function asValidDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function resolveEntitlement<TTier extends string>(
  snapshot: SubscriptionSnapshot<TTier> | null | undefined,
  freeTier: TTier,
  now = new Date(),
): EffectiveEntitlement<TTier> {
  const configuredTier = snapshot?.tier ?? freeTier;
  const status = snapshot?.status ?? "active";
  const isConfiguredPaid = configuredTier !== freeTier;
  const trialEnd = asValidDate(snapshot?.trialEndsAt);
  const periodEnd = asValidDate(snapshot?.currentPeriodEnd);
  const hasFutureTrial = !!trialEnd && trialEnd.getTime() > now.getTime();
  const hasFuturePeriod = !!periodEnd && periodEnd.getTime() > now.getTime();
  const canManageBilling = !!snapshot?.stripeCustomerId;

  const result = (
    effectiveTier: TTier,
    state: EffectiveSubscriptionState,
    options: Partial<Omit<EffectiveEntitlement<TTier>, "configuredTier" | "effectiveTier" | "state">> = {},
  ): EffectiveEntitlement<TTier> => ({
    configuredTier,
    effectiveTier,
    state,
    hasPaidAccess: effectiveTier !== freeTier,
    isTrialing: false,
    isScheduledToCancel: false,
    requiresBillingAction: false,
    canManageBilling,
    accessEndsAt: null,
    ...options,
  });

  if (!snapshot || configuredTier === freeTier) return result(freeTier, "free");

  if (status === "trialing") {
    if (hasFutureTrial) return result(configuredTier, "trialing", { isTrialing: true, accessEndsAt: trialEnd });
    return result(freeTier, "trial_expired", { requiresBillingAction: true });
  }

  if (status === "active") {
    if (snapshot.cancelAtPeriodEnd && hasFuturePeriod) {
      return result(configuredTier, "cancelling", { isScheduledToCancel: true, accessEndsAt: periodEnd });
    }
    return result(configuredTier, "active");
  }

  if (status === "past_due") {
    if (hasFuturePeriod) return result(configuredTier, "past_due_grace", { requiresBillingAction: true, accessEndsAt: periodEnd });
    return result(freeTier, "past_due_suspended", { requiresBillingAction: true });
  }

  // Preserve valid access for legacy rows that were incorrectly marked cancelled
  // while Stripe remained scheduled to cancel at a future period end.
  if (status === "cancelled" && snapshot.cancelAtPeriodEnd && hasFuturePeriod) {
    return result(configuredTier, "cancelling", { isScheduledToCancel: true, accessEndsAt: periodEnd });
  }

  if (status === "paused") return result(freeTier, "paused", { requiresBillingAction: true });
  if (status === "incomplete") return result(freeTier, "incomplete", { requiresBillingAction: true });
  return result(freeTier, "cancelled", { requiresBillingAction: isConfiguredPaid });
}

export const resolveProviderEntitlement = (snapshot: SubscriptionSnapshot<ProviderTier> | null | undefined, now?: Date) =>
  resolveEntitlement(snapshot, "free", now);

export const resolveCustomerEntitlement = (snapshot: SubscriptionSnapshot<CustomerTier> | null | undefined, now?: Date) =>
  resolveEntitlement(snapshot, "free", now);

export function providerHasFeature(tier: ProviderTier, feature: ProviderFeature): boolean {
  return PROVIDER_PLANS[tier].entitlements[feature];
}

export function customerHasFeature(tier: CustomerTier, feature: CustomerFeature): boolean {
  return CUSTOMER_PLANS[tier].entitlements[feature];
}

export const TRIAL_DAYS = 14;
