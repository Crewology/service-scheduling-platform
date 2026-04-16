import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

export const messageRouter = router({
  send: protectedProcedure
    .input(z.object({
      recipientId: z.number(),
      messageText: z.string(),
      bookingId: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const ids = [ctx.user.id, input.recipientId].sort((a, b) => a - b);
      const conversationId = `conv-${ids[0]}-${ids[1]}`;
      
      await db.createMessage({
        conversationId,
        senderId: ctx.user.id,
        recipientId: input.recipientId,
        messageText: input.messageText,
        bookingId: input.bookingId,
      });
      
      const msgs = await db.getConversationMessages(conversationId);
      const newMsg = msgs[msgs.length - 1]!;

      // Create in-app notification for the recipient (triggers SSE push automatically)
      try {
        const preview = input.messageText.length > 100 ? input.messageText.slice(0, 100) + "..." : input.messageText;
        await db.createNotification({
          userId: input.recipientId,
          notificationType: "message_received",
          title: "New Message",
          message: `${ctx.user.name || "Someone"}: ${preview}`,
          actionUrl: `/messages?conversation=${conversationId}`,
        });

        // Also push a dedicated newMessage event for instant chat updates
        const { sseManager } = await import("../sseManager");
        sseManager.pushMessageNotification(input.recipientId, {
          conversationId,
          senderId: ctx.user.id,
          senderName: ctx.user.name || "Someone",
          messagePreview: preview,
          bookingId: input.bookingId,
        });

        // Send web push notification for messages
        const { sendPushNotification } = await import("../notifications/pushHelper");
        sendPushNotification("message_received", { userId: input.recipientId }, {
          customerName: ctx.user.name || "Someone",
          providerName: ctx.user.name || "Someone",
          message: preview,
        });
      } catch (err) {
        console.error("[Message] Notification failed (non-blocking):", err);
      }

      return newMsg;
    }),
    
  getConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ input }) => {
      return await db.getConversationMessages(input.conversationId);
    }),
    
  myConversations: protectedProcedure.query(async ({ ctx }) => {
    return await db.getUserConversations(ctx.user.id);
  }),
  
  listByBooking: protectedProcedure
    .input(z.object({ bookingId: z.number() }))
    .query(async ({ ctx, input }) => {
      const booking = await db.getBookingById(input.bookingId);
      if (!booking) return [];
      const provider = await db.getProviderByUserId(ctx.user.id);
      if (booking.customerId !== ctx.user.id && booking.providerId !== provider?.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return await db.getMessagesByBooking(input.bookingId);
    }),
  
  markAsRead: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db.markMessagesAsRead(input.conversationId, ctx.user.id);
      return { success: true };
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return await db.getUnreadMessageCount(ctx.user.id);
  }),
});
