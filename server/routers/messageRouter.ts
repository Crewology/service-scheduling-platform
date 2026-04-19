import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";

// Allowed MIME types for message attachments
const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

async function pushMessageNotifications(
  senderId: number,
  senderName: string,
  recipientId: number,
  messageText: string,
  conversationId: string,
  bookingId?: number,
  hasAttachment?: boolean,
) {
  try {
    const preview = hasAttachment && !messageText
      ? "📎 Sent an attachment"
      : messageText.length > 100 ? messageText.slice(0, 100) + "..." : messageText;
    
    await db.createNotification({
      userId: recipientId,
      notificationType: "message_received",
      title: "New Message",
      message: `${senderName}: ${preview}`,
      actionUrl: `/messages?conversation=${conversationId}`,
    });

    const { sseManager } = await import("../sseManager");
    sseManager.pushMessageNotification(recipientId, {
      conversationId,
      senderId,
      senderName,
      messagePreview: preview,
      bookingId,
    });

    const { sendPushNotification } = await import("../notifications/pushHelper");
    sendPushNotification("message_received", { userId: recipientId }, {
      customerName: senderName,
      providerName: senderName,
      message: preview,
    });
  } catch (err) {
    console.error("[Message] Notification failed (non-blocking):", err);
  }
}

export const messageRouter = router({
  // Upload a file attachment for messages — returns the S3 URL
  uploadAttachment: protectedProcedure
    .input(z.object({
      base64: z.string(),
      mimeType: z.string(),
      fileName: z.string(),
      fileSize: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `File type not allowed. Supported: images, PDF, Word, Excel, text files.`,
        });
      }
      if (input.fileSize > MAX_FILE_SIZE_BYTES) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `File too large. Maximum size is 10MB.`,
        });
      }

      const { storagePut } = await import("../storage");
      const buffer = Buffer.from(input.base64, "base64");
      const suffix = Math.random().toString(36).slice(2, 10);
      const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileKey = `message-attachments/${ctx.user.id}/${Date.now()}-${suffix}-${safeFileName}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType);

      return { url, fileName: input.fileName, mimeType: input.mimeType };
    }),

  send: protectedProcedure
    .input(z.object({
      recipientId: z.number(),
      messageText: z.string(),
      bookingId: z.number().optional(),
      attachmentUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // At least one of messageText or attachmentUrl must be provided
      if (!input.messageText.trim() && !input.attachmentUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Message text or attachment required" });
      }

      const ids = [ctx.user.id, input.recipientId].sort((a, b) => a - b);
      const conversationId = `conv-${ids[0]}-${ids[1]}`;
      
      await db.createMessage({
        conversationId,
        senderId: ctx.user.id,
        recipientId: input.recipientId,
        messageText: input.messageText || (input.attachmentUrl ? "📎 Attachment" : ""),
        bookingId: input.bookingId,
        attachmentUrl: input.attachmentUrl || null,
      });
      
      const msgs = await db.getConversationMessages(conversationId);
      const newMsg = msgs[msgs.length - 1]!;

      await pushMessageNotifications(
        ctx.user.id,
        ctx.user.name || "Someone",
        input.recipientId,
        input.messageText,
        conversationId,
        input.bookingId,
        !!input.attachmentUrl,
      );

      return newMsg;
    }),
    
  getConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ input }) => {
      return await db.getConversationMessages(input.conversationId);
    }),
    
  myConversations: protectedProcedure.query(async ({ ctx }) => {
    const rawConversations = await db.getUserConversations(ctx.user.id);
    
    if (!rawConversations || rawConversations.length === 0) return [];

    const enriched = await Promise.all(
      rawConversations.map(async (msg: any) => {
        const otherUserId = msg.senderId === ctx.user.id ? msg.recipientId : msg.senderId;
        
        let otherUserName = "Unknown User";
        let otherUserPhoto: string | null = null;
        try {
          const otherUser = await db.getUserById(otherUserId);
          if (otherUser) {
            otherUserName = otherUser.name || otherUser.email || "Unknown User";
            otherUserPhoto = otherUser.profilePhotoUrl || null;
          }
          const otherProvider = await db.getProviderByUserId(otherUserId);
          if (otherProvider) {
            otherUserName = otherProvider.businessName || otherUserName;
          }
        } catch {
          // Non-blocking
        }

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

        // Determine last message preview (check for attachment)
        const lastMessage = msg.attachmentUrl && !msg.messageText?.trim()
          ? "📎 Attachment"
          : msg.messageText;

        return {
          conversationId: msg.conversationId,
          otherUserId,
          otherUserName,
          otherUserPhoto,
          lastMessage,
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
      attachmentUrl: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.recipientId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot message yourself" });
      }
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
        attachmentUrl: input.attachmentUrl || null,
      });
      
      await pushMessageNotifications(
        ctx.user.id,
        ctx.user.name || "Someone",
        input.recipientId,
        input.messageText,
        conversationId,
        undefined,
        !!input.attachmentUrl,
      );
      
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
