import type { User } from "../drizzle/schema";

export const APPROVED_ADMIN_EMAILS = [
  "garychisolm30@gmail.com",
  "wwilliams@visionkwest.com",
] as const;

export function isApprovedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if ((APPROVED_ADMIN_EMAILS as readonly string[]).includes(normalized)) return true;
  return process.env.NODE_ENV === "test" && normalized.endsWith("@example.invalid");
}

export function hasAdminClearance(user: Pick<User, "role" | "email"> | null | undefined): boolean {
  return Boolean(user?.role === "admin" && isApprovedAdminEmail(user.email));
}

export function normalizeNamedAdminClearance(user: User | null): User | null {
  if (!user || user.role !== "admin" || isApprovedAdminEmail(user.email)) return user;
  return { ...user, role: "customer", adminRole: null };
}
