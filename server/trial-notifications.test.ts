import { describe, it, expect } from "vitest";
import { getTemplate } from "./notifications/templates";

/**
 * Tests for trial milestone notification templates and logic
 */

describe("Trial Milestone Notification Templates", () => {
  const mockData = {
    providerName: "Jane's Salon",
    trialEndDate: "Monday, May 6, 2026",
    dashboardUrl: "/provider/dashboard",
    upgradeUrl: "/provider/subscription",
    unsubscribeUrl: "/unsubscribe/abc123",
    servicesCreated: 5,
    bookingsReceived: 3,
    reviewsReceived: 2,
  };

  describe("trial_started template", () => {
    it("should generate correct subject and body", () => {
      const template = getTemplate("trial_started", mockData);
      expect(template.subject).toBe("Welcome to Your 14-Day Professional Trial!");
      expect(template.body).toContain("14-day Professional trial");
      expect(template.body).toContain("Jane's Salon");
      expect(template.body).toContain("Monday, May 6, 2026");
      expect(template.body).toContain("Up to 10 services");
      expect(template.body).toContain("3 photos per service");
      expect(template.body).toContain("Priority search placement");
      expect(template.body).toContain("Custom profile slug");
      expect(template.body).toContain("/provider/dashboard");
      expect(template.smsBody).toContain("14-day Professional trial");
    });
  });

  describe("trial_7_days template", () => {
    it("should generate correct subject and body with stats", () => {
      const template = getTemplate("trial_7_days", mockData);
      expect(template.subject).toBe("7 Days Left on Your Professional Trial");
      expect(template.body).toContain("7 days");
      expect(template.body).toContain("Jane's Salon");
      expect(template.body).toContain("5 services");
      expect(template.body).toContain("3 bookings");
      expect(template.body).toContain("2 reviews");
      expect(template.body).toContain("$19.99/month");
      expect(template.body).toContain("$15.99/month");
      expect(template.body).toContain("/provider/subscription");
      expect(template.smsBody).toContain("7 days left");
    });

    it("should handle missing stats gracefully", () => {
      const template = getTemplate("trial_7_days", {
        providerName: "Test",
        trialEndDate: "May 6, 2026",
        upgradeUrl: "/upgrade",
      });
      expect(template.subject).toBe("7 Days Left on Your Professional Trial");
      expect(template.body).toContain("Test");
      // Should not contain stats lines when data is missing
      expect(template.body).not.toContain("undefined");
    });
  });

  describe("trial_3_days template", () => {
    it("should generate urgent messaging", () => {
      const template = getTemplate("trial_3_days", mockData);
      expect(template.subject).toContain("3 Days Left");
      expect(template.subject).toContain("Don't Lose");
      expect(template.body).toContain("3 days");
      expect(template.body).toContain("lose access to");
      expect(template.body).toContain("Priority search placement");
      expect(template.body).toContain("$19.99/mo");
      expect(template.body).toContain("$15.99/month");
      expect(template.smsBody).toContain("3 days left");
    });
  });

  describe("trial_1_day template", () => {
    it("should generate final-day urgent messaging", () => {
      const template = getTemplate("trial_1_day", mockData);
      expect(template.subject).toContain("Last Day");
      expect(template.subject).toContain("Expires Tomorrow");
      expect(template.body).toContain("expires tomorrow");
      expect(template.body).toContain("downgraded to the Free tier");
      expect(template.body).toContain("Only 3 services visible");
      expect(template.body).toContain("1 photo per service");
      expect(template.body).toContain("$19.99/mo");
      expect(template.smsBody).toContain("TOMORROW");
    });
  });

  describe("trial_expired template", () => {
    it("should generate expiry notification with reactivation CTA", () => {
      const template = getTemplate("trial_expired", mockData);
      expect(template.subject).toBe("Your Professional Trial Has Ended");
      expect(template.body).toContain("trial has ended");
      expect(template.body).toContain("Free tier");
      expect(template.body).toContain("$19.99/mo");
      expect(template.body).toContain("$15.99/month");
      expect(template.body).toContain("Unsubscribe");
      expect(template.smsBody).toContain("trial has ended");
    });
  });
});

describe("Trial Milestone Logic", () => {
  // Test the milestone determination logic
  const MILESTONE_MAP: Record<number, string> = {
    7: "trial_7_days",
    3: "trial_3_days",
    1: "trial_1_day",
    0: "trial_expired",
  };

  function determineMilestone(daysRemaining: number): string | null {
    const milestones = [0, 1, 3, 7];
    for (const milestone of milestones) {
      if (daysRemaining <= milestone) {
        return MILESTONE_MAP[milestone] || null;
      }
    }
    return null;
  }

  it("should return null for 14 days remaining (no milestone)", () => {
    expect(determineMilestone(14)).toBeNull();
  });

  it("should return null for 10 days remaining (no milestone)", () => {
    expect(determineMilestone(10)).toBeNull();
  });

  it("should return null for 8 days remaining (no milestone)", () => {
    expect(determineMilestone(8)).toBeNull();
  });

  it("should return trial_7_days for exactly 7 days remaining", () => {
    expect(determineMilestone(7)).toBe("trial_7_days");
  });

  it("should return trial_7_days for 6 days remaining", () => {
    expect(determineMilestone(6)).toBe("trial_7_days");
  });

  it("should return trial_7_days for 4 days remaining", () => {
    expect(determineMilestone(4)).toBe("trial_7_days");
  });

  it("should return trial_3_days for exactly 3 days remaining", () => {
    expect(determineMilestone(3)).toBe("trial_3_days");
  });

  it("should return trial_3_days for 2 days remaining", () => {
    expect(determineMilestone(2)).toBe("trial_3_days");
  });

  it("should return trial_1_day for exactly 1 day remaining", () => {
    expect(determineMilestone(1)).toBe("trial_1_day");
  });

  it("should return trial_expired for 0 days remaining", () => {
    expect(determineMilestone(0)).toBe("trial_expired");
  });
});

describe("Trial Notification Data Formatting", () => {
  it("should format trial end date correctly", () => {
    const trialEnd = new Date("2026-05-06T00:00:00Z");
    const formatted = trialEnd.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    expect(formatted).toContain("2026");
    expect(formatted).toContain("May");
    expect(formatted).toContain("6");
  });

  it("should calculate days remaining correctly", () => {
    const now = new Date("2026-04-22T12:00:00Z");
    const trialEnd = new Date("2026-05-06T12:00:00Z");
    const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    expect(daysRemaining).toBe(14);
  });

  it("should return 0 for expired trials", () => {
    const now = new Date("2026-05-07T12:00:00Z");
    const trialEnd = new Date("2026-05-06T12:00:00Z");
    const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    expect(daysRemaining).toBe(0);
  });

  it("should handle same-day expiry", () => {
    const now = new Date("2026-05-06T18:00:00Z");
    const trialEnd = new Date("2026-05-06T12:00:00Z");
    const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    expect(daysRemaining).toBe(0);
  });
});

describe("Email Template Compliance", () => {
  it("trial_expired template should include unsubscribe link", () => {
    const template = getTemplate("trial_expired", {
      providerName: "Test Provider",
      upgradeUrl: "/upgrade",
      unsubscribeUrl: "/unsubscribe/token123",
    });
    expect(template.body).toContain("Unsubscribe");
  });

  it("all trial templates should include OlogyCrew branding", () => {
    const types = ["trial_started", "trial_7_days", "trial_3_days", "trial_1_day", "trial_expired"] as const;
    for (const type of types) {
      const template = getTemplate(type, {
        providerName: "Test",
        trialEndDate: "May 6, 2026",
        dashboardUrl: "/dashboard",
        upgradeUrl: "/upgrade",
        unsubscribeUrl: "/unsubscribe",
      });
      expect(template.body).toContain("OlogyCrew Team");
    }
  });

  it("all trial templates should have SMS body", () => {
    const types = ["trial_started", "trial_7_days", "trial_3_days", "trial_1_day", "trial_expired"] as const;
    for (const type of types) {
      const template = getTemplate(type, {
        providerName: "Test",
        trialEndDate: "May 6, 2026",
        dashboardUrl: "/dashboard",
        upgradeUrl: "/upgrade",
        unsubscribeUrl: "/unsubscribe",
      });
      expect(template.smsBody).toBeDefined();
      expect(template.smsBody!.length).toBeGreaterThan(0);
    }
  });
});
