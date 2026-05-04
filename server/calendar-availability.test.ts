import { describe, it, expect } from "vitest";
import {
  generateTimeSlots,
  timeToMinutes,
  minutesToTime,
  isTimeSlotAvailable,
  formatTimeForDisplay,
  getDateRange,
} from "../shared/timeSlots";

describe("timeToMinutes", () => {
  it("converts 00:00 to 0", () => {
    expect(timeToMinutes("00:00")).toBe(0);
  });
  it("converts 09:30 to 570", () => {
    expect(timeToMinutes("09:30")).toBe(570);
  });
  it("converts 23:59 to 1439", () => {
    expect(timeToMinutes("23:59")).toBe(1439);
  });
});

describe("minutesToTime", () => {
  it("converts 0 to 00:00", () => {
    expect(minutesToTime(0)).toBe("00:00");
  });
  it("converts 570 to 09:30", () => {
    expect(minutesToTime(570)).toBe("09:30");
  });
  it("converts 1439 to 23:59", () => {
    expect(minutesToTime(1439)).toBe("23:59");
  });
});

describe("formatTimeForDisplay", () => {
  it("formats 09:00 as 9:00 AM", () => {
    expect(formatTimeForDisplay("09:00")).toBe("9:00 AM");
  });
  it("formats 13:30 as 1:30 PM", () => {
    expect(formatTimeForDisplay("13:30")).toBe("1:30 PM");
  });
  it("formats 00:00 as 12:00 AM", () => {
    expect(formatTimeForDisplay("00:00")).toBe("12:00 AM");
  });
  it("formats 12:00 as 12:00 PM", () => {
    expect(formatTimeForDisplay("12:00")).toBe("12:00 PM");
  });
});

describe("getDateRange", () => {
  it("returns correct number of dates", () => {
    const dates = getDateRange(new Date("2026-05-01"), 5);
    expect(dates).toHaveLength(5);
    expect(dates[0]).toBe("2026-05-01");
    expect(dates[4]).toBe("2026-05-05");
  });
});

describe("generateTimeSlots", () => {
  const weeklySchedule = [
    { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isAvailable: true }, // Monday
    { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", isAvailable: true }, // Tuesday
    { dayOfWeek: 0, startTime: "09:00", endTime: "17:00", isAvailable: false }, // Sunday - unavailable
  ];

  it("generates correct slots for a working day with no bookings", () => {
    // 2026-05-04 is a Monday
    const slots = generateTimeSlots(
      "2026-05-04",
      60, // 1 hour service
      weeklySchedule,
      [],
      [],
      30, // 30 min intervals
      1
    );
    // 09:00 to 17:00 with 60-min service, last slot at 16:00
    // Slots: 09:00, 09:30, 10:00, ..., 16:00
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].time).toBe("09:00");
    expect(slots[0].available).toBe(true);
    expect(slots[0].spotsRemaining).toBe(1);
    expect(slots[0].maxCapacity).toBe(1);
    // Last slot should be 16:00 (16:00 + 60min = 17:00 which is exactly endMinutes)
    const lastSlot = slots[slots.length - 1];
    expect(lastSlot.time).toBe("16:00");
  });

  it("returns empty array for unavailable day", () => {
    // 2026-05-03 is a Sunday
    const slots = generateTimeSlots(
      "2026-05-03",
      60,
      weeklySchedule,
      [],
      [],
      30,
      1
    );
    expect(slots).toHaveLength(0);
  });

  it("returns empty array for day with no schedule", () => {
    // 2026-05-07 is a Wednesday (no schedule defined)
    const slots = generateTimeSlots(
      "2026-05-07",
      60,
      weeklySchedule,
      [],
      [],
      30,
      1
    );
    expect(slots).toHaveLength(0);
  });

  it("marks slots as unavailable when booked (individual service)", () => {
    const bookings = [
      { bookingDate: "2026-05-04", bookingTime: "10:00", endTime: "11:00", status: "confirmed" },
    ];
    const slots = generateTimeSlots(
      "2026-05-04",
      60,
      weeklySchedule,
      [],
      bookings,
      30,
      1
    );
    // 10:00 slot should be unavailable (booking 10:00-11:00 overlaps with slot 10:00-11:00)
    const slot10 = slots.find(s => s.time === "10:00");
    expect(slot10?.available).toBe(false);
    expect(slot10?.bookingCount).toBe(1);
    expect(slot10?.spotsRemaining).toBe(0);

    // 09:00 should still be available
    const slot9 = slots.find(s => s.time === "09:00");
    expect(slot9?.available).toBe(true);
  });

  it("detects overlapping bookings (not just exact time match)", () => {
    const bookings = [
      { bookingDate: "2026-05-04", bookingTime: "10:00", endTime: "11:00", status: "confirmed" },
    ];
    const slots = generateTimeSlots(
      "2026-05-04",
      60,
      weeklySchedule,
      [],
      bookings,
      30,
      1
    );
    // 10:30 slot (10:30-11:30) overlaps with booking 10:00-11:00
    const slot1030 = slots.find(s => s.time === "10:30");
    expect(slot1030?.available).toBe(false);
    expect(slot1030?.bookingCount).toBe(1);

    // 09:30 slot (09:30-10:30) overlaps with booking 10:00-11:00
    const slot930 = slots.find(s => s.time === "09:30");
    expect(slot930?.available).toBe(false);
    expect(slot930?.bookingCount).toBe(1);

    // 11:00 slot (11:00-12:00) does NOT overlap with booking 10:00-11:00
    const slot11 = slots.find(s => s.time === "11:00");
    expect(slot11?.available).toBe(true);
    expect(slot11?.bookingCount).toBe(0);
  });

  it("supports group class capacity (multiple bookings per slot)", () => {
    const bookings = [
      { bookingDate: "2026-05-04", bookingTime: "10:00", endTime: "11:00", status: "confirmed" },
      { bookingDate: "2026-05-04", bookingTime: "10:00", endTime: "11:00", status: "confirmed" },
    ];
    // maxCapacity = 5 (group class with 5 spots)
    const slots = generateTimeSlots(
      "2026-05-04",
      60,
      weeklySchedule,
      [],
      bookings,
      30,
      5
    );
    const slot10 = slots.find(s => s.time === "10:00");
    expect(slot10?.available).toBe(true); // Still available, 2 of 5 spots taken
    expect(slot10?.bookingCount).toBe(2);
    expect(slot10?.maxCapacity).toBe(5);
    expect(slot10?.spotsRemaining).toBe(3);
  });

  it("marks group class slot as full when capacity reached", () => {
    const bookings = Array.from({ length: 3 }, () => ({
      bookingDate: "2026-05-04",
      bookingTime: "10:00",
      endTime: "11:00",
      status: "confirmed",
    }));
    // maxCapacity = 3
    const slots = generateTimeSlots(
      "2026-05-04",
      60,
      weeklySchedule,
      [],
      bookings,
      30,
      3
    );
    const slot10 = slots.find(s => s.time === "10:00");
    expect(slot10?.available).toBe(false);
    expect(slot10?.bookingCount).toBe(3);
    expect(slot10?.spotsRemaining).toBe(0);
  });

  it("ignores cancelled bookings", () => {
    const bookings = [
      { bookingDate: "2026-05-04", bookingTime: "10:00", endTime: "11:00", status: "cancelled" },
    ];
    const slots = generateTimeSlots(
      "2026-05-04",
      60,
      weeklySchedule,
      [],
      bookings,
      30,
      1
    );
    const slot10 = slots.find(s => s.time === "10:00");
    expect(slot10?.available).toBe(true);
    expect(slot10?.bookingCount).toBe(0);
  });

  it("uses override schedule instead of weekly schedule", () => {
    const overrides = [
      { overrideDate: "2026-05-04", startTime: "10:00", endTime: "14:00", isAvailable: true },
    ];
    const slots = generateTimeSlots(
      "2026-05-04",
      60,
      weeklySchedule,
      overrides,
      [],
      30,
      1
    );
    // Should use override hours 10:00-14:00 instead of weekly 09:00-17:00
    expect(slots[0].time).toBe("10:00");
    const lastSlot = slots[slots.length - 1];
    expect(lastSlot.time).toBe("13:00"); // 13:00 + 60min = 14:00
  });

  it("returns empty for blocked date override", () => {
    const overrides = [
      { overrideDate: "2026-05-04", startTime: null, endTime: null, isAvailable: false },
    ];
    const slots = generateTimeSlots(
      "2026-05-04",
      60,
      weeklySchedule,
      overrides,
      [],
      30,
      1
    );
    expect(slots).toHaveLength(0);
  });

  it("handles booking with durationMinutes instead of endTime", () => {
    const bookings = [
      { bookingDate: "2026-05-04", bookingTime: "10:00", durationMinutes: 90, status: "confirmed" },
    ];
    const slots = generateTimeSlots(
      "2026-05-04",
      60,
      weeklySchedule,
      [],
      bookings,
      30,
      1
    );
    // Booking is 10:00-11:30
    // 10:00 (10:00-11:00) overlaps with 10:00-11:30 -> unavailable
    const slot10 = slots.find(s => s.time === "10:00");
    expect(slot10?.available).toBe(false);
    // 10:30 (10:30-11:30) overlaps with 10:00-11:30 -> unavailable
    const slot1030 = slots.find(s => s.time === "10:30");
    expect(slot1030?.available).toBe(false);
    // 11:00 (11:00-12:00) overlaps with 10:00-11:30 -> unavailable
    const slot11 = slots.find(s => s.time === "11:00");
    expect(slot11?.available).toBe(false);
    // 11:30 (11:30-12:30) does NOT overlap with 10:00-11:30 -> available
    const slot1130 = slots.find(s => s.time === "11:30");
    expect(slot1130?.available).toBe(true);
  });
});

describe("isTimeSlotAvailable", () => {
  const weeklySchedule = [
    { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isAvailable: true },
  ];

  it("returns true for available slot", () => {
    const result = isTimeSlotAvailable(
      "2026-05-04",
      "09:00",
      60,
      weeklySchedule,
      [],
      [],
      1
    );
    expect(result).toBe(true);
  });

  it("returns false for booked slot", () => {
    const bookings = [
      { bookingDate: "2026-05-04", bookingTime: "09:00", endTime: "10:00", status: "confirmed" },
    ];
    const result = isTimeSlotAvailable(
      "2026-05-04",
      "09:00",
      60,
      weeklySchedule,
      [],
      bookings,
      1
    );
    expect(result).toBe(false);
  });

  it("returns true for group class with remaining capacity", () => {
    const bookings = [
      { bookingDate: "2026-05-04", bookingTime: "09:00", endTime: "10:00", status: "confirmed" },
    ];
    const result = isTimeSlotAvailable(
      "2026-05-04",
      "09:00",
      60,
      weeklySchedule,
      [],
      bookings,
      10 // 10 spots, only 1 taken
    );
    expect(result).toBe(true);
  });

  it("returns false for time not in schedule", () => {
    const result = isTimeSlotAvailable(
      "2026-05-04",
      "07:00", // Before schedule starts
      60,
      weeklySchedule,
      [],
      [],
      1
    );
    expect(result).toBe(false);
  });
});
