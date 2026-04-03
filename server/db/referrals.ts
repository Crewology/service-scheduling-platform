import { getDb } from "./connection";
import { referralCodes, referrals, users } from "../../drizzle/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import crypto from "crypto";

// ============================================================================
// REFERRAL CODE MANAGEMENT
// ============================================================================

function generateReferralCodeString(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "REF-";
  for (let i = 0; i < 6; i++) {
    code += chars[crypto.randomInt(chars.length)];
  }
  return code;
}

export async function getOrCreateReferralCode(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.userId, userId))
    .limit(1);

  if (existing.length > 0) return existing[0];

  let code = generateReferralCodeString();
  let attempts = 0;
  while (attempts < 10) {
    const dup = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.code, code))
      .limit(1);
    if (dup.length === 0) break;
    code = generateReferralCodeString();
    attempts++;
  }

  await db.insert(referralCodes).values({
    userId,
    code,
    referrerDiscountPercent: 10,
    refereeDiscountPercent: 10,
    isActive: true,
  });

  const created = await db
    .select()
    .from(referralCodes)
    .where(and(eq(referralCodes.userId, userId), eq(referralCodes.code, code)))
    .limit(1);

  return created[0]!;
}

export async function getReferralCodeByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const results = await db
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.code, code.toUpperCase().trim()))
    .limit(1);
  return results[0] || null;
}

export async function getReferralCodeByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.userId, userId))
    .limit(1);
  return results[0] || null;
}

export async function validateReferralCode(code: string, userId: number): Promise<{
  valid: boolean;
  referralCode?: typeof referralCodes.$inferSelect;
  error?: string;
}> {
  const refCode = await getReferralCodeByCode(code);
  if (!refCode) return { valid: false, error: "Invalid referral code" };
  if (!refCode.isActive) return { valid: false, error: "This referral code is no longer active" };
  if (refCode.userId === userId) return { valid: false, error: "You cannot use your own referral code" };

  const db = await getDb();
  if (!db) return { valid: false, error: "Database not available" };

  const existingReferral = await db
    .select()
    .from(referrals)
    .where(eq(referrals.refereeId, userId))
    .limit(1);
  if (existingReferral.length > 0) return { valid: false, error: "You have already used a referral code" };

  if (refCode.maxReferrals) {
    const referralCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(referrals)
      .where(eq(referrals.referralCodeId, refCode.id));
    if ((referralCount[0]?.count || 0) >= refCode.maxReferrals) {
      return { valid: false, error: "This referral code has reached its maximum uses" };
    }
  }

  return { valid: true, referralCode: refCode };
}

export async function createReferral(data: {
  referralCodeId: number;
  referrerId: number;
  refereeId: number;
  refereeBookingId?: number;
  refereeDiscountAmount?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(referrals).values({
    referralCodeId: data.referralCodeId,
    referrerId: data.referrerId,
    refereeId: data.refereeId,
    refereeBookingId: data.refereeBookingId,
    refereeDiscountAmount: data.refereeDiscountAmount,
    status: "pending",
  });
}

export async function completeReferral(referralId: number, referrerRewardBookingId?: number, referrerDiscountAmount?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(referrals)
    .set({
      status: "completed",
      completedAt: new Date(),
      referrerRewardBookingId,
      referrerDiscountAmount,
    })
    .where(eq(referrals.id, referralId));
}

export async function getReferralStats(userId: number) {
  const db = await getDb();
  if (!db) return { code: null, totalReferrals: 0, completedReferrals: 0, pendingReferrals: 0, totalEarnings: "0.00" };

  const code = await getReferralCodeByUserId(userId);
  if (!code) return { code: null, totalReferrals: 0, completedReferrals: 0, pendingReferrals: 0, totalEarnings: "0.00" };

  const allReferrals = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referrerId, userId));

  const totalReferrals = allReferrals.length;
  const completedReferrals = allReferrals.filter((r: typeof referrals.$inferSelect) => r.status === "completed").length;
  const pendingReferrals = allReferrals.filter((r: typeof referrals.$inferSelect) => r.status === "pending").length;
  const totalEarnings = allReferrals
    .filter((r: typeof referrals.$inferSelect) => r.referrerDiscountAmount)
    .reduce((sum: number, r: typeof referrals.$inferSelect) => sum + parseFloat(r.referrerDiscountAmount || "0"), 0)
    .toFixed(2);

  return { code, totalReferrals, completedReferrals, pendingReferrals, totalEarnings };
}

export async function getReferralHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select({
      id: referrals.id,
      refereeId: referrals.refereeId,
      refereeName: users.name,
      refereeEmail: users.email,
      status: referrals.status,
      refereeDiscountAmount: referrals.refereeDiscountAmount,
      referrerDiscountAmount: referrals.referrerDiscountAmount,
      createdAt: referrals.createdAt,
      completedAt: referrals.completedAt,
    })
    .from(referrals)
    .leftJoin(users, eq(referrals.refereeId, users.id))
    .where(eq(referrals.referrerId, userId))
    .orderBy(desc(referrals.createdAt));

  return results;
}

export async function getPendingReferralForReferee(refereeId: number) {
  const db = await getDb();
  if (!db) return null;
  const results = await db
    .select()
    .from(referrals)
    .where(and(
      eq(referrals.refereeId, refereeId),
      eq(referrals.status, "pending"),
    ))
    .limit(1);
  return results[0] || null;
}

export async function updateReferralCode(codeId: number, data: {
  referrerDiscountPercent?: number;
  refereeDiscountPercent?: number;
  maxReferrals?: number | null;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(referralCodes)
    .set(data)
    .where(eq(referralCodes.id, codeId));
}
