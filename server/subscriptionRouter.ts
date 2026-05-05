import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import Stripe from "stripe";
import { ENV } from "./_core/env";
import * as db from "./db";
import { SUBSCRIPTION_TIERS, STRIPE_PRODUCT_NAME, getTrialDays, type SubscriptionTier } from "./products";
import { sendTrialStartedNotification, checkAndSendTrialMilestoneNotification } from "./trialNotifications";

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

  // Start 14-day Professional trial for new providers
  startProfessionalTrial: protectedProcedure.mutation(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
    }

    // Check if already has an active/trialing subscription
    const existing = await db.getProviderSubscription(provider.id);
    if (existing && existing.status === "trialing") {
      return { tier: existing.tier, status: existing.status, trialEndsAt: existing.trialEndsAt };
    }
    if (existing && existing.status === "active" && existing.tier !== "free") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Already have an active paid subscription" });
    }

    // Start 14-day Professional trial
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    await db.upsertProviderSubscription({
      providerId: provider.id,
      tier: "basic",
      status: "trialing",
      trialEndsAt: trialEnd,
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
    });

    // Send trial started email notification (fire-and-forget)
    const user = ctx.user;
    sendTrialStartedNotification({
      providerId: provider.id,
      userId: user.id,
      email: user.email || undefined,
      providerName: provider.businessName,
      daysRemaining: 14,
      trialEndsAt: trialEnd,
    }).catch(err => console.error("[Trial] Failed to send trial_started notification:", err));

    return { tier: "basic" as const, status: "trialing" as const, trialEndsAt: trialEnd };
  }),

  // Check and handle trial expiry (called on dashboard load)
  checkTrialStatus: protectedProcedure.query(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider) return null;

    const sub = await db.getProviderSubscription(provider.id);
    if (!sub) return null;

    // If trialing, check if expired
    if (sub.status === "trialing" && sub.trialEndsAt) {
      const now = new Date();
      const trialEnd = new Date(sub.trialEndsAt);
      const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      if (daysRemaining <= 0) {
        // Trial expired — downgrade to free
        await db.upsertProviderSubscription({
          providerId: provider.id,
          tier: "free",
          status: "active",
          trialEndsAt: undefined,
          currentPeriodStart: undefined,
          currentPeriodEnd: undefined,
        });
      // Send trial expired notification (fire-and-forget)
      const user = ctx.user;
      checkAndSendTrialMilestoneNotification({
        providerId: provider.id,
        userId: user.id,
        email: user.email || undefined,
        providerName: provider.businessName,
        daysRemaining: 0,
        trialEndsAt: new Date(sub.trialEndsAt!),
      }).catch(err => console.error("[Trial] Failed to send trial_expired notification:", err));

      return {
        isTrialing: false,
        trialExpired: true,
        trialTier: "basic" as const,
        daysRemaining: 0,
        trialEndsAt: sub.trialEndsAt,
        currentTier: "free" as const,
      };
      }

      // Check and send milestone notifications (7, 3, 1 day) — fire-and-forget
      const user = ctx.user;
      checkAndSendTrialMilestoneNotification({
        providerId: provider.id,
        userId: user.id,
        email: user.email || undefined,
        providerName: provider.businessName,
        daysRemaining,
        trialEndsAt: new Date(sub.trialEndsAt!),
      }).catch(err => console.error("[Trial] Failed to send milestone notification:", err));

      return {
        isTrialing: true,
        trialExpired: false,
        trialTier: sub.tier,
        daysRemaining,
        trialEndsAt: sub.trialEndsAt,
        currentTier: sub.tier,
        showUrgentNudge: daysRemaining <= 3,
      };
    }

    return {
      isTrialing: false,
      trialExpired: false,
      trialTier: null,
      daysRemaining: 0,
      trialEndsAt: null,
      currentTier: sub.tier,
    };
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

  // Downgrade subscription immediately (with prorated credit)
  downgrade: protectedProcedure
    .input(z.object({
      targetTier: z.enum(["free", "basic"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Must be a provider" });
      }

      const sub = await db.getProviderSubscription(provider.id);
      if (!sub) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No subscription found" });
      }

      const currentTier = sub.tier;
      const targetTier = input.targetTier;

      // Validate this is actually a downgrade
      const tierOrder: Record<string, number> = { free: 0, basic: 1, premium: 2 };
      if (tierOrder[targetTier] >= tierOrder[currentTier]) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Target tier must be lower than current tier" });
      }

      // If downgrading to free, cancel the Stripe subscription immediately with proration
      if (targetTier === "free") {
        if (sub.stripeSubscriptionId) {
          try {
            await stripe.subscriptions.cancel(sub.stripeSubscriptionId, {
              prorate: true, // Issue prorated credit
            });
          } catch (err: any) {
            console.error("[Downgrade] Failed to cancel Stripe subscription:", err.message);
            // If subscription is already cancelled in Stripe, continue
            if (!err.message?.includes("No such subscription")) {
              throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to cancel subscription" });
            }
          }
        }

        // Update local subscription record
        await db.upsertProviderSubscription({
          providerId: provider.id,
          tier: "free",
          status: "active",
          stripeSubscriptionId: undefined,
          currentPeriodStart: undefined,
          currentPeriodEnd: undefined,
        });

        return { success: true, newTier: "free" as const, message: "Downgraded to Starter. Prorated credit issued." };
      }

      // If downgrading from premium to basic, switch the subscription price immediately
      if (currentTier === "premium" && targetTier === "basic") {
        if (!sub.stripeSubscriptionId) {
          // No Stripe subscription (e.g. trial) — just update locally
          await db.upsertProviderSubscription({
            providerId: provider.id,
            tier: "basic",
            status: sub.status,
          });
          return { success: true, newTier: "basic" as const, message: "Downgraded to Professional." };
        }

        try {
          // Get the current subscription from Stripe
          const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
          const currentItem = stripeSubscription.items.data[0];

          if (!currentItem) {
            throw new Error("No subscription item found");
          }

          // Get the interval from the current subscription
          const currentInterval = currentItem.price.recurring?.interval as "month" | "year" || "month";
          
          // Get or create the new price for the basic tier
          const newPriceId = await getOrCreateStripePrice("basic", currentInterval);

          // Update the subscription with the new price (immediate proration)
          await stripe.subscriptions.update(sub.stripeSubscriptionId, {
            items: [{
              id: currentItem.id,
              price: newPriceId,
            }],
            proration_behavior: "create_prorations", // Immediate prorated credit
          });

          // Update local subscription record
          await db.upsertProviderSubscription({
            providerId: provider.id,
            tier: "basic",
            status: "active",
          });

          return { success: true, newTier: "basic" as const, message: "Downgraded to Professional. Prorated credit applied." };
        } catch (err: any) {
          console.error("[Downgrade] Failed to update Stripe subscription:", err.message);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to downgrade subscription" });
        }
      }

      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid downgrade path" });
    }),

  // Admin: get subscription analytics
  analytics: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
    }
    return await db.getSubscriptionAnalytics();
  }),
});
