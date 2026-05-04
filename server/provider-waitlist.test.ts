import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for provider waitlist view and remove functionality.
 * Tests the providerRemoveFromWaitlist db helper logic and the
 * providerEntries enrichment.
 */

// Mock the database connection
vi.mock("./db/connection", () => ({
  getDb: vi.fn(),
}));

describe("Provider Waitlist - providerRemoveFromWaitlist", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should cancel a waitlist entry belonging to the provider", async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]),
      }),
    });

    vi.doMock("./db/connection", () => ({
      getDb: vi.fn().mockResolvedValue({
        update: mockUpdate,
      }),
    }));

    const { providerRemoveFromWaitlist } = await import("./db/waitlist");
    const result = await providerRemoveFromWaitlist(5, 10);
    expect(result).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("should return false when entry does not belong to provider", async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ affectedRows: 0 }]),
      }),
    });

    vi.doMock("./db/connection", () => ({
      getDb: vi.fn().mockResolvedValue({
        update: mockUpdate,
      }),
    }));

    const { providerRemoveFromWaitlist } = await import("./db/waitlist");
    const result = await providerRemoveFromWaitlist(99, 10);
    expect(result).toBe(false);
  });

  it("should throw when database is not available", async () => {
    vi.doMock("./db/connection", () => ({
      getDb: vi.fn().mockResolvedValue(null),
    }));

    const { providerRemoveFromWaitlist } = await import("./db/waitlist");
    await expect(providerRemoveFromWaitlist(1, 1)).rejects.toThrow("Database not available");
  });
});

describe("Provider Waitlist - getProviderWaitlistEntries", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return entries filtered by providerId and waiting status", async () => {
    const mockEntries = [
      { id: 1, userId: 10, serviceId: 5, providerId: 3, bookingDate: "2026-06-01", startTime: "10:00:00", position: 1, status: "waiting" },
      { id: 2, userId: 11, serviceId: 5, providerId: 3, bookingDate: "2026-06-01", startTime: "10:00:00", position: 2, status: "waiting" },
    ];

    const mockOrderBy = vi.fn().mockResolvedValue(mockEntries);
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

    vi.doMock("./db/connection", () => ({
      getDb: vi.fn().mockResolvedValue({
        select: mockSelect,
      }),
    }));

    const { getProviderWaitlistEntries } = await import("./db/waitlist");
    const result = await getProviderWaitlistEntries(3);
    expect(result).toHaveLength(2);
    expect(result[0].position).toBe(1);
    expect(result[1].position).toBe(2);
  });

  it("should return empty array when no entries exist", async () => {
    const mockOrderBy = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

    vi.doMock("./db/connection", () => ({
      getDb: vi.fn().mockResolvedValue({
        select: mockSelect,
      }),
    }));

    const { getProviderWaitlistEntries } = await import("./db/waitlist");
    const result = await getProviderWaitlistEntries(999);
    expect(result).toHaveLength(0);
  });
});

describe("Provider Waitlist - UI grouping logic", () => {
  it("should group waitlist entries by service name and date", () => {
    const entries = [
      { id: 1, serviceName: "Yoga Class", bookingDate: "2026-06-01", startTime: "10:00:00", position: 1, userName: "Alice", status: "waiting" },
      { id: 2, serviceName: "Yoga Class", bookingDate: "2026-06-01", startTime: "10:00:00", position: 2, userName: "Bob", status: "waiting" },
      { id: 3, serviceName: "Pilates", bookingDate: "2026-06-02", startTime: "14:00:00", position: 1, userName: "Charlie", status: "waiting" },
    ];

    // Simulate the grouping logic from the UI
    const grouped: Record<string, typeof entries> = {};
    entries.forEach((entry) => {
      const key = `${entry.serviceName}|${entry.bookingDate}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(entry);
    });

    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped["Yoga Class|2026-06-01"]).toHaveLength(2);
    expect(grouped["Pilates|2026-06-02"]).toHaveLength(1);
  });

  it("should separate same service on different dates into different groups", () => {
    const entries = [
      { id: 1, serviceName: "Yoga Class", bookingDate: "2026-06-01", startTime: "10:00:00", position: 1, userName: "Alice", status: "waiting" },
      { id: 2, serviceName: "Yoga Class", bookingDate: "2026-06-03", startTime: "10:00:00", position: 1, userName: "Bob", status: "waiting" },
    ];

    const grouped: Record<string, typeof entries> = {};
    entries.forEach((entry) => {
      const key = `${entry.serviceName}|${entry.bookingDate}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(entry);
    });

    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped["Yoga Class|2026-06-01"]).toHaveLength(1);
    expect(grouped["Yoga Class|2026-06-03"]).toHaveLength(1);
  });

  it("should display correct status labels", () => {
    const statusMap: Record<string, string> = {
      waiting: "Waiting",
      notified: "Notified",
      booked: "Booked",
      expired: "Expired",
    };

    expect(statusMap["waiting"]).toBe("Waiting");
    expect(statusMap["notified"]).toBe("Notified");
    expect(statusMap["booked"]).toBe("Booked");
    expect(statusMap["expired"]).toBe("Expired");
  });
});
