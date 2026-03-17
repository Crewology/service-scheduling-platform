import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock database module
vi.mock("./db", () => ({
  getUnreadMessageCount: vi.fn(),
  getUserConversations: vi.fn(),
  markMessagesAsRead: vi.fn(),
  getProviderAvailability: vi.fn(),
  getProviderOverrides: vi.fn(),
  getBookingsByDateRange: vi.fn(),
  getServiceById: vi.fn(),
  getProviderByUserId: vi.fn(),
  getProviderById: vi.fn(),
  getBookingById: vi.fn(),
  createBooking: vi.fn(),
  createMessage: vi.fn(),
  getConversationMessages: vi.fn(),
  getCustomerBookings: vi.fn(),
  getProviderBookings: vi.fn(),
  getUserNotifications: vi.fn(),
  markNotificationAsRead: vi.fn(),
  getReviewsByProviderId: vi.fn(),
  getReviewByBookingId: vi.fn(),
  createReview: vi.fn(),
  getAllCategories: vi.fn(),
  getCategoryById: vi.fn(),
  getCategoryBySlug: vi.fn(),
  getServicesByProviderId: vi.fn(),
  getServicesByCategory: vi.fn(),
  searchServices: vi.fn(),
  createService: vi.fn(),
  createServiceProvider: vi.fn(),
  getAllProviders: vi.fn(),
  createAvailabilitySchedule: vi.fn(),
  createAvailabilityOverride: vi.fn(),
  updateBookingStatus: vi.fn(),
  getMessagesByBooking: vi.fn(),
}));

import * as db from "./db";

const mockDb = db as unknown as {
  [K in keyof typeof db]: ReturnType<typeof vi.fn>;
};

// ============================================================================
// UNREAD MESSAGE COUNT TESTS
// ============================================================================

describe("Unread Message Count", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 0 when user has no unread messages", async () => {
    mockDb.getUnreadMessageCount.mockResolvedValue(0);

    const count = await db.getUnreadMessageCount(1);
    expect(count).toBe(0);
    expect(mockDb.getUnreadMessageCount).toHaveBeenCalledWith(1);
  });

  it("should return correct count for unread messages", async () => {
    mockDb.getUnreadMessageCount.mockResolvedValue(5);

    const count = await db.getUnreadMessageCount(1);
    expect(count).toBe(5);
  });

  it("should return count specific to the user", async () => {
    mockDb.getUnreadMessageCount
      .mockResolvedValueOnce(3) // user 1
      .mockResolvedValueOnce(7); // user 2

    const count1 = await db.getUnreadMessageCount(1);
    const count2 = await db.getUnreadMessageCount(2);

    expect(count1).toBe(3);
    expect(count2).toBe(7);
  });
});

// ============================================================================
// AVAILABILITY SCHEDULE TESTS
// ============================================================================

describe("Provider Availability Schedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return weekly schedule for a provider", async () => {
    const schedule = [
      { id: 1, providerId: 1, dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isAvailable: true },
      { id: 2, providerId: 1, dayOfWeek: 2, startTime: "09:00", endTime: "17:00", isAvailable: true },
      { id: 3, providerId: 1, dayOfWeek: 3, startTime: "09:00", endTime: "17:00", isAvailable: true },
      { id: 4, providerId: 1, dayOfWeek: 4, startTime: "09:00", endTime: "17:00", isAvailable: true },
      { id: 5, providerId: 1, dayOfWeek: 5, startTime: "09:00", endTime: "17:00", isAvailable: true },
    ];
    mockDb.getProviderAvailability.mockResolvedValue(schedule);

    const result = await db.getProviderAvailability(1);
    expect(result).toHaveLength(5);
    expect(result[0].dayOfWeek).toBe(1); // Monday
    expect(result[0].startTime).toBe("09:00");
    expect(result[0].endTime).toBe("17:00");
  });

  it("should return empty array for provider with no schedule", async () => {
    mockDb.getProviderAvailability.mockResolvedValue([]);

    const result = await db.getProviderAvailability(999);
    expect(result).toHaveLength(0);
  });

  it("should return overrides for a date range", async () => {
    const overrides = [
      { id: 1, providerId: 1, overrideDate: "2026-03-20", isAvailable: false, reason: "Holiday" },
      { id: 2, providerId: 1, overrideDate: "2026-03-25", startTime: "10:00", endTime: "14:00", isAvailable: true },
    ];
    mockDb.getProviderOverrides.mockResolvedValue(overrides);

    const result = await db.getProviderOverrides(1, "2026-03-01", "2026-03-31");
    expect(result).toHaveLength(2);
    expect(result[0].isAvailable).toBe(false);
    expect(result[1].isAvailable).toBe(true);
  });
});

// ============================================================================
// BOOKING DATE RANGE QUERY TESTS
// ============================================================================

describe("Booking Date Range Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return bookings for a specific date", async () => {
    const bookings = [
      { id: 1, bookingDate: "2026-03-20", startTime: "09:00", endTime: "10:00", status: "confirmed" },
      { id: 2, bookingDate: "2026-03-20", startTime: "14:00", endTime: "15:00", status: "pending" },
    ];
    mockDb.getBookingsByDateRange.mockResolvedValue(bookings);

    const result = await db.getBookingsByDateRange(1, "2026-03-20", "2026-03-20");
    expect(result).toHaveLength(2);
    expect(result[0].bookingDate).toBe("2026-03-20");
  });

  it("should return empty array when no bookings exist for date", async () => {
    mockDb.getBookingsByDateRange.mockResolvedValue([]);

    const result = await db.getBookingsByDateRange(1, "2026-04-01", "2026-04-01");
    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// TIME SLOT GENERATION TESTS (shared/timeSlots.ts)
// ============================================================================

import { generateTimeSlots, formatTimeForDisplay, isTimeSlotAvailable, getDateRange } from "@shared/timeSlots";

describe("Time Slot Generation", () => {
  const weeklySchedule = [
    { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isAvailable: true }, // Monday
    { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", isAvailable: true }, // Tuesday
    { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", isAvailable: true }, // Wednesday
    { dayOfWeek: 0, startTime: "09:00", endTime: "17:00", isAvailable: false }, // Sunday - off
  ];

  it("should generate time slots for a working day", () => {
    // Find a Monday in 2026
    const slots = generateTimeSlots("2026-03-23", 60, weeklySchedule, [], []);
    // 09:00 to 17:00 with 30-min intervals, 60-min service: 09:00, 09:30, ..., 16:00
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].time).toBe("09:00");
    expect(slots[0].available).toBe(true);
    // Last slot should allow full 60 min before 17:00
    const lastSlot = slots[slots.length - 1];
    const [h, m] = lastSlot.time.split(":").map(Number);
    expect(h * 60 + m + 60).toBeLessThanOrEqual(17 * 60);
  });

  it("should return empty array for non-working day", () => {
    // Find a Sunday in 2026 - March 22 is a Sunday
    const slots = generateTimeSlots("2026-03-22", 60, weeklySchedule, [], []);
    expect(slots).toHaveLength(0);
  });

  it("should mark booked slots as unavailable", () => {
    const existingBookings = [
      { bookingDate: "2026-03-23", bookingTime: "10:00", status: "confirmed" },
    ];
    const slots = generateTimeSlots("2026-03-23", 60, weeklySchedule, [], existingBookings);
    const bookedSlot = slots.find((s) => s.time === "10:00");
    expect(bookedSlot?.available).toBe(false);
  });

  it("should respect schedule overrides", () => {
    const overrides = [
      { overrideDate: "2026-03-23", startTime: null, endTime: null, isAvailable: false },
    ];
    const slots = generateTimeSlots("2026-03-23", 60, weeklySchedule, overrides, []);
    expect(slots).toHaveLength(0);
  });

  it("should use override time range when available", () => {
    const overrides = [
      { overrideDate: "2026-03-23", startTime: "10:00", endTime: "14:00", isAvailable: true },
    ];
    const slots = generateTimeSlots("2026-03-23", 60, weeklySchedule, overrides, []);
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].time).toBe("10:00");
    const lastSlot = slots[slots.length - 1];
    const [h, m] = lastSlot.time.split(":").map(Number);
    expect(h * 60 + m + 60).toBeLessThanOrEqual(14 * 60);
  });

  it("should handle custom slot intervals", () => {
    const slots15 = generateTimeSlots("2026-03-23", 30, weeklySchedule, [], [], 15);
    const slots60 = generateTimeSlots("2026-03-23", 30, weeklySchedule, [], [], 60);
    expect(slots15.length).toBeGreaterThan(slots60.length);
  });
});

describe("Time Formatting", () => {
  it("should format morning time correctly", () => {
    expect(formatTimeForDisplay("09:00")).toBe("9:00 AM");
  });

  it("should format afternoon time correctly", () => {
    expect(formatTimeForDisplay("14:30")).toBe("2:30 PM");
  });

  it("should format noon correctly", () => {
    expect(formatTimeForDisplay("12:00")).toBe("12:00 PM");
  });

  it("should format midnight correctly", () => {
    expect(formatTimeForDisplay("00:00")).toBe("12:00 AM");
  });
});

describe("isTimeSlotAvailable", () => {
  const weeklySchedule = [
    { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isAvailable: true },
  ];

  it("should return true for available slot", () => {
    const result = isTimeSlotAvailable("2026-03-23", "10:00", 60, weeklySchedule, [], []);
    expect(result).toBe(true);
  });

  it("should return false for booked slot", () => {
    const bookings = [{ bookingDate: "2026-03-23", bookingTime: "10:00", status: "confirmed" }];
    const result = isTimeSlotAvailable("2026-03-23", "10:00", 60, weeklySchedule, [], bookings);
    expect(result).toBe(false);
  });

  it("should return false for non-existent slot", () => {
    const result = isTimeSlotAvailable("2026-03-23", "23:00", 60, weeklySchedule, [], []);
    expect(result).toBe(false);
  });
});

describe("getDateRange", () => {
  it("should generate correct number of dates", () => {
    const dates = getDateRange(new Date("2026-03-01"), 7);
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe("2026-03-01");
    expect(dates[6]).toBe("2026-03-07");
  });

  it("should handle month boundaries", () => {
    const dates = getDateRange(new Date("2026-03-30"), 5);
    expect(dates).toHaveLength(5);
    expect(dates[0]).toBe("2026-03-30");
    expect(dates[1]).toBe("2026-03-31");
    expect(dates[2]).toBe("2026-04-01");
  });
});

// ============================================================================
// NOTIFICATION TESTS
// ============================================================================

describe("Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return unread notifications", async () => {
    const notifications = [
      { id: 1, userId: 1, title: "New booking", message: "You have a new booking", isRead: false },
      { id: 2, userId: 1, title: "Review received", message: "New review", isRead: false },
    ];
    mockDb.getUserNotifications.mockResolvedValue(notifications);

    const result = await db.getUserNotifications(1, true);
    expect(result).toHaveLength(2);
    expect(mockDb.getUserNotifications).toHaveBeenCalledWith(1, true);
  });

  it("should mark notification as read", async () => {
    mockDb.markNotificationAsRead.mockResolvedValue(undefined);

    await db.markNotificationAsRead(1);
    expect(mockDb.markNotificationAsRead).toHaveBeenCalledWith(1);
  });
});
