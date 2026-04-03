import { eq, and, or, desc, sql } from "drizzle-orm";
import { messages, users } from "../../drizzle/schema";
import { getDb } from "./connection";

// ============================================================================
// MESSAGE MANAGEMENT
// ============================================================================

export async function createMessage(data: typeof messages.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(messages).values(data);
  return result;
}

export async function getMessagesBetweenUsers(userId1: number, userId2: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(messages)
    .where(or(
      and(eq(messages.senderId, userId1), eq(messages.recipientId, userId2)),
      and(eq(messages.senderId, userId2), eq(messages.recipientId, userId1))
    ))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
}

export async function getConversationList(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get the latest message for each conversation partner
  const sent = await db.select({
    partnerId: messages.recipientId,
    lastMessage: messages.messageText,
    lastAt: messages.createdAt,
  }).from(messages)
    .where(eq(messages.senderId, userId))
    .orderBy(desc(messages.createdAt));

  const received = await db.select({
    partnerId: messages.senderId,
    lastMessage: messages.messageText,
    lastAt: messages.createdAt,
  }).from(messages)
    .where(eq(messages.recipientId, userId))
    .orderBy(desc(messages.createdAt));

  // Merge and deduplicate by partner
  const partnerMap = new Map<number, { partnerId: number; lastMessage: string | null; lastAt: Date }>();
  for (const msg of [...sent, ...received]) {
    const existing = partnerMap.get(msg.partnerId);
    if (!existing || msg.lastAt > existing.lastAt) {
      partnerMap.set(msg.partnerId, msg);
    }
  }

  return Array.from(partnerMap.values()).sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
}

export async function markMessagesRead(senderId: number, receiverId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(messages)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(messages.senderId, senderId), eq(messages.recipientId, receiverId), eq(messages.isRead, false)));
}

export async function getUnreadMessageCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`COUNT(*)` })
    .from(messages)
    .where(and(eq(messages.recipientId, userId), eq(messages.isRead, false)));
  return result[0]?.count || 0;
}
