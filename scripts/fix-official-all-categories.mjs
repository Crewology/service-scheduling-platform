import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool(process.env.DATABASE_URL);

async function main() {
  const officialProviderId = 360001;

  // Get all category IDs
  const [categories] = await pool.execute("SELECT id, name FROM service_categories ORDER BY sortOrder");
  console.log(`Found ${categories.length} categories total`);

  // Check which ones the official provider is already linked to
  const [existing] = await pool.execute(
    "SELECT categoryId FROM provider_categories WHERE providerId = ?",
    [officialProviderId]
  );
  const existingIds = new Set(existing.map(r => r.categoryId));
  console.log(`OlogyCrew Official already linked to ${existingIds.size} categories`);

  // Link to all missing categories
  let added = 0;
  for (const cat of categories) {
    if (!existingIds.has(cat.id)) {
      await pool.execute(
        "INSERT INTO provider_categories (providerId, categoryId, isActive) VALUES (?, ?, 1)",
        [officialProviderId, cat.id]
      );
      console.log(`  + Linked to: ${cat.name} (ID: ${cat.id})`);
      added++;
    }
  }

  console.log(`\nDone! Added ${added} new category links. OlogyCrew Official is now in all ${categories.length} categories.`);
  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error("Failed:", err);
  process.exit(1);
});
