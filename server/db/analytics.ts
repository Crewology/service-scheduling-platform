import { eq, and, gte, desc, sql } from "drizzle-orm";
import {
  bookings,
  services,
  reviews,
  payments,
} from "../../drizzle/schema";
import { getDb } from "./connection";

// ============================================================================
// PROVIDER ANALYTICS
// ============================================================================

export async function getBookingSourceAnalytics(providerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    source: bookings.bookingSource,
    count: sql<number>`COUNT(*)`,
    revenue: sql<number>`COALESCE(SUM(CAST(${bookings.totalAmount} AS DECIMAL(10,2))), 0)`,
  }).from(bookings)
    .where(eq(bookings.providerId, providerId))
    .groupBy(bookings.bookingSource);
}

export async function getBookingTrends(providerId: number) {
  const db = await getDb();
  if (!db) return [];
  const monthExpr = sql.raw(`DATE_FORMAT(createdAt, '%Y-%m')`);
  return await db.select({
    month: sql<string>`DATE_FORMAT(${bookings.createdAt}, '%Y-%m')`,
    totalBookings: sql<number>`COUNT(*)`,
    completedBookings: sql<number>`SUM(CASE WHEN ${bookings.status} = 'completed' THEN 1 ELSE 0 END)`,
    cancelledBookings: sql<number>`SUM(CASE WHEN ${bookings.status} = 'cancelled' THEN 1 ELSE 0 END)`,
    revenue: sql<number>`COALESCE(SUM(CASE WHEN ${bookings.status} = 'completed' THEN CAST(${bookings.totalAmount} AS DECIMAL(10,2)) ELSE 0 END), 0)`,
  }).from(bookings)
    .where(and(
      eq(bookings.providerId, providerId),
      gte(bookings.createdAt, new Date(Date.now() - 365 * 24 * 60 * 60 * 1000))
    ))
    .groupBy(monthExpr)
    .orderBy(monthExpr);
}

export async function getTopServices(providerId: number, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    serviceId: bookings.serviceId,
    serviceName: services.name,
    totalBookings: sql<number>`COUNT(*)`,
    completedBookings: sql<number>`SUM(CASE WHEN ${bookings.status} = 'completed' THEN 1 ELSE 0 END)`,
    revenue: sql<number>`COALESCE(SUM(CASE WHEN ${bookings.status} = 'completed' THEN CAST(${bookings.totalAmount} AS DECIMAL(10,2)) ELSE 0 END), 0)`,
    avgRating: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
    reviewCount: sql<number>`COUNT(DISTINCT ${reviews.id})`,
  }).from(bookings)
    .leftJoin(services, eq(bookings.serviceId, services.id))
    .leftJoin(reviews, eq(bookings.id, reviews.bookingId))
    .where(eq(bookings.providerId, providerId))
    .groupBy(bookings.serviceId, services.name)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(limit);
}

export async function getCustomerRetention(providerId: number) {
  const db = await getDb();
  if (!db) return { totalCustomers: 0, returningCustomers: 0, retentionRate: 0, avgBookingsPerCustomer: 0 };

  const [totalResult] = await db.select({
    totalCustomers: sql<number>`COUNT(DISTINCT ${bookings.customerId})`,
    totalBookings: sql<number>`COUNT(*)`,
  }).from(bookings).where(eq(bookings.providerId, providerId));

  const [returningResult] = await db.select({
    returningCustomers: sql<number>`COUNT(*)`,
  }).from(
    db.select({
      customerId: bookings.customerId,
      bookingCount: sql<number>`COUNT(*)`.as("bookingCount"),
    }).from(bookings)
      .where(eq(bookings.providerId, providerId))
      .groupBy(bookings.customerId)
      .having(sql`COUNT(*) >= 2`)
      .as("repeat_customers")
  );

  const totalCustomers = totalResult?.totalCustomers ?? 0;
  const returningCustomers = returningResult?.returningCustomers ?? 0;
  const totalBookings = totalResult?.totalBookings ?? 0;

  return {
    totalCustomers, returningCustomers,
    retentionRate: totalCustomers > 0 ? Math.round((returningCustomers / totalCustomers) * 100) : 0,
    avgBookingsPerCustomer: totalCustomers > 0 ? parseFloat((totalBookings / totalCustomers).toFixed(1)) : 0,
  };
}

export async function getRefundAnalytics(providerId: number) {
  const db = await getDb();
  if (!db) return { totalRefunds: 0, totalRefundAmount: 0, avgRefundAmount: 0, refundRate: 0 };

  const [refundResult] = await db.select({
    totalRefunds: sql<number>`COUNT(*)`,
    totalRefundAmount: sql<number>`COALESCE(SUM(CAST(${payments.refundAmount} AS DECIMAL(10,2))), 0)`,
    avgRefundAmount: sql<number>`COALESCE(AVG(CAST(${payments.refundAmount} AS DECIMAL(10,2))), 0)`,
  }).from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .where(and(eq(bookings.providerId, providerId), eq(payments.status, "refunded" as any)));

  const [totalBookingsResult] = await db.select({
    total: sql<number>`COUNT(*)`,
  }).from(bookings).where(eq(bookings.providerId, providerId));

  const totalBookings = totalBookingsResult?.total ?? 0;
  const totalRefunds = refundResult?.totalRefunds ?? 0;

  return {
    totalRefunds,
    totalRefundAmount: refundResult?.totalRefundAmount ?? 0,
    avgRefundAmount: refundResult?.avgRefundAmount ?? 0,
    refundRate: totalBookings > 0 ? Math.round((totalRefunds / totalBookings) * 100) : 0,
  };
}

export async function getAdminBookingSourceAnalytics() {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    source: bookings.bookingSource,
    count: sql<number>`COUNT(*)`,
    revenue: sql<number>`COALESCE(SUM(CAST(${bookings.totalAmount} AS DECIMAL(10,2))), 0)`,
  }).from(bookings).groupBy(bookings.bookingSource);
}
