import { describe, it, expect, vi } from "vitest";

describe("Admin Dashboard Enhancements", () => {
  // ====================================================================
  // Push Notification Analytics
  // ====================================================================
  describe("Push Notification Analytics", () => {
    it("should have getPushAnalytics function exported from db", async () => {
      const db = await import("./db");
      expect(typeof db.getPushAnalytics).toBe("function");
    });

    it("should return correct shape from getPushAnalytics", async () => {
      const db = await import("./db");
      const result = await db.getPushAnalytics();
      expect(result).toHaveProperty("totalSubscriptions");
      expect(result).toHaveProperty("activeSubscriptions");
      expect(result).toHaveProperty("inactiveSubscriptions");
      expect(result).toHaveProperty("uniqueUsers");
      expect(result).toHaveProperty("recentSubscriptions");
      // All should be numbers
      expect(typeof result.totalSubscriptions).toBe("number");
      expect(typeof result.activeSubscriptions).toBe("number");
      expect(typeof result.inactiveSubscriptions).toBe("number");
      expect(typeof result.uniqueUsers).toBe("number");
      expect(typeof result.recentSubscriptions).toBe("number");
    });

    it("should have getPushAnalytics endpoint in admin router", async () => {
      const { adminRouter } = await import("./adminRouter");
      expect(adminRouter).toBeDefined();
      // The router should have the getPushAnalytics procedure
      const procedures = Object.keys(adminRouter._def.procedures);
      expect(procedures).toContain("getPushAnalytics");
    });

    it("should have pushSubscriptions table in schema", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.pushSubscriptions).toBeDefined();
    });
  });

  // ====================================================================
  // Contact Submissions Search & Export
  // ====================================================================
  describe("Contact Submissions Backend", () => {
    it("should have contact list endpoint available", async () => {
      const db = await import("./db");
      expect(typeof db.getContactSubmissionsFiltered).toBe("function");
    });

    it("should have contact stats endpoint available", async () => {
      const db = await import("./db");
      expect(typeof db.getContactSubmissionStats).toBe("function");
    });

    it("should have contact reply functionality", async () => {
      const db = await import("./db");
      expect(typeof db.createContactReply).toBe("function");
      expect(typeof db.getContactReplies).toBe("function");
    });

    it("should have template management functions", async () => {
      const db = await import("./db");
      expect(typeof db.createReplyTemplate).toBe("function");
      expect(typeof db.getReplyTemplates).toBe("function");
      expect(typeof db.updateReplyTemplate).toBe("function");
      expect(typeof db.deleteReplyTemplate).toBe("function");
      expect(typeof db.incrementTemplateUsage).toBe("function");
    });

    it("should have contact status update function", async () => {
      const db = await import("./db");
      expect(typeof db.updateContactSubmissionStatus).toBe("function");
    });
  });

  // ====================================================================
  // Referral System
  // ====================================================================
  describe("Referral System", () => {
    it("should have all referral functions exported", async () => {
      const db = await import("./db");
      expect(typeof db.getOrCreateReferralCode).toBe("function");
      expect(typeof db.getReferralCodeByCode).toBe("function");
      expect(typeof db.getReferralCodeByUserId).toBe("function");
      expect(typeof db.validateReferralCode).toBe("function");
      expect(typeof db.createReferral).toBe("function");
      expect(typeof db.completeReferral).toBe("function");
      expect(typeof db.getReferralStats).toBe("function");
      expect(typeof db.getReferralHistory).toBe("function");
      expect(typeof db.updateReferralCode).toBe("function");
    });

    it("should have referral router with all endpoints", async () => {
      const { referralRouter } = await import("./referralRouter");
      expect(referralRouter).toBeDefined();
      const procedures = Object.keys(referralRouter._def.procedures);
      expect(procedures).toContain("getMyCode");
      expect(procedures).toContain("getStats");
      expect(procedures).toContain("getHistory");
      expect(procedures).toContain("validate");
      expect(procedures).toContain("applyCode");
      expect(procedures).toContain("updateSettings");
    });

    it("should have referral tables in schema", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.referralCodes).toBeDefined();
      expect(schema.referrals).toBeDefined();
    });
  });

  // ====================================================================
  // Admin Router Completeness
  // ====================================================================
  describe("Admin Router Completeness", () => {
    it("should have all expected admin procedures", async () => {
      const { adminRouter } = await import("./adminRouter");
      const procedures = Object.keys(adminRouter._def.procedures);
      
      // Core admin procedures
      expect(procedures).toContain("getStats");
      expect(procedures).toContain("listUsers");
      expect(procedures).toContain("listProviders");
      expect(procedures).toContain("listBookings");
      expect(procedures).toContain("suspendUser");
      expect(procedures).toContain("unsuspendUser");
      expect(procedures).toContain("verifyProvider");
      expect(procedures).toContain("rejectProvider");
      
      // Analytics
      expect(procedures).toContain("getSubscriptionAnalytics");
      expect(procedures).toContain("getBookingSourceAnalytics");
      expect(procedures).toContain("getPushAnalytics");
      
      // Review moderation
      expect(procedures).toContain("listReviews");
      expect(procedures).toContain("flagReview");
      expect(procedures).toContain("unflagReview");
      expect(procedures).toContain("hideReview");
      expect(procedures).toContain("deleteReview");
    });
  });
});
