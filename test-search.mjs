import { createConnection } from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.log("No DATABASE_URL"); process.exit(1); }

const conn = await createConnection(dbUrl);

const [rows] = await conn.execute(
  "SELECT sp.id, sp.businessName, sp.isActive, sp.userId, u.id as uid, u.name as uname FROM service_providers sp LEFT JOIN users u ON sp.userId = u.id WHERE sp.businessName LIKE '%Legacy%'"
);
console.log("Legacy providers:", JSON.stringify(rows, null, 2));

const [countRows] = await conn.execute(
  "SELECT COUNT(*) as total FROM service_providers WHERE isActive = 1"
);
console.log("Total active providers:", countRows[0].total);

const [joinCount] = await conn.execute(
  "SELECT COUNT(*) as total FROM service_providers sp INNER JOIN users u ON sp.userId = u.id WHERE sp.isActive = 1"
);
console.log("Active providers with user record:", joinCount[0].total);

// Check providers without user records (these would be hidden by INNER JOIN)
const [noUser] = await conn.execute(
  "SELECT sp.id, sp.businessName FROM service_providers sp LEFT JOIN users u ON sp.userId = u.id WHERE sp.isActive = 1 AND u.id IS NULL LIMIT 20"
);
console.log("Active providers WITHOUT user record (hidden from search):", JSON.stringify(noUser, null, 2));

await conn.end();
