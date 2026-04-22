import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import { ENV } from "./_core/env";
import * as db from "./db";
import { SUBSCRIPTION_TIERS, STRIPE_PRODUCT_NAME, getTrialDays, type SubscriptionTier } from "./products";

const stripe = new Stripe(ENV.stripeSecretKey, {
  apiVersion: "2025-12-18.acacia" as any,
});

// Cache for Stripe price IDs (created on first use)
const priceCache: Record<string, string> = {};

async function getOrCreateStripePrice(tier: SubscriptionTier, interval: "month" | "year"): Promise<string> {
  const cacheKey = `${tier}_${interval}`;
  if (priceCache[cacheKey]) return priceCache[cacheKey];

  const config = SUBSCRIPTION_TIERS[tier];
  const amount = interval === "month"
    ? Math.round(config.monthlyPrice * 100)
    : Math.round(config.yearlyPrice * 100);

  if (amount === 0) throw new Error("Cannot create Stripe price for free tier");

  // Search for existing product
  const products = await stripe.products.list({ limit: 10 });
  let product = products.data.find(p => p.name === STRIPE_PRODUCT_NAME && p.active);

  if (!product) {
    product = await stripe.products.create({
      name: STRIPE_PRODUCT_NAME,
      description: "OlogyCrew provider subscription for service professionals",
    });
  }

  // Search for existing price
  const prices = await stripe.prices.list({ product: product.id, limit: 20, active: true });
  const existingPrice = prices.data.find(
    p => p.unit_amount === amount && p.recurring?.interval === interval
  );

  if (existingPrice) {
    priceCache[cacheKey] = existingPrice.id;
    return existingPrice.id;
  }

  // Create new price
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: amount,
    currency: "usd",
    recurring: { interval },
    metadata: { tier, interval },
  });

  priceCache[cacheKey] = price.id;
  return price.id;
}

export const subscriptionRouter = router({
  // Get available tiers and current subscription
  getTiers: publicProcedure.query(() => {
    return Object.values(SUBSCRIPTION_TIERS);
  }),

  // Select free tier explicitly during onboarding (creates a subscription record)
  selectFreeTier: protectedProcedure.mutation(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
    }

    // Check if already has a subscription
    const existing = await db.getProviderSubscription(provider.id);
    if (existing && (existing.status === "active" || existing.status === "trialing")) {
      return { tier: existing.tier, status: existing.status };
    }

    // Create a free tier subscription record
    await db.upsertProviderSubscription({
      providerId: provider.id,
      tier: "free",
      status: "active",
    });

    return { tier: "free" as const, status: "active" as const };
  }),

  // Get current provider's subscription
  mySubscription: protectedProcedure.query(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider) return null;

    const subscription = await db.getProviderSubscription(provider.id);
    const tier = await db.getProviderTier(provider.id);
    const serviceCount = await db.getActiveServiceCount(provider.id);
    const tierConfig = SUBSCRIPTION_TIERS[tier];

    return {
      subscription,
      currentTier: tier,
      tierConfig,
      usage: {
        servicesUsed: serviceCount,
        servicesLimit: tierConfig.limits.maxServices,
      },
    };
  }),

  // Create checkout session for subscription
  createCheckout: protectedProcedure
    .input(z.object({
      tier: z.enum(["basic", "premium"]),
      interval: z.enum(["month", "year"]).default("month"),
      withTrial: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider to subscribe" });
      }

      const currentSub = await db.getProviderSubscription(provider.id);
      if (currentSub?.status === "active" && currentSub.tier === input.tier) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already subscribed to this tier" });
      }

      const priceId = await getOrCreateStripePrice(input.tier, input.interval);

      // Get or create Stripe customer
      let customerId = currentSub?.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: ctx.user.email || undefined,
          name: provider.businessName,
          metadata: {
            providerId: provider.id.toString(),
            userId: ctx.user.id.toString(),
          },
        });
        customerId = customer.id;
      }

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${ctx.req.headers.origin}/provider/dashboard?tab=subscription&status=success`,
        cancel_url: `${ctx.req.headers.origin}/provider/dashboard?tab=subscription&status=cancelled`,
        metadata: {
          providerId: provider.id.toString(),
          userId: ctx.user.id.toString(),
          tier: input.tier,
        },
        allow_promotion_codes: true,
      };

      if (input.withTrial) {
        sessionParams.subscription_data = {
          trial_period_days: getTrialDays(),
          metadata: {
            providerId: provider.id.toString(),
            tier: input.tier,
          },
        };
      } else {
        sessionParams.subscription_data = {
          metadata: {
            providerId: provider.id.toString(),
            tier: input.tier,
          },
        };
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      return { url: session.url };
    }),

  // Create portal session for managing subscription
  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider) throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });

    const sub = await db.getProviderSubscription(provider.id);
    if (!sub?.stripeCustomerId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No active subscription found" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${ctx.req.headers.origin}/provider/dashboard?tab=subscription`,
    });

    return { url: session.url };
  }),

  // Check feature access for current tier
  checkAccess: protectedProcedure
    .input(z.object({
      feature: z.enum(["customSlug", "prioritySearch", "customBranding", "analyticsAccess", "premiumSupport", "featuredListing"]),
    }))
    .query(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) return { allowed: false, currentTier: "free" as const, requiredTier: "basic" as const };

      const tier = await db.getProviderTier(provider.id);
      const limits = SUBSCRIPTION_TIERS[tier].limits;
      const allowed = limits[input.feature] === true;

      // Find minimum tier that allows this feature
      let requiredTier: SubscriptionTier = "premium";
      for (const t of ["free", "basic", "premium"] as SubscriptionTier[]) {
        if (SUBSCRIPTION_TIERS[t].limits[input.feature]) {
          requiredTier = t;
          break;
        }
      }

      return { allowed, currentTier: tier, requiredTier };
    }),

  // Admin: get subscription analytics
  analytics: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
    }
    return await db.getSubscriptionAnalytics();
  }),
});
