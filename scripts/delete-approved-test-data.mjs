import mysql from "mysql2/promise";
import { readFile, writeFile } from "node:fs/promises";

const args = new Set(process.argv.slice(2));
const execute = args.has("--execute");
const approvalArg = process.argv.find((value) => value.startsWith("--approval="));
const manifestArg = process.argv.find((value) => value.startsWith("--manifest="));
const receiptArg = process.argv.find((value) => value.startsWith("--receipt="));
const approval = approvalArg?.split("=").slice(1).join("=") || "";
const manifestPath = manifestArg?.split("=").slice(1).join("=") || "docs/cleanup/PRODUCTION_TEST_DATA_MANIFEST.json";
const receiptPath = receiptArg?.split("=").slice(1).join("=") || "docs/cleanup/PRODUCTION_TEST_DATA_CLEANUP_RECEIPT.json";
const REQUIRED_APPROVAL = "DELETE-EXACT-TEST-COM-168";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.mode !== "read_only") throw new Error("The supplied manifest is not a read-only cleanup manifest");

const expectedUserIds = manifest.exactTestUsers.map((item) => Number(item.id)).sort((a, b) => a - b);
const expectedProviderIds = manifest.exactTestUsers.filter((item) => item.providerId != null).map((item) => Number(item.providerId)).sort((a, b) => a - b);
if (expectedUserIds.length !== 168 || expectedProviderIds.length !== 81) {
  throw new Error(`Manifest scope mismatch: expected 168 users and 81 providers, found ${expectedUserIds.length} and ${expectedProviderIds.length}`);
}

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const rows = async (sql, params = []) => (await connection.query(sql, params))[0];
const txRows = async (sql, params = []) => (await connection.query(sql, params))[0];
const inClause = (values) => values.length ? values.map(() => "?").join(",") : "NULL";
const ids = async (sql, params = []) => (await rows(sql, params)).map((item) => Number(item.id));
const equalIds = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);

const currentUsers = await rows(`
  SELECT u.id, sp.id AS providerId
    FROM users u
    LEFT JOIN service_providers sp ON sp.userId = u.id
   WHERE LOWER(TRIM(SUBSTRING_INDEX(COALESCE(u.email, ''), '@', -1))) = 'test.com'
   ORDER BY u.id
`);
const currentUserIds = currentUsers.map((item) => Number(item.id));
const currentProviderIds = currentUsers.filter((item) => item.providerId != null).map((item) => Number(item.providerId)).sort((a, b) => a - b);
if (!equalIds(currentUserIds, expectedUserIds) || !equalIds(currentProviderIds, expectedProviderIds)) {
  throw new Error("Cleanup manifest drifted. Regenerate and review the read-only manifest before requesting approval again.");
}

const protectedRows = await rows(`
  SELECT u.id, u.email, sp.id AS providerId, sp.businessName, sp.isOfficial
    FROM users u LEFT JOIN service_providers sp ON sp.userId = u.id
   WHERE LOWER(u.email) IN ('garychisolm30@gmail.com', 'wwilliams@visionkwest.com', 'hello@ologycrew.com')
      OR sp.isOfficial = 1
`);
if (protectedRows.some((item) => expectedUserIds.includes(Number(item.id)) || expectedProviderIds.includes(Number(item.providerId)))) {
  throw new Error("Protected owner, partner, or official demo identity unexpectedly overlaps the deletion manifest");
}

const serviceIds = expectedProviderIds.length
  ? await ids(`SELECT id FROM services WHERE providerId IN (${inClause(expectedProviderIds)}) ORDER BY id`, expectedProviderIds)
  : [];
const bookingIds = await ids(`
  SELECT DISTINCT id FROM bookings
   WHERE customerId IN (${inClause(expectedUserIds)})
      OR providerId IN (${inClause(expectedProviderIds)})
      OR serviceId IN (${inClause(serviceIds)})
   ORDER BY id
`, [...expectedUserIds, ...expectedProviderIds, ...serviceIds]);
const invoiceIds = await ids(`
  SELECT DISTINCT id FROM invoices
   WHERE customerId IN (${inClause(expectedUserIds)})
      OR providerId IN (${inClause(expectedProviderIds)})
      OR bookingId IN (${inClause(bookingIds)})
   ORDER BY id
`, [...expectedUserIds, ...expectedProviderIds, ...bookingIds]);
const packageIds = await ids(`SELECT id FROM service_packages WHERE providerId IN (${inClause(expectedProviderIds)}) ORDER BY id`, expectedProviderIds);
const crmContactIds = await ids(`
  SELECT id FROM crm_contacts
   WHERE customerId IN (${inClause(expectedUserIds)}) OR providerId IN (${inClause(expectedProviderIds)})
   ORDER BY id
`, [...expectedUserIds, ...expectedProviderIds]);
const referralIds = await ids(`
  SELECT id FROM referrals
   WHERE referrerId IN (${inClause(expectedUserIds)}) OR refereeId IN (${inClause(expectedUserIds)})
   ORDER BY id
`, [...expectedUserIds, ...expectedUserIds]);
const contactSubmissionIds = await ids(`SELECT id FROM contact_submissions WHERE userId IN (${inClause(expectedUserIds)}) ORDER BY id`, expectedUserIds);

const [financialRows] = await connection.query(`
  SELECT
    (SELECT COUNT(*) FROM payments WHERE bookingId IN (${inClause(bookingIds)})) AS payments,
    (SELECT COUNT(*) FROM invoices WHERE id IN (${inClause(invoiceIds)})) AS invoices,
    (SELECT COUNT(*) FROM provider_subscriptions WHERE providerId IN (${inClause(expectedProviderIds)})) AS providerSubscriptions,
    (SELECT COUNT(*) FROM customer_subscriptions WHERE userId IN (${inClause(expectedUserIds)})) AS customerSubscriptions,
    (SELECT COUNT(*) FROM audit_log WHERE actorId IN (${inClause(expectedUserIds)})) AS auditActors,
    (SELECT COUNT(*) FROM terms_versions WHERE createdBy IN (${inClause(expectedUserIds)}) OR publishedBy IN (${inClause(expectedUserIds)})) AS legalVersions
`, [...bookingIds, ...invoiceIds, ...expectedProviderIds, ...expectedUserIds, ...expectedUserIds, ...expectedUserIds, ...expectedUserIds]);
const financialRisk = financialRows[0];
if (Object.values(financialRisk).some((value) => Number(value) > 0)) {
  throw new Error(`Protected financial, audit-actor, subscription, or legal references appeared after manifest review: ${JSON.stringify(financialRisk)}`);
}

const preflight = {
  mode: execute ? "execute_requested" : "dry_run",
  manifestPath,
  requiredApproval: REQUIRED_APPROVAL,
  candidates: {
    users: expectedUserIds.length,
    providers: expectedProviderIds.length,
    services: serviceIds.length,
    bookings: bookingIds.length,
    invoices: invoiceIds.length,
    crmContacts: crmContactIds.length,
  },
  protected: {
    protectedIdentityRows: protectedRows.length,
    partnerTransfers: Number((await rows("SELECT COUNT(*) AS count FROM partner_transfers"))[0]?.count ?? 0),
    auditTargetRows: Number((await rows(`
      SELECT COUNT(*) AS count FROM audit_log
       WHERE (targetType='user' AND targetId IN (${inClause(expectedUserIds)}))
          OR (targetType='provider' AND targetId IN (${inClause(expectedProviderIds)}))
          OR (targetType='booking' AND targetId IN (${inClause(bookingIds)}))
    `, [...expectedUserIds, ...expectedProviderIds, ...bookingIds]))[0]?.count ?? 0),
  },
};

if (!execute) {
  console.log(JSON.stringify(preflight, null, 2));
  await connection.end();
  process.exit(0);
}
if (approval !== REQUIRED_APPROVAL) {
  await connection.end();
  throw new Error(`Execution blocked. The exact approval token is --approval=${REQUIRED_APPROVAL}`);
}

const deleted = {};
const remove = async (table, whereSql, params = []) => {
  const [result] = await connection.query(`DELETE FROM \`${table}\` WHERE ${whereSql}`, params);
  deleted[table] = (deleted[table] || 0) + Number(result.affectedRows || 0);
};

try {
  await connection.beginTransaction();

  if (crmContactIds.length) {
    for (const table of ["crm_automation_runs", "crm_message_drafts", "crm_tasks", "crm_activity_events", "crm_contact_notes", "crm_contact_preferences", "crm_contact_stage_history"]) {
      await remove(table, `contactId IN (${inClause(crmContactIds)})`, crmContactIds);
    }
    await remove("crm_contacts", `id IN (${inClause(crmContactIds)})`, crmContactIds);
  }
  for (const table of ["crm_saved_segments", "crm_automation_rules"]) {
    await remove(table, `providerId IN (${inClause(expectedProviderIds)})`, expectedProviderIds);
  }
  await remove("crm_automation_rules", `createdByUserId IN (${inClause(expectedUserIds)})`, expectedUserIds);
  await txRows(`UPDATE crm_operational_state SET updatedByUserId=NULL WHERE updatedByUserId IN (${inClause(expectedUserIds)})`, expectedUserIds);

  if (bookingIds.length) {
    for (const table of ["booking_sessions", "messages", "notifications", "promo_redemptions", "referral_credits", "reviews"]) {
      const column = table === "notifications" ? "relatedBookingId" : "bookingId";
      await remove(table, `${column} IN (${inClause(bookingIds)})`, bookingIds);
    }
  }
  if (invoiceIds.length) {
    await remove("invoice_line_items", `invoiceId IN (${inClause(invoiceIds)})`, invoiceIds);
    await remove("invoices", `id IN (${inClause(invoiceIds)})`, invoiceIds);
  }
  if (contactSubmissionIds.length) {
    await remove("contact_replies", `submissionId IN (${inClause(contactSubmissionIds)})`, contactSubmissionIds);
    await remove("contact_submissions", `id IN (${inClause(contactSubmissionIds)})`, contactSubmissionIds);
  }
  if (referralIds.length) {
    await remove("referral_credits", `referralId IN (${inClause(referralIds)})`, referralIds);
  }
  if (packageIds.length) await remove("package_items", `packageId IN (${inClause(packageIds)})`, packageIds);
  if (serviceIds.length) {
    for (const table of ["service_photos", "package_items", "waitlist_entries", "promotions"]) {
      await remove(table, `serviceId IN (${inClause(serviceIds)})`, serviceIds);
    }
  }

  for (const [table, column] of [
    ["promo_redemptions", "userId"], ["referral_credits", "userId"], ["referral_codes", "userId"],
    ["customer_favorites", "userId"], ["saved_provider_folders", "userId"], ["notification_preferences", "userId"],
    ["push_subscriptions", "userId"], ["two_factor_codes", "userId"], ["trusted_devices", "userId"],
    ["bulk_booking_drafts", "userId"], ["event_templates", "userId"], ["waitlist_entries", "userId"],
    ["notifications", "userId"], ["user_terms_notices", "userId"], ["reply_templates", "createdBy"],
  ]) {
    await remove(table, `${column} IN (${inClause(expectedUserIds)})`, expectedUserIds);
  }
  await remove("messages", `senderId IN (${inClause(expectedUserIds)}) OR recipientId IN (${inClause(expectedUserIds)})`, [...expectedUserIds, ...expectedUserIds]);
  await remove("referrals", `referrerId IN (${inClause(expectedUserIds)}) OR refereeId IN (${inClause(expectedUserIds)})`, [...expectedUserIds, ...expectedUserIds]);
  await remove("quote_requests", `customerId IN (${inClause(expectedUserIds)}) OR providerId IN (${inClause(expectedProviderIds)})`, [...expectedUserIds, ...expectedProviderIds]);

  for (const [table, column] of [
    ["customer_favorites", "providerId"], ["waitlist_entries", "providerId"], ["promotions", "providerId"],
    ["promo_codes", "providerId"], ["verification_documents", "providerId"], ["portfolio_items", "providerId"],
    ["availability_overrides", "providerId"], ["availability_schedules", "providerId"], ["provider_categories", "providerId"],
    ["service_packages", "providerId"],
  ]) {
    await remove(table, `${column} IN (${inClause(expectedProviderIds)})`, expectedProviderIds);
  }

  if (bookingIds.length) await remove("bookings", `id IN (${inClause(bookingIds)})`, bookingIds);
  if (serviceIds.length) await remove("services", `id IN (${inClause(serviceIds)})`, serviceIds);
  await remove("service_providers", `id IN (${inClause(expectedProviderIds)})`, expectedProviderIds);
  await remove("users", `id IN (${inClause(expectedUserIds)})`, expectedUserIds);

  const remainingUsers = Number((await rows(`SELECT COUNT(*) AS count FROM users WHERE id IN (${inClause(expectedUserIds)})`, expectedUserIds))[0]?.count ?? 0);
  const remainingProviders = Number((await rows(`SELECT COUNT(*) AS count FROM service_providers WHERE id IN (${inClause(expectedProviderIds)})`, expectedProviderIds))[0]?.count ?? 0);
  const protectedAfter = await rows(`SELECT u.email, sp.id AS providerId, sp.isOfficial FROM users u LEFT JOIN service_providers sp ON sp.userId=u.id WHERE LOWER(u.email) IN ('garychisolm30@gmail.com','wwilliams@visionkwest.com','hello@ologycrew.com') OR sp.isOfficial=1`);
  if (remainingUsers || remainingProviders || protectedAfter.length < protectedRows.length) {
    throw new Error(`Post-delete verification failed: ${remainingUsers} users, ${remainingProviders} providers, ${protectedAfter.length}/${protectedRows.length} protected identities`);
  }

  await connection.commit();
  const receipt = {
    executedAt: new Date().toISOString(),
    approval,
    manifestPath,
    scope: "Exact @test.com identities only; Prattis Test, orphan financial fixture, official demo, real accounts, partner transfers, and audit records preserved",
    preflight,
    deleted,
  };
  await writeFile(receiptPath, JSON.stringify(receipt, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(receipt, null, 2));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
