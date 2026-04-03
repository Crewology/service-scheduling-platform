import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { sql } from "drizzle-orm";

async function main() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);

  // Find the owner user
  const [users] = await connection.execute(
    "SELECT id, name, email, role, openId FROM users ORDER BY id ASC LIMIT 10"
  );
  console.log("Current users:", JSON.stringify(users, null, 2));

  // Update the owner (first user or user with name matching OWNER_NAME) to provider role
  const ownerName = process.env.OWNER_NAME || "";
  console.log("\nOwner name from env:", ownerName);

  // Update by owner name if available, otherwise update the first user
  let targetUser;
  if (ownerName) {
    targetUser = users.find(u => u.name === ownerName);
  }
  if (!targetUser && users.length > 0) {
    targetUser = users[0];
  }

  if (targetUser) {
    console.log(`\nUpdating user "${targetUser.name}" (ID: ${targetUser.id}) to role: provider`);
    await connection.execute(
      "UPDATE users SET role = 'provider' WHERE id = ?",
      [targetUser.id]
    );
    console.log("Done! User role updated to 'provider'.");

    // Check if they already have a provider profile
    const [providers] = await connection.execute(
      "SELECT id FROM service_providers WHERE userId = ?",
      [targetUser.id]
    );

    if (providers.length === 0) {
      console.log("\nNo provider profile found. Creating one...");
      await connection.execute(
        `INSERT INTO service_providers (userId, businessName, businessType, description, city, state, postalCode, isActive, isVerified)
         VALUES (?, ?, 'sole_proprietor', 'Test provider profile for platform testing', 'New York', 'NY', '10001', 1, 1)`,
        [targetUser.id, `${targetUser.name}'s Services`]
      );
      console.log("Provider profile created!");
    } else {
      console.log("Provider profile already exists (ID:", providers[0].id, ")");
    }
  } else {
    console.log("No users found in the database. Please log in first.");
  }

  await connection.end();
}

main().catch(console.error);
