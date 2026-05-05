import { eq, and, desc, gte, sql } from "drizzle-orm";
import {
  payments,
  bookings,
  providerSubscriptions,
  serviceProviders,
  type ProviderSubscription,
} from "../../drizzle/schema";
import { getDb } from "./connection";

// ============================================================================
// PAYMENT MANAGEMENT
// ============================================================================

export async function createPayment(data: typeof payments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(payments).values(data);
  return result;
}

export async function getPaymentByBookingId(bookingId: number) {
  const database = await getDb();
  if (!database) return undefined;
  const [payment] = await database.select().from(payments)
    .where(eq(payments.bookingId, bookingId))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  return payment;
}

export async function getPaymentByStripePaymentIntentId(paymentIntentId: string) {
  const database = await getDb();
  if (!database) return undefined;
  const [payment] = await database.select().from(payments)
    .where(eq(payments.stripePaymentIntentId, paymentIntentId))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  return payment;
}

export async function updatePaymentRefund(paymentId: number, data: {
  status: string;
  refundAmount: string;
  refundReason: string;
  stripeRefundId?: string;
  refundedAt: Date;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  await database.update(payments).set(data as any).where(eq(payments.id, paymentId));
}

export async function updatePaymentStatus(paymentId: number, status: string, additionalData?: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: Record<string, any> = { status };
  if (additionalData) Object.assign(updateData, additionalData);
  await db.update(payments).set(updateData).where(eq(payments.id, paymentId));
}

// ============================================================================
// SUBSCRIPTION HELPERS
// ============================================================================

export async function getProviderSubscription(providerId: number): Promise<ProviderSubscription | undefined> {
  const database = await getDb();
  if (!database) return undefined;
  const [sub] = await database.select().from(providerSubscriptions)
    .where(eq(providerSubscriptions.providerId, providerId))
    .limit(1);
  return sub;
}

export async function upsertProviderSubscription(data: {
  providerId: number;
  tier: "free" | "basic" | "premium";
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  status: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  trialEndsAt?: Date;
  pausedAt?: Date | null;
  resumesAt?: Date | null;
  cancelAtPeriodEnd?: boolean;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const existing = await getProviderSubscription(data.providerId);
  if (existing) {
    const setData: any = {
      tier: data.tier,
      stripeSubscriptionId: data.stripeSubscriptionId,
      stripeCustomerId: data.stripeCustomerId,
      status: data.status,
      currentPeriodStart: data.currentPeriodStart,
      currentPeriodEnd: data.currentPeriodEnd,
      trialEndsAt: data.trialEndsAt,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd,
    };
    if (data.pausedAt !== undefined) setData.pausedAt = data.pausedAt;
    if (data.resumesAt !== undefined) setData.resumesAt = data.resumesAt;
    await database.update(providerSubscriptions)
      .set(setData)
      .where(eq(providerSubscriptions.id, existing.id));
  } else {
    await database.insert(providerSubscriptions).values(data as any);
  }
}

export async function getProviderTier(providerId: number): Promise<"free" | "basic" | "premium"> {
  const sub = await getProviderSubscription(providerId);
  if (!sub) return "free";
  if (sub.status !== "active" && sub.status !== "trialing" && sub.status !== "paused") return "free";
  return sub.tier;
}

export async function getSubscriptionAnalytics() {
  const database = await getDb();
  if (!database) return {
    tiers: { free: 0, basic: 0, premium: 0, trialing: 0 },
    mrr: 0, churnRate: 0, totalProviders: 0, activeSubscribers: 0,
    cancelledThisMonth: 0, newThisMonth: 0,
    conversionRates: { freeToBasic: 0, basicToPremium: 0 },
  };

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const subs = await database.select().from(providerSubscriptions);
  const allProviders = await database.select({ count: sql<number>`COUNT(*)` }).from(serviceProviders);
  const totalProviders = allProviders[0]?.count ?? 0;

  const active = subs.filter(s => s.status === "active" || s.status === "trialing");
  const cancelled = subs.filter(s => s.status === "cancelled");
  const cancelledThisMonth = cancelled.filter(s => s.updatedAt && new Date(s.updatedAt) >= firstOfMonth).length;
  const newThisMonth = subs.filter(s => s.createdAt && new Date(s.createdAt) >= firstOfMonth).length;

  const basic = active.filter(s => s.tier === "basic").length;
  const premium = active.filter(s => s.tier === "premium").length;
  const trialing = subs.filter(s => s.status === "trialing").length;
  const freeCount = totalProviders - basic - premium;

  const mrr = (basic * 29) + (premium * 79);
  const activeAtStart = active.length - newThisMonth + cancelledThisMonth;
  const churnRate = activeAtStart > 0 ? (cancelledThisMonth / activeAtStart) * 100 : 0;
  const everBasicOrHigher = subs.filter(s => s.tier === "basic" || s.tier === "premium").length;
  const everPremium = subs.filter(s => s.tier === "premium").length;
  const freeToBasic = totalProviders > 0 ? (everBasicOrHigher / totalProviders) * 100 : 0;
  const basicToPremium = everBasicOrHigher > 0 ? (everPremium / everBasicOrHigher) * 100 : 0;

  return {
    tiers: { free: freeCount, basic, premium, trialing },
    mrr, churnRate: Math.round(churnRate * 10) / 10,
    totalProviders, activeSubscribers: basic + premium,
    cancelledThisMonth, newThisMonth,
    conversionRates: {
      freeToBasic: Math.round(freeToBasic * 10) / 10,
      basicToPremium: Math.round(basicToPremium * 10) / 10,
    },
  };
}
