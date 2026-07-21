import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

// Raw query to check portfolio items for provider 1
const [rows] = await connection.execute(
  "SELECT id, providerId, title, mediaType, imageUrl, beforeImageUrl, categoryId, createdAt FROM portfolio_items WHERE providerId = 1"
);
console.log("Portfolio items for provider 1 (Chisolm Audio):");
console.log(JSON.stringify(rows, null, 2));

// Also check if there are any with empty/null imageUrl or beforeImageUrl
const [blanks] = await connection.execute(
  "SELECT id, providerId, title, mediaType, imageUrl, beforeImageUrl FROM portfolio_items WHERE (imageUrl IS NULL OR imageUrl = '' OR beforeImageUrl IS NOT NULL) AND providerId = 1"
);
console.log("\nItems with blank imageUrl or non-null beforeImageUrl:");
console.log(JSON.stringify(blanks, null, 2));

await connection.end();
