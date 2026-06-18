import { getDb } from "./connection";
import { users } from "../../drizzle/schema";
import { eq, and, isNull, like, or } from "drizzle-orm";

export type AdminRole = "super_admin" | "support_agent" | "moderator";

/**
 * Get all admin team members (users with role=admin).
 */
export async function getAdminTeamMembers() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      adminRole: users.adminRole,
      profilePhotoUrl: users.profilePhotoUrl,
      lastSignedIn: users.lastSignedIn,
      createdAt: users.createdAt,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.role, "admin"));
}

/**
 * Promote a user to admin with a specific admin role.
 */
export async function promoteToAdmin(userId: number, adminRole: AdminRole) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(users)
    .set({ role: "admin", adminRole })
    .where(eq(users.id, userId));
}

/**
 * Demote an admin back to their previous role (customer or provider).
 * We check if they have a provider profile to determine the fallback role.
 */
export async function demoteFromAdmin(userId: number, fallbackRole: "customer" | "provider") {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(users)
    .set({ role: fallbackRole, adminRole: null })
    .where(eq(users.id, userId));
}

/**
 * Update an admin's sub-role.
 */
export async function updateAdminRole(userId: number, adminRole: AdminRole) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(users)
    .set({ adminRole })
    .where(eq(users.id, userId));
}

/**
 * Search users by name, email, or phone (for promote dialog).
 */
export async function searchUsersForAdmin(query: string, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  const searchTerm = `%${query}%`;
  return await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      adminRole: users.adminRole,
      profilePhotoUrl: users.profilePhotoUrl,
      lastSignedIn: users.lastSignedIn,
      createdAt: users.createdAt,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(
      and(
        isNull(users.deletedAt),
        or(
          like(users.name, searchTerm),
          like(users.email, searchTerm),
          like(users.phone, searchTerm)
        )
      )
    )
    .limit(limit);
}
