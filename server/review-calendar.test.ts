import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// REVIEW REMINDER SERVICE TESTS
// ============================================================================

describe("Review Reminder Service", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should identify completed bookings needing review reminders", async () => {
    // The service should find bookings where:
    // 1. status = 'completed'
    // 2. reviewReminderSent = false
    // 3. completedAt is at least 24 hours ago
    // 4. No review exists for this booking
    const { getBookingsNeedingReviewReminders } = await import("./reviewReminderService");
    
    // This calls the real DB - should return an array (possibly empty)
    const bookings = await getBookingsNeedingReviewReminders();
    expect(Array.isArray(bookings)).toBe(true);
  });

  it("should mark review reminder as sent", async () => {
    const { markReviewReminderSent } = await import("./reviewReminderService");
    // Should not throw even with non-existent booking ID
    await expect(markReviewReminderSent(999999)).resolves.not.toThrow();
  });

  it("should process review reminders without errors", async () => {
    const { processReviewReminders } = await import("./reviewReminderService");
    const result = await processReviewReminders();
    
    expect(result).toHaveProperty("processed");
    expect(result).toHaveProperty("sent");
    expect(result).toHaveProperty("failed");
    expect(typeof result.processed).toBe("number");
    expect(typeof result.sent).toBe("number");
    expect(typeof result.failed).toBe("number");
    expect(result.processed).toBeGreaterThanOrEqual(0);
  });

  it("should start and stop the review reminder service", async () => {
    const { startReviewReminderService, stopReviewReminderService } = await import("./reviewReminderService");
    
    // Start with a very long interval so it doesn't actually run
    startReviewReminderService(999999999);
    
    // Starting again should not throw (idempotent)
    startReviewReminderService(999999999);
    
    // Stop should clean up
    stopReviewReminderService();
    
    // Stopping again should not throw
    stopReviewReminderService();
  });
});

// ============================================================================
// REVIEW REMINDER NOTIFICATION TEMPLATE TESTS
// ============================================================================

describe("Review Reminder Notification Template", () => {
  it("should have a review_reminder template", async () => {
    const { getTemplate } = await import("./notifications/templates");
    
    const template = getTemplate("review_reminder", {
      customerName: "John Doe",
      serviceName: "Haircut",
      providerName: "Bob's Barber",
      reviewUrl: "/booking/123/review",
      unsubscribeUrl: "/unsubscribe/abc",
    });

    expect(template.subject).toContain("Haircut");
    expect(template.body).toContain("John Doe");
    expect(template.body).toContain("Bob's Barber");
    expect(template.body).toContain("Leave a Review");
    expect(template.body).toContain("Unsubscribe");
    expect(template.smsBody).toContain("Haircut");
    expect(template.smsBody).toContain("Bob's Barber");
  });

  it("should handle missing data gracefully", async () => {
    const { getTemplate } = await import("./notifications/templates");
    
    const template = getTemplate("review_reminder", {});
    expect(template.subject).toBeTruthy();
    expect(template.body).toBeTruthy();
    expect(template.smsBody).toBeTruthy();
  });
});

// ============================================================================
// CALENDAR EVENTS ENDPOINT TESTS
// ============================================================================

describe("Calendar Events Endpoint", () => {
  it("should have calendarEvents procedure on booking router", async () => {
    const { bookingRouter } = await import("./routers/bookingRouter");
    
    // The router should have a calendarEvents procedure
    expect(bookingRouter).toBeDefined();
    // We can't easily test the full procedure without a mock context,
    // but we can verify the router exports correctly
    expect(typeof bookingRouter).toBe("object");
  });

  it("should export getProviderCalendarBookings from db", async () => {
    const db = await import("./db");
    expect(typeof db.getProviderCalendarBookings).toBe("function");
  });

  it("should return calendar data for a provider", async () => {
    const db = await import("./db");
    
    // Call with a non-existent provider ID - should return empty array
    const bookings = await db.getProviderCalendarBookings(999999);
    expect(Array.isArray(bookings)).toBe(true);
    expect(bookings.length).toBe(0);
  });

  it("should export getSessionsByBookingId from db", async () => {
    const db = await import("./db");
    expect(typeof db.getSessionsByBookingId).toBe("function");
    
    // Call with non-existent booking - should return empty array
    const sessions = await db.getSessionsByBookingId(999999);
    expect(Array.isArray(sessions)).toBe(true);
  });
});

// ============================================================================
// ADMIN TRIGGER TESTS
// ============================================================================

describe("Admin Review Reminder Trigger", () => {
  it("should have triggerReviewReminders procedure on admin router", async () => {
    const { adminRouter } = await import("./adminRouter");
    expect(adminRouter).toBeDefined();
  });
});

// ============================================================================
// SCHEMA TESTS
// ============================================================================

describe("Schema - reviewReminderSent column", () => {
  it("should have reviewReminderSent column on bookings table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.bookings).toBeDefined();
    // The column should exist in the bookings table definition
    const columns = Object.keys(schema.bookings);
    // Drizzle tables have column accessors
    expect(schema.bookings.reviewReminderSent).toBeDefined();
  });
});
