import { getDb } from "./connection";
import { bookings, notifications, payments, referralCodes, referrals, referralCredits, serviceProviders, users } from "../../drizzle/schema";
import { eq, and, sql, desc, isNull } from "drizzle-orm";
import crypto from "crypto";
import { centsToDollars, netCapturedBookingCents, remainingCreditById, rewardCents } from "../referralRewardPolicy";

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
  await db.transaction(async tx => {
    const [code] = await tx.select().from(referralCodes)
      .where(eq(referralCodes.id, data.referralCodeId)).limit(1).for("update");
    if (!code?.isActive || code.userId !== data.referrerId || code.userId === data.refereeId) {
      throw new Error("Invalid referral code or referrer");
    }
    const [existing] = await tx.select({ id: referrals.id }).from(referrals)
      .where(eq(referrals.refereeId, data.refereeId)).limit(1);
    if (existing) throw new Error("Referral code already applied for this account");
    if (code.maxReferrals) {
      const [count] = await tx.select({ count: sql<number>`COUNT(*)` }).from(referrals)
        .where(eq(referrals.referralCodeId, code.id));
      if (Number(count?.count || 0) >= code.maxReferrals) throw new Error("Referral code usage limit reached");
    }
    if (data.refereeBookingId) {
      const [booking] = await tx.select({ customerId: bookings.customerId, status: bookings.status }).from(bookings)
        .where(eq(bookings.id, data.refereeBookingId)).limit(1);
      if (booking?.customerId !== data.refereeId ||
          ["completed", "cancelled", "refunded"].includes(booking.status)) {
        throw new Error("Referral code cannot be applied to this booking");
      }
    }
    await tx.insert(referrals).values({
      referralCodeId: code.id,
      referrerId: code.userId,
      refereeId: data.refereeId,
      refereeBookingId: data.refereeBookingId,
      refereeDiscountAmount: data.refereeDiscountAmount,
      status: "pending",
    });
  });
}

export async function completeReferral(referralId: number, referrerRewardBookingId?: number, referrerDiscountAmount?: string) {
  // Keep this legacy export for compatibility with older server imports, but
  // never allow a status-only award without captured-payment verification.
  void referralId; void referrerRewardBookingId; void referrerDiscountAmount;
  throw new Error("Use fulfillReferralOnBookingComplete with an eligible paid booking");
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

/** Default credit expiration: 90 days from earning */
const CREDIT_EXPIRATION_DAYS = 90;

/**
 * Add a credit entry (earned, spent, or expired).
 * Earned credits automatically get a 90-day expiration date.
 */
export async function addReferralCredit(data: {
  userId: number;
  amount: string;
  type: "earned" | "spent" | "expired";
  referralId?: number;
  bookingId?: number;
  description?: string;
  expiresAt?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Auto-set expiration for earned credits
  let expiresAt = data.expiresAt;
  if (data.type === "earned" && !expiresAt) {
    expiresAt = new Date(Date.now() + CREDIT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
  }

  await db.insert(referralCredits).values({
    ...data,
    earnedReferralId: data.type === "earned" ? data.referralId ?? null : null,
    expiresAt: expiresAt || null,
  });
}

/**
 * Get the current credit balance for a user.
 * Excludes earned credits that have passed their expiresAt date.
 * Expired entries are history markers, not another debit: expired earned
 * amounts have already been excluded from the first term.
 */
export async function getReferralCreditBalance(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "0.00";
  const rows = await db.select({ id: referralCredits.id, type: referralCredits.type,
    amount: referralCredits.amount, createdAt: referralCredits.createdAt, expiresAt: referralCredits.expiresAt })
    .from(referralCredits).where(eq(referralCredits.userId, userId));
  const available = Array.from(remainingCreditById(rows).values()).reduce((total, cents) => total + cents, 0);
  return centsToDollars(available);
}

/**
 * Get the next expiring credit date for a user (for UI display).
 */
export async function getNextCreditExpiration(userId: number): Promise<{ amount: string; expiresAt: Date } | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({ id: referralCredits.id, type: referralCredits.type,
    amount: referralCredits.amount, createdAt: referralCredits.createdAt, expiresAt: referralCredits.expiresAt })
    .from(referralCredits).where(eq(referralCredits.userId, userId));
  const available = remainingCreditById(rows);
  const next = rows.filter(row => row.type === "earned" && row.expiresAt && (available.get(row.id) || 0) > 0)
    .sort((a, b) => a.expiresAt!.getTime() - b.expiresAt!.getTime())[0];
  return next?.expiresAt ? { amount: centsToDollars(available.get(next.id)!), expiresAt: next.expiresAt } : null;
}

/**
 * Expire all earned credits that have passed their expiresAt date.
 * Creates matching "expired" entries and returns the count of expired credits.
 */
export async function expireOldCredits(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available for referral credit expiry");

  // Find earned credits that have expired but don't have a matching "expired" entry yet
  const expiredCredits = await db
    .select()
    .from(referralCredits)
    .where(and(
      eq(referralCredits.type, "earned"),
      sql`${referralCredits.expiresAt} IS NOT NULL AND ${referralCredits.expiresAt} <= NOW()`,
    ));

  let count = 0;
  for (const credit of expiredCredits) {
    const created = await db.transaction(async tx => {
      const [locked] = await tx.select({ id: referralCredits.id })
        .from(referralCredits).where(eq(referralCredits.id, credit.id)).limit(1).for("update");
      if (!locked) return false;
      const [existing] = await tx.select({ id: referralCredits.id }).from(referralCredits)
        .where(eq(referralCredits.expiredSourceCreditId, credit.id)).limit(1);
      if (existing) return false;
      const history = await tx.select({ id: referralCredits.id, type: referralCredits.type,
        amount: referralCredits.amount, createdAt: referralCredits.createdAt, expiresAt: referralCredits.expiresAt })
        .from(referralCredits).where(eq(referralCredits.userId, credit.userId));
      const unused = remainingCreditById(history, new Date(credit.expiresAt!.getTime() - 1)).get(credit.id) || 0;
      await tx.insert(referralCredits).values({
        userId: credit.userId,
        amount: centsToDollars(unused),
        type: "expired",
        referralId: credit.referralId,
        expiredSourceCreditId: credit.id,
        description: `Credit auto-expired after ${CREDIT_EXPIRATION_DAYS} days`,
      });
      return true;
    });
    if (created) count++;
  }

  return count;
}

/**
 * Get credits expiring within the next N days (for warning notifications).
 */
export async function getCreditsExpiringSoon(daysAhead: number = 7): Promise<Array<{ id: number; userId: number; amount: string; expiresAt: Date }>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available for referral credit warnings");

  const results = await db
    .select({
      id: referralCredits.id,
      userId: referralCredits.userId,
      amount: referralCredits.amount,
      expiresAt: referralCredits.expiresAt,
    })
    .from(referralCredits)
    .where(and(
      eq(referralCredits.type, "earned"),
      isNull(referralCredits.warningNotifiedAt),
      sql`${referralCredits.expiresAt} IS NOT NULL AND ${referralCredits.expiresAt} > NOW() AND ${referralCredits.expiresAt} <= DATE_ADD(NOW(), INTERVAL ${daysAhead} DAY)`,
    )).orderBy(referralCredits.expiresAt).limit(500);

  return results.filter(r => r.expiresAt !== null) as Array<{ id: number; userId: number; amount: string; expiresAt: Date }>;
}

/** Atomic in-app warning and durable per-credit marker, safe under concurrent retries. */
export async function warnExpiringCredit(creditId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available for referral credit warnings");
  const warnedUser = await db.transaction(async tx => {
    const [credit] = await tx.select().from(referralCredits)
      .where(eq(referralCredits.id, creditId)).limit(1).for("update");
    const now = new Date();
    if (!credit || credit.type !== "earned" || credit.warningNotifiedAt ||
        !credit.expiresAt || credit.expiresAt <= now ||
        credit.expiresAt.getTime() > now.getTime() + 7 * 86_400_000) return null;
    const ledger = await tx.select({ id: referralCredits.id, type: referralCredits.type,
      amount: referralCredits.amount, createdAt: referralCredits.createdAt, expiresAt: referralCredits.expiresAt })
      .from(referralCredits).where(eq(referralCredits.userId, credit.userId));
    const remaining = remainingCreditById(ledger, now).get(credit.id) || 0;
    if (remaining <= 0) {
      // This credit cannot expire with value remaining. Record the evaluation
      // without notifying; otherwise it occupies a 500-row scan slot forever.
      await tx.update(referralCredits).set({ warningNotifiedAt: now })
        .where(eq(referralCredits.id, credit.id));
      return null;
    }

    await tx.insert(notifications).values({
      userId: credit.userId,
      notificationType: "referral_credit_expiring",
      title: "Referral credits may expire soon",
      message: `${centsToDollars(remaining)} in referral credits from ${credit.createdAt.toISOString().slice(0, 10)} is scheduled to expire on ${credit.expiresAt.toISOString().slice(0, 10)}. Use available credits toward an eligible booking before then.`,
      actionUrl: "/referrals",
    });
    await tx.update(referralCredits).set({ warningNotifiedAt: now })
      .where(eq(referralCredits.id, credit.id));
    return credit.userId;
  });
  if (warnedUser === null) return false;
  // The persisted notification is authoritative. SSE is best-effort only.
  try {
    const { sseManager } = await import("../sseManager");
    sseManager.pushUnreadCount(warnedUser, await (await import("./notifications")).getUnreadCount(warnedUser));
  } catch (error) {
    console.warn("[CreditExpiration] SSE unread-count push failed", error);
  }
  return true;
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

// ============================================================================
// REFERRAL TIER REWARDS
// ============================================================================

/**
 * Tier definitions: escalating reward percentages based on completed referral count.
 */
export const REFERRAL_TIERS = [
  { name: "Bronze", minReferrals: 0, maxReferrals: 5, rewardPercent: 10, color: "#CD7F32" },
  { name: "Silver", minReferrals: 6, maxReferrals: 10, rewardPercent: 15, color: "#C0C0C0" },
  { name: "Gold", minReferrals: 11, maxReferrals: 25, rewardPercent: 20, color: "#FFD700" },
  { name: "Platinum", minReferrals: 26, maxReferrals: Infinity, rewardPercent: 25, color: "#E5E4E2" },
] as const;

/**
 * Get the current tier for a user based on their completed referral count.
 */
export async function getUserReferralTier(userId: number) {
  const db = await getDb();
  if (!db) return { tier: REFERRAL_TIERS[0], completedCount: 0, nextTier: REFERRAL_TIERS[1] || null, referralsToNextTier: REFERRAL_TIERS[1]?.minReferrals || 0 };

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(referrals)
    .where(and(
      eq(referrals.referrerId, userId),
      eq(referrals.status, "completed"),
    ));

  const completedCount = Number(result[0]?.count || 0);
  let currentTier: typeof REFERRAL_TIERS[number] = REFERRAL_TIERS[0];
  let nextTier: typeof REFERRAL_TIERS[number] | null = null;

  for (let i = REFERRAL_TIERS.length - 1; i >= 0; i--) {
    if (completedCount >= REFERRAL_TIERS[i].minReferrals) {
      currentTier = REFERRAL_TIERS[i];
      nextTier = i < REFERRAL_TIERS.length - 1 ? REFERRAL_TIERS[i + 1] : null;
      break;
    }
  }

  const referralsToNextTier = nextTier ? nextTier.minReferrals - completedCount : 0;

  return { tier: currentTier, completedCount, nextTier, referralsToNextTier };
}

/**
 * Get the dynamic reward percentage for a referrer based on their tier.
 */
export async function getReferrerRewardPercent(userId: number): Promise<number> {
  const { tier } = await getUserReferralTier(userId);
  return tier.rewardPercent;
}

/**
 * Check both completion and capture: whichever event happens second awards a
 * pending referral. Never trusts a caller-supplied amount or customer ID.
 * A per-referee lock and unique earned-credit claim serialize webhook retries.
 * Prior completed referrals and credits are not recalculated.
 */
export async function fulfillReferralOnBookingComplete(bookingId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available for referral fulfillment");
  return db.transaction(async (tx) => {
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
    if (!booking || booking.status !== "completed") return false;

    const [pendingRef] = await tx.select().from(referrals).where(and(
      eq(referrals.refereeId, booking.customerId), eq(referrals.status, "pending"),
    )).limit(1).for("update");
    if (!pendingRef || (pendingRef.refereeBookingId !== bookingId &&
        booking.createdAt.getTime() < pendingRef.createdAt.getTime())) return false;

    // The first qualifying paid completion belongs to the referral. A demo or
    // fully refunded earlier booking does not block the next eligible one.
    // Bookings created in the same second use ID for a deterministic order.
    const completedBookings = await tx.select({ id: bookings.id, providerId: bookings.providerId,
      createdAt: bookings.createdAt }).from(bookings)
      .where(and(eq(bookings.customerId, booking.customerId), eq(bookings.status, "completed")));
    for (const prior of completedBookings) {
      if (prior.id === bookingId || prior.createdAt.getTime() > booking.createdAt.getTime() ||
          (prior.createdAt.getTime() === booking.createdAt.getTime() && prior.id > bookingId)) continue;
      const [priorProvider] = await tx.select({ isOfficial: serviceProviders.isOfficial })
        .from(serviceProviders).where(eq(serviceProviders.id, prior.providerId)).limit(1);
      if (!priorProvider || priorProvider.isOfficial) continue;
      const previousPayments = await tx.select().from(payments).where(eq(payments.bookingId, prior.id));
      if (netCapturedBookingCents(previousPayments) > 0) return false;
    }

    const [provider] = await tx.select({ isOfficial: serviceProviders.isOfficial })
      .from(serviceProviders).where(eq(serviceProviders.id, booking.providerId)).limit(1);
    if (!provider || provider.isOfficial) return false;

    const paymentRows = await tx.select().from(payments).where(eq(payments.bookingId, bookingId));
    const netCents = netCapturedBookingCents(paymentRows);
    if (netCents <= 0) return false;

    // Serialize simultaneous tier-boundary awards for the same referrer.
    const [referrer] = await tx.select({ id: users.id }).from(users)
      .where(eq(users.id, pendingRef.referrerId)).limit(1).for("update");
    if (!referrer) return false;
    const [tierRows] = await tx.select({ count: sql<number>`COUNT(*)` }).from(referrals)
      .where(and(eq(referrals.referrerId, pendingRef.referrerId), eq(referrals.status, "completed")));
    const completedCount = Number(tierRows?.count || 0);
    const tierPercent = [...REFERRAL_TIERS].reverse().find(t => completedCount >= t.minReferrals)!.rewardPercent;
    const reward = rewardCents(netCents, tierPercent);
    if (reward <= 0) return false;
    const amount = centsToDollars(reward);

    // Credit and referral status either commit together or roll back together.
    await tx.insert(referralCredits).values({
      userId: pendingRef.referrerId,
      amount,
      type: "earned",
      referralId: pendingRef.id,
      earnedReferralId: pendingRef.id,
      bookingId,
      expiresAt: new Date(Date.now() + CREDIT_EXPIRATION_DAYS * 86_400_000),
      description: `Referral reward (${tierPercent}% of net captured payment)`,
    });
    await tx.update(referrals).set({
      status: "completed",
      completedAt: new Date(),
      refereeBookingId: bookingId,
      referrerDiscountAmount: amount,
    }).where(and(eq(referrals.id, pendingRef.id), eq(referrals.status, "pending")));
    return true;
  });
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
