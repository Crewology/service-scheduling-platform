import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import Stripe from "stripe";
import { ENV } from "./_core/env";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

const stripe = new Stripe(ENV.stripeSecretKey!, {
  apiVersion: "2025-12-18.acacia" as any,
});

export const stripeConnectRouter = router({
  // Start Stripe Connect onboarding — creates an Express account and returns an onboarding link
  startOnboarding: protectedProcedure
    .input(z.object({
      origin: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider) throw new TRPCError({ code: "NOT_FOUND", message: "Provider profile not found" });

      // If already has a Stripe account, return a new onboarding link
      if (provider.stripeAccountId) {
        const accountLink = await stripe.accountLinks.create({
          account: provider.stripeAccountId,
          refresh_url: `${input.origin}/provider/dashboard?stripe=refresh`,
          return_url: `${input.origin}/provider/dashboard?stripe=return`,
          type: "account_onboarding",
        });
        return { url: accountLink.url, accountId: provider.stripeAccountId };
      }

      // Create a new Express account
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        email: ctx.user.email || undefined,
        business_type: provider.businessType === "sole_proprietor" ? "individual" : "company",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          providerId: provider.id.toString(),
          userId: ctx.user.id.toString(),
          platform: "ologycrew",
        },
      });

      const accountId = account.id;

      await db.updateProviderStripeAccount(provider.id, {
        stripeAccountId: accountId,
        stripeAccountStatus: "onboarding",
      });

      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${input.origin}/provider/dashboard?stripe=refresh`,
        return_url: `${input.origin}/provider/dashboard?stripe=return`,
        type: "account_onboarding",
      });

      return { url: accountLink.url, accountId };
    }),

  // Check the status of the provider's Stripe Connect account
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider) throw new TRPCError({ code: "NOT_FOUND", message: "Provider profile not found" });

    if (!provider.stripeAccountId) {
      return {
        connected: false,
        status: "not_connected" as const,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
      };
    }

    try {
      const account = await stripe.accounts.retrieve(provider.stripeAccountId);

      const newStatus = account.charges_enabled && account.payouts_enabled
        ? "active"
        : account.details_submitted
          ? "restricted"
          : "onboarding";

      await db.updateProviderStripeAccount(provider.id, {
        stripeAccountStatus: newStatus,
        stripeOnboardingComplete: account.details_submitted || false,
        payoutEnabled: account.payouts_enabled || false,
      });

      return {
        connected: true,
        status: newStatus,
        chargesEnabled: account.charges_enabled || false,
        payoutsEnabled: account.payouts_enabled || false,
        detailsSubmitted: account.details_submitted || false,
      };
    } catch (error) {
      console.error("[StripeConnect] Error retrieving account:", error);
      return {
        connected: true,
        status: provider.stripeAccountStatus,
        chargesEnabled: false,
        payoutsEnabled: provider.payoutEnabled,
        detailsSubmitted: provider.stripeOnboardingComplete,
      };
    }
  }),

  // Get a link to the Stripe Express Dashboard
  getDashboardLink: protectedProcedure.mutation(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider?.stripeAccountId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No Stripe account connected" });
    }

    const loginLink = await stripe.accounts.createLoginLink(provider.stripeAccountId);
    return { url: loginLink.url };
  }),

  // Get a new onboarding link (for resuming incomplete onboarding)
  getOnboardingLink: protectedProcedure
    .input(z.object({ origin: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (!provider?.stripeAccountId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No Stripe account connected" });
      }

      const accountLink = await stripe.accountLinks.create({
        account: provider.stripeAccountId,
        refresh_url: `${input.origin}/provider/dashboard?stripe=refresh`,
        return_url: `${input.origin}/provider/dashboard?stripe=return`,
        type: "account_onboarding",
      });

      return { url: accountLink.url };
    }),

  // Get the provider's Stripe balance
  getBalance: protectedProcedure.query(async ({ ctx }) => {
    const provider = await db.getProviderByUserId(ctx.user.id);
    if (!provider?.stripeAccountId) {
      return { available: 0, pending: 0 };
    }

    try {
      const balance = await stripe.balance.retrieve({
        stripeAccount: provider.stripeAccountId,
      });

      const available = balance.available.reduce((sum, b) => sum + b.amount, 0) / 100;
      const pending = balance.pending.reduce((sum, b) => sum + b.amount, 0) / 100;

      return { available, pending };
    } catch (error) {
      console.error("[StripeConnect] Error retrieving balance:", error);
      return { available: 0, pending: 0 };
    }
  }),
});
