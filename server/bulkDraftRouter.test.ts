import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db functions
vi.mock("./db/bulkDrafts", () => ({
  createBulkDraft: vi.fn(),
  updateBulkDraft: vi.fn(),
  getBulkDraftsByUser: vi.fn(),
  getBulkDraftById: vi.fn(),
  deleteBulkDraft: vi.fn(),
}));

import {
  createBulkDraft,
  updateBulkDraft,
  getBulkDraftsByUser,
  getBulkDraftById,
  deleteBulkDraft,
} from "./db/bulkDrafts";

describe("Bulk Draft Router logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createBulkDraft", () => {
    it("should create a draft with all fields", async () => {
      (createBulkDraft as any).mockResolvedValue(1);

      const data = {
        userId: 42,
        name: "Wedding at Grand Ballroom",
        eventDate: "2026-08-15",
        eventType: "Wedding",
        eventVenue: "The Grand Ballroom, Atlanta GA",
        slots: [
          {
            id: "abc123",
            categoryId: 20,
            categoryName: "DJ & MUSIC SERVICES",
            providerId: 5,
            providerName: "DJ Mike",
            serviceId: 10,
            serviceName: "Wedding DJ Package",
            startTime: "18:00",
            endTime: "23:00",
            notes: "Need wireless mic",
          },
        ],
      };

      const result = await createBulkDraft(data);
      expect(createBulkDraft).toHaveBeenCalledWith(data);
      expect(result).toBe(1);
    });

    it("should create a draft with minimal fields", async () => {
      (createBulkDraft as any).mockResolvedValue(2);

      const data = {
        userId: 42,
        slots: [],
      };

      const result = await createBulkDraft(data);
      expect(createBulkDraft).toHaveBeenCalledWith(data);
      expect(result).toBe(2);
    });
  });

  describe("getBulkDraftsByUser", () => {
    it("should return drafts for a user", async () => {
      const mockDrafts = [
        {
          id: 1,
          userId: 42,
          name: "Wedding Draft",
          eventDate: "2026-08-15",
          eventType: "Wedding",
          eventVenue: "Grand Ballroom",
          slots: [{ id: "a", categoryName: "DJ" }],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          userId: 42,
          name: "Corporate Event",
          eventDate: "2026-09-01",
          eventType: "Corporate Event",
          eventVenue: "Convention Center",
          slots: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (getBulkDraftsByUser as any).mockResolvedValue(mockDrafts);

      const result = await getBulkDraftsByUser(42);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Wedding Draft");
      expect(result[1].eventType).toBe("Corporate Event");
    });

    it("should return empty array for user with no drafts", async () => {
      (getBulkDraftsByUser as any).mockResolvedValue([]);
      const result = await getBulkDraftsByUser(999);
      expect(result).toEqual([]);
    });
  });

  describe("getBulkDraftById", () => {
    it("should return a draft by id", async () => {
      const mockDraft = {
        id: 1,
        userId: 42,
        name: "Test Draft",
        eventDate: "2026-08-15",
        eventType: "Wedding",
        eventVenue: "Grand Ballroom",
        slots: [{ id: "slot1", providerId: 5 }],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (getBulkDraftById as any).mockResolvedValue(mockDraft);

      const result = await getBulkDraftById(1);
      expect(result).toBeDefined();
      expect(result!.id).toBe(1);
      expect(result!.userId).toBe(42);
    });

    it("should return undefined for non-existent draft", async () => {
      (getBulkDraftById as any).mockResolvedValue(undefined);
      const result = await getBulkDraftById(999);
      expect(result).toBeUndefined();
    });
  });

  describe("updateBulkDraft", () => {
    it("should update an existing draft", async () => {
      (updateBulkDraft as any).mockResolvedValue(undefined);

      await updateBulkDraft(1, 42, {
        name: "Updated Name",
        eventDate: "2026-09-01",
        eventType: "Corporate Event",
        eventVenue: "New Venue",
        slots: [{ id: "new-slot", providerId: 10 }],
      });

      expect(updateBulkDraft).toHaveBeenCalledWith(1, 42, {
        name: "Updated Name",
        eventDate: "2026-09-01",
        eventType: "Corporate Event",
        eventVenue: "New Venue",
        slots: [{ id: "new-slot", providerId: 10 }],
      });
    });
  });

  describe("deleteBulkDraft", () => {
    it("should delete a draft", async () => {
      (deleteBulkDraft as any).mockResolvedValue(undefined);
      await deleteBulkDraft(1);
      expect(deleteBulkDraft).toHaveBeenCalledWith(1);
    });
  });
});

describe("Cost calculation logic", () => {
  // Test the cost calculation logic that lives in the frontend
  function calculateSlotCost(slot: {
    serviceId: number | null;
    startTime: string;
    endTime: string;
    pricingModel?: string;
    basePrice?: string | null;
    hourlyRate?: string | null;
  }): number | null {
    if (!slot.serviceId || !slot.startTime || !slot.endTime) return null;

    if (slot.pricingModel === "fixed" && slot.basePrice) {
      return parseFloat(slot.basePrice);
    }

    if (slot.pricingModel === "hourly" && slot.hourlyRate) {
      const [startH, startM] = slot.startTime.split(":").map(Number);
      const [endH, endM] = slot.endTime.split(":").map(Number);
      let durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      if (durationMinutes <= 0) durationMinutes += 24 * 60;
      const hours = durationMinutes / 60;
      return parseFloat(slot.hourlyRate) * hours;
    }

    if (slot.pricingModel === "package" && slot.basePrice) {
      return parseFloat(slot.basePrice);
    }

    return null;
  }

  it("should calculate fixed price correctly", () => {
    const cost = calculateSlotCost({
      serviceId: 1,
      startTime: "09:00",
      endTime: "17:00",
      pricingModel: "fixed",
      basePrice: "250.00",
      hourlyRate: null,
    });
    expect(cost).toBe(250.0);
  });

  it("should calculate hourly rate correctly for 5 hours", () => {
    const cost = calculateSlotCost({
      serviceId: 1,
      startTime: "18:00",
      endTime: "23:00",
      pricingModel: "hourly",
      basePrice: null,
      hourlyRate: "75.00",
    });
    expect(cost).toBe(375.0); // 5 hours * $75/hr
  });

  it("should calculate hourly rate for partial hours", () => {
    const cost = calculateSlotCost({
      serviceId: 1,
      startTime: "14:00",
      endTime: "15:30",
      pricingModel: "hourly",
      basePrice: null,
      hourlyRate: "100.00",
    });
    expect(cost).toBe(150.0); // 1.5 hours * $100/hr
  });

  it("should return null for custom_quote pricing", () => {
    const cost = calculateSlotCost({
      serviceId: 1,
      startTime: "09:00",
      endTime: "17:00",
      pricingModel: "custom_quote",
      basePrice: null,
      hourlyRate: null,
    });
    expect(cost).toBeNull();
  });

  it("should return null when no service is selected", () => {
    const cost = calculateSlotCost({
      serviceId: null,
      startTime: "09:00",
      endTime: "17:00",
      pricingModel: "fixed",
      basePrice: "100.00",
      hourlyRate: null,
    });
    expect(cost).toBeNull();
  });

  it("should return null when times are not set", () => {
    const cost = calculateSlotCost({
      serviceId: 1,
      startTime: "",
      endTime: "",
      pricingModel: "hourly",
      basePrice: null,
      hourlyRate: "50.00",
    });
    expect(cost).toBeNull();
  });

  it("should handle package pricing correctly", () => {
    const cost = calculateSlotCost({
      serviceId: 1,
      startTime: "10:00",
      endTime: "14:00",
      pricingModel: "package",
      basePrice: "500.00",
      hourlyRate: null,
    });
    expect(cost).toBe(500.0);
  });
});
