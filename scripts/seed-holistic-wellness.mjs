import { drizzle } from "drizzle-orm/mysql2";
import { mysqlTable, int, varchar, text, boolean, timestamp, index } from "drizzle-orm/mysql-core";

// Re-define the serviceCategories table inline matching the actual schema
const serviceCategories = mysqlTable("service_categories", {
  id: int("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  description: text("description"),
  iconUrl: varchar("iconUrl", { length: 500 }),
  isMobileEnabled: boolean("isMobileEnabled").default(true).notNull(),
  isFixedLocationEnabled: boolean("isFixedLocationEnabled").default(true).notNull(),
  isVirtualEnabled: boolean("isVirtualEnabled").default(false).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

const CATEGORY = {
  id: 210,
  name: "HOLISTIC WELLNESS CENTER",
  slug: "holistic-wellness-center",
  description: "Holistic wellness services including energy healing, meditation, aromatherapy, and integrative health practices",
  isMobileEnabled: true,
  isFixedLocationEnabled: true,
  isVirtualEnabled: true,
  sortOrder: 42,
  isActive: true,
};

async function seed() {
  const db = drizzle(process.env.DATABASE_URL);

  console.log("Adding Holistic Wellness Center category...");

  try {
    await db.insert(serviceCategories).values(CATEGORY).onDuplicateKeyUpdate({
      set: {
        name: CATEGORY.name,
        slug: CATEGORY.slug,
        description: CATEGORY.description,
        isMobileEnabled: CATEGORY.isMobileEnabled,
        isFixedLocationEnabled: CATEGORY.isFixedLocationEnabled,
        isVirtualEnabled: CATEGORY.isVirtualEnabled,
        sortOrder: CATEGORY.sortOrder,
        isActive: CATEGORY.isActive,
      },
    });
    console.log(`✓ Added category: ${CATEGORY.name} (ID: ${CATEGORY.id})`);
  } catch (error) {
    console.error(`✗ Failed to add category:`, error.message);
    process.exit(1);
  }

  console.log("\nHolistic Wellness Center category seeded successfully!");
  console.log("Providers can now select this category and add their own services under it.");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
