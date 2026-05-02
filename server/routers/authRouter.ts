import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "../_core/env";

export const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),

  selectRole: protectedProcedure
    .input(z.object({
      role: z.enum(["customer", "provider"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.updateUserProfile(ctx.user.id, {
        role: input.role,
        hasSelectedRole: true,
      });

      // Send welcome email for customers (providers get theirs when they create their profile)
      if (input.role === "customer" && ctx.user.email) {
        try {
          const { sendNotification } = await import("../notifications");
          await sendNotification({
            type: "welcome_customer",
            channel: "email",
            recipient: {
              userId: ctx.user.id,
              email: ctx.user.email,
              name: ctx.user.name || undefined,
            },
            data: {
              customerName: ctx.user.name || ctx.user.firstName || "there",
            },
          });
        } catch (err) {
          console.error("[Auth] Failed to send welcome customer email:", err);
        }
      }

      return { success: true, role: input.role };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
  
  /**
   * Delete the current user's account.
   * Requires typing "DELETE" to confirm.
   * Checks for active bookings, anonymizes PII, soft-deletes, and cancels subscriptions.
   */
  deleteAccount: protectedProcedure
    .input(z.object({
      confirmation: z.literal("DELETE"),
    }))
    .mutation(async ({ ctx }) => {
      const userId = ctx.user.id;

      // Block admin self-deletion
      if (ctx.user.role === "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin accounts cannot be self-deleted. Please contact support.",
        });
      }

      // Check for active bookings
      const hasActive = await db.hasActiveBookings(userId);
      if (hasActive) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "You have active bookings (pending, confirmed, or in-progress). Please cancel or complete them before deleting your account.",
        });
      }

      // Cancel Stripe subscriptions if any
      try {
        const Stripe = (await import("stripe")).default;
        const stripe = new Stripe(ENV.stripeSecretKey, { apiVersion: "2025-12-18.acacia" as any });

        // Check customer subscriptions
        const custSub = await db.getCustomerSubscription?.(userId).catch(() => null);
        if (custSub?.stripeSubscriptionId) {
          try {
            await stripe.subscriptions.cancel(custSub.stripeSubscriptionId);
          } catch (e: any) {
            console.warn(`[DeleteAccount] Failed to cancel customer subscription: ${e.message}`);
          }
        }

        // Check provider Stripe connect account — we can't delete it but we note it
        // Provider subscriptions are handled by the db.deleteUserAccount function
      } catch (e: any) {
        console.warn(`[DeleteAccount] Stripe cleanup warning: ${e.message}`);
      }

      // Perform the deletion (anonymize + soft-delete)
      const result = await db.deleteUserAccount(userId);

      // Send account deletion confirmation email directly via SendGrid
      // (We can't use the notification system since the user is now anonymized)
      try {
        const userEmail = ctx.user.email;
        const userName = ctx.user.name || ctx.user.firstName || "User";
        if (userEmail) {
          const { sendAccountDeletionEmail } = await import("../accountDeletionEmail");
          await sendAccountDeletionEmail(userEmail, userName);
        }
      } catch {
        // Email may fail — non-critical
      }

      // Notify owner
      try {
        const { notifyOwner } = await import("../_core/notification");
        await notifyOwner({
          title: "Account Deleted",
          content: `User ${ctx.user.name || ctx.user.email} (ID: ${userId}, role: ${ctx.user.role}) has deleted their account. Provider deactivated: ${result.providerDeactivated}. Services deactivated: ${result.servicesDeactivated}.`,
        });
      } catch {
        // Non-critical
      }

      // Clear session cookie
      const { getSessionCookieOptions } = await import("../_core/cookies");
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });

      return {
        success: true,
        ...result,
      };
    }),

  updateProfile: protectedProcedure
    .input(z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      profilePhotoUrl: z.string().optional(),
      email: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Auto-compose the display name from firstName + lastName
      const updateData: Record<string, any> = { ...input };
      if (input.firstName !== undefined || input.lastName !== undefined) {
        const currentUser = await db.getUserById(ctx.user.id);
        const newFirst = input.firstName ?? currentUser?.firstName ?? "";
        const newLast = input.lastName ?? currentUser?.lastName ?? "";
        updateData.name = [newFirst, newLast].filter(Boolean).join(" ") || currentUser?.name;
      }
      await db.updateUserProfile(ctx.user.id, updateData);
      const updated = await db.getUserById(ctx.user.id);
      return updated!;
    }),
});
