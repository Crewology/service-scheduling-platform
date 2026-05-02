import { eq, and, inArray, isNull, or } from "drizzle-orm";
import {
  InsertUser,
  users,
  serviceProviders,
  services,
  bookings,
  notificationPreferences,
  customerSubscriptions,
  notifications,
  messages,
  reviews,
  customerFavorites,
  savedProviderFolders,
  referralCodes,
  referrals,
  referralCredits,
  promoRedemptions,
  pushSubscriptions,
  portfolioItems,
  servicePhotos,
  servicePackages,
  packageItems,
  availabilitySchedules,
  availabilityOverrides,
  providerSubscriptions,
  providerCategories,
  verificationDocuments,
  contactSubmissions,
  quoteRequests,
} from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { getDb } from "./connection";

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "firstName", "lastName", "phone", "profilePhotoUrl"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    // List of emails that should be auto-promoted to admin on signup
    const ADMIN_EMAILS = [
      'rlstephens42@comcast.net',
    ];

    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      // Only set admin on initial insert, don't override on subsequent logins
      values.role = 'admin';
      // Don't add to updateSet — preserves whatever role was manually set in DB
    } else if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      // Auto-promote pre-approved admin emails
      values.role = 'admin';
      updateSet.role = 'admin';
      console.log(`[Database] Auto-promoting ${user.email} to admin role`);
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(users).orderBy(users.createdAt);
}

// ============================================================================
// USER PROFILE UPDATE
// ============================================================================

export async function updateUserProfile(userId: number, data: {
  name?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  profilePhotoUrl?: string;
  role?: "admin" | "customer" | "provider";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.firstName !== undefined) updateData.firstName = data.firstName;
  if (data.lastName !== undefined) updateData.lastName = data.lastName;
  if (data.profilePhotoUrl !== undefined) updateData.profilePhotoUrl = data.profilePhotoUrl;
  if (data.role !== undefined) updateData.role = data.role;

  if (Object.keys(updateData).length === 0) return;

  await db.update(users).set(updateData).where(eq(users.id, userId));
}

// ============================================================================
// USER SUSPENSION
// ============================================================================

export async function suspendUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, userId));
}

export async function unsuspendUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ deletedAt: null }).where(eq(users.id, userId));
}

// ============================================================================
// ACCOUNT DELETION (GDPR / CCPA) — COMPREHENSIVE
// ============================================================================

/**
 * Check if a user has any active (non-terminal) bookings.
 * Active = pending, confirmed, or in_progress.
 */
export async function hasActiveBookings(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check as customer
  const customerBookings = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.customerId, userId),
        inArray(bookings.status, ["pending", "confirmed", "in_progress"] as const)
      )
    )
    .limit(1);

  if (customerBookings.length > 0) return true;

  // Check as provider
  const provider = await db
    .select({ id: serviceProviders.id })
    .from(serviceProviders)
    .where(and(eq(serviceProviders.userId, userId), isNull(serviceProviders.deletedAt)))
    .limit(1);

  if (provider.length > 0) {
    const providerBookings = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.providerId, provider[0].id),
          inArray(bookings.status, ["pending", "confirmed", "in_progress"] as const)
        )
      )
      .limit(1);

    if (providerBookings.length > 0) return true;
  }

  return false;
}

/**
 * Comprehensive account deletion — removes/anonymizes ALL user data from ALL tables.
 *
 * Strategy:
 * - Anonymizes PII on the user record (name, email, phone, photo)
 * - Soft-deletes the user (sets deletedAt)
 * - Hard-deletes personal data from: messages, notifications, favorites,
 *   folders, push subscriptions, referral codes/credits, promo redemptions
 * - Anonymizes reviews (removes review text but keeps ratings for provider integrity)
 * - Deactivates provider profile, services, portfolio, availability, packages, categories
 * - Disables notification preferences
 * - Cancels subscriptions
 */
export async function deleteUserAccount(userId: number): Promise<{
  anonymized: boolean;
  providerDeactivated: boolean;
  servicesDeactivated: number;
  subscriptionsCancelled: number;
  messagesDeleted: number;
  notificationsDeleted: number;
  favoritesDeleted: number;
  foldersDeleted: number;
  reviewsAnonymized: number;
  referralDataDeleted: number;
  pushSubscriptionsDeleted: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const anonymizedLabel = `deleted-user-${userId}`;
  let providerDeactivated = false;
  let servicesDeactivated = 0;
  let subscriptionsCancelled = 0;
  let messagesDeleted = 0;
  let notificationsDeleted = 0;
  let favoritesDeleted = 0;
  let foldersDeleted = 0;
  let reviewsAnonymized = 0;
  let referralDataDeleted = 0;
  let pushSubscriptionsDeleted = 0;

  // 1. Anonymize and soft-delete the user
  await db.update(users).set({
    name: anonymizedLabel,
    firstName: "Deleted",
    lastName: "User",
    email: `${anonymizedLabel}@deleted.ologycrew.com`,
    phone: null,
    profilePhotoUrl: null,
    deletedAt: now,
  }).where(eq(users.id, userId));

  // 2. Delete all messages sent by or received by this user
  try {
    const msgResult = await db.delete(messages).where(
      or(
        eq(messages.senderId, userId),
        eq(messages.recipientId, userId)
      )
    );
    messagesDeleted = msgResult[0]?.affectedRows ?? 0;
  } catch (e) {
    console.warn(`[DeleteAccount] Messages cleanup: ${(e as Error).message}`);
  }

  // 3. Delete all notifications for this user
  try {
    const notifResult = await db.delete(notifications).where(
      eq(notifications.userId, userId)
    );
    notificationsDeleted = notifResult[0]?.affectedRows ?? 0;
  } catch (e) {
    console.warn(`[DeleteAccount] Notifications cleanup: ${(e as Error).message}`);
  }

  // 4. Delete customer favorites and saved provider folders
  try {
    const favResult = await db.delete(customerFavorites).where(
      eq(customerFavorites.userId, userId)
    );
    favoritesDeleted = favResult[0]?.affectedRows ?? 0;
  } catch (e) {
    console.warn(`[DeleteAccount] Favorites cleanup: ${(e as Error).message}`);
  }

  try {
    const folderResult = await db.delete(savedProviderFolders).where(
      eq(savedProviderFolders.userId, userId)
    );
    foldersDeleted = folderResult[0]?.affectedRows ?? 0;
  } catch (e) {
    console.warn(`[DeleteAccount] Folders cleanup: ${(e as Error).message}`);
  }

  // 5. Anonymize reviews (keep ratings for provider integrity, remove PII text)
  try {
    const reviewResult = await db.update(reviews).set({
      reviewText: "[Review removed - account deleted]",
    }).where(eq(reviews.customerId, userId));
    reviewsAnonymized = reviewResult[0]?.affectedRows ?? 0;
  } catch (e) {
    console.warn(`[DeleteAccount] Reviews cleanup: ${(e as Error).message}`);
  }

  // 6. Delete push subscriptions
  try {
    const pushResult = await db.delete(pushSubscriptions).where(
      eq(pushSubscriptions.userId, userId)
    );
    pushSubscriptionsDeleted = pushResult[0]?.affectedRows ?? 0;
  } catch (e) {
    console.warn(`[DeleteAccount] Push subscriptions cleanup: ${(e as Error).message}`);
  }

  // 7. Delete referral codes, referrals, and referral credits
  try {
    // Delete referral credits
    const creditResult = await db.delete(referralCredits).where(
      eq(referralCredits.userId, userId)
    );
    referralDataDeleted += creditResult[0]?.affectedRows ?? 0;

    // Delete referrals where user is referrer or referee
    const refResult = await db.delete(referrals).where(
      or(
        eq(referrals.referrerId, userId),
        eq(referrals.refereeId, userId)
      )
    );
    referralDataDeleted += refResult[0]?.affectedRows ?? 0;

    // Delete referral codes
    const codeResult = await db.delete(referralCodes).where(
      eq(referralCodes.userId, userId)
    );
    referralDataDeleted += codeResult[0]?.affectedRows ?? 0;
  } catch (e) {
    console.warn(`[DeleteAccount] Referral cleanup: ${(e as Error).message}`);
  }

  // 8. Delete promo redemptions
  try {
    await db.delete(promoRedemptions).where(
      eq(promoRedemptions.userId, userId)
    );
  } catch (e) {
    console.warn(`[DeleteAccount] Promo redemptions cleanup: ${(e as Error).message}`);
  }

  // 9. Anonymize contact submissions
  try {
    await db.update(contactSubmissions).set({
      name: anonymizedLabel,
      email: `${anonymizedLabel}@deleted.ologycrew.com`,
    }).where(eq(contactSubmissions.userId, userId));
  } catch (e) {
    console.warn(`[DeleteAccount] Contact submissions cleanup: ${(e as Error).message}`);
  }

  // 10. Anonymize quote requests where user is customer
  // Quote requests reference customerId (FK to users table) — the user row is already
  // anonymized above, so the quote's PII is effectively scrubbed. We just clean up
  // any free-text description that might contain personal info.
  try {
    await db.update(quoteRequests).set({
      description: "[Removed - account deleted]",
      location: null,
      attachmentUrls: null,
    }).where(eq(quoteRequests.customerId, userId));
  } catch (e) {
    console.warn(`[DeleteAccount] Quote requests cleanup: ${(e as Error).message}`);
  }

  // 11. Deactivate provider profile if exists
  const providerRows = await db
    .select({ id: serviceProviders.id })
    .from(serviceProviders)
    .where(eq(serviceProviders.userId, userId))
    .limit(1);

  if (providerRows.length > 0) {
    const providerId = providerRows[0].id;

    await db.update(serviceProviders).set({
      isActive: false,
      deletedAt: now,
      businessName: `${anonymizedLabel}-business`,
      description: null,
    }).where(eq(serviceProviders.id, providerId));

    providerDeactivated = true;

    // Get all service IDs for this provider (needed for cascading deletes)
    const providerServices = await db
      .select({ id: services.id })
      .from(services)
      .where(eq(services.providerId, providerId));
    const serviceIds = providerServices.map(s => s.id);

    // Soft-delete all services
    if (serviceIds.length > 0) {
      const svcResult = await db.update(services).set({
        isActive: false,
        deletedAt: now,
      }).where(eq(services.providerId, providerId));
      servicesDeactivated = svcResult[0]?.affectedRows ?? 0;

      // Delete service photos for all services
      try {
        await db.delete(servicePhotos).where(
          inArray(servicePhotos.serviceId, serviceIds)
        );
      } catch (e) {
        console.warn(`[DeleteAccount] Service photos cleanup: ${(e as Error).message}`);
      }
    }

    // Delete portfolio items
    try {
      await db.delete(portfolioItems).where(
        eq(portfolioItems.providerId, providerId)
      );
    } catch (e) {
      console.warn(`[DeleteAccount] Portfolio cleanup: ${(e as Error).message}`);
    }

    // Delete availability schedules and overrides
    try {
      await db.delete(availabilitySchedules).where(
        eq(availabilitySchedules.providerId, providerId)
      );
      await db.delete(availabilityOverrides).where(
        eq(availabilityOverrides.providerId, providerId)
      );
    } catch (e) {
      console.warn(`[DeleteAccount] Availability cleanup: ${(e as Error).message}`);
    }

    // Delete provider categories
    try {
      await db.delete(providerCategories).where(
        eq(providerCategories.providerId, providerId)
      );
    } catch (e) {
      console.warn(`[DeleteAccount] Provider categories cleanup: ${(e as Error).message}`);
    }

    // Delete verification documents
    try {
      await db.delete(verificationDocuments).where(
        eq(verificationDocuments.providerId, providerId)
      );
    } catch (e) {
      console.warn(`[DeleteAccount] Verification docs cleanup: ${(e as Error).message}`);
    }

    // Get package IDs then delete package items, then packages
    try {
      const providerPackages = await db
        .select({ id: servicePackages.id })
        .from(servicePackages)
        .where(eq(servicePackages.providerId, providerId));
      const packageIds = providerPackages.map(p => p.id);

      if (packageIds.length > 0) {
        await db.delete(packageItems).where(
          inArray(packageItems.packageId, packageIds)
        );
      }
      await db.delete(servicePackages).where(
        eq(servicePackages.providerId, providerId)
      );
    } catch (e) {
      console.warn(`[DeleteAccount] Packages cleanup: ${(e as Error).message}`);
    }

    // Cancel provider subscription
    try {
      const provSubResult = await db.update(providerSubscriptions).set({
        status: "cancelled",
      }).where(
        and(
          eq(providerSubscriptions.providerId, providerId),
          inArray(providerSubscriptions.status, ["active", "trialing"])
        )
      );
      subscriptionsCancelled += provSubResult[0]?.affectedRows ?? 0;
    } catch (e) {
      console.warn(`[DeleteAccount] Provider subscription cleanup: ${(e as Error).message}`);
    }
  }

  // 12. Disable email notifications
  try {
    await db.update(notificationPreferences).set({
      emailEnabled: false,
      pushEnabled: false,
      smsEnabled: false,
    }).where(eq(notificationPreferences.userId, userId));
  } catch {
    // Preferences row may not exist — that's fine
  }

  // 13. Mark customer subscriptions as cancelled
  try {
    const subResult = await db.update(customerSubscriptions).set({
      status: "cancelled",
    }).where(
      and(
        eq(customerSubscriptions.userId, userId),
        inArray(customerSubscriptions.status, ["active", "trialing"])
      )
    );
    subscriptionsCancelled += subResult[0]?.affectedRows ?? 0;
  } catch {
    // No subscriptions — fine
  }

  console.log(`[DeleteAccount] User ${userId} deletion complete:`, {
    providerDeactivated,
    servicesDeactivated,
    subscriptionsCancelled,
    messagesDeleted,
    notificationsDeleted,
    favoritesDeleted,
    foldersDeleted,
    reviewsAnonymized,
    referralDataDeleted,
    pushSubscriptionsDeleted,
  });

  return {
    anonymized: true,
    providerDeactivated,
    servicesDeactivated,
    subscriptionsCancelled,
    messagesDeleted,
    notificationsDeleted,
    favoritesDeleted,
    foldersDeleted,
    reviewsAnonymized,
    referralDataDeleted,
    pushSubscriptionsDeleted,
  };
}
