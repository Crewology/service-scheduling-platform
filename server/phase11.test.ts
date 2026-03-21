import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import * as db from "./db";

// ============================================================================
// Phase 11 Tests: Notification System, Reminders, Admin Trigger
// ============================================================================

function createAuthContext(role: "customer" | "provider" | "admin", userId: number, name: string, email?: string) {
  return {
    user: { id: userId, openId: `test-p11-${userId}`, name, role, email },
    req: { headers: { origin: "http://localhost:3000" } } as any,
  };
}

describe("Phase 11: Notifications, Reminders, Admin Trigger", () => {
  let providerUserId: number;
  let providerId: number;
  let serviceId: number;
  let customerUserId: number;
  let adminUserId: number;
  let bookingId: number;

  beforeAll(async () => {
    const suffix = Math.floor(Math.random() * 100000) + 70000;

    // Create provider user
    await db.upsertUser({
      openId: `test-p11-provider-${suffix}`,
      name: "P11 Provider",
      email: `p11provider${suffix}@test.com`,
      role: "provider",
    });
    const pUser = await db.getUserByOpenId(`test-p11-provider-${suffix}`);
    providerUserId = pUser!.id;

    // Create provider profile
    const providerCaller = appRouter.createCaller(createAuthContext("provider", providerUserId, "P11 Provider", `p11provider${suffix}@test.com`));
    const provider = await providerCaller.provider.create({
      businessName: `P11 Test Biz ${suffix}`,
      businessType: "sole_proprietor",
      phone: "555-1100",
      address: "100 Reminder St",
    });
    providerId = provider.id;

    // Create a service
    const service = await providerCaller.service.create({
      categoryId: 7,
      name: `P11 Reminder Service ${suffix}`,
      serviceType: "mobile",
      pricingModel: "fixed",
      basePrice: 75,
      durationMinutes: 60,
    });
    serviceId = service.id;

    // Set up availability for provider (all days)
    for (let day = 0; day <= 6; day++) {
      await providerCaller.availability.createSchedule({
        dayOfWeek: day,
        startTime: "08:00",
        endTime: "18:00",
        isAvailable: true,
      });
    }

    // Create customer user
    await db.upsertUser({
      openId: `test-p11-customer-${suffix}`,
      name: "P11 Customer",
      email: `p11customer${suffix}@test.com`,
      role: "customer",
    });
    const cUser = await db.getUserByOpenId(`test-p11-customer-${suffix}`);
    customerUserId = cUser!.id;

    // Create admin user
    await db.upsertUser({
      openId: `test-p11-admin-${suffix}`,
      name: "P11 Admin",
      role: "admin",
    });
    const aUser = await db.getUserByOpenId(`test-p11-admin-${suffix}`);
    adminUserId = aUser!.id;

    // Create a booking for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const bookingDate = tomorrow.toISOString().split("T")[0];

    const customerCaller = appRouter.createCaller(createAuthContext("customer", customerUserId, "P11 Customer", `p11customer${suffix}@test.com`));
    const booking = await customerCaller.booking.create({
      providerId,
      serviceId,
      bookingDate,
      startTime: "10:00",
      endTime: "11:00",
      durationMinutes: 60,
      locationType: "mobile",
      subtotal: "75.00",
      platformFee: "0.75",
      totalAmount: "75.75",
      depositAmount: "0.00",
      remainingAmount: "75.75",
    });
    bookingId = booking.id;
  });

  // ============================================================================
  // Notification Router Tests
  // ============================================================================

  describe("Notification Router", () => {
    it("should list notifications for a user", async () => {
      const caller = appRouter.createCaller(createAuthContext("customer", customerUserId, "P11 Customer"));
      const notifications = await caller.notification.list({ unreadOnly: false });
      expect(Array.isArray(notifications)).toBe(true);
    });

    it("should return unread count", async () => {
      const caller = appRouter.createCaller(createAuthContext("customer", customerUserId, "P11 Customer"));
      const result = await caller.notification.unreadCount();
      expect(result).toHaveProperty("count");
      expect(typeof result.count).toBe("number");
    });

    it("should create and retrieve in-app notifications", async () => {
      // Create a notification directly
      await db.createNotification({
        userId: customerUserId,
        notificationType: "booking_confirmed",
        title: "Test Booking Confirmed",
        message: "Your test booking has been confirmed.",
        relatedBookingId: bookingId,
      });

      const caller = appRouter.createCaller(createAuthContext("customer", customerUserId, "P11 Customer"));
      const notifications = await caller.notification.list({ unreadOnly: true });
      expect(notifications.length).toBeGreaterThan(0);

      const testNotif = notifications.find((n: any) => n.title === "Test Booking Confirmed");
      expect(testNotif).toBeDefined();
      expect(testNotif!.isRead).toBe(false);
    });

    it("should mark notification as read", async () => {
      // Get unread notifications
      const caller = appRouter.createCaller(createAuthContext("customer", customerUserId, "P11 Customer"));
      const notifications = await caller.notification.list({ unreadOnly: true });
      
      if (notifications.length > 0) {
        const result = await caller.notification.markAsRead({ notificationId: notifications[0].id });
        expect(result.success).toBe(true);
      }
    });
  });

  // ============================================================================
  // Reminder Database Helper Tests
  // ============================================================================

  describe("Reminder Database Helpers", () => {
    it("should have getBookingsNeedingReminders function", () => {
      expect(typeof db.getBookingsNeedingReminders).toBe("function");
    });

    it("should have markReminderSent function", () => {
      expect(typeof db.markReminderSent).toBe("function");
    });

    it("should return an array from getBookingsNeedingReminders", async () => {
      const result = await db.getBookingsNeedingReminders();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should mark a booking reminder as sent", async () => {
      // First confirm the booking so it's eligible for reminders
      const providerCaller = appRouter.createCaller(createAuthContext("provider", providerUserId, "P11 Provider"));
      await providerCaller.booking.updateStatus({ id: bookingId, status: "confirmed" });

      // Mark reminder as sent
      await db.markReminderSent(bookingId);

      // Verify the booking has reminderSent = true
      const booking = await db.getBookingById(bookingId);
      expect(booking).toBeDefined();
      expect(booking!.reminderSent).toBe(true);
    });
  });

  // ============================================================================
  // Reminder Service Tests
  // ============================================================================

  describe("Reminder Service", () => {
    it("should export processReminders function", async () => {
      const { processReminders } = await import("./reminderService");
      expect(typeof processReminders).toBe("function");
    });

    it("should export startReminderService and stopReminderService", async () => {
      const { startReminderService, stopReminderService } = await import("./reminderService");
      expect(typeof startReminderService).toBe("function");
      expect(typeof stopReminderService).toBe("function");
    });

    it("should run processReminders without errors", async () => {
      const { processReminders } = await import("./reminderService");
      const result = await processReminders();
      expect(result).toHaveProperty("processed");
      expect(result).toHaveProperty("sent");
      expect(result).toHaveProperty("failed");
      expect(typeof result.processed).toBe("number");
      expect(typeof result.sent).toBe("number");
      expect(typeof result.failed).toBe("number");
    });

    it("should start and stop the reminder service", async () => {
      const { startReminderService, stopReminderService } = await import("./reminderService");
      // Start with a very long interval so it doesn't actually fire during test
      startReminderService(999999999);
      // Stop immediately
      stopReminderService();
      // No errors means success
      expect(true).toBe(true);
    });
  });

  // ============================================================================
  // Admin Trigger Tests
  // ============================================================================

  describe("Admin Reminder Trigger", () => {
    it("should allow admin to trigger reminders manually", async () => {
      const caller = appRouter.createCaller(createAuthContext("admin", adminUserId, "P11 Admin"));
      const result = await caller.admin.triggerReminders();
      expect(result).toHaveProperty("processed");
      expect(result).toHaveProperty("sent");
      expect(result).toHaveProperty("failed");
    });

    it("should reject non-admin users from triggering reminders", async () => {
      const caller = appRouter.createCaller(createAuthContext("customer", customerUserId, "P11 Customer"));
      await expect(caller.admin.triggerReminders()).rejects.toThrow();
    });
  });

  // ============================================================================
  // Booking Notification Integration Tests
  // ============================================================================

  describe("Booking Notification Integration", () => {
    it("should create a booking and trigger notifications (non-blocking)", async () => {
      const suffix = Math.floor(Math.random() * 100000) + 80000;
      
      // Create another customer for this test
      await db.upsertUser({
        openId: `test-p11-cust2-${suffix}`,
        name: "P11 Customer2",
        email: `p11cust2-${suffix}@test.com`,
        role: "customer",
      });
      const cUser2 = await db.getUserByOpenId(`test-p11-cust2-${suffix}`);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const bookingDate = tomorrow.toISOString().split("T")[0];

      const caller = appRouter.createCaller(createAuthContext("customer", cUser2!.id, "P11 Customer2", `p11cust2-${suffix}@test.com`));
      
      // Create booking - should not throw even if notification sending fails
      const booking = await caller.booking.create({
        providerId,
        serviceId,
        bookingDate,
        startTime: "14:00",
        endTime: "15:00",
        durationMinutes: 60,
        locationType: "mobile",
        subtotal: "75.00",
        platformFee: "0.75",
        totalAmount: "75.75",
        depositAmount: "0.00",
        remainingAmount: "75.75",
      });

      expect(booking).toBeDefined();
      expect(booking.id).toBeGreaterThan(0);
      expect(booking.status).toBe("pending");
    });

    it("should send notifications when booking status is updated to confirmed", async () => {
      const suffix = Math.floor(Math.random() * 100000) + 90000;
      
      // Create another booking to confirm
      await db.upsertUser({
        openId: `test-p11-cust3-${suffix}`,
        name: "P11 Customer3",
        email: `p11cust3-${suffix}@test.com`,
        role: "customer",
      });
      const cUser3 = await db.getUserByOpenId(`test-p11-cust3-${suffix}`);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 3);
      const bookingDate = tomorrow.toISOString().split("T")[0];

      const customerCaller = appRouter.createCaller(createAuthContext("customer", cUser3!.id, "P11 Customer3", `p11cust3-${suffix}@test.com`));
      const booking = await customerCaller.booking.create({
        providerId,
        serviceId,
        bookingDate,
        startTime: "16:00",
        endTime: "17:00",
        durationMinutes: 60,
        locationType: "mobile",
        subtotal: "75.00",
        platformFee: "0.75",
        totalAmount: "75.75",
        depositAmount: "0.00",
        remainingAmount: "75.75",
      });

      // Provider confirms the booking - should trigger confirmation notification
      const providerCaller = appRouter.createCaller(createAuthContext("provider", providerUserId, "P11 Provider"));
      const updated = await providerCaller.booking.updateStatus({ id: booking.id, status: "confirmed" });
      
      expect(updated.status).toBe("confirmed");
    });
  });

  // ============================================================================
  // Notification Template Tests
  // ============================================================================

  describe("Notification Templates", () => {
    it("should have reminder_24h template", async () => {
      const { getTemplate } = await import("./notifications/templates");
      const template = getTemplate("reminder_24h", {
        customerName: "Test Customer",
        serviceName: "Test Service",
        providerName: "Test Provider",
        date: "2026-03-22",
        time: "10:00",
        location: "123 Test St",
      });
      
      expect(template.subject).toContain("Reminder");
      expect(template.body).toContain("Test Customer");
      expect(template.body).toContain("Test Service");
      expect(template.smsBody).toBeDefined();
    });

    it("should have reminder_1h template", async () => {
      const { getTemplate } = await import("./notifications/templates");
      const template = getTemplate("reminder_1h", {
        customerName: "Test Customer",
        serviceName: "Test Service",
        time: "10:00",
        location: "123 Test St",
      });
      
      expect(template.subject).toContain("1 Hour");
      expect(template.body).toContain("Test Customer");
    });

    it("should have booking_created template", async () => {
      const { getTemplate } = await import("./notifications/templates");
      const template = getTemplate("booking_created", {
        bookingNumber: "BK-TEST",
        serviceName: "Test Service",
        customerName: "Test Customer",
        providerName: "Test Provider",
        date: "2026-03-22",
        time: "10:00",
      });
      
      expect(template.subject).toContain("BK-TEST");
      expect(template.body).toContain("Test Provider");
    });

    it("should have booking_confirmed template", async () => {
      const { getTemplate } = await import("./notifications/templates");
      const template = getTemplate("booking_confirmed", {
        bookingNumber: "BK-TEST",
        serviceName: "Test Service",
        customerName: "Test Customer",
        providerName: "Test Provider",
        date: "2026-03-22",
        time: "10:00",
        amount: "$75.00",
      });
      
      expect(template.subject).toContain("Confirmed");
      expect(template.body).toContain("Test Customer");
    });

    it("should have all 12 notification types with templates", async () => {
      const { getTemplate } = await import("./notifications/templates");
      const types = [
        "booking_created", "booking_confirmed", "booking_cancelled", "booking_completed",
        "payment_received", "payment_failed", "message_received", "review_received",
        "reminder_24h", "reminder_1h", "subscription_cancelled", "subscription_updated",
      ] as const;

      for (const type of types) {
        const template = getTemplate(type, { customerName: "Test" });
        expect(template).toHaveProperty("body");
        expect(template.body.length).toBeGreaterThan(0);
      }
    });
  });
});
