import Stripe from "stripe";
import { ENV } from "./_core/env";
import { getDb } from "./db/connection";
import { partnerTransfers } from "../drizzle/schema";
import { desc, eq, sql, and, gte, lte } from "drizzle-orm";

const stripe = new Stripe(ENV.stripeSecretKey, {
  apiVersion: "2026-01-28.clover",
});

// Revenue split configuration
const PARTNER_SPLIT_PERCENTAGE = 40; // Partner gets 40%
const PLATFORM_SPLIT_PERCENTAGE = 60; // Platform keeps 60%

type TransferSourceType = "provider_subscription" | "customer_subscription" | "booking_platform_fee";

interface PartnerTransferInput {
  totalRevenue: number; // Total revenue in dollars
  sourceType: TransferSourceType;
  sourceId: string; // Stripe invoice ID, payment intent ID, etc.
  sourceDescription: string; // Human-readable description
}

/**
 * Calculate the partner's share of revenue
 */
export function calculatePartnerShare(totalRevenue: number): number {
  return Math.round(totalRevenue * (PARTNER_SPLIT_PERCENTAGE / 100) * 100) / 100;
}

/**
 * Calculate the platform's share of revenue
 */
export function calculatePlatformShare(totalRevenue: number): number {
  return Math.round(totalRevenue * (PLATFORM_SPLIT_PERCENTAGE / 100) * 100) / 100;
}

/**
 * Execute a partner revenue split transfer via Stripe
 * Transfers 40% of the revenue to the partner's connected Stripe account
 */
export async function executePartnerTransfer(input: PartnerTransferInput): Promise<{
  success: boolean;
  transferId?: string;
  amount?: number;
  error?: string;
}> {
  const partnerAccountId = ENV.partnerStripeAccountId;

  if (!partnerAccountId) {
    console.warn("[Partner Split] No partner account configured, skipping transfer");
    return { success: false, error: "No partner account configured" };
  }

  const partnerAmount = calculatePartnerShare(input.totalRevenue);

  // Stripe requires minimum transfer of $0.50
  if (partnerAmount < 0.50) {
    console.log(`[Partner Split] Amount too small for transfer: $${partnerAmount} (source: ${input.sourceDescription})`);
    // Still record it for tracking
    await recordTransfer({
      amount: partnerAmount,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceDescription: input.sourceDescription,
      totalRevenue: input.totalRevenue,
      partnerAccountId,
      status: "completed",
      stripeTransferId: null,
      errorMessage: "Amount below Stripe minimum ($0.50), recorded but not transferred",
    });
    return { success: true, amount: partnerAmount };
  }

  const amountInCents = Math.round(partnerAmount * 100);

  try {
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: "usd",
      destination: partnerAccountId,
      description: `OlogyCrew 40% revenue share: ${input.sourceDescription}`,
      metadata: {
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        splitPercentage: PARTNER_SPLIT_PERCENTAGE.toString(),
        totalRevenue: input.totalRevenue.toFixed(2),
      },
    });

    await recordTransfer({
      amount: partnerAmount,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceDescription: input.sourceDescription,
      totalRevenue: input.totalRevenue,
      partnerAccountId,
      status: "completed",
      stripeTransferId: transfer.id,
      errorMessage: null,
    });

    console.log(`[Partner Split] Transfer successful: $${partnerAmount} to ${partnerAccountId} (${input.sourceDescription})`);
    return { success: true, transferId: transfer.id, amount: partnerAmount };
  } catch (error: any) {
    console.error(`[Partner Split] Transfer failed: ${error.message}`);

    await recordTransfer({
      amount: partnerAmount,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceDescription: input.sourceDescription,
      totalRevenue: input.totalRevenue,
      partnerAccountId,
      status: "failed",
      stripeTransferId: null,
      errorMessage: error.message,
    });

    return { success: false, error: error.message };
  }
}

/**
 * Record a partner transfer in the database
 */
async function recordTransfer(data: {
  amount: number;
  sourceType: TransferSourceType;
  sourceId: string;
  sourceDescription: string;
  totalRevenue: number;
  partnerAccountId: string;
  status: "pending" | "completed" | "failed";
  stripeTransferId: string | null;
  errorMessage: string | null;
}) {
  const db = await getDb();
  if (!db) {
    console.error("[Partner Split] Database not available, cannot record transfer");
    return;
  }
  await db.insert(partnerTransfers).values({
    stripeTransferId: data.stripeTransferId,
    amount: data.amount.toFixed(2),
    sourceType: data.sourceType,
    sourceId: data.sourceId,
    sourceDescription: data.sourceDescription,
    status: data.status,
    errorMessage: data.errorMessage,
    partnerAccountId: data.partnerAccountId,
    splitPercentage: PARTNER_SPLIT_PERCENTAGE.toFixed(2),
    totalRevenue: data.totalRevenue.toFixed(2),
  });
}

/**
 * Get partner transfer history with optional filters
 */
export async function getPartnerTransfers(options?: {
  sourceType?: TransferSourceType;
  status?: "pending" | "completed" | "failed";
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const conditions = [];

  if (options?.sourceType) {
    conditions.push(eq(partnerTransfers.sourceType, options.sourceType));
  }
  if (options?.status) {
    conditions.push(eq(partnerTransfers.status, options.status));
  }
  if (options?.startDate) {
    conditions.push(gte(partnerTransfers.createdAt, options.startDate));
  }
  if (options?.endDate) {
    conditions.push(lte(partnerTransfers.createdAt, options.endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const db = await getDb();
  if (!db) return [];

  const transfers = await db
    .select()
    .from(partnerTransfers)
    .where(whereClause)
    .orderBy(desc(partnerTransfers.createdAt))
    .limit(options?.limit || 50)
    .offset(options?.offset || 0);

  return transfers;
}

/**
 * Get partner transfer summary statistics
 */
export async function getPartnerTransferSummary() {
  const db = await getDb();
  if (!db) {
    return {
      totalTransferred: 0,
      totalRevenue: 0,
      platformShare: 0,
      totalCount: 0,
      completedCount: 0,
      failedCount: 0,
      subscriptionRevenue: 0,
      bookingFeeRevenue: 0,
      splitPercentage: { partner: PARTNER_SPLIT_PERCENTAGE, platform: PLATFORM_SPLIT_PERCENTAGE },
    };
  }

  const [totals] = await db
    .select({
      totalTransferred: sql<string>`COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0)`,
      totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN status = 'completed' THEN totalRevenue ELSE 0 END), 0)`,
      totalCount: sql<number>`COUNT(*)`,
      completedCount: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`,
      failedCount: sql<number>`SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)`,
      subscriptionRevenue: sql<string>`COALESCE(SUM(CASE WHEN status = 'completed' AND (sourceType = 'provider_subscription' OR sourceType = 'customer_subscription') THEN amount ELSE 0 END), 0)`,
      bookingFeeRevenue: sql<string>`COALESCE(SUM(CASE WHEN status = 'completed' AND sourceType = 'booking_platform_fee' THEN amount ELSE 0 END), 0)`,
    })
    .from(partnerTransfers);

  return {
    totalTransferred: parseFloat(totals?.totalTransferred || "0"),
    totalRevenue: parseFloat(totals?.totalRevenue || "0"),
    platformShare: parseFloat(totals?.totalRevenue || "0") - parseFloat(totals?.totalTransferred || "0"),
    totalCount: Number(totals?.totalCount || 0),
    completedCount: Number(totals?.completedCount || 0),
    failedCount: Number(totals?.failedCount || 0),
    subscriptionRevenue: parseFloat(totals?.subscriptionRevenue || "0"),
    bookingFeeRevenue: parseFloat(totals?.bookingFeeRevenue || "0"),
    splitPercentage: { partner: PARTNER_SPLIT_PERCENTAGE, platform: PLATFORM_SPLIT_PERCENTAGE },
  };
}

/**
 * Get partner transfer summary with optional date range filter
 */
export async function getPartnerTransferSummaryFiltered(options?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) {
    return {
      totalTransferred: 0,
      totalRevenue: 0,
      platformShare: 0,
      totalCount: 0,
      completedCount: 0,
      failedCount: 0,
      subscriptionRevenue: 0,
      bookingFeeRevenue: 0,
      splitPercentage: { partner: PARTNER_SPLIT_PERCENTAGE, platform: PLATFORM_SPLIT_PERCENTAGE },
    };
  }

  const conditions = [];
  if (options?.startDate) {
    conditions.push(gte(partnerTransfers.createdAt, options.startDate));
  }
  if (options?.endDate) {
    conditions.push(lte(partnerTransfers.createdAt, options.endDate));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totals] = await db
    .select({
      totalTransferred: sql<string>`COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0)`,
      totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN status = 'completed' THEN totalRevenue ELSE 0 END), 0)`,
      totalCount: sql<number>`COUNT(*)`,
      completedCount: sql<number>`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`,
      failedCount: sql<number>`SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)`,
      subscriptionRevenue: sql<string>`COALESCE(SUM(CASE WHEN status = 'completed' AND (sourceType = 'provider_subscription' OR sourceType = 'customer_subscription') THEN amount ELSE 0 END), 0)`,
      bookingFeeRevenue: sql<string>`COALESCE(SUM(CASE WHEN status = 'completed' AND sourceType = 'booking_platform_fee' THEN amount ELSE 0 END), 0)`,
    })
    .from(partnerTransfers)
    .where(whereClause);

  return {
    totalTransferred: parseFloat(totals?.totalTransferred || "0"),
    totalRevenue: parseFloat(totals?.totalRevenue || "0"),
    platformShare: parseFloat(totals?.totalRevenue || "0") - parseFloat(totals?.totalTransferred || "0"),
    totalCount: Number(totals?.totalCount || 0),
    completedCount: Number(totals?.completedCount || 0),
    failedCount: Number(totals?.failedCount || 0),
    subscriptionRevenue: parseFloat(totals?.subscriptionRevenue || "0"),
    bookingFeeRevenue: parseFloat(totals?.bookingFeeRevenue || "0"),
    splitPercentage: { partner: PARTNER_SPLIT_PERCENTAGE, platform: PLATFORM_SPLIT_PERCENTAGE },
  };
}

/**
 * Get monthly revenue breakdown for chart display
 */
export async function getMonthlyRevenueBreakdown(options?: {
  months?: number; // How many months back to show, default 12
}) {
  const db = await getDb();
  if (!db) return [];

  const monthsBack = options?.months || 12;
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const results = await db
    .select({
      month: sql<string>`DATE_FORMAT(createdAt, '%Y-%m')`,
      totalRevenue: sql<string>`COALESCE(SUM(CASE WHEN status = 'completed' THEN totalRevenue ELSE 0 END), 0)`,
      partnerShare: sql<string>`COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0)`,
      transferCount: sql<number>`COUNT(*)`,
    })
    .from(partnerTransfers)
    .where(gte(partnerTransfers.createdAt, startDate))
    .groupBy(sql`DATE_FORMAT(createdAt, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(createdAt, '%Y-%m')`);

  return results.map((row) => {
    const totalRev = parseFloat(row.totalRevenue || "0");
    const partnerAmt = parseFloat(row.partnerShare || "0");
    return {
      month: row.month,
      totalRevenue: totalRev,
      platformShare: totalRev - partnerAmt,
      partnerShare: partnerAmt,
      transferCount: Number(row.transferCount || 0),
    };
  });
}

/**
 * Get all transfers for CSV export (no pagination limit)
 */
export async function getPartnerTransfersForExport(options?: {
  sourceType?: TransferSourceType;
  status?: "pending" | "completed" | "failed";
  startDate?: Date;
  endDate?: Date;
}) {
  const conditions = [];

  if (options?.sourceType) {
    conditions.push(eq(partnerTransfers.sourceType, options.sourceType));
  }
  if (options?.status) {
    conditions.push(eq(partnerTransfers.status, options.status));
  }
  if (options?.startDate) {
    conditions.push(gte(partnerTransfers.createdAt, options.startDate));
  }
  if (options?.endDate) {
    conditions.push(lte(partnerTransfers.createdAt, options.endDate));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const db = await getDb();
  if (!db) return [];

  const transfers = await db
    .select()
    .from(partnerTransfers)
    .where(whereClause)
    .orderBy(desc(partnerTransfers.createdAt));

  return transfers;
}

// Export constants for use in tests and other modules
export const SPLIT_CONFIG = {
  partnerPercentage: PARTNER_SPLIT_PERCENTAGE,
  platformPercentage: PLATFORM_SPLIT_PERCENTAGE,
};
