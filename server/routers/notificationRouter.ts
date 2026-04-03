import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const notificationRouter = router({
  list: protectedProcedure
    .input(z.object({ unreadOnly: z.boolean().default(false) }))
    .query(async ({ ctx, input }) => {
      return await db.getUserNotifications(ctx.user.id, input.unreadOnly);
    }),
    
  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await db.markNotificationAsRead(input.notificationId);
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await db.markAllNotificationsAsRead(ctx.user.id);
    return { success: true };
  }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const notifications = await db.getUserNotifications(ctx.user.id, true);
    return { count: notifications.length };
  }),

  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    return await db.getNotificationPreferences(ctx.user.id);
  }),

  updatePreferences: protectedProcedure
    .input(z.object({
      emailEnabled: z.boolean().optional(),
      smsEnabled: z.boolean().optional(),
      pushEnabled: z.boolean().optional(),
      bookingEmail: z.boolean().optional(),
      reminderEmail: z.boolean().optional(),
      messageEmail: z.boolean().optional(),
      paymentEmail: z.boolean().optional(),
      marketingEmail: z.boolean().optional(),
      bookingSms: z.boolean().optional(),
      reminderSms: z.boolean().optional(),
      messageSms: z.boolean().optional(),
      paymentSms: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await db.upsertNotificationPreferences(ctx.user.id, input);
    }),

  unsubscribe: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const success = await db.unsubscribeAllEmail(input.token);
      return { success };
    }),

  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const prefs = await db.getPreferencesByUnsubscribeToken(input.token);
      if (!prefs) return null;
      return {
        emailEnabled: prefs.emailEnabled,
        bookingEmail: prefs.bookingEmail,
        reminderEmail: prefs.reminderEmail,
        messageEmail: prefs.messageEmail,
        paymentEmail: prefs.paymentEmail,
        marketingEmail: prefs.marketingEmail,
      };
    }),
});
