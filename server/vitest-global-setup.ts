/**
 * Vitest Global Setup/Teardown
 *
 * Tests use the project database, so every recognizable test identity and all
 * dependent data must be removed after each Vitest run. Test providers are
 * never intended to remain as marketplace supply.
 */
import { getDb } from "./db/connection";
import {
  auditLog,
  availabilityOverrides,
  availabilitySchedules,
  bookingSessions,
  bookings,
  bulkBookingDrafts,
  customerFavorites,
  customerSubscriptions,
  eventTemplates,
  invoiceLineItems,
  invoices,
  messages,
  notificationPreferences,
  notifications,
  packageItems,
  payments,
  portfolioItems,
  promoCodes,
  promoRedemptions,
  promotions,
  providerCategories,
  providerSubscriptions,
  pushSubscriptions,
  quoteRequests,
  referralCodes,
  referralCredits,
  referrals,
  reviews,
  savedProviderFolders,
  servicePackages,
  servicePhotos,
  serviceProviders,
  services,
  trustedDevices,
  twoFactorCodes,
  termsVersions,
  userTermsNotices,
  users,
  verificationDocuments,
  waitlistEntries,
} from "../drizzle/schema";
import { and, eq, inArray, or, sql } from "drizzle-orm";

// Cleanup is intentionally limited to namespaces reserved by automated tests.
// Never match normal example.com addresses, deleted-user aliases, or display names.
const testIdentityPredicate = sql`
  email LIKE '%@example.invalid'
  OR openId LIKE 'test-%'
  OR openId LIKE 'rolesel-%'
  OR openId LIKE 'profile-test-%'
  OR openId LIKE 'role-test-%'
  OR openId LIKE 'platform-test-%'
  OR openId LIKE 'og-%'
  OR openId LIKE 'sc-%'
`;

export async function teardown() {
  console.log("\n[vitest-global-setup] Cleaning up test data from database...");

  let db: Awaited<ReturnType<typeof getDb>>;
  try {
    db = await getDb();
  } catch (error: any) {
    console.log(`[vitest-global-setup] Could not connect to database: ${error.message}`);
    return;
  }
  if (!db) {
    console.log("[vitest-global-setup] Database is unavailable, skipping cleanup");
    return;
  }

  try {
    const testUsers = await db.select({ id: users.id }).from(users).where(testIdentityPredicate);
    const testUserIds = testUsers.map(user => user.id);
    if (testUserIds.length === 0) {
      console.log("[vitest-global-setup] No test accounts found, skipping cleanup");
      return;
    }

    const testProviderRows = await db.select({ id: serviceProviders.id })
      .from(serviceProviders)
      .where(inArray(serviceProviders.userId, testUserIds));
    const testProviderIds = testProviderRows.map(provider => provider.id);
    const testServiceRows = testProviderIds.length
      ? await db.select({ id: services.id }).from(services).where(inArray(services.providerId, testProviderIds))
      : [];
    const testServiceIds = testServiceRows.map(service => service.id);
    const testBookingRows = await db.select({ id: bookings.id }).from(bookings).where(
      testProviderIds.length
        ? or(inArray(bookings.customerId, testUserIds), inArray(bookings.providerId, testProviderIds))
        : inArray(bookings.customerId, testUserIds),
    );
    const testBookingIds = testBookingRows.map(booking => booking.id);
    const testPackageRows = testProviderIds.length
      ? await db.select({ id: servicePackages.id }).from(servicePackages).where(inArray(servicePackages.providerId, testProviderIds))
      : [];
    const testPackageIds = testPackageRows.map(servicePackage => servicePackage.id);
    const testInvoiceRows = await db.select({ id: invoices.id }).from(invoices).where(
      testProviderIds.length
        ? or(inArray(invoices.customerId, testUserIds), inArray(invoices.providerId, testProviderIds))
        : inArray(invoices.customerId, testUserIds),
    );
    const testInvoiceIds = testInvoiceRows.map(invoice => invoice.id);
    const testReferralRows = await db.select({ id: referrals.id }).from(referrals).where(
      or(inArray(referrals.referrerId, testUserIds), inArray(referrals.refereeId, testUserIds)),
    );
    const testReferralIds = testReferralRows.map(referral => referral.id);
    const testTermsRows = await db.select({ id: termsVersions.id }).from(termsVersions).where(
      or(inArray(termsVersions.createdBy, testUserIds), inArray(termsVersions.publishedBy, testUserIds)),
    );
    const testTermsIds = testTermsRows.map(termsVersion => termsVersion.id);

    console.log(`[vitest-global-setup] Found ${testUserIds.length} test accounts and ${testProviderIds.length} test providers to clean up`);
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);

    if (testBookingIds.length) {
      await db.delete(bookingSessions).where(inArray(bookingSessions.bookingId, testBookingIds));
      await db.delete(payments).where(inArray(payments.bookingId, testBookingIds));
      await db.delete(reviews).where(inArray(reviews.bookingId, testBookingIds));
      await db.delete(messages).where(inArray(messages.bookingId, testBookingIds));
      await db.delete(notifications).where(inArray(notifications.relatedBookingId, testBookingIds));
      await db.delete(promoRedemptions).where(inArray(promoRedemptions.bookingId, testBookingIds));
    }
    if (testInvoiceIds.length) {
      await db.delete(invoiceLineItems).where(inArray(invoiceLineItems.invoiceId, testInvoiceIds));
      await db.delete(invoices).where(inArray(invoices.id, testInvoiceIds));
    }
    if (testPackageIds.length) {
      await db.delete(packageItems).where(inArray(packageItems.packageId, testPackageIds));
    }
    if (testServiceIds.length) {
      await db.delete(servicePhotos).where(inArray(servicePhotos.serviceId, testServiceIds));
      await db.delete(packageItems).where(inArray(packageItems.serviceId, testServiceIds));
      await db.delete(waitlistEntries).where(inArray(waitlistEntries.serviceId, testServiceIds));
    }
    if (testReferralIds.length) {
      await db.delete(referralCredits).where(inArray(referralCredits.referralId, testReferralIds));
    }

    await db.delete(promoRedemptions).where(inArray(promoRedemptions.userId, testUserIds));
    await db.delete(referralCredits).where(inArray(referralCredits.userId, testUserIds));
    await db.delete(referrals).where(or(inArray(referrals.referrerId, testUserIds), inArray(referrals.refereeId, testUserIds)));
    await db.delete(referralCodes).where(inArray(referralCodes.userId, testUserIds));
    await db.delete(customerFavorites).where(inArray(customerFavorites.userId, testUserIds));
    await db.delete(savedProviderFolders).where(inArray(savedProviderFolders.userId, testUserIds));
    await db.delete(customerSubscriptions).where(inArray(customerSubscriptions.userId, testUserIds));
    await db.delete(notificationPreferences).where(inArray(notificationPreferences.userId, testUserIds));
    await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.userId, testUserIds));
    await db.delete(twoFactorCodes).where(inArray(twoFactorCodes.userId, testUserIds));
    await db.delete(trustedDevices).where(inArray(trustedDevices.userId, testUserIds));
    await db.delete(bulkBookingDrafts).where(inArray(bulkBookingDrafts.userId, testUserIds));
    await db.delete(eventTemplates).where(inArray(eventTemplates.userId, testUserIds));
    await db.delete(waitlistEntries).where(inArray(waitlistEntries.userId, testUserIds));
    await db.delete(messages).where(or(inArray(messages.senderId, testUserIds), inArray(messages.recipientId, testUserIds)));
    await db.delete(notifications).where(inArray(notifications.userId, testUserIds));
    await db.delete(userTermsNotices).where(inArray(userTermsNotices.userId, testUserIds));
    if (testTermsIds.length) {
      await db.delete(userTermsNotices).where(inArray(userTermsNotices.termsVersionId, testTermsIds));
      await db.delete(auditLog).where(and(eq(auditLog.targetType, "terms_version"), inArray(auditLog.targetId, testTermsIds)));
      await db.delete(termsVersions).where(inArray(termsVersions.id, testTermsIds));
    }
    await db.delete(quoteRequests).where(inArray(quoteRequests.customerId, testUserIds));
    await db.delete(auditLog).where(or(
      inArray(auditLog.actorId, testUserIds),
      and(eq(auditLog.targetType, "user"), inArray(auditLog.targetId, testUserIds)),
    ));

    if (testProviderIds.length) {
      await db.delete(customerFavorites).where(inArray(customerFavorites.providerId, testProviderIds));
      await db.delete(waitlistEntries).where(inArray(waitlistEntries.providerId, testProviderIds));
      await db.delete(quoteRequests).where(inArray(quoteRequests.providerId, testProviderIds));
      await db.delete(promotions).where(inArray(promotions.providerId, testProviderIds));
      await db.delete(promoCodes).where(inArray(promoCodes.providerId, testProviderIds));
      await db.delete(verificationDocuments).where(inArray(verificationDocuments.providerId, testProviderIds));
      await db.delete(portfolioItems).where(inArray(portfolioItems.providerId, testProviderIds));
      await db.delete(availabilityOverrides).where(inArray(availabilityOverrides.providerId, testProviderIds));
      await db.delete(availabilitySchedules).where(inArray(availabilitySchedules.providerId, testProviderIds));
      await db.delete(providerCategories).where(inArray(providerCategories.providerId, testProviderIds));
      await db.delete(providerSubscriptions).where(inArray(providerSubscriptions.providerId, testProviderIds));
      await db.delete(servicePackages).where(inArray(servicePackages.providerId, testProviderIds));
      await db.delete(bookings).where(inArray(bookings.providerId, testProviderIds));
      await db.delete(services).where(inArray(services.providerId, testProviderIds));
      await db.delete(auditLog).where(and(eq(auditLog.targetType, "provider"), inArray(auditLog.targetId, testProviderIds)));
      await db.delete(serviceProviders).where(inArray(serviceProviders.id, testProviderIds));
    }

    await db.delete(bookings).where(inArray(bookings.customerId, testUserIds));
    await db.delete(users).where(testIdentityPredicate);
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);

    const remainingUsers = await db.select({ id: users.id }).from(users).where(testIdentityPredicate);
    const remainingProviders = testProviderIds.length
      ? await db.select({ id: serviceProviders.id }).from(serviceProviders).where(inArray(serviceProviders.id, testProviderIds))
      : [];
    if (remainingUsers.length || remainingProviders.length) {
      throw new Error(`Cleanup verification failed: ${remainingUsers.length} users and ${remainingProviders.length} providers remain`);
    }
    console.log(`[vitest-global-setup] Successfully cleaned up ${testUserIds.length} test accounts and all dependent data`);
  } catch (error: any) {
    console.error(`[vitest-global-setup] Cleanup error: ${error.message}`);
    try {
      await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);
    } catch {}
  }
}
