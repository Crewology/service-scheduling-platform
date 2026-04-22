import { eq, and, inArray, isNull } from "drizzle-orm";
import {
  InsertUser,
  users,
  serviceProviders,
  services,
  bookings,
  notificationPreferences,
  customerSubscriptions,
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
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      // Only set admin on initial insert, don't override on subsequent logins
      values.role = 'admin';
      // Don't add to updateSet — preserves whatever role was manually set in DB
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
// ACCOUNT DELETION (GDPR / CCPA)
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
 * Soft-delete and anonymize a user account.
 *
 * - Anonymizes PII (name, email, phone, photo)
 * - Soft-deletes the user record (sets deletedAt)
 * - Deactivates provider profile if applicable
 * - Soft-deletes provider services
 * - Disables email notifications
 * - Returns info about what was cleaned up
 */
export async function deleteUserAccount(userId: number): Promise<{
  anonymized: boolean;
  providerDeactivated: boolean;
  servicesDeactivated: number;
  subscriptionsCancelled: number;
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const anonymizedLabel = `deleted-user-${userId}`;
  let providerDeactivated = false;
  let servicesDeactivated = 0;
  let subscriptionsCancelled = 0;

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

  // 2. Deactivate provider profile if exists
  const providerRows = await db
    .select({ id: serviceProviders.id })
    .from(serviceProviders)
    .where(and(eq(serviceProviders.userId, userId), isNull(serviceProviders.deletedAt)))
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

    // Soft-delete all services
    const svcResult = await db.update(services).set({
      isActive: false,
      deletedAt: now,
    }).where(
      and(eq(services.providerId, providerId), isNull(services.deletedAt))
    );

    servicesDeactivated = svcResult[0]?.affectedRows ?? 0;
  }

  // 3. Disable email notifications
  try {
    await db.update(notificationPreferences).set({
      emailEnabled: false,
      pushEnabled: false,
      smsEnabled: false,
    }).where(eq(notificationPreferences.userId, userId));
  } catch {
    // Preferences row may not exist — that's fine
  }

  // 4. Mark customer subscriptions as cancelled
  try {
    const subResult = await db.update(customerSubscriptions).set({
      status: "cancelled",
    }).where(
      and(
        eq(customerSubscriptions.userId, userId),
        inArray(customerSubscriptions.status, ["active", "trialing"])
      )
    );
    subscriptionsCancelled = subResult[0]?.affectedRows ?? 0;
  } catch {
    // No subscriptions — fine
  }

  return {
    anonymized: true,
    providerDeactivated,
    servicesDeactivated,
    subscriptionsCancelled,
  };
}
