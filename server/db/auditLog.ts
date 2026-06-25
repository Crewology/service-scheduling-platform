import { getDb } from "./connection";
import { auditLog, users } from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export type AuditAction =
  | "suspend_user"
  | "unsuspend_user"
  | "verify_provider"
  | "reject_provider"
  | "promote_to_admin"
  | "demote_from_admin"
  | "change_admin_role"
  | "flag_review"
  | "unflag_review"
  | "hide_review"
  | "delete_review"
  | "approve_document"
  | "reject_document"
  | "trigger_reminders"
  | "trigger_review_reminders"
  | "delete_user"
  | "activate_provider"
  | "deactivate_provider";

export type TargetType = "user" | "provider" | "review" | "booking" | "document" | "system";

/**
 * Record an admin action in the audit log.
 */
export async function createAuditEntry(params: {
  actorId: number;
  action: AuditAction;
  targetType: TargetType;
  targetId: number;
  details?: Record<string, any>;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLog).values({
    actorId: params.actorId,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    details: params.details ? JSON.stringify(params.details) : null,
  });
}

/**
 * Get audit log entries with optional filters, paginated.
 */
export async function getAuditLog(filters?: {
  action?: string;
  actorId?: number;
  targetType?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}) {
  const page = filters?.page || 1;
  const limit = filters?.limit || 50;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (filters?.action) conditions.push(eq(auditLog.action, filters.action));
  if (filters?.actorId) conditions.push(eq(auditLog.actorId, filters.actorId));
  if (filters?.targetType) conditions.push(eq(auditLog.targetType, filters.targetType));
  if (filters?.startDate) conditions.push(gte(auditLog.createdAt, filters.startDate));
  if (filters?.endDate) conditions.push(lte(auditLog.createdAt, filters.endDate));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const db = await getDb();
  if (!db) return { entries: [], total: 0, page, limit, totalPages: 0 };

  const entries = await db
    .select({
      id: auditLog.id,
      actorId: auditLog.actorId,
      actorName: users.name,
      actorEmail: users.email,
      action: auditLog.action,
      targetType: auditLog.targetType,
      targetId: auditLog.targetId,
      details: auditLog.details,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.actorId, users.id))
    .where(whereClause)
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(auditLog)
    .where(whereClause);

  return {
    entries: entries.map(e => ({
      ...e,
      details: e.details ? JSON.parse(e.details as string) : null,
    })),
    total: countResult?.count || 0,
    page,
    limit,
    totalPages: Math.ceil((countResult?.count || 0) / limit),
  };
}

/**
 * Get audit log entries for a specific target (e.g., all actions on a user).
 */
export async function getAuditLogForTarget(targetType: string, targetId: number) {
  const db = await getDb();
  if (!db) return [];
  const entries = await db
    .select({
      id: auditLog.id,
      actorId: auditLog.actorId,
      actorName: users.name,
      action: auditLog.action,
      targetType: auditLog.targetType,
      targetId: auditLog.targetId,
      details: auditLog.details,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.actorId, users.id))
    .where(and(eq(auditLog.targetType, targetType), eq(auditLog.targetId, targetId)))
    .orderBy(desc(auditLog.createdAt))
    .limit(100);

  return entries.map((e: any) => ({
    ...e,
    details: e.details ? JSON.parse(e.details as string) : null,
  }));
}
