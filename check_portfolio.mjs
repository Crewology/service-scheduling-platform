import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
const connection = await mysql.createConnection(DATABASE_URL);

const [rows] = await connection.execute(
  "SELECT id, providerId, title, imageUrl, isActive, mediaType FROM portfolio_items WHERE providerId = 1 AND isActive = 1 LIMIT 5"
);
console.log(JSON.stringify(rows, null, 2));
await connection.end();
