import type { User } from "../drizzle/schema";

export const SUPER_ADMIN_EMAILS = [
  "garychisolm30@gmail.com",
  "wwilliams@visionkwest.com",
] as const;
export const OPERATIONS_ADMIN_EMAIL = "trace@visionkwest.com";
export const APPROVED_ADMIN_EMAILS = [...SUPER_ADMIN_EMAILS, OPERATIONS_ADMIN_EMAIL] as const;

export function isApprovedSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if ((SUPER_ADMIN_EMAILS as readonly string[]).includes(normalized)) return true;
  return process.env.NODE_ENV === "test" && normalized.endsWith("@example.invalid");
}

export function isApprovedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return normalized === OPERATIONS_ADMIN_EMAIL || isApprovedSuperAdminEmail(normalized);
}

/** An approved identity and matching database role are both required. Never infer a role from email alone. */
export function hasAdminClearance(user: Pick<User, "role" | "email" | "adminRole"> | null | undefined): boolean {
  if (user?.role !== "admin" || !isApprovedAdminEmail(user.email)) return false;
  if (user.email?.trim().toLowerCase() === OPERATIONS_ADMIN_EMAIL) return user.adminRole === "operations_admin";
  return true;
}

/** Financial partner transfers and owner-only controls are never available to operations admins. */
export function hasPartnerSplitAccess(user: Pick<User, "role" | "email" | "adminRole"> | null | undefined): boolean {
  return hasAdminClearance(user) && user?.adminRole === "super_admin" && isApprovedSuperAdminEmail(user.email);
}

export function normalizeNamedAdminClearance(user: User | null): User | null {
  if (!user || user.role !== "admin" || hasAdminClearance(user)) return user;
  return { ...user, role: "customer", adminRole: null };
}
