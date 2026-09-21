import mysql from "mysql2/promise";
import { writeFile } from "node:fs/promises";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const outputPath = process.argv[2] || "/tmp/reserved-cleanup-candidates.json";
const db = await mysql.createConnection(process.env.DATABASE_URL);
const rows = async (sql, params = []) => (await db.query(sql, params))[0];
const count = async (sql, params = []) => Number((await rows(sql, params))[0]?.count ?? 0);

try {
  const [prattis] = await rows(`
    SELECT sp.id AS providerId, sp.userId, sp.businessName, sp.profileSlug, sp.isActive, sp.deletedAt,
           u.name, u.email, u.role, u.deletedAt AS userDeletedAt, sp.stripeAccountId, sp.stripeAccountStatus
      FROM service_providers sp INNER JOIN users u ON u.id=sp.userId
     WHERE sp.id=1680002 OR LOWER(TRIM(sp.businessName))='prattis test'
     LIMIT 1
  `);
  const prattisData = prattis ? {
    identity: prattis,
    services: await count("SELECT COUNT(*) AS count FROM services WHERE providerId=?", [prattis.providerId]),
    activeServices: await count("SELECT COUNT(*) AS count FROM services WHERE providerId=? AND isActive=1 AND deletedAt IS NULL", [prattis.providerId]),
    bookings: await count("SELECT COUNT(*) AS count FROM bookings WHERE providerId=?", [prattis.providerId]),
    quotes: await count("SELECT COUNT(*) AS count FROM quote_requests WHERE providerId=?", [prattis.providerId]),
    payments: await count("SELECT COUNT(*) AS count FROM payments WHERE bookingId IN (SELECT id FROM bookings WHERE providerId=?)", [prattis.providerId]),
    invoices: await count("SELECT COUNT(*) AS count FROM invoices WHERE providerId=? OR customerId=?", [prattis.providerId, prattis.userId]),
    providerSubscriptions: await count("SELECT COUNT(*) AS count FROM provider_subscriptions WHERE providerId=?", [prattis.providerId]),
    crmContacts: await count("SELECT COUNT(*) AS count FROM crm_contacts WHERE providerId=? OR customerId=?", [prattis.providerId, prattis.userId]),
  } : null;

  const orphanFixture = {
    providerId: 2310003,
    userId: 320880004,
    serviceId: 2850001,
    bookingId: 2430001,
    quoteIds: [90001, 90002],
    providerExists: await count("SELECT COUNT(*) AS count FROM service_providers WHERE id=2310003"),
    userExists: await count("SELECT COUNT(*) AS count FROM users WHERE id=320880004"),
    serviceExists: await count("SELECT COUNT(*) AS count FROM services WHERE id=2850001"),
    bookingExists: await count("SELECT COUNT(*) AS count FROM bookings WHERE id=2430001"),
    quoteCount: await count("SELECT COUNT(*) AS count FROM quote_requests WHERE id IN (90001,90002)"),
    paymentRows: await rows("SELECT id, bookingId, status, amount, stripePaymentIntentId, stripeChargeId, stripeRefundId FROM payments WHERE bookingId=2430001"),
    invoiceRows: await rows("SELECT id, invoiceType AS type, invoiceStatus AS status, total, stripePaymentIntentId, stripeCheckoutSessionId FROM invoices WHERE bookingId=2430001 OR paymentId IN (SELECT id FROM payments WHERE bookingId=2430001)"),
    reviewCount: await count("SELECT COUNT(*) AS count FROM reviews WHERE bookingId=2430001 OR providerId=2310003"),
    notificationCount: await count("SELECT COUNT(*) AS count FROM notifications WHERE relatedBookingId=2430001"),
    crmContactCount: await count("SELECT COUNT(*) AS count FROM crm_contacts WHERE providerId=2310003 OR customerId IN (320880005,320880006)"),
    auditCount: await count("SELECT COUNT(*) AS count FROM audit_log WHERE (targetType='provider' AND targetId=2310003) OR (targetType='booking' AND targetId=2430001)"),
  };

  const output = { generatedAt: new Date().toISOString(), mode: "read_only", prattis: prattisData, orphanFixture };
  await writeFile(outputPath, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(output, null, 2));
} finally {
  await db.end();
}
