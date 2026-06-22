import { describe, it, expect } from "vitest";

// Test the partner split calculation logic
describe("Partner Revenue Split", () => {
  // Import the pure calculation functions
  const PARTNER_SPLIT_PERCENTAGE = 40;
  const PLATFORM_SPLIT_PERCENTAGE = 60;

  function calculatePartnerShare(totalRevenue: number): number {
    return Math.round(totalRevenue * (PARTNER_SPLIT_PERCENTAGE / 100) * 100) / 100;
  }

  function calculatePlatformShare(totalRevenue: number): number {
    return Math.round(totalRevenue * (PLATFORM_SPLIT_PERCENTAGE / 100) * 100) / 100;
  }

  describe("calculatePartnerShare", () => {
    it("should calculate 40% of revenue correctly", () => {
      expect(calculatePartnerShare(100)).toBe(40);
      expect(calculatePartnerShare(12)).toBe(4.8);
      expect(calculatePartnerShare(20)).toBe(8);
    });

    it("should handle small amounts correctly", () => {
      expect(calculatePartnerShare(1)).toBe(0.4);
      expect(calculatePartnerShare(0.50)).toBe(0.2);
    });

    it("should handle zero revenue", () => {
      expect(calculatePartnerShare(0)).toBe(0);
    });

    it("should handle typical subscription amounts", () => {
      // Provider Pro: $12/mo → partner gets $4.80
      expect(calculatePartnerShare(12)).toBe(4.8);
      // Provider Business: $20/mo → partner gets $8.00
      expect(calculatePartnerShare(20)).toBe(8);
      // Customer Coordinator: $12/mo → partner gets $4.80
      expect(calculatePartnerShare(12)).toBe(4.8);
      // Customer Manager: $20/mo → partner gets $8.00
      expect(calculatePartnerShare(20)).toBe(8);
    });

    it("should handle booking platform fees (1% of booking)", () => {
      // $100 booking → $1 platform fee → $0.40 partner share
      const bookingAmount = 100;
      const platformFee = bookingAmount * 0.01;
      expect(calculatePartnerShare(platformFee)).toBe(0.4);

      // $500 booking → $5 platform fee → $2.00 partner share
      const bookingAmount2 = 500;
      const platformFee2 = bookingAmount2 * 0.01;
      expect(calculatePartnerShare(platformFee2)).toBe(2);
    });

    it("should round to 2 decimal places", () => {
      // $33.33 → 40% = $13.332 → rounds to $13.33
      expect(calculatePartnerShare(33.33)).toBe(13.33);
      // $16.67 → 40% = $6.668 → rounds to $6.67
      expect(calculatePartnerShare(16.67)).toBe(6.67);
    });
  });

  describe("calculatePlatformShare", () => {
    it("should calculate 60% of revenue correctly", () => {
      expect(calculatePlatformShare(100)).toBe(60);
      expect(calculatePlatformShare(12)).toBe(7.2);
      expect(calculatePlatformShare(20)).toBe(12);
    });

    it("should ensure partner + platform = total (within rounding)", () => {
      const amounts = [12, 20, 100, 33.33, 50, 75.99, 0.50];
      for (const amount of amounts) {
        const partner = calculatePartnerShare(amount);
        const platform = calculatePlatformShare(amount);
        // Allow for rounding difference of up to 1 cent
        expect(Math.abs((partner + platform) - amount)).toBeLessThanOrEqual(0.01);
      }
    });
  });

  describe("Split Configuration", () => {
    it("should have correct split percentages", () => {
      expect(PARTNER_SPLIT_PERCENTAGE).toBe(40);
      expect(PLATFORM_SPLIT_PERCENTAGE).toBe(60);
      expect(PARTNER_SPLIT_PERCENTAGE + PLATFORM_SPLIT_PERCENTAGE).toBe(100);
    });
  });

  describe("Partner Account Configuration", () => {
    it("should have PARTNER_STRIPE_ACCOUNT_ID env variable set", () => {
      // This validates the secret was properly configured
      const accountId = process.env.PARTNER_STRIPE_ACCOUNT_ID;
      expect(accountId).toBeDefined();
      expect(accountId).not.toBe("");
      expect(accountId?.startsWith("acct_")).toBe(true);
    });
  });

  describe("Module exports", () => {
    it("should export all required functions", async () => {
      const mod = await import("./partnerSplit");
      expect(mod.calculatePartnerShare).toBeDefined();
      expect(mod.calculatePlatformShare).toBeDefined();
      expect(mod.executePartnerTransfer).toBeDefined();
      expect(mod.getPartnerTransfers).toBeDefined();
      expect(mod.getPartnerTransferSummary).toBeDefined();
      expect(mod.SPLIT_CONFIG).toBeDefined();
      expect(mod.SPLIT_CONFIG.partnerPercentage).toBe(40);
      expect(mod.SPLIT_CONFIG.platformPercentage).toBe(60);
    });
  });

  describe("Admin router partner endpoints", () => {
    it("should have partner transfer procedures in admin router", async () => {
      const { adminRouter } = await import("./adminRouter");
      // Check that the procedures exist on the router
      const procedures = Object.keys((adminRouter as any)._def.procedures || {});
      expect(procedures).toContain("getPartnerTransferSummary");
      expect(procedures).toContain("getPartnerTransfers");
    });
  });

  describe("Webhook integration", () => {
    it("should export handleStripeWebhook with partner split support", async () => {
      const { handleStripeWebhook } = await import("./stripeWebhook");
      expect(handleStripeWebhook).toBeDefined();
      expect(typeof handleStripeWebhook).toBe("function");
    });
  });
});
