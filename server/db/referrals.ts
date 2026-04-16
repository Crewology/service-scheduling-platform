import { getDb } from "./connection";
import { referralCodes, referrals, referralCredits, users } from "../../drizzle/schema";
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

// ============================================================================
// REFERRAL CREDITS
// ============================================================================

/**
 * Add a credit entry (earned, spent, or expired).
 */
export async function addReferralCredit(data: {
  userId: number;
  amount: string;
  type: "earned" | "spent" | "expired";
  referralId?: number;
  bookingId?: number;
  description?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(referralCredits).values(data);
}

/**
 * Get the current credit balance for a user (earned - spent - expired).
 */
export async function getReferralCreditBalance(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "0.00";

  const result = await db
    .select({
      earned: sql<string>`COALESCE(SUM(CASE WHEN ${referralCredits.type} = 'earned' THEN ${referralCredits.amount} ELSE 0 END), 0)`,
      spent: sql<string>`COALESCE(SUM(CASE WHEN ${referralCredits.type} = 'spent' THEN ${referralCredits.amount} ELSE 0 END), 0)`,
      expired: sql<string>`COALESCE(SUM(CASE WHEN ${referralCredits.type} = 'expired' THEN ${referralCredits.amount} ELSE 0 END), 0)`,
    })
    .from(referralCredits)
    .where(eq(referralCredits.userId, userId));

  const earned = parseFloat(result[0]?.earned || "0");
  const spent = parseFloat(result[0]?.spent || "0");
  const expired = parseFloat(result[0]?.expired || "0");
  return Math.max(0, earned - spent - expired).toFixed(2);
}

/**
 * Get full credit history for a user.
 */
export async function getReferralCreditHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(referralCredits)
    .where(eq(referralCredits.userId, userId))
    .orderBy(desc(referralCredits.createdAt));
}

/**
 * Spend credits on a booking. Returns the amount actually spent.
 */
export async function spendReferralCredits(userId: number, bookingId: number, maxAmount: number): Promise<string> {
  const balance = parseFloat(await getReferralCreditBalance(userId));
  if (balance <= 0) return "0.00";

  const amountToSpend = Math.min(balance, maxAmount);
  if (amountToSpend <= 0) return "0.00";

  await addReferralCredit({
    userId,
    amount: amountToSpend.toFixed(2),
    type: "spent",
    bookingId,
    description: `Applied to booking #${bookingId}`,
  });

  return amountToSpend.toFixed(2);
}

/**
 * Complete a referral and credit the referrer when the referee's booking completes.
 * Returns true if a referral was found and completed.
 */
export async function fulfillReferralOnBookingComplete(bookingId: number, customerId: number, totalAmount: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Find a pending referral for this customer
  const pendingRef = await getPendingReferralForReferee(customerId);
  if (!pendingRef) return false;

  // Get the referral code to determine discount percentages
  const refCode = await db
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.id, pendingRef.referralCodeId))
    .limit(1);
  if (!refCode[0]) return false;

  const referrerCreditAmount = (parseFloat(totalAmount) * refCode[0].referrerDiscountPercent / 100).toFixed(2);

  // Complete the referral
  await completeReferral(pendingRef.id, undefined, referrerCreditAmount);

  // Credit the referrer
  await addReferralCredit({
    userId: pendingRef.referrerId,
    amount: referrerCreditAmount,
    type: "earned",
    referralId: pendingRef.id,
    bookingId,
    description: `Referral reward — referred user completed booking`,
  });

  return true;
}

// ============================================================================
// ADMIN REFERRAL ANALYTICS
// ============================================================================

/**
 * Get platform-wide referral analytics for admin dashboard.
 */
export async function getReferralAnalytics() {
  const db = await getDb();
  if (!db) return {
    totalCodes: 0,
    activeCodes: 0,
    totalReferrals: 0,
    completedReferrals: 0,
    pendingReferrals: 0,
    conversionRate: 0,
    totalCreditsEarned: "0.00",
    totalCreditsSpent: "0.00",
    topReferrers: [],
    monthlyTrend: [],
  };

  // Total codes
  const codeStats = await db
    .select({
      total: sql<number>`COUNT(*)`,
      active: sql<number>`SUM(CASE WHEN ${referralCodes.isActive} = true THEN 1 ELSE 0 END)`,
    })
    .from(referralCodes);

  // Referral stats
  const refStats = await db
    .select({
      total: sql<number>`COUNT(*)`,
      completed: sql<number>`SUM(CASE WHEN ${referrals.status} = 'completed' THEN 1 ELSE 0 END)`,
      pending: sql<number>`SUM(CASE WHEN ${referrals.status} = 'pending' THEN 1 ELSE 0 END)`,
    })
    .from(referrals);

  // Credit totals
  const creditStats = await db
    .select({
      earned: sql<string>`COALESCE(SUM(CASE WHEN ${referralCredits.type} = 'earned' THEN ${referralCredits.amount} ELSE 0 END), 0)`,
      spent: sql<string>`COALESCE(SUM(CASE WHEN ${referralCredits.type} = 'spent' THEN ${referralCredits.amount} ELSE 0 END), 0)`,
    })
    .from(referralCredits);

  // Top referrers (top 10)
  const topReferrers = await db
    .select({
      userId: referrals.referrerId,
      userName: users.name,
      userEmail: users.email,
      totalReferrals: sql<number>`COUNT(*)`,
      completedReferrals: sql<number>`SUM(CASE WHEN ${referrals.status} = 'completed' THEN 1 ELSE 0 END)`,
      totalEarned: sql<string>`COALESCE(SUM(CAST(${referrals.referrerDiscountAmount} AS DECIMAL(10,2))), 0)`,
    })
    .from(referrals)
    .leftJoin(users, eq(referrals.referrerId, users.id))
    .groupBy(referrals.referrerId, users.name, users.email)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(10);

  // Monthly trend (last 12 months)
  const monthlyTrend = await db.execute(
    sql`SELECT DATE_FORMAT(${referrals.createdAt}, '%Y-%m') as month, COUNT(*) as total, SUM(CASE WHEN ${referrals.status} = 'completed' THEN 1 ELSE 0 END) as completed FROM ${referrals} WHERE ${referrals.createdAt} >= DATE_SUB(NOW(), INTERVAL 12 MONTH) GROUP BY DATE_FORMAT(${referrals.createdAt}, '%Y-%m') ORDER BY month`
  ).then(res => ((res as any)[0] as any[] || []).map((r: any) => ({ month: r.month, total: Number(r.total), completed: Number(r.completed) })));

  const totalRefs = Number(refStats[0]?.total || 0);
  const completedRefs = Number(refStats[0]?.completed || 0);

  return {
    totalCodes: Number(codeStats[0]?.total || 0),
    activeCodes: Number(codeStats[0]?.active || 0),
    totalReferrals: totalRefs,
    completedReferrals: completedRefs,
    pendingReferrals: Number(refStats[0]?.pending || 0),
    conversionRate: totalRefs > 0 ? Math.round((completedRefs / totalRefs) * 100) : 0,
    totalCreditsEarned: creditStats[0]?.earned || "0.00",
    totalCreditsSpent: creditStats[0]?.spent || "0.00",
    topReferrers,
    monthlyTrend,
  };
}
