import { getDb } from "./connection";
import { contactSubmissions, contactReplies, replyTemplates, users } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// ─── Contact Submissions ────────────────────────────────────────────────────

export async function createContactSubmission(data: {
  name: string;
  email: string;
  subject: string;
  category: "general" | "booking" | "payment" | "provider" | "technical" | "other";
  message: string;
  userId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(contactSubmissions).values({
    name: data.name,
    email: data.email,
    subject: data.subject,
    category: data.category,
    message: data.message,
    userId: data.userId ?? null,
  }).$returningId();
  return result;
}

export async function getContactSubmissions(limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(contactSubmissions).orderBy(desc(contactSubmissions.createdAt)).limit(limit);
}

export async function getContactSubmissionsFiltered(filters: {
  status?: "new" | "in_progress" | "resolved" | "closed";
  category?: "general" | "booking" | "payment" | "provider" | "technical" | "other";
  limit?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [];
  if (filters.status) {
    conditions.push(eq(contactSubmissions.status, filters.status));
  }
  if (filters.category) {
    conditions.push(eq(contactSubmissions.category, filters.category));
  }

  const query = db.select().from(contactSubmissions);
  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(desc(contactSubmissions.createdAt)).limit(filters.limit ?? 100);
  }
  return query.orderBy(desc(contactSubmissions.createdAt)).limit(filters.limit ?? 100);
}

export async function getContactSubmissionById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [submission] = await db.select().from(contactSubmissions).where(eq(contactSubmissions.id, id)).limit(1);
  return submission || null;
}

export async function updateContactSubmissionStatus(
  id: number,
  status: "new" | "in_progress" | "resolved" | "closed"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(contactSubmissions)
    .set({
      status,
      resolvedAt: status === "resolved" || status === "closed" ? new Date() : null,
    })
    .where(eq(contactSubmissions.id, id));
}

export async function getContactSubmissionStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db.select({
    status: contactSubmissions.status,
    count: sql<number>`COUNT(*)`.as("count"),
  }).from(contactSubmissions).groupBy(contactSubmissions.status);

  const stats: Record<string, number> = { new: 0, in_progress: 0, resolved: 0, closed: 0, total: 0 };
  for (const row of rows) {
    stats[row.status] = Number(row.count);
    stats.total += Number(row.count);
  }
  return stats;
}

// ─── Contact Replies ────────────────────────────────────────────────────────

export async function createContactReply(data: {
  submissionId: number;
  adminUserId: number;
  message: string;
  templateId?: number;
  emailSent?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(contactReplies).values({
    submissionId: data.submissionId,
    adminUserId: data.adminUserId,
    message: data.message,
    templateId: data.templateId ?? null,
    emailSent: data.emailSent ?? false,
  }).$returningId();
  return result;
}

export async function getContactReplies(submissionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select({
      reply: contactReplies,
      adminName: users.name,
    })
    .from(contactReplies)
    .leftJoin(users, eq(contactReplies.adminUserId, users.id))
    .where(eq(contactReplies.submissionId, submissionId))
    .orderBy(desc(contactReplies.createdAt));
  return rows;
}

// ─── Reply Templates ────────────────────────────────────────────────────────

export async function createReplyTemplate(data: {
  name: string;
  category: "general" | "booking" | "payment" | "provider" | "technical" | "other";
  subject: string;
  body: string;
  createdBy?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(replyTemplates).values({
    name: data.name,
    category: data.category,
    subject: data.subject,
    body: data.body,
    createdBy: data.createdBy ?? null,
  }).$returningId();
  return result;
}

export async function getReplyTemplates(category?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (category && category !== "all") {
    return db.select().from(replyTemplates)
      .where(and(
        eq(replyTemplates.isActive, true),
        eq(replyTemplates.category, category as any),
      ))
      .orderBy(desc(replyTemplates.usageCount));
  }
  return db.select().from(replyTemplates)
    .where(eq(replyTemplates.isActive, true))
    .orderBy(desc(replyTemplates.usageCount));
}

export async function updateReplyTemplate(id: number, data: {
  name?: string;
  category?: "general" | "booking" | "payment" | "provider" | "technical" | "other";
  subject?: string;
  body?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(replyTemplates).set(data).where(eq(replyTemplates.id, id));
}

export async function deleteReplyTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(replyTemplates).set({ isActive: false }).where(eq(replyTemplates.id, id));
}

export async function incrementTemplateUsage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(replyTemplates)
    .set({ usageCount: sql`${replyTemplates.usageCount} + 1` })
    .where(eq(replyTemplates.id, id));
}
