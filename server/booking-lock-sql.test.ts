import { describe, expect, it } from "vitest";
import {
  BookingReservationConflictError,
  QuoteConversionConflictError,
  createBookingWithCalendarGuard,
  rescheduleSessionWithCalendarGuard,
  updateBookingTimingWithCalendarGuard,
} from "./db/bookings";

const missingId = 2_000_000_000;

describe("atomic booking lock SQL", () => {
  it("executes the physical quoteStatus lock query before rejecting a missing quote", async () => {
    await expect(createBookingWithCalendarGuard({
      booking: {
        bookingNumber: "TEST-LOCK-MISSING-QUOTE",
        customerId: missingId,
        providerId: missingId,
        serviceId: missingId,
        bookingDate: "2027-06-15",
        startTime: "10:00",
        endTime: "11:00",
        durationMinutes: 60,
        status: "pending",
        subtotal: "0.00",
        platformFee: "0.00",
        totalAmount: "0.00",
        depositAmount: "0.00",
        remainingAmount: "0.00",
      },
      isGroupClass: false,
      maxCapacity: 1,
      quoteId: missingId,
    })).rejects.toBeInstanceOf(QuoteConversionConflictError);
  });

  it("executes the booking-session lock query before rejecting a missing session", async () => {
    await expect(rescheduleSessionWithCalendarGuard({
      bookingId: missingId,
      sessionId: missingId,
      providerId: missingId,
      serviceId: missingId,
      originalDate: "2027-06-15",
      newDate: "2027-06-16",
      newStartTime: "10:00",
      newEndTime: "11:00",
      sessionNumber: 1,
      isGroupClass: false,
      maxCapacity: 1,
    })).rejects.toBeInstanceOf(BookingReservationConflictError);
  });

  it("executes the booking lock query before rejecting a missing timing edit", async () => {
    await expect(updateBookingTimingWithCalendarGuard({
      bookingId: missingId,
      providerId: missingId,
      serviceId: missingId,
      bookingDate: "2027-06-15",
      startTime: "10:00",
      endTime: "11:00",
      isGroupClass: false,
      maxCapacity: 1,
      values: {
        startTime: "10:00",
        endTime: "11:00",
        durationMinutes: 60,
        subtotal: "0.00",
        platformFee: "0.00",
        totalAmount: "0.00",
        depositAmount: "0.00",
        remainingAmount: "0.00",
      },
    })).rejects.toBeInstanceOf(BookingReservationConflictError);
  });
});
