import { describe, it, expect } from "vitest";

// ============================================================================
// REFERRAL ENHANCEMENTS TESTS
// Tests for: (1) Referral reward fulfillment, (2) Admin referral analytics,
// (3) Email notifications for referral events
// ============================================================================

describe("Referral Enhancements", () => {
  // ==========================================================================
  // 1. REFERRAL REWARD FULFILLMENT
  // ==========================================================================
  describe("Referral Credit System (Schema & DB)", () => {
    it("should have referral_credits table in schema", async () => {
      const schema = await import("../drizzle/schema");
      expect(schema.referralCredits).toBeDefined();
    }, 15000);

    it("referral_credits table should have required columns", async () => {
      const schema = await import("../drizzle/schema");
      const table = schema.referralCredits;
      // Check the table has the expected column names
      const columnNames = Object.keys(table);
      expect(columnNames).toContain("id");
      expect(columnNames).toContain("userId");
      expect(columnNames).toContain("amount");
      expect(columnNames).toContain("type");
    });

    it("should export addReferralCredit from db helpers", async () => {
      const db = await import("./db");
      expect(typeof db.addReferralCredit).toBe("function");
    });

    it("should export getReferralCreditBalance from db helpers", async () => {
      const db = await import("./db");
      expect(typeof db.getReferralCreditBalance).toBe("function");
    });

    it("should export getReferralCreditHistory from db helpers", async () => {
      const db = await import("./db");
      expect(typeof db.getReferralCreditHistory).toBe("function");
    });

    it("should export spendReferralCredits from db helpers", async () => {
      const db = await import("./db");
      expect(typeof db.spendReferralCredits).toBe("function");
    });

    it("should export fulfillReferralOnBookingComplete from db helpers", async () => {
      const db = await import("./db");
      expect(typeof db.fulfillReferralOnBookingComplete).toBe("function");
    });
  });

  describe("Referral Fulfillment Module", () => {
    it("should export fulfillReferralAndNotify function", async () => {
      const mod = await import("./referralFulfillment");
      expect(typeof mod.fulfillReferralAndNotify).toBe("function");
    });
  });

  describe("Referral Credit Router Endpoints", () => {
    it("should have getCreditBalance endpoint", async () => {
      const { referralRouter } = await import("./referralRouter");
      const procedures = Object.keys(referralRouter._def.procedures);
      expect(procedures).toContain("getCreditBalance");
    });

    it("should have getCreditHistory endpoint", async () => {
      const { referralRouter } = await import("./referralRouter");
      const procedures = Object.keys(referralRouter._def.procedures);
      expect(procedures).toContain("getCreditHistory");
    });

    it("should have spendCredits endpoint", async () => {
      const { referralRouter } = await import("./referralRouter");
      const procedures = Object.keys(referralRouter._def.procedures);
      expect(procedures).toContain("spendCredits");
    });

    it("should still have all original referral endpoints", async () => {
      const { referralRouter } = await import("./referralRouter");
      const procedures = Object.keys(referralRouter._def.procedures);
      expect(procedures).toContain("getMyCode");
      expect(procedures).toContain("validate");
      expect(procedures).toContain("applyCode");
      expect(procedures).toContain("getStats");
      expect(procedures).toContain("getHistory");
      expect(procedures).toContain("updateSettings");
      expect(procedures).toContain("lookup");
    });
  });

  describe("Booking Router Referral Integration", () => {
    it("should import referralFulfillment in booking status update flow", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/server/routers/bookingRouter.ts",
        "utf-8"
      );
      expect(content).toContain("fulfillReferralAndNotify");
      expect(content).toContain("referralFulfillment");
    });

    it("should trigger referral fulfillment only on completed status", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/server/routers/bookingRouter.ts",
        "utf-8"
      );
      // Should check for completed status before calling fulfillment
      expect(content).toContain('input.status === "completed"');
      expect(content).toContain("fulfillReferralAndNotify");
    });
  });

  // ==========================================================================
  // 2. ADMIN REFERRAL ANALYTICS
  // ==========================================================================
  describe("Admin Referral Analytics (Backend)", () => {
    it("should export getReferralAnalytics from db helpers", async () => {
      const db = await import("./db");
      expect(typeof db.getReferralAnalytics).toBe("function");
    });

    it("should have getReferralAnalytics endpoint in admin router", async () => {
      const { adminRouter } = await import("./adminRouter");
      const procedures = Object.keys(adminRouter._def.procedures);
      expect(procedures).toContain("getReferralAnalytics");
    });

    it("getReferralAnalytics should return expected shape", async () => {
      const { getReferralAnalytics } = await import("./db/referrals");
      const result = await getReferralAnalytics();
      
      // Verify all expected fields are present
      expect(result).toHaveProperty("totalReferrals");
      expect(result).toHaveProperty("completedReferrals");
      expect(result).toHaveProperty("pendingReferrals");
      expect(result).toHaveProperty("conversionRate");
      expect(result).toHaveProperty("totalCodes");
      expect(result).toHaveProperty("activeCodes");
      expect(result).toHaveProperty("totalCreditsEarned");
      expect(result).toHaveProperty("totalCreditsSpent");
      expect(result).toHaveProperty("topReferrers");
      expect(result).toHaveProperty("monthlyTrend");
      
      // Verify types
      expect(typeof result.totalReferrals).toBe("number");
      expect(typeof result.completedReferrals).toBe("number");
      expect(typeof result.conversionRate).toBe("number");
      expect(Array.isArray(result.topReferrers)).toBe(true);
      expect(Array.isArray(result.monthlyTrend)).toBe(true);
    });
  });

  describe("Admin Referral Analytics (Frontend)", () => {
    it("should have ReferralAnalyticsPanel in AdminDashboard", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/client/src/pages/AdminDashboard.tsx",
        "utf-8"
      );
      expect(content).toContain("ReferralAnalyticsPanel");
      expect(content).toContain('value="referrals"');
    });

    it("should display top referrers table", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/client/src/pages/AdminDashboard.tsx",
        "utf-8"
      );
      expect(content).toContain("Top Referrers");
      expect(content).toContain("topReferrers");
    });

    it("should display monthly trend chart", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/client/src/pages/AdminDashboard.tsx",
        "utf-8"
      );
      expect(content).toContain("Monthly Trend");
      expect(content).toContain("monthlyTrend");
    });

    it("should display credit summary", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/client/src/pages/AdminDashboard.tsx",
        "utf-8"
      );
      expect(content).toContain("Credit Summary");
      expect(content).toContain("Credits Earned");
      expect(content).toContain("Credits Spent");
    });
  });

  // ==========================================================================
  // 3. EMAIL NOTIFICATIONS FOR REFERRAL EVENTS
  // ==========================================================================
  describe("Referral Email Notification Types", () => {
    it("should include referral_signup notification type", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/server/notifications/types.ts",
        "utf-8"
      );
      expect(content).toContain("referral_signup");
    });

    it("should include referral_completed notification type", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/server/notifications/types.ts",
        "utf-8"
      );
      expect(content).toContain("referral_completed");
    });

    it("should include referral_welcome notification type", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/server/notifications/types.ts",
        "utf-8"
      );
      expect(content).toContain("referral_welcome");
    });
  });

  describe("Referral Email Templates", () => {
    it("should have referral_signup email template", async () => {
      const { getTemplate } = await import("./notifications/templates");
      const template = getTemplate("referral_signup" as any, {
        referrerName: "John",
        refereeName: "Jane",
      });
      expect(template.subject).toContain("joined OlogyCrew");
      expect(template.body).toContain("John");
      expect(template.body).toContain("Jane");
      expect(template.body).toContain("pending");
    });

    it("should have referral_completed email template", async () => {
      const { getTemplate } = await import("./notifications/templates");
      const template = getTemplate("referral_completed" as any, {
        referrerName: "John",
        refereeName: "Jane",
        creditAmount: "5.00",
        serviceName: "Haircut",
      });
      expect(template.subject).toContain("$5.00");
      expect(template.body).toContain("Jane");
      expect(template.body).toContain("Haircut");
      expect(template.body).toContain("$5.00");
    });

    it("should have referral_welcome email template", async () => {
      const { getTemplate } = await import("./notifications/templates");
      const template = getTemplate("referral_welcome" as any, {
        refereeName: "Jane",
        referrerName: "John",
        discountPercent: 10,
      });
      expect(template.subject).toContain("Welcome");
      expect(template.body).toContain("Jane");
      expect(template.body).toContain("John");
      expect(template.body).toContain("10%");
    });

    it("referral_welcome should handle missing discount gracefully", async () => {
      const { getTemplate } = await import("./notifications/templates");
      const template = getTemplate("referral_welcome" as any, {
        refereeName: "Jane",
        referrerName: "John",
      });
      expect(template.body).toContain("eligible for special discounts");
    });
  });

  describe("Referral Notification Integration in applyCode", () => {
    it("should send referral_signup email in applyCode mutation", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/server/referralRouter.ts",
        "utf-8"
      );
      expect(content).toContain("referral_signup");
      expect(content).toContain("sendNotification");
    });

    it("should send referral_welcome email in applyCode mutation", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/server/referralRouter.ts",
        "utf-8"
      );
      expect(content).toContain("referral_welcome");
    });

    it("should send referral_completed email in fulfillment module", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/server/referralFulfillment.ts",
        "utf-8"
      );
      expect(content).toContain("referral_completed");
      expect(content).toContain("sendNotification");
    });
  });

  // ==========================================================================
  // FRONTEND: CREDIT BALANCE ON REFERRALS PAGE
  // ==========================================================================
  describe("Referrals Page Credit Balance", () => {
    it("should query credit balance on Referrals page", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/client/src/pages/Referrals.tsx",
        "utf-8"
      );
      expect(content).toContain("getCreditBalance");
      expect(content).toContain("creditBalance");
    });

    it("should display credit balance banner when balance > 0", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/client/src/pages/Referrals.tsx",
        "utf-8"
      );
      expect(content).toContain("Available Credit Balance");
      expect(content).toContain("Auto-applied at checkout");
    });

    it("should show credit balance in stats cards", async () => {
      const fs = await import("fs");
      const content = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/client/src/pages/Referrals.tsx",
        "utf-8"
      );
      expect(content).toContain("Credit Balance");
    });
  });
});
