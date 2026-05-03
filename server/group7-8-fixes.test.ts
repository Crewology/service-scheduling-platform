import { describe, it, expect } from "vitest";
import { formatTimeForDisplay } from "../shared/timeSlots";

describe("Group 7: UI/Display Fixes", () => {
  describe("12-hour time format", () => {
    it("should convert 24-hour time to 12-hour format", () => {
      expect(formatTimeForDisplay("14:30:00")).toBe("2:30 PM");
      expect(formatTimeForDisplay("09:00:00")).toBe("9:00 AM");
      expect(formatTimeForDisplay("00:00:00")).toBe("12:00 AM");
      expect(formatTimeForDisplay("12:00:00")).toBe("12:00 PM");
      expect(formatTimeForDisplay("23:59:00")).toBe("11:59 PM");
    });

    it("should handle time without seconds", () => {
      expect(formatTimeForDisplay("14:30")).toBe("2:30 PM");
      expect(formatTimeForDisplay("09:00")).toBe("9:00 AM");
    });

    it("should handle edge cases", () => {
      expect(formatTimeForDisplay("01:00:00")).toBe("1:00 AM");
      expect(formatTimeForDisplay("13:00:00")).toBe("1:00 PM");
      expect(formatTimeForDisplay("12:30:00")).toBe("12:30 PM");
      expect(formatTimeForDisplay("00:30:00")).toBe("12:30 AM");
    });
  });

  describe("Email support removed from help page", () => {
    it("should not reference email support in help center", async () => {
      const fs = await import("fs");
      const helpContent = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/client/src/pages/HelpCenter.tsx",
        "utf-8"
      );
      // Should not have the email support card
      expect(helpContent).not.toContain("Email Support");
      expect(helpContent).not.toContain("mailto:garychisolm30@gmail.com");
      // Should still have phone support
      expect(helpContent).toContain("Phone Support");
      expect(helpContent).toContain("(678) 525-0891");
    });
  });

  describe("Account Subscription page", () => {
    it("should exist as a page component", async () => {
      const fs = await import("fs");
      const pageContent = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/client/src/pages/AccountSubscription.tsx",
        "utf-8"
      );
      expect(pageContent).toContain("My Subscription");
      expect(pageContent).toContain("Manage your plan and billing");
      expect(pageContent).toContain("Upgrade Your Plan");
      expect(pageContent).toContain("Manage Billing");
      expect(pageContent).toContain("createPortalSession");
    });

    it("should be registered as a route in App.tsx", async () => {
      const fs = await import("fs");
      const appContent = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/client/src/App.tsx",
        "utf-8"
      );
      expect(appContent).toContain('path="/account/subscription"');
      expect(appContent).toContain("AccountSubscription");
    });

    it("should be linked from the NavHeader dropdown", async () => {
      const fs = await import("fs");
      const navContent = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/client/src/components/shared/NavHeader.tsx",
        "utf-8"
      );
      expect(navContent).toContain("/account/subscription");
      expect(navContent).toContain("My Subscription");
    });

    it("should show correct pricing for all tiers", async () => {
      const fs = await import("fs");
      const pageContent = fs.readFileSync(
        "/home/ubuntu/service-scheduling-platform/client/src/pages/AccountSubscription.tsx",
        "utf-8"
      );
      expect(pageContent).toContain('"$0"');
      expect(pageContent).toContain('"$19/mo"');
      expect(pageContent).toContain('"$49/mo"');
      expect(pageContent).toContain('"$15.20/mo"');
      expect(pageContent).toContain('"$39.20/mo"');
    });
  });
});

describe("Group 8: Payment - PayPal", () => {
  it("should include PayPal in customer subscription checkout", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/service-scheduling-platform/server/customerSubscriptionRouter.ts",
      "utf-8"
    );
    expect(content).toContain('"paypal"');
    expect(content).toContain('payment_method_types: ["card", "paypal"]');
  });

  it("should include PayPal in booking payment checkout", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/service-scheduling-platform/server/stripeRouter.ts",
      "utf-8"
    );
    expect(content).toContain('"paypal"');
    expect(content).toContain('payment_method_types: ["card", "paypal"]');
  });

  it("should include PayPal in provider subscription checkout", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync(
      "/home/ubuntu/service-scheduling-platform/server/subscriptionRouter.ts",
      "utf-8"
    );
    expect(content).toContain('"paypal"');
    expect(content).toContain('payment_method_types: ["card", "paypal"]');
  });

  it("should have PayPal in all checkout sessions consistently", async () => {
    const fs = await import("fs");
    const files = [
      "customerSubscriptionRouter.ts",
      "stripeRouter.ts",
      "subscriptionRouter.ts",
    ];
    for (const file of files) {
      const content = fs.readFileSync(
        `/home/ubuntu/service-scheduling-platform/server/${file}`,
        "utf-8"
      );
      const matches = content.match(/payment_method_types/g);
      expect(matches).toBeTruthy();
      // Every payment_method_types should include paypal
      const paypalMatches = content.match(/payment_method_types: \["card", "paypal"\]/g);
      expect(paypalMatches?.length).toBe(matches?.length);
    }
  });
});
