import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool(process.env.DATABASE_URL);

async function main() {
  const [rows] = await pool.execute("SELECT id, name FROM services WHERE providerId = 1 AND name LIKE '%Box Truck%'");
  console.log("Found:", rows);
  if (rows.length > 0) {
    await pool.execute("DELETE FROM services WHERE providerId = 1 AND name LIKE '%Box Truck%'");
    console.log("Deleted successfully");
  }
  await pool.end();
  process.exit(0);
}
main();
