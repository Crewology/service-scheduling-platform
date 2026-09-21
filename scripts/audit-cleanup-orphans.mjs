import mysql from "mysql2/promise";
import { writeFile } from "node:fs/promises";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const outputPath = process.argv[2] || "/tmp/ologycrew-orphan-audit.json";
const connection = await mysql.createConnection(process.env.DATABASE_URL);
const rows = async (sql, params = []) => (await connection.query(sql, params))[0];
const count = async (sql, params = []) => Number((await rows(sql, params))[0]?.count ?? 0);

try {
  const orphanBookings = await rows(`
    SELECT b.id, b.bookingNumber, b.customerId, b.providerId, b.serviceId, b.status, b.totalAmount, b.createdAt,
           cu.id AS customerExists, sp.id AS providerExists, s.id AS serviceExists,
           p.id AS paymentId, p.status AS paymentStatus, p.stripePaymentIntentId
      FROM bookings b
      LEFT JOIN users cu ON cu.id = b.customerId
      LEFT JOIN service_providers sp ON sp.id = b.providerId
      LEFT JOIN services s ON s.id = b.serviceId
      LEFT JOIN payments p ON p.bookingId = b.id
     WHERE cu.id IS NULL OR sp.id IS NULL OR s.id IS NULL
     ORDER BY b.id
  `);
  const orphanQuotes = await rows(`
    SELECT q.id, q.customerId, q.providerId, q.serviceId, q.bookingId, q.quoteStatus AS status, q.createdAt,
           cu.id AS customerExists, sp.id AS providerExists, s.id AS serviceExists
      FROM quote_requests q
      LEFT JOIN users cu ON cu.id = q.customerId
      LEFT JOIN service_providers sp ON sp.id = q.providerId
      LEFT JOIN services s ON s.id = q.serviceId
     WHERE cu.id IS NULL OR sp.id IS NULL OR s.id IS NULL
     ORDER BY q.id
  `);
  const orphanReviews = await rows(`
    SELECT r.id, r.bookingId, r.customerId, r.providerId, r.rating, r.createdAt
      FROM reviews r
      LEFT JOIN bookings b ON b.id = r.bookingId
      LEFT JOIN users cu ON cu.id = r.customerId
      LEFT JOIN service_providers sp ON sp.id = r.providerId
     WHERE b.id IS NULL OR cu.id IS NULL OR sp.id IS NULL
     ORDER BY r.id
  `);
  const orphanNotifications = await rows(`
    SELECT n.id, n.userId, n.relatedBookingId, n.notificationType, n.createdAt
      FROM notifications n
      LEFT JOIN users u ON u.id = n.userId
      LEFT JOIN bookings b ON b.id = n.relatedBookingId
     WHERE u.id IS NULL OR (n.relatedBookingId IS NOT NULL AND b.id IS NULL)
     ORDER BY n.id
  `);
  const orphanProviders = await rows(`
    SELECT sp.id, sp.userId, sp.businessName, sp.isOfficial, sp.isActive, sp.deletedAt
      FROM service_providers sp LEFT JOIN users u ON u.id = sp.userId
     WHERE u.id IS NULL ORDER BY sp.id
  `);
  const orphanServices = await rows(`
    SELECT s.id, s.providerId, s.name, s.isActive, s.deletedAt
      FROM services s LEFT JOIN service_providers sp ON sp.id = s.providerId
     WHERE sp.id IS NULL ORDER BY s.id
  `);

  const auditBreakdown = await rows(`
    SELECT
      SUM(CASE WHEN a.actorId IN (SELECT id FROM users WHERE LOWER(TRIM(SUBSTRING_INDEX(email, '@', -1))) = 'test.com') THEN 1 ELSE 0 END) AS testActorRows,
      SUM(CASE WHEN a.targetType = 'user' AND a.targetId IN (SELECT id FROM users WHERE LOWER(TRIM(SUBSTRING_INDEX(email, '@', -1))) = 'test.com') THEN 1 ELSE 0 END) AS testUserTargetRows,
      SUM(CASE WHEN a.targetType = 'provider' AND a.targetId IN (
        SELECT sp.id FROM service_providers sp INNER JOIN users u ON u.id = sp.userId
        WHERE LOWER(TRIM(SUBSTRING_INDEX(u.email, '@', -1))) = 'test.com'
      ) THEN 1 ELSE 0 END) AS testProviderTargetRows,
      COUNT(*) AS totalAuditRows
    FROM audit_log a
  `);

  const emailDomains = await rows(`
    SELECT LOWER(TRIM(SUBSTRING_INDEX(COALESCE(email, ''), '@', -1))) AS domain, COUNT(*) AS count
      FROM users
     GROUP BY domain
     ORDER BY count DESC, domain
  `);

  const output = {
    generatedAt: new Date().toISOString(),
    mode: "read_only",
    orphanCounts: {
      bookings: orphanBookings.length,
      quotes: orphanQuotes.length,
      reviews: orphanReviews.length,
      notifications: orphanNotifications.length,
      providers: orphanProviders.length,
      services: orphanServices.length,
    },
    orphanBookings,
    orphanQuotes,
    orphanReviews,
    orphanNotifications,
    orphanProviders,
    orphanServices,
    auditBreakdown: auditBreakdown[0],
    emailDomains,
    crossChecks: {
      demoBookings: await count("SELECT COUNT(*) AS count FROM bookings WHERE providerId IN (SELECT id FROM service_providers WHERE isOfficial = 1)"),
      exactTestDomainBookings: await count(`SELECT COUNT(DISTINCT b.id) AS count FROM bookings b LEFT JOIN users cu ON cu.id=b.customerId LEFT JOIN service_providers sp ON sp.id=b.providerId LEFT JOIN users pu ON pu.id=sp.userId WHERE LOWER(TRIM(SUBSTRING_INDEX(COALESCE(cu.email,''),'@',-1)))='test.com' OR LOWER(TRIM(SUBSTRING_INDEX(COALESCE(pu.email,''),'@',-1)))='test.com'`),
      exactTestDomainReviews: await count(`SELECT COUNT(DISTINCT r.id) AS count FROM reviews r LEFT JOIN users cu ON cu.id=r.customerId LEFT JOIN service_providers sp ON sp.id=r.providerId LEFT JOIN users pu ON pu.id=sp.userId WHERE LOWER(TRIM(SUBSTRING_INDEX(COALESCE(cu.email,''),'@',-1)))='test.com' OR LOWER(TRIM(SUBSTRING_INDEX(COALESCE(pu.email,''),'@',-1)))='test.com'`),
    },
  };
  await writeFile(outputPath, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ outputPath, orphanCounts: output.orphanCounts, auditBreakdown: output.auditBreakdown, crossChecks: output.crossChecks, emailDomains }, null, 2));
} finally {
  await connection.end();
}
