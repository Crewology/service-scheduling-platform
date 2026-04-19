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
    // Get raw conversation list from db-legacy (grouped by conversation partner)
    const rawConversations = await db.getUserConversations(ctx.user.id);
    
    if (!rawConversations || rawConversations.length === 0) return [];

    // Enrich each conversation with user info, booking context, and unread count
    const enriched = await Promise.all(
      rawConversations.map(async (msg: any) => {
        const otherUserId = msg.senderId === ctx.user.id ? msg.recipientId : msg.senderId;
        
        // Get the other user's info
        let otherUserName = "Unknown User";
        let otherUserPhoto: string | null = null;
        try {
          const otherUser = await db.getUserById(otherUserId);
          if (otherUser) {
            otherUserName = otherUser.name || otherUser.email || "Unknown User";
            otherUserPhoto = otherUser.profilePhotoUrl || null;
          }
          // If the other user is a provider, use business name
          const otherProvider = await db.getProviderByUserId(otherUserId);
          if (otherProvider) {
            otherUserName = otherProvider.businessName || otherUserName;
          }
        } catch {
          // Non-blocking
        }

        // Get booking context if available
        let bookingLabel: string | null = null;
        let bookingId: number | null = msg.bookingId || null;
        if (bookingId) {
          try {
            const booking = await db.getBookingById(bookingId);
            if (booking) {
              bookingLabel = `Booking #${booking.bookingNumber}`;
            }
          } catch {
            // Non-blocking
          }
        }

        // Count unread messages from this conversation partner
        let unreadCount = 0;
        try {
          const { getDb } = await import("../db/connection");
          const { messages: messagesTable } = await import("../../drizzle/schema");
          const { eq, and } = await import("drizzle-orm");
          const database = await getDb();
          if (database) {
            const result = await database.select({ count: (await import("drizzle-orm")).sql<number>`COUNT(*)` })
              .from(messagesTable)
              .where(and(
                eq(messagesTable.conversationId, msg.conversationId),
                eq(messagesTable.recipientId, ctx.user.id),
                eq(messagesTable.isRead, false)
              ));
            unreadCount = result[0]?.count || 0;
          }
        } catch {
          // Non-blocking
        }

        return {
          conversationId: msg.conversationId,
          otherUserId,
          otherUserName,
          otherUserPhoto,
          lastMessage: msg.messageText,
          lastAt: msg.createdAt,
          bookingId,
          bookingLabel,
          unreadCount,
        };
      })
    );

    return enriched;
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
  
  startConversation: protectedProcedure
    .input(z.object({
      recipientId: z.number(),
      messageText: z.string().min(1).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.recipientId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot message yourself" });
      }
      // Check recipient exists
      const recipient = await db.getUserById(input.recipientId);
      if (!recipient) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      const ids = [ctx.user.id, input.recipientId].sort((a, b) => a - b);
      const conversationId = `conv-${ids[0]}-${ids[1]}`;
      
      await db.createMessage({
        conversationId,
        senderId: ctx.user.id,
        recipientId: input.recipientId,
        messageText: input.messageText,
      });
      
      // Push notifications
      try {
        const preview = input.messageText.length > 100 ? input.messageText.slice(0, 100) + "..." : input.messageText;
        await db.createNotification({
          userId: input.recipientId,
          notificationType: "message_received",
          title: "New Message",
          message: `${ctx.user.name || "Someone"}: ${preview}`,
          actionUrl: `/messages`,
        });
        const { sseManager } = await import("../sseManager");
        sseManager.pushMessageNotification(input.recipientId, {
          conversationId,
          senderId: ctx.user.id,
          senderName: ctx.user.name || "Someone",
          messagePreview: preview,
        });
        const { sendPushNotification } = await import("../notifications/pushHelper");
        sendPushNotification("message_received", { userId: input.recipientId }, {
          customerName: ctx.user.name || "Someone",
          providerName: ctx.user.name || "Someone",
          message: preview,
        });
      } catch (err) {
        console.error("[Message] Notification failed (non-blocking):", err);
      }
      
      return { conversationId };
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
