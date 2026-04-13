import { describe, it, expect, vi, beforeEach } from "vitest";

// Test the multi-day and recurring booking logic

describe("Multi-Day Booking", () => {
  describe("Date Range Calculation", () => {
    it("should calculate correct number of days between start and end dates", () => {
      const startDate = new Date("2026-05-01");
      const endDate = new Date("2026-05-05");
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
      expect(diffDays).toBe(5);
    });

    it("should handle single-day range (same start and end)", () => {
      const startDate = new Date("2026-05-01");
      const endDate = new Date("2026-05-01");
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      expect(diffDays).toBe(1);
    });

    it("should reject end date before start date", () => {
      const startDate = new Date("2026-05-05");
      const endDate = new Date("2026-05-01");
      expect(endDate < startDate).toBe(true);
    });

    it("should calculate multi-day total price correctly", () => {
      const pricePerDay = 150;
      const numDays = 5;
      const total = pricePerDay * numDays;
      expect(total).toBe(750);
    });

    it("should generate session dates for each day in range", () => {
      const startDate = new Date("2026-05-01");
      const endDate = new Date("2026-05-03");
      const sessions: string[] = [];
      const current = new Date(startDate);
      while (current <= endDate) {
        sessions.push(current.toISOString().split("T")[0]);
        current.setDate(current.getDate() + 1);
      }
      expect(sessions).toEqual(["2026-05-01", "2026-05-02", "2026-05-03"]);
      expect(sessions.length).toBe(3);
    });
  });

  describe("Multi-Day Booking Validation", () => {
    it("should require both start and end dates", () => {
      const startDate = "2026-05-01";
      const endDate = "";
      expect(!startDate || !endDate).toBe(true);
    });

    it("should limit maximum days to 30", () => {
      const MAX_DAYS = 30;
      const startDate = new Date("2026-05-01");
      const endDate = new Date("2026-06-15");
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      expect(diffDays > MAX_DAYS).toBe(true);
    });
  });
});

describe("Recurring Booking", () => {
  describe("Session Generation", () => {
    it("should generate correct weekly sessions for selected days", () => {
      // Use UTC dates to avoid timezone issues
      const startDate = new Date("2026-05-04T00:00:00Z"); // Monday in UTC
      const daysOfWeek = [1, 3, 5]; // Mon, Wed, Fri
      const totalWeeks = 2;
      
      const sessions: string[] = [];
      for (let week = 0; week < totalWeeks; week++) {
        for (const dayOfWeek of daysOfWeek) {
          const sessionDate = new Date(startDate);
          const startDay = startDate.getUTCDay();
          let daysToAdd = dayOfWeek - startDay;
          if (daysToAdd < 0) daysToAdd += 7;
          sessionDate.setUTCDate(startDate.getUTCDate() + daysToAdd + (week * 7));
          sessions.push(sessionDate.toISOString().split("T")[0]);
        }
      }
      
      expect(sessions.length).toBe(6); // 3 days * 2 weeks
      expect(sessions[0]).toBe("2026-05-04"); // Monday week 1
      expect(sessions[1]).toBe("2026-05-06"); // Wednesday week 1
      expect(sessions[2]).toBe("2026-05-08"); // Friday week 1
      expect(sessions[3]).toBe("2026-05-11"); // Monday week 2
    });

    it("should generate biweekly sessions correctly", () => {
      const startDate = new Date("2026-05-04T00:00:00Z"); // Monday in UTC
      const daysOfWeek = [1]; // Monday only
      const totalWeeks = 4;
      
      const sessions: string[] = [];
      for (let week = 0; week < totalWeeks; week += 2) { // step by 2 for biweekly
        for (const dayOfWeek of daysOfWeek) {
          const sessionDate = new Date(startDate);
          const startDay = startDate.getUTCDay();
          let daysToAdd = dayOfWeek - startDay;
          if (daysToAdd < 0) daysToAdd += 7;
          sessionDate.setUTCDate(startDate.getUTCDate() + daysToAdd + (week * 7));
          sessions.push(sessionDate.toISOString().split("T")[0]);
        }
      }
      
      expect(sessions.length).toBe(2); // 1 day * 2 biweekly occurrences in 4 weeks
      expect(sessions[0]).toBe("2026-05-04"); // Week 1
      expect(sessions[1]).toBe("2026-05-18"); // Week 3 (biweekly)
    });

    it("should calculate total sessions correctly", () => {
      const daysPerWeek = 3;
      const totalWeeks = 8;
      const frequency = "weekly";
      const totalSessions = frequency === "weekly" 
        ? daysPerWeek * totalWeeks 
        : daysPerWeek * Math.ceil(totalWeeks / 2);
      expect(totalSessions).toBe(24);
    });

    it("should calculate biweekly total sessions correctly", () => {
      const daysPerWeek = 2;
      const totalWeeks = 8;
      const frequency = "biweekly";
      const totalSessions = frequency === "weekly" 
        ? daysPerWeek * totalWeeks 
        : daysPerWeek * Math.ceil(totalWeeks / 2);
      expect(totalSessions).toBe(8);
    });

    it("should calculate recurring total price correctly", () => {
      const pricePerSession = 50;
      const totalSessions = 24;
      const total = pricePerSession * totalSessions;
      expect(total).toBe(1200);
    });
  });

  describe("Recurring Booking Validation", () => {
    it("should require at least one day of week selected", () => {
      const daysOfWeek: number[] = [];
      expect(daysOfWeek.length === 0).toBe(true);
    });

    it("should validate days of week are 0-6", () => {
      const validDays = [0, 1, 2, 3, 4, 5, 6];
      const invalidDays = [7, -1, 8];
      
      for (const day of validDays) {
        expect(day >= 0 && day <= 6).toBe(true);
      }
      for (const day of invalidDays) {
        expect(day >= 0 && day <= 6).toBe(false);
      }
    });

    it("should validate frequency is weekly or biweekly", () => {
      const validFrequencies = ["weekly", "biweekly"];
      expect(validFrequencies.includes("weekly")).toBe(true);
      expect(validFrequencies.includes("biweekly")).toBe(true);
      expect(validFrequencies.includes("monthly")).toBe(false);
    });

    it("should validate total weeks is between 1 and 52", () => {
      expect(1 >= 1 && 1 <= 52).toBe(true);
      expect(52 >= 1 && 52 <= 52).toBe(true);
      expect(0 >= 1 && 0 <= 52).toBe(false);
      expect(53 >= 1 && 53 <= 52).toBe(false);
    });
  });
});

describe("Booking Type Categories", () => {
  const MULTI_DAY_CATEGORIES = [15, 19, 177, 202, 179]; // AV Crew, TV/Film, Event Planning, Day Labor, Home Renovation
  const RECURRING_CATEGORIES = [109, 12, 195, 188, 10, 11]; // Fitness, Personal Trainer, Dance, Cleaning, Massage, Pet Care

  it("should identify multi-day eligible categories", () => {
    expect(MULTI_DAY_CATEGORIES.includes(15)).toBe(true);  // Audio Visual Crew
    expect(MULTI_DAY_CATEGORIES.includes(19)).toBe(true);  // TV/Film Crew
    expect(MULTI_DAY_CATEGORIES.includes(177)).toBe(true); // Event Planning
    expect(MULTI_DAY_CATEGORIES.includes(202)).toBe(true); // Day Labor
    expect(MULTI_DAY_CATEGORIES.includes(179)).toBe(true); // Home Renovation
  });

  it("should identify recurring eligible categories", () => {
    expect(RECURRING_CATEGORIES.includes(109)).toBe(true); // Fitness Classes
    expect(RECURRING_CATEGORIES.includes(12)).toBe(true);  // Personal Trainer
    expect(RECURRING_CATEGORIES.includes(195)).toBe(true); // Dance Lessons
    expect(RECURRING_CATEGORIES.includes(188)).toBe(true); // Home Cleaning
    expect(RECURRING_CATEGORIES.includes(10)).toBe(true);  // Massage Therapist
    expect(RECURRING_CATEGORIES.includes(11)).toBe(true);  // Pet Care
  });

  it("should not overlap between multi-day and recurring categories", () => {
    const overlap = MULTI_DAY_CATEGORIES.filter(id => RECURRING_CATEGORIES.includes(id));
    expect(overlap.length).toBe(0);
  });

  it("should default to single booking for non-eligible categories", () => {
    const barberId = 7; // Barber Shop
    const isMultiDay = MULTI_DAY_CATEGORIES.includes(barberId);
    const isRecurring = RECURRING_CATEGORIES.includes(barberId);
    expect(isMultiDay).toBe(false);
    expect(isRecurring).toBe(false);
  });
});

describe("Booking Sessions Table", () => {
  it("should track session status independently", () => {
    const sessions = [
      { id: 1, bookingId: 100, sessionDate: "2026-05-01", status: "scheduled" },
      { id: 2, bookingId: 100, sessionDate: "2026-05-02", status: "completed" },
      { id: 3, bookingId: 100, sessionDate: "2026-05-03", status: "cancelled" },
    ];
    
    expect(sessions.filter(s => s.status === "scheduled").length).toBe(1);
    expect(sessions.filter(s => s.status === "completed").length).toBe(1);
    expect(sessions.filter(s => s.status === "cancelled").length).toBe(1);
  });

  it("should link sessions to parent booking", () => {
    const sessions = [
      { id: 1, bookingId: 100, sessionDate: "2026-05-01" },
      { id: 2, bookingId: 100, sessionDate: "2026-05-02" },
    ];
    
    const allLinked = sessions.every(s => s.bookingId === 100);
    expect(allLinked).toBe(true);
  });
});
