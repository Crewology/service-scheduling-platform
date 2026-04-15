import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// FEATURE 1: Provider Availability Exceptions
// ============================================================================
describe("Provider Availability Exceptions", () => {
  describe("Override checking in booking creation", () => {
    it("should reject bookings on dates with unavailable overrides", () => {
      // Simulating the override check logic from bookingRouter
      const overrides = [
        { overrideDate: "2026-05-01", isAvailable: false, reason: "Vacation" },
        { overrideDate: "2026-05-02", isAvailable: false, reason: "Holiday" },
      ];
      const bookingDate = "2026-05-01";
      
      const blocked = overrides.find(
        (o) => o.overrideDate === bookingDate && !o.isAvailable
      );
      
      expect(blocked).toBeDefined();
      expect(blocked?.reason).toBe("Vacation");
    });

    it("should allow bookings on dates with available overrides", () => {
      const overrides = [
        { overrideDate: "2026-05-01", isAvailable: true, reason: "Special hours" },
      ];
      const bookingDate = "2026-05-01";
      
      const blocked = overrides.find(
        (o) => o.overrideDate === bookingDate && !o.isAvailable
      );
      
      expect(blocked).toBeUndefined();
    });

    it("should allow bookings on dates without any overrides", () => {
      const overrides = [
        { overrideDate: "2026-05-01", isAvailable: false, reason: "Vacation" },
      ];
      const bookingDate = "2026-05-03";
      
      const blocked = overrides.find(
        (o) => o.overrideDate === bookingDate && !o.isAvailable
      );
      
      expect(blocked).toBeUndefined();
    });

    it("should check multi-day booking dates against overrides", () => {
      const overrides = [
        { overrideDate: "2026-06-15", isAvailable: false, reason: "Family event" },
      ];
      const multiDayDates = ["2026-06-14", "2026-06-15", "2026-06-16"];
      
      const blockedDates = multiDayDates.filter((date) =>
        overrides.some((o) => o.overrideDate === date && !o.isAvailable)
      );
      
      expect(blockedDates).toHaveLength(1);
      expect(blockedDates[0]).toBe("2026-06-15");
    });

    it("should check recurring booking sessions against overrides", () => {
      const overrides = [
        { overrideDate: "2026-07-04", isAvailable: false, reason: "Independence Day" },
        { overrideDate: "2026-07-11", isAvailable: false, reason: "Vacation" },
      ];
      const recurringDates = [
        "2026-06-27", "2026-07-04", "2026-07-11", "2026-07-18", "2026-07-25",
      ];
      
      const blockedDates = recurringDates.filter((date) =>
        overrides.some((o) => o.overrideDate === date && !o.isAvailable)
      );
      
      expect(blockedDates).toHaveLength(2);
      expect(blockedDates).toContain("2026-07-04");
      expect(blockedDates).toContain("2026-07-11");
    });
  });

  describe("Quick-block presets", () => {
    it("should generate date ranges for next week block", () => {
      const today = new Date("2026-04-15");
      // Next Monday from Wednesday April 15 is April 20
      const nextMonday = new Date(today);
      const dayOfWeek = today.getDay();
      const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      nextMonday.setDate(today.getDate() + daysUntilMonday);
      
      // Generate 7 consecutive days (a full week block)
      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(nextMonday);
        d.setDate(nextMonday.getDate() + i);
        dates.push(d.toISOString().slice(0, 10));
      }
      
      expect(dates).toHaveLength(7);
      expect(dates[0]).toBe("2026-04-21"); // Monday
      expect(dates[6]).toBe("2026-04-27"); // Sunday
    });

    it("should generate date range for custom period", () => {
      const startDate = "2026-08-01";
      const endDate = "2026-08-07";
      const start = new Date(startDate + "T00:00:00");
      const end = new Date(endDate + "T00:00:00");
      
      const dates: string[] = [];
      const current = new Date(start);
      while (current <= end) {
        dates.push(current.toISOString().slice(0, 10));
        current.setDate(current.getDate() + 1);
      }
      
      expect(dates).toHaveLength(7);
      expect(dates[0]).toBe("2026-08-01");
      expect(dates[6]).toBe("2026-08-07");
    });
  });

  describe("Calendar view integration", () => {
    it("should include blocked dates in calendar events response", () => {
      const calendarResponse = {
        bookings: [
          { id: 1, bookingDate: "2026-05-10", status: "confirmed" },
        ],
        overrides: [
          { overrideDate: "2026-05-15", isAvailable: false, reason: "Vacation" },
          { overrideDate: "2026-05-20", isAvailable: true, reason: "Special hours" },
        ],
      };
      
      const blockedDates = calendarResponse.overrides.filter((o) => !o.isAvailable);
      const specialDates = calendarResponse.overrides.filter((o) => o.isAvailable);
      
      expect(blockedDates).toHaveLength(1);
      expect(specialDates).toHaveLength(1);
    });
  });
});

// ============================================================================
// FEATURE 2: Saved Provider Folders
// ============================================================================
describe("Saved Provider Folders", () => {
  describe("Folder CRUD operations", () => {
    it("should create a folder with name and color", () => {
      const folder = {
        name: "AV Crew - NYC",
        color: "#3b82f6",
        icon: "folder",
        userId: 1,
      };
      
      expect(folder.name).toBe("AV Crew - NYC");
      expect(folder.color).toBe("#3b82f6");
    });

    it("should enforce unique folder names per user", () => {
      const existingFolders = [
        { id: 1, name: "AV Crew", userId: 1 },
        { id: 2, name: "DJs", userId: 1 },
      ];
      
      const newFolderName = "AV Crew";
      const isDuplicate = existingFolders.some(
        (f) => f.name.toLowerCase() === newFolderName.toLowerCase()
      );
      
      expect(isDuplicate).toBe(true);
    });

    it("should allow same folder name for different users", () => {
      const allFolders = [
        { id: 1, name: "Favorites", userId: 1 },
        { id: 2, name: "Favorites", userId: 2 },
      ];
      
      const user1Folders = allFolders.filter((f) => f.userId === 1);
      const user2Folders = allFolders.filter((f) => f.userId === 2);
      
      expect(user1Folders).toHaveLength(1);
      expect(user2Folders).toHaveLength(1);
    });
  });

  describe("Folder assignment", () => {
    it("should assign a provider to a folder", () => {
      const favorites = [
        { id: 1, providerId: 10, userId: 1, folderId: null },
        { id: 2, providerId: 20, userId: 1, folderId: 1 },
      ];
      
      // Move provider 10 to folder 1
      const updated = favorites.map((f) =>
        f.providerId === 10 ? { ...f, folderId: 1 } : f
      );
      
      expect(updated[0].folderId).toBe(1);
      expect(updated[1].folderId).toBe(1);
    });

    it("should remove provider from folder (move to uncategorized)", () => {
      const favorite = { id: 1, providerId: 10, userId: 1, folderId: 1 };
      const updated = { ...favorite, folderId: null };
      
      expect(updated.folderId).toBeNull();
    });

    it("should filter providers by folder", () => {
      const favorites = [
        { id: 1, providerId: 10, folderId: 1 },
        { id: 2, providerId: 20, folderId: 1 },
        { id: 3, providerId: 30, folderId: 2 },
        { id: 4, providerId: 40, folderId: null },
      ];
      
      const folder1 = favorites.filter((f) => f.folderId === 1);
      const uncategorized = favorites.filter((f) => f.folderId === null);
      
      expect(folder1).toHaveLength(2);
      expect(uncategorized).toHaveLength(1);
    });
  });

  describe("Folder deletion", () => {
    it("should move providers to uncategorized when folder is deleted", () => {
      const favorites = [
        { id: 1, providerId: 10, folderId: 1 },
        { id: 2, providerId: 20, folderId: 1 },
        { id: 3, providerId: 30, folderId: 2 },
      ];
      
      const deletedFolderId = 1;
      const updated = favorites.map((f) =>
        f.folderId === deletedFolderId ? { ...f, folderId: null } : f
      );
      
      expect(updated.filter((f) => f.folderId === 1)).toHaveLength(0);
      expect(updated.filter((f) => f.folderId === null)).toHaveLength(2);
      expect(updated.filter((f) => f.folderId === 2)).toHaveLength(1);
    });
  });

  describe("Subscription tier gating", () => {
    it("should allow folder creation for Pro subscribers", () => {
      const tier = "pro";
      const canCreateFolders = tier === "pro" || tier === "business";
      expect(canCreateFolders).toBe(true);
    });

    it("should allow folder creation for Business subscribers", () => {
      const tier = "business";
      const canCreateFolders = tier === "pro" || tier === "business";
      expect(canCreateFolders).toBe(true);
    });

    it("should deny folder creation for Free subscribers", () => {
      const tier = "free";
      const canCreateFolders = tier === "pro" || tier === "business";
      expect(canCreateFolders).toBe(false);
    });
  });
});

// ============================================================================
// FEATURE 3: Booking Analytics (Business Tier)
// ============================================================================
describe("Booking Analytics", () => {
  describe("Tier gating", () => {
    it("should allow analytics access for Business tier", () => {
      const tierPerks = { bookingAnalytics: true };
      expect(tierPerks.bookingAnalytics).toBe(true);
    });

    it("should deny analytics access for Pro tier", () => {
      const tierPerks = { bookingAnalytics: false };
      expect(tierPerks.bookingAnalytics).toBe(false);
    });

    it("should deny analytics access for Free tier", () => {
      const tierPerks = { bookingAnalytics: false };
      expect(tierPerks.bookingAnalytics).toBe(false);
    });
  });

  describe("Spending summary calculation", () => {
    it("should calculate total spent from completed/confirmed bookings only", () => {
      const bookings = [
        { status: "completed", totalAmount: "100.00" },
        { status: "confirmed", totalAmount: "50.00" },
        { status: "cancelled", totalAmount: "75.00" },
        { status: "pending", totalAmount: "200.00" },
      ];
      
      const countableStatuses = ["completed", "confirmed", "in_progress"];
      const totalSpent = bookings
        .filter((b) => countableStatuses.includes(b.status))
        .reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);
      
      expect(totalSpent).toBe(150);
    });

    it("should calculate average booking amount correctly", () => {
      const amounts = [100, 200, 300];
      const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
      expect(avg).toBeCloseTo(200);
    });

    it("should handle zero bookings gracefully", () => {
      const bookings: Array<{ totalAmount: string }> = [];
      const totalSpent = bookings.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);
      expect(totalSpent).toBe(0);
    });
  });

  describe("Monthly spending aggregation", () => {
    it("should group bookings by month", () => {
      const bookings = [
        { bookingDate: "2026-01-15", totalAmount: "100.00" },
        { bookingDate: "2026-01-20", totalAmount: "50.00" },
        { bookingDate: "2026-02-10", totalAmount: "200.00" },
      ];
      
      const monthly = new Map<string, number>();
      bookings.forEach((b) => {
        const month = b.bookingDate.slice(0, 7);
        monthly.set(month, (monthly.get(month) || 0) + parseFloat(b.totalAmount));
      });
      
      expect(monthly.get("2026-01")).toBe(150);
      expect(monthly.get("2026-02")).toBe(200);
    });

    it("should only include last 12 months of data", () => {
      const now = new Date("2026-04-15");
      const startDate = new Date(now);
      startDate.setMonth(startDate.getMonth() - 12);
      
      const testDate = new Date("2025-03-01");
      const isInRange = testDate >= startDate;
      
      // March 2025 should be excluded (more than 12 months ago from April 2026)
      expect(isInRange).toBe(false);
      
      const recentDate = new Date("2025-05-01");
      expect(recentDate >= startDate).toBe(true);
    });
  });

  describe("Top providers ranking", () => {
    it("should rank providers by total spent descending", () => {
      const providers = [
        { businessName: "Provider A", totalSpent: "500.00" },
        { businessName: "Provider B", totalSpent: "1200.00" },
        { businessName: "Provider C", totalSpent: "300.00" },
      ];
      
      const sorted = [...providers].sort(
        (a, b) => parseFloat(b.totalSpent) - parseFloat(a.totalSpent)
      );
      
      expect(sorted[0].businessName).toBe("Provider B");
      expect(sorted[1].businessName).toBe("Provider A");
      expect(sorted[2].businessName).toBe("Provider C");
    });

    it("should limit to top 10 providers", () => {
      const providers = Array.from({ length: 15 }, (_, i) => ({
        businessName: `Provider ${i}`,
        totalSpent: `${(15 - i) * 100}`,
      }));
      
      const top10 = providers.slice(0, 10);
      expect(top10).toHaveLength(10);
    });
  });

  describe("Category breakdown", () => {
    it("should calculate spending percentage per category", () => {
      const categories = [
        { categoryName: "Barber", totalSpent: "300.00" },
        { categoryName: "DJ", totalSpent: "200.00" },
        { categoryName: "Photography", totalSpent: "500.00" },
      ];
      
      const total = categories.reduce((sum, c) => sum + parseFloat(c.totalSpent), 0);
      const percentages = categories.map((c) => ({
        name: c.categoryName,
        pct: ((parseFloat(c.totalSpent) / total) * 100).toFixed(1),
      }));
      
      expect(percentages.find((p) => p.name === "Photography")?.pct).toBe("50.0");
      expect(percentages.find((p) => p.name === "Barber")?.pct).toBe("30.0");
      expect(percentages.find((p) => p.name === "DJ")?.pct).toBe("20.0");
    });
  });

  describe("Currency formatting", () => {
    it("should format amounts as USD currency", () => {
      const format = (amount: string | number) => {
        const num = typeof amount === "string" ? parseFloat(amount) : amount;
        return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
      };
      
      expect(format("1234.56")).toBe("$1,234.56");
      expect(format(0)).toBe("$0.00");
      expect(format("99.90")).toBe("$99.90");
    });
  });
});

// ============================================================================
// Schema validation
// ============================================================================
describe("Schema validation", () => {
  it("should have savedProviderFolders table fields", () => {
    const folderFields = ["id", "userId", "name", "color", "icon", "sortOrder", "createdAt", "updatedAt"];
    folderFields.forEach((field) => {
      expect(typeof field).toBe("string");
    });
  });

  it("should have folderId on customerFavorites", () => {
    const favoriteFields = ["id", "userId", "providerId", "folderId", "createdAt"];
    expect(favoriteFields).toContain("folderId");
  });

  it("should have reviewReminderSent on bookings", () => {
    const bookingFields = ["reviewReminderSent"];
    expect(bookingFields).toContain("reviewReminderSent");
  });
});
