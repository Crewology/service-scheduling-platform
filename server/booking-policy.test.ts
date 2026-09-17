import { describe, expect, it } from "vitest";
import {
  evaluateBookingWindow,
  OLOGYCREW_BOOKING_TIME_ZONE,
  zonedDateTimeToUtc,
} from "../shared/bookingPolicy";
import { evaluateBookingConflict, generateTimeSlots } from "../shared/timeSlots";

describe("authoritative booking window", () => {
  const now = new Date("2026-09-17T14:00:00.000Z"); // 10:00 AM America/New_York

  it("uses the documented IANA timezone and enforces minimum advance notice", () => {
    const tooSoon = evaluateBookingWindow({
      bookingDate: "2026-09-18",
      startTime: "09:00",
      minAdvanceBookingHours: 24,
      maxAdvanceBookingDays: 90,
      now,
    });
    const allowed = evaluateBookingWindow({
      bookingDate: "2026-09-18",
      startTime: "10:00",
      minAdvanceBookingHours: 24,
      maxAdvanceBookingDays: 90,
      now,
    });

    expect(tooSoon).toMatchObject({ allowed: false, code: "too_soon", timeZone: OLOGYCREW_BOOKING_TIME_ZONE });
    expect(allowed).toMatchObject({ allowed: true, timeZone: OLOGYCREW_BOOKING_TIME_ZONE });
  });

  it("enforces the service booking horizon", () => {
    expect(evaluateBookingWindow({
      bookingDate: "2026-12-17",
      startTime: "12:00",
      minAdvanceBookingHours: 0,
      maxAdvanceBookingDays: 90,
      now,
    })).toMatchObject({ allowed: false, code: "too_far" });
  });

  it("converts marketplace wall-clock times correctly and rejects nonexistent DST times", () => {
    expect(zonedDateTimeToUtc("2026-09-21", "10:00")?.toISOString()).toBe("2026-09-21T14:00:00.000Z");
    expect(zonedDateTimeToUtc("2026-03-08", "02:30")).toBeNull();
  });
});

describe("authoritative booking conflicts", () => {
  it("blocks a long-service start when any part of its full duration overlaps", () => {
    const slots = generateTimeSlots(
      "2026-02-23",
      240,
      [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isAvailable: true }],
      [],
      [{ bookingDate: "2026-02-23", bookingTime: "10:00", endTime: "11:00", status: "confirmed" }],
    );

    expect(slots.find((slot) => slot.time === "09:00")?.available).toBe(false);
  });

  it("never treats a non-group service as multi-capacity", () => {
    const result = evaluateBookingConflict({
      startTime: "09:00",
      endTime: "10:00",
      durationMinutes: 60,
      existingBookings: [{ bookingDate: "2026-02-23", bookingTime: "09:30", endTime: "10:30", status: "confirmed" }],
      isGroupClass: false,
      maxCapacity: 8,
      serviceId: 100,
    });

    expect(result).toEqual({ available: false, bookingCount: 1, maxCapacity: 1, spotsRemaining: 0 });
  });

  it("allows capacity sharing only when every overlapping booking is the same class and exact start", () => {
    const result = evaluateBookingConflict({
      startTime: "09:00",
      durationMinutes: 60,
      existingBookings: [
        { serviceId: 100, bookingDate: "2026-02-23", bookingTime: "09:00", status: "confirmed" },
        { serviceId: 200, bookingDate: "2026-02-23", bookingTime: "09:00", status: "confirmed" },
      ],
      isGroupClass: true,
      maxCapacity: 2,
      serviceId: 100,
    });

    expect(result).toEqual({ available: false, bookingCount: 2, maxCapacity: 2, spotsRemaining: 0 });
  });
});
