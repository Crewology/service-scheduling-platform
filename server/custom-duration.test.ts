import { describe, it, expect } from "vitest";

/**
 * Tests for the custom duration calculation logic used in DJ & Music services.
 * These test the same math that runs in the frontend ServiceDetail component.
 */

function calculateCustomDurationMinutes(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  let startTotal = startH * 60 + startM;
  let endTotal = endH * 60 + endM;
  // Handle overnight (e.g., 10 PM to 2 AM)
  if (endTotal <= startTotal) endTotal += 24 * 60;
  return endTotal - startTotal;
}

function calculateCustomDurationPrice(durationMinutes: number, hourlyRate: number): number {
  if (durationMinutes <= 0 || hourlyRate <= 0) return 0;
  return (hourlyRate * durationMinutes) / 60;
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
}

describe("Custom Duration Calculations", () => {
  describe("calculateCustomDurationMinutes", () => {
    it("should calculate duration for same-day times", () => {
      expect(calculateCustomDurationMinutes("18:00", "22:00")).toBe(240); // 4 hours
      expect(calculateCustomDurationMinutes("09:00", "12:30")).toBe(210); // 3.5 hours
      expect(calculateCustomDurationMinutes("20:00", "23:00")).toBe(180); // 3 hours
    });

    it("should handle overnight durations (end time < start time)", () => {
      expect(calculateCustomDurationMinutes("22:00", "02:00")).toBe(240); // 4 hours overnight
      expect(calculateCustomDurationMinutes("23:00", "01:00")).toBe(120); // 2 hours overnight
      expect(calculateCustomDurationMinutes("21:00", "03:00")).toBe(360); // 6 hours overnight
    });

    it("should handle exact hour boundaries", () => {
      expect(calculateCustomDurationMinutes("18:00", "19:00")).toBe(60); // 1 hour
      expect(calculateCustomDurationMinutes("20:00", "20:30")).toBe(30); // 30 min
    });

    it("should return 0 for same start and end time (treated as overnight = 24hrs)", () => {
      // When end equals start, it wraps to 24 hours
      expect(calculateCustomDurationMinutes("18:00", "18:00")).toBe(1440);
    });
  });

  describe("calculateCustomDurationPrice", () => {
    it("should calculate price based on hourly rate and duration", () => {
      // $100/hr for 4 hours = $400
      expect(calculateCustomDurationPrice(240, 100)).toBe(400);
      // $75/hr for 3 hours = $225
      expect(calculateCustomDurationPrice(180, 75)).toBe(225);
      // $150/hr for 2.5 hours = $375
      expect(calculateCustomDurationPrice(150, 150)).toBe(375);
    });

    it("should handle fractional hours correctly", () => {
      // $100/hr for 1.5 hours (90 min) = $150
      expect(calculateCustomDurationPrice(90, 100)).toBe(150);
      // $80/hr for 45 min = $60
      expect(calculateCustomDurationPrice(45, 80)).toBe(60);
    });

    it("should return 0 for invalid inputs", () => {
      expect(calculateCustomDurationPrice(0, 100)).toBe(0);
      expect(calculateCustomDurationPrice(-60, 100)).toBe(0);
      expect(calculateCustomDurationPrice(120, 0)).toBe(0);
      expect(calculateCustomDurationPrice(120, -50)).toBe(0);
    });
  });

  describe("calculateEndTime", () => {
    it("should calculate end time from start time and duration", () => {
      expect(calculateEndTime("18:00", 240)).toBe("22:00"); // 6 PM + 4 hrs = 10 PM
      expect(calculateEndTime("20:00", 180)).toBe("23:00"); // 8 PM + 3 hrs = 11 PM
      expect(calculateEndTime("09:30", 90)).toBe("11:00"); // 9:30 AM + 1.5 hrs = 11 AM
    });

    it("should wrap past midnight correctly", () => {
      expect(calculateEndTime("22:00", 240)).toBe("02:00"); // 10 PM + 4 hrs = 2 AM
      expect(calculateEndTime("23:00", 120)).toBe("01:00"); // 11 PM + 2 hrs = 1 AM
    });
  });

  describe("Integration: DJ booking custom duration flow", () => {
    it("should calculate correct price for a 4-hour DJ set at $100/hr", () => {
      const startTime = "20:00";
      const endTime = "00:00"; // midnight
      const hourlyRate = 100;

      const durationMinutes = calculateCustomDurationMinutes(startTime, endTime);
      expect(durationMinutes).toBe(240); // 4 hours

      const price = calculateCustomDurationPrice(durationMinutes, hourlyRate);
      expect(price).toBe(400); // $400

      const calculatedEnd = calculateEndTime(startTime, durationMinutes);
      expect(calculatedEnd).toBe("00:00");
    });

    it("should calculate correct price for a 6-hour event at $150/hr", () => {
      const startTime = "18:00";
      const endTime = "00:00"; // midnight
      const hourlyRate = 150;

      const durationMinutes = calculateCustomDurationMinutes(startTime, endTime);
      expect(durationMinutes).toBe(360); // 6 hours

      const price = calculateCustomDurationPrice(durationMinutes, hourlyRate);
      expect(price).toBe(900); // $900
    });

    it("should calculate correct price for a late-night 3-hour set at $200/hr", () => {
      const startTime = "23:00";
      const endTime = "02:00"; // 2 AM
      const hourlyRate = 200;

      const durationMinutes = calculateCustomDurationMinutes(startTime, endTime);
      expect(durationMinutes).toBe(180); // 3 hours

      const price = calculateCustomDurationPrice(durationMinutes, hourlyRate);
      expect(price).toBe(600); // $600
    });
  });
});
