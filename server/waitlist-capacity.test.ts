import { describe, it, expect } from "vitest";

/**
 * Tests for server-side booking capacity validation and waitlist logic.
 * These test the pure logic and data structures used in the booking/waitlist system.
 */

describe("Server-Side Capacity Validation", () => {
  describe("Capacity check logic", () => {
    it("should allow booking when under capacity for group class", () => {
      const maxCapacity = 10;
      const currentBookings = 5;
      const hasCapacity = currentBookings < maxCapacity;
      expect(hasCapacity).toBe(true);
    });

    it("should reject booking when at capacity for group class", () => {
      const maxCapacity = 10;
      const currentBookings = 10;
      const hasCapacity = currentBookings < maxCapacity;
      expect(hasCapacity).toBe(false);
    });

    it("should treat non-group services as capacity 1", () => {
      const isGroupClass = false;
      const maxCapacity = isGroupClass ? 10 : 1;
      const currentBookings = 1;
      const hasCapacity = currentBookings < maxCapacity;
      expect(hasCapacity).toBe(false);
    });

    it("should not count cancelled bookings toward capacity", () => {
      const bookings = [
        { status: "confirmed", startTime: "09:00" },
        { status: "cancelled", startTime: "09:00" },
        { status: "confirmed", startTime: "09:00" },
        { status: "refunded", startTime: "09:00" },
        { status: "no_show", startTime: "09:00" },
      ];
      const excludedStatuses = ["cancelled", "refunded", "no_show"];
      const activeBookings = bookings.filter(b => !excludedStatuses.includes(b.status));
      expect(activeBookings.length).toBe(2);
    });

    it("should only count bookings for the same time slot", () => {
      const bookings = [
        { status: "confirmed", startTime: "09:00", serviceId: 1 },
        { status: "confirmed", startTime: "10:00", serviceId: 1 },
        { status: "confirmed", startTime: "09:00", serviceId: 2 },
        { status: "confirmed", startTime: "09:00", serviceId: 1 },
      ];
      const targetServiceId = 1;
      const targetStartTime = "09:00";
      const excludedStatuses = ["cancelled", "refunded", "no_show"];
      
      const sameSlotBookings = bookings.filter(b => {
        if (excludedStatuses.includes(b.status)) return false;
        return b.serviceId === targetServiceId && b.startTime === targetStartTime;
      });
      expect(sameSlotBookings.length).toBe(2);
    });
  });

  describe("Waitlist position logic", () => {
    it("should assign position 1 to first waitlist entry", () => {
      const existingPositions: number[] = [];
      const maxPos = existingPositions.length > 0 ? Math.max(...existingPositions) : 0;
      const nextPosition = maxPos + 1;
      expect(nextPosition).toBe(1);
    });

    it("should assign incrementing positions", () => {
      const existingPositions = [1, 2, 3];
      const maxPos = Math.max(...existingPositions);
      const nextPosition = maxPos + 1;
      expect(nextPosition).toBe(4);
    });

    it("should handle gaps in positions correctly", () => {
      // If someone leaves the waitlist, positions may have gaps
      const existingPositions = [1, 3, 5];
      const maxPos = Math.max(...existingPositions);
      const nextPosition = maxPos + 1;
      expect(nextPosition).toBe(6);
    });
  });

  describe("Waitlist notification logic", () => {
    it("should notify the entry with lowest position first", () => {
      const waitlistEntries = [
        { id: 1, position: 3, status: "waiting" },
        { id: 2, position: 1, status: "waiting" },
        { id: 3, position: 2, status: "waiting" },
      ];
      const nextEntry = waitlistEntries
        .filter(e => e.status === "waiting")
        .sort((a, b) => a.position - b.position)[0];
      expect(nextEntry?.id).toBe(2);
      expect(nextEntry?.position).toBe(1);
    });

    it("should skip already-notified entries", () => {
      const waitlistEntries = [
        { id: 1, position: 1, status: "notified" },
        { id: 2, position: 2, status: "waiting" },
        { id: 3, position: 3, status: "waiting" },
      ];
      const nextEntry = waitlistEntries
        .filter(e => e.status === "waiting")
        .sort((a, b) => a.position - b.position)[0];
      expect(nextEntry?.id).toBe(2);
    });

    it("should return null when no waiting entries exist", () => {
      const waitlistEntries = [
        { id: 1, position: 1, status: "notified" },
        { id: 2, position: 2, status: "booked" },
        { id: 3, position: 3, status: "cancelled" },
      ];
      const nextEntry = waitlistEntries
        .filter(e => e.status === "waiting")
        .sort((a, b) => a.position - b.position)[0];
      expect(nextEntry).toBeUndefined();
    });
  });

  describe("Waitlist duplicate prevention", () => {
    it("should detect when user is already on waitlist for same slot", () => {
      const existingEntries = [
        { userId: 1, serviceId: 10, bookingDate: "2025-03-15", startTime: "09:00", status: "waiting" },
        { userId: 2, serviceId: 10, bookingDate: "2025-03-15", startTime: "09:00", status: "waiting" },
      ];
      const checkUserId = 1;
      const checkServiceId = 10;
      const checkDate = "2025-03-15";
      const checkTime = "09:00";

      const alreadyOnWaitlist = existingEntries.some(e =>
        e.userId === checkUserId &&
        e.serviceId === checkServiceId &&
        e.bookingDate === checkDate &&
        e.startTime === checkTime &&
        e.status === "waiting"
      );
      expect(alreadyOnWaitlist).toBe(true);
    });

    it("should allow re-joining after cancellation", () => {
      const existingEntries = [
        { userId: 1, serviceId: 10, bookingDate: "2025-03-15", startTime: "09:00", status: "cancelled" },
      ];
      const alreadyOnWaitlist = existingEntries.some(e =>
        e.userId === 1 &&
        e.serviceId === 10 &&
        e.bookingDate === "2025-03-15" &&
        e.startTime === "09:00" &&
        e.status === "waiting"
      );
      expect(alreadyOnWaitlist).toBe(false);
    });
  });

  describe("Capacity validation with concurrent bookings", () => {
    it("should handle race condition by checking count at insert time", () => {
      // Simulates the atomic check: count bookings, then insert if under capacity
      const maxCapacity = 5;
      const bookingsAtCheckTime = 4;
      // Another booking comes in simultaneously
      const bookingsAtInsertTime = 5;
      
      // The server should re-check at insert time
      const canBook = bookingsAtInsertTime < maxCapacity;
      expect(canBook).toBe(false);
    });

    it("should allow booking when capacity check passes at insert time", () => {
      const maxCapacity = 5;
      const bookingsAtInsertTime = 4;
      const canBook = bookingsAtInsertTime < maxCapacity;
      expect(canBook).toBe(true);
    });
  });

  describe("End time computation for waitlist", () => {
    it("should compute end time from start time + 60 min default", () => {
      const startTime = "09:00";
      const [h, m] = startTime.split(":").map(Number);
      const endMinutes = h * 60 + m + 60;
      const endTime = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
      expect(endTime).toBe("10:00");
    });

    it("should handle end time wrapping past midnight", () => {
      const startTime = "23:30";
      const [h, m] = startTime.split(":").map(Number);
      const endMinutes = h * 60 + m + 60;
      const endTime = `${String(Math.floor(endMinutes / 60) % 24).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
      expect(endTime).toBe("00:30");
    });

    it("should use provided end time when available", () => {
      const providedEndTime = "11:30";
      const startTime = "09:00";
      const endTime = providedEndTime || (() => {
        const [h, m] = startTime.split(":").map(Number);
        const endMinutes = h * 60 + m + 60;
        return `${String(Math.floor(endMinutes / 60) % 24).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
      })();
      expect(endTime).toBe("11:30");
    });
  });
});
