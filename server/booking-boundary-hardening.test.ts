import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";
import { resolveAuthoritativeBookingInterval } from "../shared/bookingIntervals";
import { generateTimeSlots } from "../shared/timeSlots";

const root = resolve(__dirname, "..");

describe("authoritative booking intervals", () => {
  it("ignores a shortened caller interval for fixed-duration services", () => {
    expect(resolveAuthoritativeBookingInterval({
      categoryId: 15,
      pricingModel: "fixed",
      serviceDurationMinutes: 600,
      startTime: "10:00",
      requestedEndTime: "10:30",
    })).toEqual({
      startTime: "10:00",
      endTime: "20:00",
      durationMinutes: 600,
      isCustomDuration: false,
    });
  });

  it("derives allowed hourly custom duration from start and end rather than a client duration field", () => {
    expect(resolveAuthoritativeBookingInterval({
      categoryId: 20,
      pricingModel: "hourly",
      serviceDurationMinutes: 60,
      startTime: "20:00",
      requestedEndTime: "02:00",
    })).toMatchObject({ endTime: "02:00", durationMinutes: 360, isCustomDuration: true });
  });
});

describe("adjacent-day conflict visibility", () => {
  it("blocks an early-morning start that overlaps a prior-day overnight booking", () => {
    const slots = generateTimeSlots(
      "2026-09-18",
      60,
      [{ dayOfWeek: 5, startTime: "00:00", endTime: "03:00", isAvailable: true }],
      [],
      [{
        serviceId: 1,
        bookingDate: "2026-09-17",
        bookingTime: "23:00",
        endTime: "01:00",
        durationMinutes: 120,
        status: "confirmed",
      }],
    );

    expect(slots.find((slot) => slot.time === "00:00")?.available).toBe(false);
    expect(slots.find((slot) => slot.time === "01:00")?.available).toBe(true);
  });

  it("blocks a group-class slot when another provider service overlaps", () => {
    const slots = generateTimeSlots(
      "2026-09-18",
      60,
      [{ dayOfWeek: 5, startTime: "09:00", endTime: "12:00", isAvailable: true }],
      [],
      [{ serviceId: 99, bookingDate: "2026-09-18", bookingTime: "09:30", endTime: "10:30", status: "confirmed" }],
      30,
      10,
      5,
    );
    expect(slots.find((slot) => slot.time === "09:00")?.available).toBe(false);
  });
});

describe("booking write boundary contracts", () => {
  const bookingRouter = readFileSync(resolve(root, "server/routers/bookingRouter.ts"), "utf8");
  const providerRouter = readFileSync(resolve(root, "server/routers/providerRouter.ts"), "utf8");
  const bookingDb = readFileSync(resolve(root, "server/db/bookings.ts"), "utf8");
  const widgetRouter = readFileSync(resolve(root, "server/widgetRouter.ts"), "utf8");
  const availabilityRouter = readFileSync(resolve(root, "server/routers/availabilityRouter.ts"), "utf8");
  const serviceDetail = readFileSync(resolve(root, "client/src/pages/ServiceDetail.tsx"), "utf8");

  it("routes every production booking writer through the atomic calendar guard", () => {
    expect(bookingRouter).not.toContain("await db.createBooking({");
    expect(providerRouter).not.toContain("await db.createBooking({");
    expect(bookingRouter.match(/createBookingWithCalendarGuard/g)?.length).toBe(3);
    expect(providerRouter).toContain("createBookingWithCalendarGuard");
    expect(bookingDb).toContain("db.transaction");
    expect(bookingDb).toContain("FOR UPDATE");
    expect(bookingDb).toContain("quote_requests WHERE id");
    expect(bookingDb).toContain("validUntil");
    expect(bookingDb).toContain("rescheduleSessionWithCalendarGuard");
    expect(bookingDb).toContain("updateBookingTimingWithCalendarGuard");
    expect(bookingRouter).not.toContain("await db.createSingleSession({");
    expect(bookingRouter).not.toContain("await db.updateBookingTiming(input.bookingId");
  });

  it("derives provider and interval server-side and applies policy to all booking types", () => {
    expect(bookingRouter).toContain("input.providerId !== service.providerId");
    expect(bookingRouter).toContain("resolveAuthoritativeBookingInterval");
    expect(bookingRouter.match(/evaluateBookingWindow\(/g)?.length).toBeGreaterThanOrEqual(3);
    expect(bookingRouter.match(/providerUser\.deletedAt/g)?.length).toBeGreaterThanOrEqual(5);
    expect(bookingRouter.match(/!category\?\.isActive/g)?.length).toBeGreaterThanOrEqual(5);
    expect(bookingRouter).toContain("calculateBookingEndTime(input.startTime, durationMinutes)");
  });

  it("includes service IDs, sessions, and adjacent dates in public and embedded occupancy", () => {
    expect(widgetRouter).toContain("serviceId: b.serviceId");
    expect(widgetRouter).toContain("getSessionsByDateRange");
    expect(widgetRouter).toContain("addCalendarDays(input.date, -1)");
    expect(availabilityRouter).toContain("getPublicTimeSlots");
    expect(availabilityRouter).toContain("return generateTimeSlots(");
    expect(serviceDetail).toContain("trpc.availability.getPublicTimeSlots.useQuery");
    expect(availabilityRouter).not.toContain("getPublicBookedSlots");
    expect(availabilityRouter).toContain("getSessionsByDateRange");
  });
});
