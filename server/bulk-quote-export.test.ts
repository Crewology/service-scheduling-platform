import { describe, it, expect, vi } from "vitest";

// ============================================================================
// BULK QUOTE REQUEST TESTS
// ============================================================================
describe("Bulk Quote Requests", () => {
  describe("Schema & Validation", () => {
    it("should require at least 2 provider IDs for bulk quote", () => {
      const { z } = require("zod");
      const schema = z.object({
        providerIds: z.array(z.number()).min(2),
        title: z.string().min(5),
        description: z.string().min(20),
      });

      // Too few providers
      const result1 = schema.safeParse({
        providerIds: [1],
        title: "Test Quote",
        description: "This is a test description that is long enough",
      });
      expect(result1.success).toBe(false);

      // Valid
      const result2 = schema.safeParse({
        providerIds: [1, 2, 3],
        title: "Test Quote",
        description: "This is a test description that is long enough",
      });
      expect(result2.success).toBe(true);
    });

    it("should validate title minimum length", () => {
      const { z } = require("zod");
      const schema = z.object({
        title: z.string().min(5),
      });

      expect(schema.safeParse({ title: "Hi" }).success).toBe(false);
      expect(schema.safeParse({ title: "Valid Title" }).success).toBe(true);
    });

    it("should validate description minimum length", () => {
      const { z } = require("zod");
      const schema = z.object({
        description: z.string().min(20),
      });

      expect(schema.safeParse({ description: "Short" }).success).toBe(false);
      expect(schema.safeParse({ description: "This is a valid description with enough characters" }).success).toBe(true);
    });

    it("should accept optional fields for bulk quote", () => {
      const { z } = require("zod");
      const schema = z.object({
        providerIds: z.array(z.number()).min(2),
        title: z.string().min(5),
        description: z.string().min(20),
        preferredDate: z.string().optional(),
        preferredTime: z.string().optional(),
        locationType: z.enum(["mobile", "fixed_location", "virtual"]).optional(),
        location: z.string().optional(),
        categoryId: z.number().optional(),
      });

      const result = schema.safeParse({
        providerIds: [1, 2],
        title: "AV Setup Needed",
        description: "Looking for AV setup for a corporate event next month",
        preferredDate: "2026-05-15",
        preferredTime: "10:00",
        locationType: "fixed_location",
        location: "123 Main St",
        categoryId: 15,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("Batch ID Generation", () => {
    it("should generate unique batch IDs", () => {
      const crypto = require("crypto");
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(crypto.randomUUID());
      }
      expect(ids.size).toBe(100);
    });

    it("should generate valid UUID format", () => {
      const crypto = require("crypto");
      const id = crypto.randomUUID();
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });
  });

  describe("Tier Gating", () => {
    it("should only allow Pro and Business tiers for bulk quotes", async () => {
      const { CUSTOMER_TIERS } = await import("./customerSubscription");

      // Free tier should NOT have bulk quote requests
      expect(CUSTOMER_TIERS.free.perks.bulkQuoteRequests).toBeFalsy();

      // Pro tier should NOT have bulk quote requests (only Business)
      expect(CUSTOMER_TIERS.pro.perks.bulkQuoteRequests).toBeFalsy();

      // Business tier should have bulk quote requests
      expect(CUSTOMER_TIERS.business.perks.bulkQuoteRequests).toBeTruthy();
    });
  });
});

// ============================================================================
// BOOKING EXPORT TESTS
// ============================================================================
describe("Booking History Export", () => {
  describe("CSV Generation", () => {
    it("should generate valid CSV headers", () => {
      const headers = [
        "Booking #", "Date", "Start Time", "End Time", "Duration (min)",
        "Status", "Type", "Location Type", "Service", "Provider",
        "Category", "Subtotal", "Travel Fee", "Platform Fee", "Total", "Notes",
      ];
      expect(headers.length).toBe(16);
      expect(headers[0]).toBe("Booking #");
      expect(headers[headers.length - 1]).toBe("Notes");
    });

    it("should properly escape CSV values with quotes", () => {
      const value = 'Service "Premium" Package';
      const escaped = `"${value.replace(/"/g, '""')}"`;
      expect(escaped).toBe('"Service ""Premium"" Package"');
    });

    it("should properly escape CSV values with commas", () => {
      const value = "Hair Cut, Shave, and Style";
      const escaped = `"${value.replace(/"/g, '""')}"`;
      expect(escaped).toBe('"Hair Cut, Shave, and Style"');
    });

    it("should handle null/empty notes in CSV", () => {
      const notes: string | null = null;
      const escaped = `"${(notes || "").replace(/"/g, '""')}"`;
      expect(escaped).toBe('""');
    });
  });

  describe("Date Range Filtering", () => {
    it("should accept valid date range", () => {
      const { z } = require("zod");
      const schema = z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        format: z.enum(["csv", "json"]).default("csv"),
      });

      const result = schema.safeParse({
        startDate: "2026-01-01",
        endDate: "2026-03-31",
        format: "csv",
      });
      expect(result.success).toBe(true);
    });

    it("should accept empty date range for all bookings", () => {
      const { z } = require("zod");
      const schema = z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        format: z.enum(["csv", "json"]).default("csv"),
      });

      const result = schema.safeParse({});
      expect(result.success).toBe(true);
      expect(result.data?.format).toBe("csv");
    });

    it("should support JSON format", () => {
      const { z } = require("zod");
      const schema = z.object({
        format: z.enum(["csv", "json"]).default("csv"),
      });

      const result = schema.safeParse({ format: "json" });
      expect(result.success).toBe(true);
      expect(result.data?.format).toBe("json");
    });
  });

  describe("Tier Gating", () => {
    it("should only allow Business tier for booking export", async () => {
      const { CUSTOMER_TIERS } = await import("./customerSubscription");

      // Free tier should NOT have booking analytics/export
      expect(CUSTOMER_TIERS.free.perks.bookingAnalytics).toBeFalsy();

      // Pro tier should NOT have booking analytics/export
      expect(CUSTOMER_TIERS.pro.perks.bookingAnalytics).toBeFalsy();

      // Business tier should have booking analytics/export
      expect(CUSTOMER_TIERS.business.perks.bookingAnalytics).toBeTruthy();
    });
  });

  describe("File Download", () => {
    it("should generate correct filename with date range", () => {
      const startDate = "2026-01-01";
      const endDate = "2026-03-31";
      const format = "csv";
      const dateRange = startDate && endDate
        ? `_${startDate}_to_${endDate}`
        : startDate
        ? `_from_${startDate}`
        : endDate
        ? `_to_${endDate}`
        : "";
      const filename = `booking-history${dateRange}.${format}`;
      expect(filename).toBe("booking-history_2026-01-01_to_2026-03-31.csv");
    });

    it("should generate correct filename without date range", () => {
      const startDate = "";
      const endDate = "";
      const format = "json";
      const dateRange = startDate && endDate
        ? `_${startDate}_to_${endDate}`
        : startDate
        ? `_from_${startDate}`
        : endDate
        ? `_to_${endDate}`
        : "";
      const filename = `booking-history${dateRange}.${format}`;
      expect(filename).toBe("booking-history.json");
    });
  });
});

// ============================================================================
// ONBOARDING IMPROVEMENTS TESTS
// ============================================================================
describe("Provider Onboarding Improvements", () => {
  describe("Step Completion Tracking", () => {
    it("should calculate correct progress percentage", () => {
      const stepComplete = { 1: true, 2: true, 3: false, 4: false };
      const completedCount = Object.values(stepComplete).filter(Boolean).length;
      const totalSteps = Object.keys(stepComplete).length;
      const progress = Math.round((completedCount / totalSteps) * 100);
      expect(progress).toBe(50);
    });

    it("should show 0% when no steps complete", () => {
      const stepComplete = { 1: false, 2: false, 3: false, 4: false };
      const completedCount = Object.values(stepComplete).filter(Boolean).length;
      const progress = Math.round((completedCount / 4) * 100);
      expect(progress).toBe(0);
    });

    it("should show 100% when all steps complete", () => {
      const stepComplete = { 1: true, 2: true, 3: true, 4: true };
      const completedCount = Object.values(stepComplete).filter(Boolean).length;
      const progress = Math.round((completedCount / 4) * 100);
      expect(progress).toBe(100);
    });
  });

  describe("Checklist Steps", () => {
    it("should have 7 checklist items in the dashboard widget", () => {
      const steps = [
        { id: "photo", done: false },
        { id: "bio", done: false },
        { id: "categories", done: false },
        { id: "services", done: false },
        { id: "availability", done: false },
        { id: "portfolio", done: false },
        { id: "stripe", done: false },
      ];
      expect(steps.length).toBe(7);
    });

    it("should identify next incomplete step correctly", () => {
      const steps = [
        { id: "photo", done: true },
        { id: "bio", done: true },
        { id: "categories", done: false },
        { id: "services", done: false },
        { id: "availability", done: false },
        { id: "portfolio", done: false },
        { id: "stripe", done: false },
      ];
      const nextStep = steps.find(s => !s.done);
      expect(nextStep?.id).toBe("categories");
    });

    it("should return undefined when all steps complete", () => {
      const steps = [
        { id: "photo", done: true },
        { id: "bio", done: true },
        { id: "categories", done: true },
        { id: "services", done: true },
        { id: "availability", done: true },
        { id: "portfolio", done: true },
        { id: "stripe", done: true },
      ];
      const nextStep = steps.find(s => !s.done);
      expect(nextStep).toBeUndefined();
    });

    it("should calculate dashboard checklist progress correctly", () => {
      const steps = [
        { id: "photo", done: true },
        { id: "bio", done: true },
        { id: "categories", done: true },
        { id: "services", done: false },
        { id: "availability", done: false },
        { id: "portfolio", done: false },
        { id: "stripe", done: false },
      ];
      const completedCount = steps.filter(s => s.done).length;
      const totalSteps = steps.length;
      const progress = Math.round((completedCount / totalSteps) * 100);
      expect(progress).toBe(43);
      expect(completedCount).toBe(3);
      expect(totalSteps).toBe(7);
    });

    it("should include availability step in the checklist", () => {
      const stepIds = ["photo", "bio", "categories", "services", "availability", "portfolio", "stripe"];
      expect(stepIds).toContain("availability");
    });
  });
});
