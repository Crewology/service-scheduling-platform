import { eq, and, desc, sql, gte, lte, or } from "drizzle-orm";
import { getDb } from "./connection";
import { promotions, serviceProviders, services, serviceCategories, type Promotion, type InsertPromotion } from "../../drizzle/schema";

export async function createPromotion(data: InsertPromotion): Promise<Promotion | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [result] = await db.insert(promotions).values(data).$returningId();
  return await getPromotionById(result.id);
}

export async function getPromotionById(id: number): Promise<Promotion | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const [result] = await db.select().from(promotions).where(eq(promotions.id, id)).limit(1);
  return result;
}

export async function getPromotionsByProvider(providerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(promotions)
    .where(eq(promotions.providerId, providerId))
    .orderBy(desc(promotions.createdAt));
}

export async function getActivePromotions(tier?: string) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const conditions = [
    eq(promotions.status, "active"),
    lte(promotions.startDate, now),
    gte(promotions.endDate, now),
  ];
  if (tier) {
    conditions.push(eq(promotions.tier, tier as any));
  }
  return await db.select({
    promotion: promotions,
    provider: serviceProviders,
    service: services,
  })
    .from(promotions)
    .innerJoin(serviceProviders, eq(promotions.providerId, serviceProviders.id))
    .leftJoin(services, eq(promotions.serviceId, services.id))
    .where(and(...conditions))
    .orderBy(desc(promotions.createdAt));
}

export async function getActivePromotionsByProviderIds(providerIds: number[]) {
  const db = await getDb();
  if (!db) return [];
  if (providerIds.length === 0) return [];
  const now = new Date();
  return await db.select().from(promotions)
    .where(and(
      eq(promotions.status, "active"),
      lte(promotions.startDate, now),
      gte(promotions.endDate, now),
      sql`${promotions.providerId} IN (${sql.raw(providerIds.join(","))})`
    ));
}

export async function activatePromotion(id: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return;
  await db.update(promotions).set({
    status: "active",
    startDate,
    endDate,
  }).where(eq(promotions.id, id));
}

export async function expirePromotions() {
  const db = await getDb();
  if (!db) return 0;
  const now = new Date();
  const result = await db.update(promotions).set({ status: "expired" })
    .where(and(
      eq(promotions.status, "active"),
      lte(promotions.endDate, now),
    ));
  return result[0]?.affectedRows || 0;
}

export async function incrementImpressions(promotionIds: number[]) {
  const db = await getDb();
  if (!db) return;
  if (promotionIds.length === 0) return;
  await db.update(promotions)
    .set({ impressions: sql`${promotions.impressions} + 1` })
    .where(sql`${promotions.id} IN (${sql.raw(promotionIds.join(","))})`);
}

export async function incrementClicks(promotionId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(promotions)
    .set({ clicks: sql`${promotions.clicks} + 1` })
    .where(eq(promotions.id, promotionId));
}

export async function updatePromotionStripeSession(id: number, stripeSessionId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(promotions).set({ stripeSessionId }).where(eq(promotions.id, id));
}

export async function updatePromotionPaymentIntent(id: number, stripePaymentIntentId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(promotions).set({ stripePaymentIntentId }).where(eq(promotions.id, id));
}
