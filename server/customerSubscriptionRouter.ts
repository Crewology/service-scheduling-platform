import { z } from "zod";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import { protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { CUSTOMER_TIERS, CUSTOMER_STRIPE_PRODUCT_NAME, type CustomerTier } from "./customerSubscription";
import { ENV } from "./_core/env";

const stripe = new Stripe(ENV.stripeSecretKey, { apiVersion: "2025-02-24.acacia" as any });

// Cache for Stripe price IDs
const priceCache = new Map<string, string>();

async function getOrCreateCustomerStripePrice(tier: "pro" | "business", interval: "month" | "year"): Promise<string> {
  const cacheKey = `customer_${tier}_${interval}`;
  if (priceCache.has(cacheKey)) return priceCache.get(cacheKey)!;

  const config = CUSTOMER_TIERS[tier];
  const amount = interval === "month" ? config.monthlyPrice : config.yearlyPrice;

  // Search for existing product
  const products = await stripe.products.search({
    query: `name:"${CUSTOMER_STRIPE_PRODUCT_NAME} - ${config.name}"`,
  });

  let productId: string;
  if (products.data.length > 0) {
    productId = products.data[0].id;
  } else {
    const product = await stripe.products.create({
      name: `${CUSTOMER_STRIPE_PRODUCT_NAME} - ${config.name}`,
      description: `OlogyCrew ${config.name} plan for customers`,
      metadata: { tier, type: "customer" },
    });
    productId = product.id;
  }

  // Search for existing price
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    recurring: { interval },
  });

  const targetAmount = Math.round(amount * 100);
  const existingPrice = prices.data.find(
    (p) => p.unit_amount === targetAmount && p.recurring?.interval === interval
  );

  if (existingPrice) {
    priceCache.set(cacheKey, existingPrice.id);
    return existingPrice.id;
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: targetAmount,
    currency: "usd",
    recurring: { interval },
    metadata: { tier, type: "customer" },
  });

  priceCache.set(cacheKey, price.id);
  return price.id;
}

export const customerSubscriptionRouter = router({
  // Get current subscription status
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await db.getCustomerSubscription(ctx.user.id);
    const tier = await db.getCustomerTier(ctx.user.id);
    const favoriteCount = await db.getUserFavoriteCount(ctx.user.id);
    const tierConfig = CUSTOMER_TIERS[tier];

    return {
      subscription,
      currentTier: tier,
      tierConfig,
      usage: {
        savedProviders: favoriteCount,
        savedProviderLimit: tierConfig.savedProviderLimit,
        isAtLimit: tierConfig.savedProviderLimit !== -1 && favoriteCount >= tierConfig.savedProviderLimit,
      },
    };
  }),

  // Get all tier configs for pricing page
  getTiers: protectedProcedure.query(() => {
    return CUSTOMER_TIERS;
  }),

  // Create checkout session for customer subscription
  createCheckout: protectedProcedure
    .input(z.object({
      tier: z.enum(["pro", "business"]),
      interval: z.enum(["month", "year"]).default("month"),
    }))
    .mutation(async ({ ctx, input }) => {
      const currentTier = await db.getCustomerTier(ctx.user.id);
      if (currentTier === input.tier) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Already subscribed to this tier" });
      }

      const priceId = await getOrCreateCustomerStripePrice(input.tier, input.interval);

      // Get or create Stripe customer
      const existingSub = await db.getCustomerSubscription(ctx.user.id);
      let customerId = existingSub?.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: ctx.user.email || undefined,
          name: ctx.user.name || undefined,
          metadata: {
            userId: ctx.user.id.toString(),
            type: "customer",
          },
        });
        customerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${ctx.req.headers.origin}/saved-providers?status=success`,
        cancel_url: `${ctx.req.headers.origin}/pricing?status=cancelled`,
        metadata: {
          userId: ctx.user.id.toString(),
          tier: input.tier,
          type: "customer_subscription",
        },
        subscription_data: {
          metadata: {
            userId: ctx.user.id.toString(),
            tier: input.tier,
            type: "customer_subscription",
          },
        },
        allow_promotion_codes: true,
      });

      return { url: session.url };
    }),

  // Create portal session for managing subscription
  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const sub = await db.getCustomerSubscription(ctx.user.id);
    if (!sub?.stripeCustomerId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No active subscription found" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${ctx.req.headers.origin}/saved-providers`,
    });

    return { url: session.url };
  }),

  // Check if user can save more providers (used before toggling favorite)
  canSaveMore: protectedProcedure.query(async ({ ctx }) => {
    const tier = await db.getCustomerTier(ctx.user.id);
    const count = await db.getUserFavoriteCount(ctx.user.id);
    const config = CUSTOMER_TIERS[tier];
    const limit = config.savedProviderLimit;
    const canSave = limit === -1 || count < limit;

    return {
      canSave,
      currentCount: count,
      limit,
      currentTier: tier,
      tierName: config.name,
    };
  }),
});
