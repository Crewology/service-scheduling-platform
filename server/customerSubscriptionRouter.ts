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
        payment_method_types: ["card", "paypal"],
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

  // Booking analytics (Business tier only)
  bookingAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const tier = await db.getCustomerTier(ctx.user.id);
    const tierConfig = CUSTOMER_TIERS[tier];
    if (!tierConfig.perks.bookingAnalytics) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Booking analytics is available for Business subscribers. Upgrade to access spending insights.",
      });
    }

    const [summary, monthlySpending, topProviders, categoryBreakdown, recentBookings] = await Promise.all([
      db.getCustomerSpendingSummary(ctx.user.id),
      db.getCustomerMonthlySpending(ctx.user.id, 12),
      db.getCustomerTopProviders(ctx.user.id, 10),
      db.getCustomerCategoryBreakdown(ctx.user.id),
      db.getCustomerRecentBookings(ctx.user.id, 20),
    ]);

    return { summary, monthlySpending, topProviders, categoryBreakdown, recentBookings };
  }),

  // Export booking history (Business tier only)
  exportBookings: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      format: z.enum(["csv", "json"]).default("csv"),
    }))
    .query(async ({ ctx, input }) => {
      const tier = await db.getCustomerTier(ctx.user.id);
      const tierConfig = CUSTOMER_TIERS[tier];
      if (!tierConfig.perks.bookingAnalytics) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Booking export is available for Business subscribers.",
        });
      }

      const bookings = await db.getCustomerBookingsForExport(
        ctx.user.id,
        input.startDate,
        input.endDate,
      );

      if (input.format === "csv") {
        const headers = [
          "Booking #", "Date", "Start Time", "End Time", "Duration (min)",
          "Status", "Type", "Location Type", "Service", "Provider",
          "Category", "Subtotal", "Travel Fee", "Platform Fee", "Total", "Notes",
        ];
        const rows = bookings.map(b => [
          b.bookingNumber,
          b.bookingDate,
          b.startTime,
          b.endTime,
          b.durationMinutes,
          b.status,
          b.bookingType,
          b.locationType,
          `"${(b.serviceName || "").replace(/"/g, '""')}"`,
          `"${(b.businessName || "").replace(/"/g, '""')}"`,
          `"${(b.categoryName || "").replace(/"/g, '""')}"`,
          b.subtotal,
          b.travelFee,
          b.platformFee,
          b.totalAmount,
          `"${(b.customerNotes || "").replace(/"/g, '""')}"`,
        ]);

        const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        return { data: csv, count: bookings.length, format: "csv" as const };
      }

      return { data: JSON.stringify(bookings, null, 2), count: bookings.length, format: "json" as const };
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
