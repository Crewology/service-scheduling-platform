import mysql from "mysql2/promise";
import { writeFile } from "node:fs/promises";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const outputPath = process.argv[2] || "/tmp/ologycrew-cleanup-manifest.json";
const connection = await mysql.createConnection(process.env.DATABASE_URL);

const rows = async (sql, params = []) => (await connection.query(sql, params))[0];
const scalar = async (sql, params = []) => Number((await rows(sql, params))[0]?.count ?? 0);
const inClause = (values) => values.length ? values.map(() => "?").join(",") : "NULL";

try {
  const exactTestUsers = await rows(`
    SELECT u.id, u.name, u.email, u.role, u.loginMethod, u.deletedAt, u.createdAt, u.lastSignedIn,
           sp.id AS providerId, sp.businessName, sp.profileSlug, sp.isOfficial,
           sp.isActive AS providerIsActive, sp.deletedAt AS providerDeletedAt,
           sp.stripeAccountId, sp.stripeAccountStatus
      FROM users u
      LEFT JOIN service_providers sp ON sp.userId = u.id
     WHERE LOWER(TRIM(SUBSTRING_INDEX(u.email, '@', -1))) = 'test.com'
     ORDER BY u.id
  `);

  const reservedCandidates = await rows(`
    SELECT u.id, u.name, u.email, u.role, u.loginMethod, u.openId, u.deletedAt,
           sp.id AS providerId, sp.businessName, sp.profileSlug, sp.isOfficial,
           sp.isActive AS providerIsActive, sp.deletedAt AS providerDeletedAt
      FROM users u
      LEFT JOIN service_providers sp ON sp.userId = u.id
     WHERE LOWER(TRIM(SUBSTRING_INDEX(COALESCE(u.email, ''), '@', -1))) <> 'test.com'
       AND COALESCE(sp.isOfficial, 0) = 0
       AND (
         LOWER(TRIM(SUBSTRING_INDEX(COALESCE(u.email, ''), '@', -1))) = 'example.invalid'
         OR u.loginMethod = 'test'
         OR u.openId LIKE 'test-%'
         OR u.openId LIKE 'test\\_%'
         OR sp.id = 1680002
         OR LOWER(TRIM(COALESCE(sp.businessName, ''))) = 'prattis test'
       )
     ORDER BY u.id
  `);

  const officialDemo = await rows(`
    SELECT sp.id AS providerId, sp.userId, sp.businessName, sp.profileSlug, sp.isOfficial, sp.isActive,
           sp.deletedAt AS providerDeletedAt, u.name, u.email, u.role, u.deletedAt AS userDeletedAt
      FROM service_providers sp
      INNER JOIN users u ON u.id = sp.userId
     WHERE sp.isOfficial = 1
     ORDER BY sp.id
  `);

  const protectedAdmins = await rows(`
    SELECT u.id, u.name, u.email, u.role, u.adminRole, u.deletedAt,
           sp.id AS providerId, sp.businessName, sp.isOfficial, sp.isActive AS providerIsActive
      FROM users u
      LEFT JOIN service_providers sp ON sp.userId = u.id
     WHERE LOWER(u.email) IN ('garychisolm30@gmail.com', 'wwilliams@visionkwest.com')
     ORDER BY u.id
  `);

  const testUserIds = exactTestUsers.map((item) => Number(item.id));
  const testProviderIds = exactTestUsers.filter((item) => item.providerId != null).map((item) => Number(item.providerId));
  const serviceRows = testProviderIds.length
    ? await rows(`SELECT id FROM services WHERE providerId IN (${inClause(testProviderIds)})`, testProviderIds)
    : [];
  const testServiceIds = serviceRows.map((item) => Number(item.id));

  const bookingConditions = [];
  const bookingParams = [];
  if (testUserIds.length) {
    bookingConditions.push(`customerId IN (${inClause(testUserIds)})`);
    bookingParams.push(...testUserIds);
  }
  if (testProviderIds.length) {
    bookingConditions.push(`providerId IN (${inClause(testProviderIds)})`);
    bookingParams.push(...testProviderIds);
  }
  if (testServiceIds.length) {
    bookingConditions.push(`serviceId IN (${inClause(testServiceIds)})`);
    bookingParams.push(...testServiceIds);
  }
  const testBookings = bookingConditions.length
    ? await rows(`SELECT id, providerId, customerId, serviceId, status, totalAmount, createdAt FROM bookings WHERE ${bookingConditions.join(" OR ")} ORDER BY id`, bookingParams)
    : [];
  const testBookingIds = testBookings.map((item) => Number(item.id));

  const quoteConditions = [];
  const quoteParams = [];
  if (testUserIds.length) {
    quoteConditions.push(`customerId IN (${inClause(testUserIds)})`);
    quoteParams.push(...testUserIds);
  }
  if (testProviderIds.length) {
    quoteConditions.push(`providerId IN (${inClause(testProviderIds)})`);
    quoteParams.push(...testProviderIds);
  }
  if (testServiceIds.length) {
    quoteConditions.push(`serviceId IN (${inClause(testServiceIds)})`);
    quoteParams.push(...testServiceIds);
  }
  const testQuotes = quoteConditions.length
    ? await rows(`SELECT id, providerId, customerId, serviceId, bookingId, quoteStatus AS status, quotedAmount, createdAt FROM quote_requests WHERE ${quoteConditions.join(" OR ")} ORDER BY id`, quoteParams)
    : [];
  const testQuoteIds = testQuotes.map((item) => Number(item.id));

  const invoiceConditions = [];
  const invoiceParams = [];
  if (testUserIds.length) {
    invoiceConditions.push(`customerId IN (${inClause(testUserIds)})`);
    invoiceParams.push(...testUserIds);
  }
  if (testProviderIds.length) {
    invoiceConditions.push(`providerId IN (${inClause(testProviderIds)})`);
    invoiceParams.push(...testProviderIds);
  }
  if (testBookingIds.length) {
    invoiceConditions.push(`bookingId IN (${inClause(testBookingIds)})`);
    invoiceParams.push(...testBookingIds);
  }
  const testInvoices = invoiceConditions.length
    ? await rows(`SELECT id, providerId, customerId, bookingId, paymentId, invoiceStatus AS status, total, stripePaymentIntentId, stripeCheckoutSessionId, createdAt FROM invoices WHERE ${invoiceConditions.join(" OR ")} ORDER BY id`, invoiceParams)
    : [];
  const testInvoiceIds = testInvoices.map((item) => Number(item.id));

  const testPayments = testBookingIds.length
    ? await rows(`SELECT id, bookingId, paymentType, amount, status, stripePaymentIntentId, stripeChargeId, stripeRefundId, createdAt FROM payments WHERE bookingId IN (${inClause(testBookingIds)}) ORDER BY id`, testBookingIds)
    : [];
  const testPaymentIds = testPayments.map((item) => Number(item.id));

  const [databaseRow] = await rows("SELECT DATABASE() AS databaseName");
  const dependencyColumns = await rows(`
    SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND COLUMN_NAME IN (
         'userId','customerId','providerId','serviceId','bookingId','quoteId','invoiceId','paymentId',
         'senderId','recipientId','actorId','createdBy','reviewedBy','referrerId'
       )
     ORDER BY TABLE_NAME, ORDINAL_POSITION
  `, [databaseRow.databaseName]);

  const groupedColumns = Map.groupBy(dependencyColumns, (item) => item.tableName);
  const idSets = {
    userId: testUserIds,
    customerId: testUserIds,
    senderId: testUserIds,
    recipientId: testUserIds,
    actorId: testUserIds,
    createdBy: testUserIds,
    reviewedBy: testUserIds,
    referrerId: testUserIds,
    providerId: testProviderIds,
    serviceId: testServiceIds,
    bookingId: testBookingIds,
    quoteId: testQuoteIds,
    invoiceId: testInvoiceIds,
    paymentId: testPaymentIds,
  };
  const dependencyCounts = [];
  for (const [tableName, columns] of groupedColumns) {
    const conditions = [];
    const params = [];
    for (const { columnName } of columns) {
      const values = idSets[columnName] || [];
      if (!values.length) continue;
      conditions.push(`\`${columnName}\` IN (${inClause(values)})`);
      params.push(...values);
    }
    if (!conditions.length) continue;
    const count = await scalar(`SELECT COUNT(*) AS count FROM \`${tableName}\` WHERE ${conditions.join(" OR ")}`, params);
    if (count > 0) dependencyCounts.push({ tableName, count });
  }

  const auditTargetCount = await scalar(`
    SELECT COUNT(*) AS count FROM audit_log
     WHERE (targetType = 'user' AND targetId IN (${inClause(testUserIds)}))
        OR (targetType = 'provider' AND targetId IN (${inClause(testProviderIds)}))
        OR (targetType = 'booking' AND targetId IN (${inClause(testBookingIds)}))
        OR (targetType = 'quote' AND targetId IN (${inClause(testQuoteIds)}))
  `, [...testUserIds, ...testProviderIds, ...testBookingIds, ...testQuoteIds]);

  const currentCounts = {
    usersAll: await scalar("SELECT COUNT(*) AS count FROM users"),
    usersActive: await scalar("SELECT COUNT(*) AS count FROM users WHERE deletedAt IS NULL"),
    providersAll: await scalar("SELECT COUNT(*) AS count FROM service_providers"),
    providersActive: await scalar("SELECT COUNT(*) AS count FROM service_providers sp INNER JOIN users u ON u.id = sp.userId WHERE sp.isActive = 1 AND sp.deletedAt IS NULL AND u.deletedAt IS NULL"),
    servicesActive: await scalar("SELECT COUNT(*) AS count FROM services s INNER JOIN service_providers sp ON sp.id = s.providerId INNER JOIN users u ON u.id = sp.userId WHERE s.isActive = 1 AND s.deletedAt IS NULL AND sp.isActive = 1 AND sp.deletedAt IS NULL AND u.deletedAt IS NULL"),
    bookingsAll: await scalar("SELECT COUNT(*) AS count FROM bookings"),
    quotesAll: await scalar("SELECT COUNT(*) AS count FROM quote_requests"),
  };

  const proposedRealCounts = {
    usersActiveExcludingExactTestAndDemo: await scalar(`
      SELECT COUNT(DISTINCT u.id) AS count
        FROM users u
        LEFT JOIN service_providers sp ON sp.userId = u.id
       WHERE u.deletedAt IS NULL
         AND LOWER(TRIM(SUBSTRING_INDEX(COALESCE(u.email, ''), '@', -1))) <> 'test.com'
         AND COALESCE(sp.isOfficial, 0) = 0
    `),
    providersActiveExcludingExactTestAndDemo: await scalar(`
      SELECT COUNT(*) AS count
        FROM service_providers sp
        INNER JOIN users u ON u.id = sp.userId
       WHERE sp.isActive = 1 AND sp.deletedAt IS NULL AND u.deletedAt IS NULL
         AND sp.isOfficial = 0
         AND LOWER(TRIM(SUBSTRING_INDEX(COALESCE(u.email, ''), '@', -1))) <> 'test.com'
    `),
    servicesActiveExcludingExactTestAndDemo: await scalar(`
      SELECT COUNT(*) AS count
        FROM services s
        INNER JOIN service_providers sp ON sp.id = s.providerId
        INNER JOIN users u ON u.id = sp.userId
       WHERE s.isActive = 1 AND s.deletedAt IS NULL
         AND sp.isActive = 1 AND sp.deletedAt IS NULL AND u.deletedAt IS NULL
         AND sp.isOfficial = 0
         AND LOWER(TRIM(SUBSTRING_INDEX(COALESCE(u.email, ''), '@', -1))) <> 'test.com'
    `),
    bookingsExcludingExactTestAndDemo: await scalar(`
      SELECT COUNT(*) AS count
        FROM bookings b
        INNER JOIN users cu ON cu.id = b.customerId
        INNER JOIN service_providers sp ON sp.id = b.providerId
        INNER JOIN users pu ON pu.id = sp.userId
       WHERE sp.isOfficial = 0
         AND LOWER(TRIM(SUBSTRING_INDEX(COALESCE(cu.email, ''), '@', -1))) <> 'test.com'
         AND LOWER(TRIM(SUBSTRING_INDEX(COALESCE(pu.email, ''), '@', -1))) <> 'test.com'
    `),
    quotesExcludingExactTestAndDemo: await scalar(`
      SELECT COUNT(*) AS count
        FROM quote_requests q
        INNER JOIN users cu ON cu.id = q.customerId
        INNER JOIN service_providers sp ON sp.id = q.providerId
        INNER JOIN users pu ON pu.id = sp.userId
       WHERE sp.isOfficial = 0
         AND LOWER(TRIM(SUBSTRING_INDEX(COALESCE(cu.email, ''), '@', -1))) <> 'test.com'
         AND LOWER(TRIM(SUBSTRING_INDEX(COALESCE(pu.email, ''), '@', -1))) <> 'test.com'
    `),
  };

  const financialRisk = {
    payments: testPayments.length,
    paymentStatuses: Object.entries(Object.groupBy(testPayments, (item) => item.status)).map(([status, items]) => ({ status, count: items.length })),
    stripePaymentReferences: testPayments.filter((item) => item.stripePaymentIntentId || item.stripeChargeId || item.stripeRefundId).length,
    invoices: testInvoices.length,
    invoiceStatuses: Object.entries(Object.groupBy(testInvoices, (item) => item.status)).map(([status, items]) => ({ status, count: items.length })),
    stripeInvoiceReferences: testInvoices.filter((item) => item.stripePaymentIntentId || item.stripeCheckoutSessionId).length,
    providerSubscriptions: testProviderIds.length ? await scalar(`SELECT COUNT(*) AS count FROM provider_subscriptions WHERE providerId IN (${inClause(testProviderIds)})`, testProviderIds) : 0,
    customerSubscriptions: testUserIds.length ? await scalar(`SELECT COUNT(*) AS count FROM customer_subscriptions WHERE userId IN (${inClause(testUserIds)})`, testUserIds) : 0,
    partnerTransfersTotalPreserved: await scalar("SELECT COUNT(*) AS count FROM partner_transfers"),
    auditRowsToPreserve: (dependencyCounts.find((item) => item.tableName === "audit_log")?.count || 0) + auditTargetCount,
  };

  const officialDemoActivity = officialDemo.length ? {
    providerCount: officialDemo.length,
    serviceCount: await scalar(`SELECT COUNT(*) AS count FROM services WHERE providerId IN (${inClause(officialDemo.map((item) => item.providerId))})`, officialDemo.map((item) => item.providerId)),
    categoryCount: await scalar(`SELECT COUNT(DISTINCT categoryId) AS count FROM provider_categories WHERE providerId IN (${inClause(officialDemo.map((item) => item.providerId))}) AND isActive = 1`, officialDemo.map((item) => item.providerId)),
    bookingCount: await scalar(`SELECT COUNT(*) AS count FROM bookings WHERE providerId IN (${inClause(officialDemo.map((item) => item.providerId))})`, officialDemo.map((item) => item.providerId)),
    quoteCount: await scalar(`SELECT COUNT(*) AS count FROM quote_requests WHERE providerId IN (${inClause(officialDemo.map((item) => item.providerId))})`, officialDemo.map((item) => item.providerId)),
    paymentCount: await scalar(`SELECT COUNT(*) AS count FROM payments WHERE bookingId IN (SELECT id FROM bookings WHERE providerId IN (${inClause(officialDemo.map((item) => item.providerId))}))`, officialDemo.map((item) => item.providerId)),
  } : { providerCount: 0, serviceCount: 0, categoryCount: 0, bookingCount: 0, quoteCount: 0, paymentCount: 0 };

  const manifest = {
    generatedAt: new Date().toISOString(),
    mode: "read_only",
    classification: {
      approvedAutomaticCandidate: "Exact email-domain match @test.com only",
      separatelyReviewedCandidates: "Existing reserved test rules: @example.invalid, loginMethod=test, test-/test_ openId, or Prattis Test provider",
      protected: ["Official OlogyCrew demo provider", "garychisolm30@gmail.com", "wwilliams@visionkwest.com", "all unclassified accounts", "all finance, Stripe, partner transfer, and audit evidence"],
    },
    summary: {
      exactTestUsers: exactTestUsers.length,
      exactTestProviders: testProviderIds.length,
      exactTestServices: testServiceIds.length,
      exactTestBookings: testBookings.length,
      exactTestQuotes: testQuotes.length,
      separatelyReviewedReservedCandidates: reservedCandidates.length,
    },
    currentCounts,
    proposedRealCounts,
    financialRisk,
    officialDemoActivity,
    exactTestUsers,
    separatelyReviewedReservedCandidates: reservedCandidates,
    officialDemo,
    protectedAdmins,
    dependencyCounts,
  };

  await writeFile(outputPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ outputPath, summary: manifest.summary, currentCounts, proposedRealCounts, financialRisk, officialDemoActivity }, null, 2));
} finally {
  await connection.end();
}
