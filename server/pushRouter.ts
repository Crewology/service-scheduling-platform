import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db/connection";
import { pushSubscriptions } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { sendPushToUser } from "./notifications/providers/push";

export const pushRouter = router({
  /**
   * Subscribe to push notifications.
   * Stores the browser's PushSubscription data.
   */
  subscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        p256dh: z.string(),
        auth: z.string(),
        userAgent: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if this endpoint already exists for this user
      const existing = await db
        .select()
        .from(pushSubscriptions)
        .where(
          and(
            eq(pushSubscriptions.userId, ctx.user.id),
            eq(pushSubscriptions.endpoint, input.endpoint)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing subscription (keys may have changed)
        await db
          .update(pushSubscriptions)
          .set({
            p256dh: input.p256dh,
            auth: input.auth,
            isActive: true,
            lastUsedAt: new Date(),
            userAgent: input.userAgent || null,
          })
          .where(eq(pushSubscriptions.id, existing[0].id));

        return { success: true, updated: true };
      }

      // Create new subscription
      await db.insert(pushSubscriptions).values({
        userId: ctx.user.id,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent || null,
        isActive: true,
      });

      return { success: true, updated: false };
    }),

  /**
   * Unsubscribe from push notifications.
   * Deactivates the subscription for the given endpoint.
   */
  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(pushSubscriptions)
        .set({ isActive: false })
        .where(
          and(
            eq(pushSubscriptions.userId, ctx.user.id),
            eq(pushSubscriptions.endpoint, input.endpoint)
          )
        );

      return { success: true };
    }),

  /**
   * Check if the current user has any active push subscriptions.
   */
  status: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { subscribed: false, count: 0 };

    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, ctx.user.id),
          eq(pushSubscriptions.isActive, true)
        )
      );

    return {
      subscribed: subs.length > 0,
      count: subs.length,
    };
  }),

  /**
   * Send a test push notification to the current user.
   */
  test: protectedProcedure.mutation(async ({ ctx }) => {
    const sent = await sendPushToUser(ctx.user.id, {
      title: "OlogyCrew Test",
      body: "Push notifications are working! You'll receive booking alerts here.",
      url: "/notifications",
      tag: "test-notification",
    });

    return { success: sent };
  }),
});
