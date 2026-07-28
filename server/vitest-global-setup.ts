/**
 * Vitest Global Setup/Teardown
 * 
 * This file runs AFTER all test suites complete.
 * It cleans up any test data that was created in the production database
 * to prevent test accounts from polluting the admin panel.
 * 
 * Test accounts are identified by their @test.com email addresses.
 */
import { getDb } from "./db/connection";
import { users, serviceProviders, services, providerCategories, bookings, payments, reviews, messages, notifications, notificationPreferences, referralCodes, referrals, availabilitySchedules, availabilityOverrides, promoCodes, verificationDocuments, portfolioItems, servicePackages, quoteRequests } from "../drizzle/schema";
import { like, inArray, sql } from "drizzle-orm";

export async function teardown() {
  console.log("\n[vitest-global-setup] Cleaning up test data from database...");
  
  let db: Awaited<ReturnType<typeof getDb>>;
  try {
    db = await getDb();
  } catch (err: any) {
    console.log(`[vitest-global-setup] Could not connect to database: ${err.message}`);
    return;
  }

  try {
    // Find all test user IDs (multiple patterns used by tests)
    const testUsers = await db.select({ id: users.id })
      .from(users)
      .where(
        sql`email LIKE '%@test.com' OR email LIKE '%@example.com' OR email LIKE '%@deleted.ologycrew.com' OR name LIKE 'Phase%' OR name LIKE 'Test %' OR name LIKE 'P1% Customer' OR name LIKE 'P1% Provider' OR name LIKE 'P1% Admin'`
      );
    
    const testUserIds = testUsers.map(u => u.id);
    
    if (testUserIds.length === 0) {
      console.log("[vitest-global-setup] No test accounts found, skipping cleanup");
      return;
    }

    console.log(`[vitest-global-setup] Found ${testUserIds.length} test accounts to clean up`);

    // Find test provider IDs
    const testProviders = await db.select({ id: serviceProviders.id })
      .from(serviceProviders)
      .where(inArray(serviceProviders.userId, testUserIds));
    
    const testProviderIds = testProviders.map(p => p.id);

    // Disable FK checks temporarily for bulk cleanup
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);

    if (testProviderIds.length > 0) {
      // Provider-related data
      await db.delete(services).where(inArray(services.providerId, testProviderIds)).catch(() => {});
      await db.delete(providerCategories).where(inArray(providerCategories.providerId, testProviderIds)).catch(() => {});
      await db.delete(availabilitySchedules).where(inArray(availabilitySchedules.providerId, testProviderIds)).catch(() => {});
      await db.delete(availabilityOverrides).where(inArray(availabilityOverrides.providerId, testProviderIds)).catch(() => {});
      await db.delete(portfolioItems).where(inArray(portfolioItems.providerId, testProviderIds)).catch(() => {});
      await db.delete(servicePackages).where(inArray(servicePackages.providerId, testProviderIds)).catch(() => {});
      await db.delete(promoCodes).where(inArray(promoCodes.providerId, testProviderIds)).catch(() => {});
      await db.delete(verificationDocuments).where(inArray(verificationDocuments.providerId, testProviderIds)).catch(() => {});
      
      // Bookings and related
      const testBookings = await db.select({ id: bookings.id })
        .from(bookings)
        .where(inArray(bookings.providerId, testProviderIds));
      const testBookingIds = testBookings.map(b => b.id);
      
      if (testBookingIds.length > 0) {
        await db.delete(payments).where(inArray(payments.bookingId, testBookingIds)).catch(() => {});
        await db.delete(reviews).where(inArray(reviews.bookingId, testBookingIds)).catch(() => {});
      }
      await db.delete(bookings).where(inArray(bookings.providerId, testProviderIds)).catch(() => {});
      
      // Quote requests by provider
      await db.delete(quoteRequests).where(inArray(quoteRequests.providerId, testProviderIds)).catch(() => {});
      
      // Provider profiles
      await db.delete(serviceProviders).where(inArray(serviceProviders.userId, testUserIds)).catch(() => {});
    }

    // User-related data
    await db.delete(bookings).where(inArray(bookings.customerId, testUserIds)).catch(() => {});
    await db.delete(messages).where(inArray(messages.senderId, testUserIds)).catch(() => {});
    await db.delete(messages).where(inArray(messages.recipientId, testUserIds)).catch(() => {});
    await db.delete(notifications).where(inArray(notifications.userId, testUserIds)).catch(() => {});
    await db.delete(notificationPreferences).where(inArray(notificationPreferences.userId, testUserIds)).catch(() => {});
    await db.delete(referralCodes).where(inArray(referralCodes.userId, testUserIds)).catch(() => {});
    await db.delete(referrals).where(inArray(referrals.referrerId, testUserIds)).catch(() => {});
    await db.delete(referrals).where(inArray(referrals.refereeId, testUserIds)).catch(() => {});
    await db.delete(quoteRequests).where(inArray(quoteRequests.customerId, testUserIds)).catch(() => {});

    // Finally delete the test users
    await db.delete(users).where(
      sql`email LIKE '%@test.com' OR email LIKE '%@example.com' OR email LIKE '%@deleted.ologycrew.com' OR name LIKE 'Phase%' OR name LIKE 'Test %' OR name LIKE 'P1% Customer' OR name LIKE 'P1% Provider' OR name LIKE 'P1% Admin'`
    );

    // Re-enable FK checks
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);

    console.log(`[vitest-global-setup] Successfully cleaned up ${testUserIds.length} test accounts and related data`);
  } catch (err: any) {
    console.error(`[vitest-global-setup] Cleanup error: ${err.message}`);
    // Re-enable FK checks even on error
    try { await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`); } catch {}
  }
}
