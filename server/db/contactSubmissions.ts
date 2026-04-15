import { getDb } from "./connection";
import { contactSubmissions } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

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
