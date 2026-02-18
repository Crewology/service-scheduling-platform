import { describe, expect, it } from "vitest";
import { generateTimeSlots, isTimeSlotAvailable, formatTimeForDisplay } from "../shared/timeSlots";

describe("Time Slot Generation", () => {
  const weeklySchedule = [
    { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isAvailable: true }, // Monday
    { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", isAvailable: true }, // Tuesday
    { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", isAvailable: true }, // Wednesday
    { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", isAvailable: true }, // Thursday
    { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", isAvailable: true }, // Friday
    { dayOfWeek: 6, startTime: "10:00", endTime: "14:00", isAvailable: true }, // Saturday
    { dayOfWeek: 0, startTime: "00:00", endTime: "00:00", isAvailable: false }, // Sunday (closed)
  ];

  it("generates time slots for a regular weekday", () => {
    const date = "2026-02-23"; // Monday
    const slots = generateTimeSlots(date, 60, weeklySchedule, [], []);
    
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]?.time).toBe("09:00");
    expect(slots[slots.length - 1]?.time).toBe("16:00"); // Last slot that allows 60min service
    expect(slots.every(s => s.available)).toBe(true);
  });

  it("generates time slots with 30-minute intervals", () => {
    const date = "2026-02-23"; // Monday
    const slots = generateTimeSlots(date, 60, weeklySchedule, [], [], 30);
    
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]?.time).toBe("09:00");
    expect(slots[1]?.time).toBe("09:30");
    expect(slots[2]?.time).toBe("10:00");
  });

  it("returns empty array for unavailable day", () => {
    const date = "2026-02-22"; // Sunday (closed)
    const slots = generateTimeSlots(date, 60, weeklySchedule, [], []);
    
    expect(slots).toEqual([]);
  });

  it("applies date-specific override", () => {
    const date = "2026-02-23"; // Monday
    const overrides = [
      { overrideDate: "2026-02-23", startTime: "10:00", endTime: "15:00", isAvailable: true }
    ];
    const slots = generateTimeSlots(date, 60, weeklySchedule, overrides, []);
    
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]?.time).toBe("10:00"); // Override start time
    expect(slots[slots.length - 1]?.time).toBe("14:00"); // Override end time
  });

  it("marks day as unavailable with override", () => {
    const date = "2026-02-23"; // Monday
    const overrides = [
      { overrideDate: "2026-02-23", startTime: null, endTime: null, isAvailable: false }
    ];
    const slots = generateTimeSlots(date, 60, weeklySchedule, overrides, []);
    
    expect(slots).toEqual([]);
  });

  it("blocks already booked time slots", () => {
    const date = "2026-02-23"; // Monday
    const existingBookings = [
      { bookingDate: "2026-02-23", bookingTime: "10:00", status: "confirmed" },
      { bookingDate: "2026-02-23", bookingTime: "14:00", status: "pending" }
    ];
    const slots = generateTimeSlots(date, 60, weeklySchedule, [], existingBookings);
    
    const slot10am = slots.find(s => s.time === "10:00");
    const slot2pm = slots.find(s => s.time === "14:00");
    const slot9am = slots.find(s => s.time === "09:00");
    
    expect(slot10am?.available).toBe(false);
    expect(slot2pm?.available).toBe(false);
    expect(slot9am?.available).toBe(true);
  });

  it("does not block cancelled bookings", () => {
    const date = "2026-02-23"; // Monday
    const existingBookings = [
      { bookingDate: "2026-02-23", bookingTime: "10:00", status: "cancelled" },
      { bookingDate: "2026-02-23", bookingTime: "14:00", status: "refunded" }
    ];
    const slots = generateTimeSlots(date, 60, weeklySchedule, [], existingBookings);
    
    const slot10am = slots.find(s => s.time === "10:00");
    const slot2pm = slots.find(s => s.time === "14:00");
    
    expect(slot10am?.available).toBe(true);
    expect(slot2pm?.available).toBe(true);
  });

  it("respects service duration when generating slots", () => {
    const date = "2026-02-23"; // Monday
    const slots = generateTimeSlots(date, 120, weeklySchedule, [], []); // 2-hour service
    
    // Last slot should be 15:00 (allows 2 hours until 17:00)
    expect(slots[slots.length - 1]?.time).toBe("15:00");
  });

  it("handles different day schedules correctly", () => {
    const saturdayDate = "2026-02-28"; // Saturday
    const slots = generateTimeSlots(saturdayDate, 60, weeklySchedule, [], []);
    
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]?.time).toBe("10:00");
    expect(slots[slots.length - 1]?.time).toBe("13:00"); // Last slot for 60min service
  });
});

describe("Time Slot Availability Check", () => {
  const weeklySchedule = [
    { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isAvailable: true },
  ];

  it("returns true for available time slot", () => {
    const available = isTimeSlotAvailable(
      "2026-02-23",
      "10:00",
      60,
      weeklySchedule,
      [],
      []
    );
    
    expect(available).toBe(true);
  });

  it("returns false for booked time slot", () => {
    const existingBookings = [
      { bookingDate: "2026-02-23", bookingTime: "10:00", status: "confirmed" }
    ];
    const available = isTimeSlotAvailable(
      "2026-02-23",
      "10:00",
      60,
      weeklySchedule,
      [],
      existingBookings
    );
    
    expect(available).toBe(false);
  });

  it("returns false for time outside schedule", () => {
    const available = isTimeSlotAvailable(
      "2026-02-23",
      "18:00",
      60,
      weeklySchedule,
      [],
      []
    );
    
    expect(available).toBe(false);
  });
});

describe("Time Formatting", () => {
  it("formats morning time correctly", () => {
    expect(formatTimeForDisplay("09:00")).toBe("9:00 AM");
    expect(formatTimeForDisplay("09:30")).toBe("9:30 AM");
  });

  it("formats afternoon time correctly", () => {
    expect(formatTimeForDisplay("13:00")).toBe("1:00 PM");
    expect(formatTimeForDisplay("15:30")).toBe("3:30 PM");
  });

  it("formats noon correctly", () => {
    expect(formatTimeForDisplay("12:00")).toBe("12:00 PM");
  });

  it("formats midnight correctly", () => {
    expect(formatTimeForDisplay("00:00")).toBe("12:00 AM");
  });
});
