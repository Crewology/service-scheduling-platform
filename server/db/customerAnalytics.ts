import { getDb } from "./connection";
import { bookings, services, serviceProviders, serviceCategories } from "../../drizzle/schema";
import { eq, and, sql, gte, lte, desc } from "drizzle-orm";

/**
 * Customer booking analytics — spending history, trends, provider comparison.
 * Available only to Business-tier subscribers.
 */

export async function getCustomerSpendingSummary(customerId: number) {
  const db = await getDb();
  if (!db) return { totalBookings: 0, completedBookings: 0, cancelledBookings: 0, totalSpent: "0", avgBookingAmount: "0", totalPlatformFees: "0" };

  const result = await db
    .select({
      totalBookings: sql<number>`COUNT(*)`,
      completedBookings: sql<number>`SUM(CASE WHEN ${bookings.status} = 'completed' THEN 1 ELSE 0 END)`,
      cancelledBookings: sql<number>`SUM(CASE WHEN ${bookings.status} = 'cancelled' THEN 1 ELSE 0 END)`,
      totalSpent: sql<string>`COALESCE(SUM(CASE WHEN ${bookings.status} IN ('completed', 'confirmed', 'in_progress') THEN ${bookings.totalAmount} ELSE 0 END), 0)`,
      avgBookingAmount: sql<string>`COALESCE(AVG(CASE WHEN ${bookings.status} IN ('completed', 'confirmed', 'in_progress') THEN ${bookings.totalAmount} ELSE NULL END), 0)`,
      totalPlatformFees: sql<string>`COALESCE(SUM(CASE WHEN ${bookings.status} IN ('completed', 'confirmed', 'in_progress') THEN ${bookings.platformFee} ELSE 0 END), 0)`,
    })
    .from(bookings)
    .where(eq(bookings.customerId, customerId));

  return result[0] || {
    totalBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    totalSpent: "0",
    avgBookingAmount: "0",
    totalPlatformFees: "0",
  };
}

export async function getCustomerMonthlySpending(customerId: number, months: number = 12) {
  const db = await getDb();
  if (!db) return [];
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  const startStr = startDate.toISOString().slice(0, 10);

  const result = await db
    .select({
      month: sql<string>`DATE_FORMAT(STR_TO_DATE(${bookings.bookingDate}, '%Y-%m-%d'), '%Y-%m')`,
      totalSpent: sql<string>`COALESCE(SUM(${bookings.totalAmount}), 0)`,
      bookingCount: sql<number>`COUNT(*)`,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.customerId, customerId),
        gte(bookings.bookingDate, startStr),
        sql`${bookings.status} IN ('completed', 'confirmed', 'in_progress')`
      )
    )
    .groupBy(sql`DATE_FORMAT(STR_TO_DATE(${bookings.bookingDate}, '%Y-%m-%d'), '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(STR_TO_DATE(${bookings.bookingDate}, '%Y-%m-%d'), '%Y-%m')`);

  return result;
}

export async function getCustomerTopProviders(customerId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      providerId: bookings.providerId,
      businessName: serviceProviders.businessName,
      profileSlug: serviceProviders.profileSlug,
      bookingCount: sql<number>`COUNT(*)`,
      totalSpent: sql<string>`COALESCE(SUM(${bookings.totalAmount}), 0)`,
      lastBookingDate: sql<string>`MAX(${bookings.bookingDate})`,
    })
    .from(bookings)
    .innerJoin(serviceProviders, eq(bookings.providerId, serviceProviders.id))
    .where(
      and(
        eq(bookings.customerId, customerId),
        sql`${bookings.status} IN ('completed', 'confirmed', 'in_progress')`
      )
    )
    .groupBy(bookings.providerId, serviceProviders.businessName, serviceProviders.profileSlug)
    .orderBy(desc(sql`SUM(${bookings.totalAmount})`))
    .limit(limit);

  return result;
}

export async function getCustomerCategoryBreakdown(customerId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      categoryId: services.categoryId,
      categoryName: serviceCategories.name,
      bookingCount: sql<number>`COUNT(*)`,
      totalSpent: sql<string>`COALESCE(SUM(${bookings.totalAmount}), 0)`,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .innerJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
    .where(
      and(
        eq(bookings.customerId, customerId),
        sql`${bookings.status} IN ('completed', 'confirmed', 'in_progress')`
      )
    )
    .groupBy(services.categoryId, serviceCategories.name)
    .orderBy(desc(sql`SUM(${bookings.totalAmount})`));

  return result;
}

export async function getCustomerRecentBookings(customerId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      id: bookings.id,
      bookingNumber: bookings.bookingNumber,
      bookingDate: bookings.bookingDate,
      status: bookings.status,
      totalAmount: bookings.totalAmount,
      serviceName: services.name,
      businessName: serviceProviders.businessName,
      profileSlug: serviceProviders.profileSlug,
      categoryName: serviceCategories.name,
    })
    .from(bookings)
    .innerJoin(services, eq(bookings.serviceId, services.id))
    .innerJoin(serviceProviders, eq(bookings.providerId, serviceProviders.id))
    .innerJoin(serviceCategories, eq(services.categoryId, serviceCategories.id))
    .where(eq(bookings.customerId, customerId))
    .orderBy(desc(bookings.createdAt))
    .limit(limit);

  return result;
}
