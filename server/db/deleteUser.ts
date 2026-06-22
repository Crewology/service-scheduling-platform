import { getDb } from "./connection";
import { sql } from "drizzle-orm";

/**
 * Deletes a user and all their related data (cascading delete).
 * This removes the user from all tables that reference them.
 */
export async function deleteUserCascade(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Disable FK checks for the bulk delete
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);

  try {
    // Delete related data in child tables
    await db.execute(sql`DELETE FROM messages WHERE senderId = ${userId}`);
    await db.execute(sql`DELETE FROM notifications WHERE userId = ${userId}`);
    await db.execute(sql`DELETE FROM notification_preferences WHERE userId = ${userId}`);
    await db.execute(sql`DELETE FROM reviews WHERE customerId = ${userId}`);
    await db.execute(sql`DELETE FROM customer_favorites WHERE userId = ${userId}`);
    await db.execute(sql`DELETE FROM referral_codes WHERE userId = ${userId}`);
    await db.execute(sql`DELETE FROM referrals WHERE referrerId = ${userId} OR referredId = ${userId}`);
    await db.execute(sql`DELETE FROM quote_requests WHERE customerId = ${userId}`);
    await db.execute(sql`DELETE FROM bookings WHERE customerId = ${userId}`);

    // Provider-related data (if user is a provider)
    const providerRows: any = await db.execute(sql`SELECT id FROM service_providers WHERE userId = ${userId}`);
    const providers = (providerRows[0] || providerRows) as any[];

    if (providers && providers.length > 0) {
      for (const provider of providers) {
        const providerId = provider.id;
        await db.execute(sql`DELETE FROM services WHERE providerId = ${providerId}`);
        await db.execute(sql`DELETE FROM service_packages WHERE providerId = ${providerId}`);
        await db.execute(sql`DELETE FROM portfolio_items WHERE providerId = ${providerId}`);
        await db.execute(sql`DELETE FROM provider_categories WHERE providerId = ${providerId}`);
        await db.execute(sql`DELETE FROM verification_documents WHERE providerId = ${providerId}`);
        await db.execute(sql`DELETE FROM promo_codes WHERE providerId = ${providerId}`);
        await db.execute(sql`DELETE FROM bookings WHERE providerId = ${providerId}`);
        await db.execute(sql`DELETE FROM reviews WHERE providerId = ${providerId}`);
      }
      await db.execute(sql`DELETE FROM service_providers WHERE userId = ${userId}`);
    }

    // Subscriptions
    try {
      await db.execute(sql`DELETE FROM subscriptions WHERE userId = ${userId}`);
    } catch (e) {
      // Table may not exist
    }

    // Finally delete the user
    await db.execute(sql`DELETE FROM users WHERE id = ${userId}`);
  } finally {
    // Re-enable FK checks
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
  }
}
