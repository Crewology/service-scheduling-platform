import { and, desc, eq, isNull, ne } from "drizzle-orm";
import {
  termsVersions,
  userTermsNotices,
  users,
  type InsertTermsVersion,
  type TermsVersion,
} from "../../drizzle/schema";
import { getDb } from "./connection";

export type TermsAudience = "all" | "customers" | "providers";
export type TermsAcceptanceMode = "notice" | "explicit";

function requireDb(database: Awaited<ReturnType<typeof getDb>>) {
  if (!database) throw new Error("Database not available");
  return database;
}

export async function listTermsVersions() {
  const database = requireDb(await getDb());
  return database.select().from(termsVersions).orderBy(desc(termsVersions.createdAt));
}

export async function getTermsVersionById(id: number) {
  const database = requireDb(await getDb());
  const [version] = await database.select().from(termsVersions).where(eq(termsVersions.id, id)).limit(1);
  return version;
}

export async function getTermsVersionByName(version: string) {
  const database = requireDb(await getDb());
  const [record] = await database.select().from(termsVersions).where(eq(termsVersions.version, version)).limit(1);
  return record;
}

export async function getLatestPublishedTermsVersion() {
  const database = requireDb(await getDb());
  const [version] = await database
    .select()
    .from(termsVersions)
    .where(eq(termsVersions.status, "published"))
    .orderBy(desc(termsVersions.publishedAt), desc(termsVersions.id))
    .limit(1);
  return version;
}

export async function getPublicTermsVersion(version?: string) {
  const record = version ? await getTermsVersionByName(version) : await getLatestPublishedTermsVersion();
  if (!record || record.status === "draft") return undefined;
  return record;
}

export async function createTermsDraft(input: Omit<InsertTermsVersion, "id" | "status" | "publishedBy" | "publishedAt" | "createdAt" | "updatedAt">) {
  const database = requireDb(await getDb());
  const result = await database.insert(termsVersions).values({ ...input, status: "draft" });
  return Number(result[0].insertId);
}

export async function updateTermsDraft(id: number, input: Partial<Pick<TermsVersion,
  "version" | "title" | "summary" | "content" | "audience" | "acceptanceMode" | "effectiveAt" |
  "materialArbitrationChanges" | "arbitrationSection" | "optOutDeadline" | "contactEmail" | "companyAddress"
>>) {
  const database = requireDb(await getDb());
  await database
    .update(termsVersions)
    .set(input)
    .where(and(eq(termsVersions.id, id), eq(termsVersions.status, "draft")));
  return getTermsVersionById(id);
}

export async function publishTermsVersion(id: number, publisherId: number) {
  const database = requireDb(await getDb());
  const draft = await getTermsVersionById(id);
  if (!draft) throw new Error("Terms version not found");
  if (draft.status !== "draft") throw new Error("Only a draft Terms version can be published");

  const now = new Date();
  await database.transaction(async (transaction) => {
    await transaction
      .update(termsVersions)
      .set({ status: "superseded" })
      .where(and(eq(termsVersions.status, "published"), ne(termsVersions.id, id)));

    await transaction
      .update(termsVersions)
      .set({ status: "published", publishedBy: publisherId, publishedAt: now })
      .where(and(eq(termsVersions.id, id), eq(termsVersions.status, "draft")));
  });

  const recipients = await getTermsAudienceUsers(draft.audience);
  if (recipients.length > 0) {
    await database
      .insert(userTermsNotices)
      .values(recipients.map((recipient) => ({ termsVersionId: id, userId: recipient.id })))
      .onDuplicateKeyUpdate({ set: { updatedAt: now } });
  }

  return { version: (await getTermsVersionById(id))!, recipients };
}

export async function getTermsAudienceUsers(audience: TermsAudience) {
  const database = requireDb(await getDb());
  const rows = await database
    .select({
      id: users.id,
      firstName: users.firstName,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      role: users.role,
    })
    .from(users)
    .where(isNull(users.deletedAt));

  if (audience === "customers") return rows.filter((user) => user.role === "customer");
  if (audience === "providers") return rows.filter((user) => user.role === "provider");
  return rows;
}

export async function getTermsDeliveryRecipients(termsVersionId: number, retryFailedOnly = false) {
  const database = requireDb(await getDb());
  const rows = await database
    .select({
      notice: userTermsNotices,
      user: {
        id: users.id,
        firstName: users.firstName,
        name: users.name,
        email: users.email,
        emailVerified: users.emailVerified,
      },
    })
    .from(userTermsNotices)
    .innerJoin(users, eq(userTermsNotices.userId, users.id))
    .where(and(
      eq(userTermsNotices.termsVersionId, termsVersionId),
      isNull(users.deletedAt),
      retryFailedOnly ? eq(userTermsNotices.emailStatus, "failed") : ne(userTermsNotices.emailStatus, "sent"),
    ));
  return rows;
}

export async function markTermsInAppNotified(noticeId: number) {
  const database = requireDb(await getDb());
  await database.update(userTermsNotices).set({ inAppNotifiedAt: new Date() }).where(eq(userTermsNotices.id, noticeId));
}

export async function markTermsEmailDelivery(noticeId: number, result: { status: "sent" | "failed" | "skipped"; reason?: string }) {
  const database = requireDb(await getDb());
  const now = new Date();
  await database.update(userTermsNotices).set({
    emailStatus: result.status,
    emailLastAttemptAt: now,
    emailSentAt: result.status === "sent" ? now : null,
    emailFailureReason: result.reason?.slice(0, 500) ?? null,
  }).where(eq(userTermsNotices.id, noticeId));
}

export async function getTermsDeliverySummary(termsVersionId: number) {
  const database = requireDb(await getDb());
  const rows = await database.select().from(userTermsNotices).where(eq(userTermsNotices.termsVersionId, termsVersionId));
  return rows.reduce((summary, row) => {
    summary.total += 1;
    summary[row.emailStatus] += 1;
    if (row.inAppNotifiedAt) summary.inAppNotified += 1;
    if (row.shownAt) summary.shown += 1;
    if (row.acknowledgedAt) summary.acknowledged += 1;
    if (row.acceptedAt) summary.accepted += 1;
    return summary;
  }, { total: 0, pending: 0, sent: 0, failed: 0, skipped: 0, inAppNotified: 0, shown: 0, acknowledged: 0, accepted: 0 });
}

export async function getPendingTermsNotice(userId: number) {
  const database = requireDb(await getDb());
  const [result] = await database
    .select({ notice: userTermsNotices, version: termsVersions })
    .from(userTermsNotices)
    .innerJoin(termsVersions, eq(userTermsNotices.termsVersionId, termsVersions.id))
    .where(and(
      eq(userTermsNotices.userId, userId),
      eq(termsVersions.status, "published"),
      isNull(userTermsNotices.acknowledgedAt),
    ))
    .orderBy(desc(termsVersions.publishedAt), desc(termsVersions.id))
    .limit(1);
  return result;
}

export async function markTermsNoticeShown(userId: number, noticeId: number) {
  const database = requireDb(await getDb());
  await database.update(userTermsNotices).set({ shownAt: new Date() }).where(and(
    eq(userTermsNotices.id, noticeId),
    eq(userTermsNotices.userId, userId),
    isNull(userTermsNotices.shownAt),
  ));
}

export async function acknowledgeTermsNotice(userId: number, noticeId: number) {
  const database = requireDb(await getDb());
  const [record] = await database
    .select({ notice: userTermsNotices, version: termsVersions })
    .from(userTermsNotices)
    .innerJoin(termsVersions, eq(userTermsNotices.termsVersionId, termsVersions.id))
    .where(and(eq(userTermsNotices.id, noticeId), eq(userTermsNotices.userId, userId)))
    .limit(1);
  if (!record) return undefined;

  const now = new Date();
  await database.update(userTermsNotices).set({
    shownAt: record.notice.shownAt ?? now,
    acknowledgedAt: now,
    acceptedAt: record.version.acceptanceMode === "explicit" ? now : null,
    acceptanceMethod: record.version.acceptanceMode === "explicit" ? "explicit" : "acknowledged",
  }).where(and(eq(userTermsNotices.id, noticeId), eq(userTermsNotices.userId, userId)));
  return record.version;
}
