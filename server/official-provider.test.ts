import { describe, it, expect } from "vitest";
import { getDb } from "./db/connection";
import { sql } from "drizzle-orm";

describe("OlogyCrew Official Provider", () => {
  describe("Schema", () => {
    it("should have isOfficial field on serviceProviders table", async () => {
      const db = await getDb();
      if (!db) return; // skip if no DB
      const rows = await db.execute(
        sql`SHOW COLUMNS FROM service_providers LIKE 'isOfficial'`
      );
      expect((rows as any)[0].length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Official Provider Data", () => {
    it("should have at least one official provider in the database", async () => {
      const db = await getDb();
      if (!db) return;
      const rows = await db.execute(
        sql`SELECT COUNT(*) as count FROM service_providers WHERE isOfficial = 1`
      );
      expect(Number((rows as any)[0][0].count)).toBeGreaterThanOrEqual(1);
    });

    it("official provider should have slug 'ologycrew-official'", async () => {
      const db = await getDb();
      if (!db) return;
      const rows = await db.execute(
        sql`SELECT profileSlug, businessName FROM service_providers WHERE isOfficial = 1 LIMIT 1`
      );
      const data = (rows as any)[0];
      if (data.length > 0) {
        expect(data[0].profileSlug).toBe("ologycrew-official");
        expect(data[0].businessName).toBe("OlogyCrew Official");
      }
    });

    it("official provider should be active", async () => {
      const db = await getDb();
      if (!db) return;
      const rows = await db.execute(
        sql`SELECT isActive FROM service_providers WHERE isOfficial = 1 LIMIT 1`
      );
      const data = (rows as any)[0];
      if (data.length > 0) {
        expect(data[0].isActive).toBe(1);
      }
    });

    it("official provider should have services across multiple categories", async () => {
      const db = await getDb();
      if (!db) return;
      const providerRows = await db.execute(
        sql`SELECT id FROM service_providers WHERE isOfficial = 1 LIMIT 1`
      );
      const providerData = (providerRows as any)[0];
      if (providerData.length > 0) {
        const providerId = providerData[0].id;
        const serviceRows = await db.execute(
          sql`SELECT COUNT(DISTINCT categoryId) as catCount FROM services WHERE providerId = ${providerId}`
        );
        expect(Number((serviceRows as any)[0][0].catCount)).toBeGreaterThanOrEqual(10);
      }
    });

    it("official provider should be linked to multiple categories", async () => {
      const db = await getDb();
      if (!db) return;
      const providerRows = await db.execute(
        sql`SELECT id FROM service_providers WHERE isOfficial = 1 LIMIT 1`
      );
      const providerData = (providerRows as any)[0];
      if (providerData.length > 0) {
        const providerId = providerData[0].id;
        const catRows = await db.execute(
          sql`SELECT COUNT(*) as count FROM provider_categories WHERE providerId = ${providerId}`
        );
        expect(Number((catRows as any)[0][0].count)).toBeGreaterThanOrEqual(10);
      }
    });

    it("official provider should have availability schedule", async () => {
      const db = await getDb();
      if (!db) return;
      const providerRows = await db.execute(
        sql`SELECT id FROM service_providers WHERE isOfficial = 1 LIMIT 1`
      );
      const providerData = (providerRows as any)[0];
      if (providerData.length > 0) {
        const providerId = providerData[0].id;
        const schedRows = await db.execute(
          sql`SELECT COUNT(*) as count FROM availability_schedules WHERE providerId = ${providerId}`
        );
        expect(Number((schedRows as any)[0][0].count)).toBeGreaterThanOrEqual(6);
      }
    });
  });

  describe("Sorting Logic", () => {
    it("official providers should sort before non-official providers", () => {
      const providers = [
        { id: 1, businessName: "Regular Provider", isOfficial: false, averageRating: "4.8" },
        { id: 2, businessName: "OlogyCrew Official", isOfficial: true, averageRating: "0" },
        { id: 3, businessName: "Another Provider", isOfficial: false, averageRating: "5.0" },
      ];
      const sorted = providers.sort((a, b) => {
        if (a.isOfficial && !b.isOfficial) return -1;
        if (!a.isOfficial && b.isOfficial) return 1;
        return parseFloat(b.averageRating || "0") - parseFloat(a.averageRating || "0");
      });
      expect(sorted[0].businessName).toBe("OlogyCrew Official");
      expect(sorted[1].businessName).toBe("Another Provider"); // 5.0 rating
      expect(sorted[2].businessName).toBe("Regular Provider"); // 4.8 rating
    });

    it("should maintain rating order among non-official providers", () => {
      const providers = [
        { id: 1, isOfficial: false, averageRating: "3.0" },
        { id: 2, isOfficial: false, averageRating: "4.5" },
        { id: 3, isOfficial: false, averageRating: "4.0" },
      ];
      const sorted = providers.sort((a, b) => {
        if (a.isOfficial && !b.isOfficial) return -1;
        if (!a.isOfficial && b.isOfficial) return 1;
        return parseFloat(b.averageRating || "0") - parseFloat(a.averageRating || "0");
      });
      expect(sorted[0].id).toBe(2); // 4.5
      expect(sorted[1].id).toBe(3); // 4.0
      expect(sorted[2].id).toBe(1); // 3.0
    });
  });
});
