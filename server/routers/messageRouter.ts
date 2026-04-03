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
      return msgs[msgs.length - 1]!;
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
