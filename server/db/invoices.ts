import { eq, desc, and, sql, like } from "drizzle-orm";
import { getDb } from "./connection";
import { invoices, invoiceLineItems, type InsertInvoice, type InsertInvoiceLineItem } from "../../drizzle/schema";

export async function getNextInvoiceNumber(providerId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  // Find the highest invoice number for this year
  const [latest] = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(like(invoices.invoiceNumber, `${prefix}%`))
    .orderBy(desc(invoices.invoiceNumber))
    .limit(1);

  if (!latest) {
    return `${prefix}0001`;
  }

  const lastNum = parseInt(latest.invoiceNumber.replace(prefix, ""), 10);
  const nextNum = (lastNum + 1).toString().padStart(4, "0");
  return `${prefix}${nextNum}`;
}

export async function createInvoice(
  data: Omit<InsertInvoice, "id" | "createdAt" | "updatedAt">,
  lineItems: Omit<InsertInvoiceLineItem, "id" | "invoiceId">[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(invoices).values(data as any);
  const invoiceId = result.insertId;

  if (lineItems.length > 0) {
    await db.insert(invoiceLineItems).values(
      lineItems.map((item) => ({ ...item, invoiceId }))
    );
  }

  return { id: invoiceId, invoiceNumber: data.invoiceNumber };
}

export async function getInvoiceById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);

  if (!invoice) return null;

  const items = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, id));

  return { ...invoice, lineItems: items };
}

export async function getInvoicesByProvider(providerId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(invoices)
    .where(eq(invoices.providerId, providerId))
    .orderBy(desc(invoices.createdAt));
}

export async function getInvoicesByCustomer(customerId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(invoices)
    .where(eq(invoices.customerId, customerId))
    .orderBy(desc(invoices.createdAt));
}

export async function updateInvoiceStatus(
  id: number,
  status: "draft" | "sent" | "viewed" | "paid" | "overdue" | "cancelled",
  extra?: Partial<{ paidAt: Date; stripePaymentIntentId: string; stripeCheckoutSessionId: string; pdfUrl: string }>
) {
  const db = await getDb();
  if (!db) return;

  const updateData: any = { status };
  if (extra?.paidAt) updateData.paidAt = extra.paidAt;
  if (extra?.stripePaymentIntentId) updateData.stripePaymentIntentId = extra.stripePaymentIntentId;
  if (extra?.stripeCheckoutSessionId) updateData.stripeCheckoutSessionId = extra.stripeCheckoutSessionId;
  if (extra?.pdfUrl) updateData.pdfUrl = extra.pdfUrl;

  await db.update(invoices).set(updateData).where(eq(invoices.id, id));
}

export async function updateInvoicePdfUrl(id: number, pdfUrl: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(invoices).set({ pdfUrl }).where(eq(invoices.id, id));
}

export async function getInvoiceByStripeSession(sessionId: string) {
  const db = await getDb();
  if (!db) return null;

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.stripeCheckoutSessionId, sessionId))
    .limit(1);

  return invoice || null;
}

export async function getInvoiceByPaymentId(paymentId: number) {
  const db = await getDb();
  if (!db) return null;

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.paymentId, paymentId))
    .limit(1);

  return invoice || null;
}

export async function getInvoicesByBookingId(bookingId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(invoices)
    .where(eq(invoices.bookingId, bookingId))
    .orderBy(desc(invoices.createdAt));
}
