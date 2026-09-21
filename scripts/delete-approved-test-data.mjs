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
const REQUIRED_APPROVAL = "DELETE-COMPLETE-CONFIRMED-TEST-DATA";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.mode !== "read_only") throw new Error("The supplied manifest is not a read-only cleanup manifest");

const expectedExactUserIds = manifest.exactTestUsers.map((item) => Number(item.id)).sort((a, b) => a - b);
const expectedExactProviderIds = manifest.exactTestUsers.filter((item) => item.providerId != null).map((item) => Number(item.providerId)).sort((a, b) => a - b);
if (expectedExactUserIds.length !== 168 || expectedExactProviderIds.length !== 81) {
  throw new Error(`Manifest scope mismatch: expected 168 users and 81 providers, found ${expectedExactUserIds.length} and ${expectedExactProviderIds.length}`);
}

const PRATTIS_USER_ID = 214_381_102;
const PRATTIS_PROVIDER_ID = 1_680_002;
const PRATTIS_SUBSCRIPTION_ID = 1_110_002;
const ORPHAN_PROVIDER_ID = 2_310_003;
const ORPHAN_SERVICE_ID = 2_850_001;
const ORPHAN_BOOKING_ID = 2_430_001;
const ORPHAN_PAYMENT_ID = 60_001;
const ORPHAN_QUOTE_IDS = [90_001, 90_002];

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
if (!equalIds(currentUserIds, expectedExactUserIds) || !equalIds(currentProviderIds, expectedExactProviderIds)) {
  throw new Error("Cleanup manifest drifted. Regenerate and review the read-only manifest before requesting approval again.");
}

const [prattisRows, orphanProviderRows, orphanServiceRows, orphanBookingRows, orphanQuoteRows] = await Promise.all([
  rows(`SELECT u.id AS userId, u.email, sp.id AS providerId, sp.businessName, sp.profileSlug, sp.isActive, sp.stripeAccountId FROM users u INNER JOIN service_providers sp ON sp.userId=u.id WHERE u.id=? AND sp.id=?`, [PRATTIS_USER_ID, PRATTIS_PROVIDER_ID]),
  rows(`SELECT id, userId, businessName, isActive FROM service_providers WHERE id=?`, [ORPHAN_PROVIDER_ID]),
  rows(`SELECT id, providerId, name FROM services WHERE id=?`, [ORPHAN_SERVICE_ID]),
  rows(`SELECT id, bookingNumber, providerId, serviceId FROM bookings WHERE id=?`, [ORPHAN_BOOKING_ID]),
  rows(`SELECT id, providerId, serviceId FROM quote_requests WHERE id IN (${inClause(ORPHAN_QUOTE_IDS)}) ORDER BY id`, ORPHAN_QUOTE_IDS),
]);
const prattis = prattisRows[0];
if (!prattis || prattis.email !== "client.care@visionkwest.com" || prattis.businessName !== "Prattis Test" || prattis.profileSlug !== "prattis-test-1680002" || Number(prattis.isActive) !== 1 || prattis.stripeAccountId) {
  throw new Error("Prattis Test identity drifted from the owner-approved cleanup record");
}
if (orphanProviderRows.length !== 1 || orphanProviderRows[0].businessName !== "Phase 2 Provider 1788735775339-lnsbcx" || Number(orphanProviderRows[0].isActive) !== 0
  || orphanServiceRows.length !== 1 || Number(orphanServiceRows[0].providerId) !== ORPHAN_PROVIDER_ID
  || orphanBookingRows.length !== 1 || orphanBookingRows[0].bookingNumber !== "TEST-CRM-P2-1788735775339-lnsbcx"
  || !equalIds(orphanQuoteRows.map((item) => Number(item.id)), ORPHAN_QUOTE_IDS)) {
  throw new Error("Orphan Phase 2 fixture drifted from the owner-approved cleanup record");
}

const expectedUserIds = [...expectedExactUserIds, PRATTIS_USER_ID].sort((a, b) => a - b);
const expectedProviderIds = [...expectedExactProviderIds, PRATTIS_PROVIDER_ID, ORPHAN_PROVIDER_ID].sort((a, b) => a - b);

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

const paymentRows = await rows(`SELECT id, bookingId, status, amount, stripePaymentIntentId, stripeChargeId, stripeRefundId FROM payments WHERE bookingId IN (${inClause(bookingIds)}) ORDER BY id`, bookingIds);
const providerSubscriptionRows = await rows(`SELECT id, providerId, tier, status, stripeSubscriptionId, stripeCustomerId FROM provider_subscriptions WHERE providerId IN (${inClause(expectedProviderIds)}) ORDER BY id`, expectedProviderIds);
const [financialRows] = await connection.query(`
  SELECT
    (SELECT COUNT(*) FROM invoices WHERE id IN (${inClause(invoiceIds)})) AS invoices,
    (SELECT COUNT(*) FROM customer_subscriptions WHERE userId IN (${inClause(expectedUserIds)})) AS customerSubscriptions,
    (SELECT COUNT(*) FROM audit_log WHERE actorId IN (${inClause(expectedUserIds)})) AS auditActors,
    (SELECT COUNT(*) FROM terms_versions WHERE createdBy IN (${inClause(expectedUserIds)}) OR publishedBy IN (${inClause(expectedUserIds)})) AS legalVersions
`, [...invoiceIds, ...expectedUserIds, ...expectedUserIds, ...expectedUserIds, ...expectedUserIds]);
const financialRisk = financialRows[0];
const approvedPayment = paymentRows[0];
const approvedSubscription = providerSubscriptionRows[0];
const approvedFinancialRowsMatch = paymentRows.length === 1
  && Number(approvedPayment?.id) === ORPHAN_PAYMENT_ID
  && Number(approvedPayment?.bookingId) === ORPHAN_BOOKING_ID
  && approvedPayment?.status === "captured"
  && approvedPayment?.amount === "30.00"
  && approvedPayment?.stripePaymentIntentId === "pi_test_crm_phase2_1788735775339-lnsbcx"
  && !approvedPayment?.stripeChargeId
  && !approvedPayment?.stripeRefundId
  && providerSubscriptionRows.length === 1
  && Number(approvedSubscription?.id) === PRATTIS_SUBSCRIPTION_ID
  && Number(approvedSubscription?.providerId) === PRATTIS_PROVIDER_ID
  && approvedSubscription?.tier === "free"
  && approvedSubscription?.status === "cancelled"
  && approvedSubscription?.stripeSubscriptionId === "sub_1U6FoYC7SjggBMstJHq2iY0o"
  && approvedSubscription?.stripeCustomerId === "cus_V6Sj33jML7Z2Rf";
if (!approvedFinancialRowsMatch || Object.values(financialRisk).some((value) => Number(value) > 0)) {
  throw new Error(`Financial, audit-actor, subscription, or legal scope drifted from the approved records: ${JSON.stringify({ financialRisk, paymentRows, providerSubscriptionRows })}`);
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
    payments: paymentRows.length,
    providerSubscriptions: providerSubscriptionRows.length,
    invoices: invoiceIds.length,
    crmContacts: crmContactIds.length,
  },
  protected: {
    protectedIdentityRows: protectedRows.length,
    partnerTransfers: Number((await rows("SELECT COUNT(*) AS count FROM partner_transfers"))[0]?.count ?? 0),
    externalStripeObjectsChanged: 0,
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
  await remove("payments", `id IN (${inClause(paymentRows.map((item) => Number(item.id)))})`, paymentRows.map((item) => Number(item.id)));
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
  await remove("contact_replies", `adminUserId IN (${inClause(expectedUserIds)})`, expectedUserIds);
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
  await remove("provider_subscriptions", `id IN (${inClause(providerSubscriptionRows.map((item) => Number(item.id)))})`, providerSubscriptionRows.map((item) => Number(item.id)));

  if (bookingIds.length) await remove("bookings", `id IN (${inClause(bookingIds)})`, bookingIds);
  if (serviceIds.length) await remove("services", `id IN (${inClause(serviceIds)})`, serviceIds);
  await remove("service_providers", `id IN (${inClause(expectedProviderIds)})`, expectedProviderIds);
  await remove("users", `id IN (${inClause(expectedUserIds)})`, expectedUserIds);

  const remainingUsers = Number((await rows(`SELECT COUNT(*) AS count FROM users WHERE id IN (${inClause(expectedUserIds)})`, expectedUserIds))[0]?.count ?? 0);
  const remainingProviders = Number((await rows(`SELECT COUNT(*) AS count FROM service_providers WHERE id IN (${inClause(expectedProviderIds)})`, expectedProviderIds))[0]?.count ?? 0);
  const remainingServices = Number((await rows(`SELECT COUNT(*) AS count FROM services WHERE id IN (${inClause(serviceIds)})`, serviceIds))[0]?.count ?? 0);
  const remainingBookings = Number((await rows(`SELECT COUNT(*) AS count FROM bookings WHERE id IN (${inClause(bookingIds)})`, bookingIds))[0]?.count ?? 0);
  const remainingApprovedPayments = Number((await rows(`SELECT COUNT(*) AS count FROM payments WHERE id=?`, [ORPHAN_PAYMENT_ID]))[0]?.count ?? 0);
  const remainingApprovedSubscriptions = Number((await rows(`SELECT COUNT(*) AS count FROM provider_subscriptions WHERE id=?`, [PRATTIS_SUBSCRIPTION_ID]))[0]?.count ?? 0);
  const protectedAfter = await rows(`SELECT u.email, sp.id AS providerId, sp.isOfficial FROM users u LEFT JOIN service_providers sp ON sp.userId=u.id WHERE LOWER(u.email) IN ('garychisolm30@gmail.com','wwilliams@visionkwest.com','hello@ologycrew.com') OR sp.isOfficial=1`);
  if (remainingUsers || remainingProviders || remainingServices || remainingBookings || remainingApprovedPayments || remainingApprovedSubscriptions || protectedAfter.length < protectedRows.length) {
    throw new Error(`Post-delete verification failed: ${remainingUsers} users, ${remainingProviders} providers, ${remainingServices} services, ${remainingBookings} bookings, ${remainingApprovedPayments} payments, ${remainingApprovedSubscriptions} subscriptions, ${protectedAfter.length}/${protectedRows.length} protected identities`);
  }

  await connection.commit();
  const receipt = {
    executedAt: new Date().toISOString(),
    approval,
    manifestPath,
    scope: "Complete confirmed-test cleanup: exact @test.com identities, Prattis Test local records, and the orphan Phase 2 fixture; official demo, real accounts, partner transfers, audit records, and external Stripe objects preserved",
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
