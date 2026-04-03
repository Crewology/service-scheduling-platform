import { eq, and, desc, sql, count } from "drizzle-orm";
import {
  promoCodes,
  promoRedemptions,
  users,
  type PromoCode,
} from "../../drizzle/schema";
import { getDb } from "./connection";

// ============================================================================
// PROMO / REFERRAL CODE HELPERS
// ============================================================================

export async function createPromoCode(data: {
  providerId: number;
  code: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: string;
  minOrderAmount?: string;
  maxDiscountAmount?: string;
  maxRedemptions?: number;
  maxRedemptionsPerUser?: number;
  validFrom?: Date;
  validUntil?: Date;
  appliesToAllServices?: boolean;
  serviceIds?: string;
  codeType?: "promo" | "referral";
}) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(promoCodes).values({
    ...data,
    validFrom: data.validFrom || new Date(),
  });
  return await db.select().from(promoCodes)
    .where(and(eq(promoCodes.providerId, data.providerId), eq(promoCodes.code, data.code)))
    .then(r => r[0] || null);
}

export async function getPromoCodesByProvider(providerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(promoCodes)
    .where(eq(promoCodes.providerId, providerId))
    .orderBy(desc(promoCodes.createdAt));
}

export async function getPromoCodeById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(promoCodes).where(eq(promoCodes.id, id));
  return rows[0] || null;
}

export async function getPromoCodeByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(promoCodes).where(eq(promoCodes.code, code.toUpperCase()));
  return rows[0] || null;
}

export async function updatePromoCode(id: number, data: Partial<{
  description: string;
  maxRedemptions: number;
  maxRedemptionsPerUser: number;
  validUntil: Date | null;
  isActive: boolean;
}>) {
  const db = await getDb();
  if (!db) return;
  await db.update(promoCodes).set(data).where(eq(promoCodes.id, id));
}

export async function deletePromoCode(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(promoCodes).where(eq(promoCodes.id, id));
}

export async function incrementPromoRedemptions(promoCodeId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(promoCodes)
    .set({ currentRedemptions: sql`${promoCodes.currentRedemptions} + 1` })
    .where(eq(promoCodes.id, promoCodeId));
}

export async function createPromoRedemption(data: {
  promoCodeId: number;
  userId: number;
  bookingId?: number;
  discountAmount: string;
}) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(promoRedemptions).values(data);
  await incrementPromoRedemptions(data.promoCodeId);
  return true;
}

export async function getUserRedemptionsForPromo(userId: number, promoCodeId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(promoRedemptions)
    .where(and(eq(promoRedemptions.userId, userId), eq(promoRedemptions.promoCodeId, promoCodeId)));
  return result[0]?.count || 0;
}

export async function getPromoRedemptionsByPromo(promoCodeId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    id: promoRedemptions.id,
    userId: promoRedemptions.userId,
    bookingId: promoRedemptions.bookingId,
    discountAmount: promoRedemptions.discountAmount,
    redeemedAt: promoRedemptions.redeemedAt,
    userName: users.name,
  }).from(promoRedemptions)
    .leftJoin(users, eq(promoRedemptions.userId, users.id))
    .where(eq(promoRedemptions.promoCodeId, promoCodeId))
    .orderBy(desc(promoRedemptions.redeemedAt));
}

export async function validatePromoCode(code: string, userId: number, serviceId?: number): Promise<PromoCode> {
  const promo = await getPromoCodeByCode(code);
  if (!promo) throw new Error("Invalid promo code");
  if (!promo.isActive) throw new Error("This promo code is no longer active");
  const now = new Date();
  const gracePeriod = new Date(now.getTime() + 60000);
  if (promo.validFrom > gracePeriod) throw new Error("This promo code is not yet valid");
  if (promo.validUntil && promo.validUntil < now) throw new Error("This promo code has expired");
  if (promo.maxRedemptions && promo.currentRedemptions >= promo.maxRedemptions) {
    throw new Error("This promo code has reached its maximum number of uses");
  }
  const userRedemptions = await getUserRedemptionsForPromo(userId, promo.id);
  if (userRedemptions >= promo.maxRedemptionsPerUser) {
    throw new Error("You have already used this promo code the maximum number of times");
  }
  if (!promo.appliesToAllServices && serviceId && promo.serviceIds) {
    try {
      const allowedIds = JSON.parse(promo.serviceIds) as number[];
      if (!allowedIds.includes(serviceId)) {
        throw new Error("This promo code does not apply to the selected service");
      }
    } catch (e) {
      if ((e as Error).message.includes("promo code")) throw e;
    }
  }
  return promo;
}

export function calculatePromoDiscount(promo: PromoCode, orderAmount: number): number {
  const minOrder = promo.minOrderAmount ? parseFloat(promo.minOrderAmount) : 0;
  if (orderAmount < minOrder) return 0;
  let discount = 0;
  if (promo.discountType === "percentage") {
    discount = orderAmount * (parseFloat(promo.discountValue) / 100);
  } else {
    discount = parseFloat(promo.discountValue);
  }
  const maxDiscount = promo.maxDiscountAmount ? parseFloat(promo.maxDiscountAmount) : Infinity;
  discount = Math.min(discount, maxDiscount, orderAmount);
  return Math.round(discount * 100) / 100;
}

export async function redeemPromoCode(promoCodeId: number, userId: number, bookingId: number, discountAmount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not initialized");
  await db.insert(promoRedemptions).values({
    promoCodeId, userId, bookingId,
    discountAmount: discountAmount.toFixed(2),
  });
  const promo = await db.select().from(promoCodes).where(eq(promoCodes.id, promoCodeId)).then((r: any[]) => r[0]);
  if (promo) {
    await db.update(promoCodes)
      .set({ currentRedemptions: promo.currentRedemptions + 1 })
      .where(eq(promoCodes.id, promoCodeId));
  }
}

export async function validatePromoCodeById(promoCodeId: number, serviceId: number | undefined, orderAmount: number) {
  const db = await getDb();
  if (!db) return null;
  const promo = await db.select().from(promoCodes).where(eq(promoCodes.id, promoCodeId)).then((r: any[]) => r[0]);
  if (!promo || !promo.isActive) return null;
  const now = new Date();
  if (promo.validFrom > now) return null;
  if (promo.validUntil && promo.validUntil < now) return null;
  if (promo.maxRedemptions && promo.currentRedemptions >= promo.maxRedemptions) return null;
  if (!promo.appliesToAllServices && serviceId && promo.serviceIds) {
    try {
      const allowedIds = JSON.parse(promo.serviceIds) as number[];
      if (!allowedIds.includes(serviceId)) return null;
    } catch {}
  }
  const discountAmount = calculatePromoDiscount(promo, orderAmount);
  return { valid: true, discountAmount, promo };
}
