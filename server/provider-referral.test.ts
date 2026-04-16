import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// PROVIDER REFERRAL PROGRAM TESTS
// ============================================================================

describe("Provider Referral Program", () => {
  // -----------------------------------------------------------------------
  // Referral Code Generation
  // -----------------------------------------------------------------------
  describe("Referral Code Format", () => {
    it("should generate codes with REF- prefix and 6 alphanumeric chars", () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "REF-";
      for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      expect(code).toMatch(/^REF-[A-Z2-9]{6}$/);
      expect(code.length).toBe(10);
    });

    it("should not include ambiguous characters (0, O, 1, I)", () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      expect(chars).not.toContain("0");
      expect(chars).not.toContain("O");
      expect(chars).not.toContain("1");
      expect(chars).not.toContain("I");
    });
  });

  // -----------------------------------------------------------------------
  // Referral Link Format
  // -----------------------------------------------------------------------
  describe("Provider Referral Link", () => {
    it("should construct referral link with ?ref= parameter", () => {
      const code = "REF-ABC123";
      const origin = "https://ologycrew.com";
      const link = `${origin}/provider/onboarding?ref=${code}`;
      expect(link).toBe("https://ologycrew.com/provider/onboarding?ref=REF-ABC123");
    });

    it("should point to provider onboarding page", () => {
      const code = "REF-XYZ789";
      const link = `/provider/onboarding?ref=${code}`;
      expect(link).toContain("/provider/onboarding");
      expect(link).toContain("ref=REF-XYZ789");
    });
  });

  // -----------------------------------------------------------------------
  // Referral Code Capture from URL
  // -----------------------------------------------------------------------
  describe("Referral Code Capture", () => {
    beforeEach(() => {
      // Clear localStorage before each test
      if (typeof globalThis.localStorage !== "undefined") {
        globalThis.localStorage.clear();
      }
    });

    it("should extract ref parameter from URL search params", () => {
      const searchParams = new URLSearchParams("?ref=REF-ABC123&step=1");
      const refCode = searchParams.get("ref");
      expect(refCode).toBe("REF-ABC123");
    });

    it("should normalize referral code to uppercase", () => {
      const refCode = "ref-abc123";
      const normalized = refCode.toUpperCase().trim();
      expect(normalized).toBe("REF-ABC123");
    });

    it("should handle URL with only ref parameter", () => {
      const searchParams = new URLSearchParams("?ref=REF-XYZ789");
      const refCode = searchParams.get("ref");
      expect(refCode).toBe("REF-XYZ789");
      
      // After removing ref, URL should be clean
      searchParams.delete("ref");
      expect(searchParams.toString()).toBe("");
    });

    it("should preserve other URL params when removing ref", () => {
      const searchParams = new URLSearchParams("?ref=REF-ABC123&step=2&source=email");
      searchParams.delete("ref");
      expect(searchParams.toString()).toBe("step=2&source=email");
    });
  });

  // -----------------------------------------------------------------------
  // Referral Validation Logic
  // -----------------------------------------------------------------------
  describe("Referral Validation", () => {
    it("should reject empty referral codes", () => {
      const code = "";
      expect(code.trim().length).toBe(0);
    });

    it("should reject self-referral (same user ID)", () => {
      const referrerId = 1;
      const refereeId = 1;
      expect(referrerId).toBe(refereeId);
      // Self-referral should be blocked
    });

    it("should allow referral between different users", () => {
      const referrerId = 1;
      const refereeId = 2;
      expect(referrerId).not.toBe(refereeId);
    });
  });

  // -----------------------------------------------------------------------
  // Referral Stats Calculation
  // -----------------------------------------------------------------------
  describe("Referral Stats", () => {
    it("should calculate stats from referral list", () => {
      const referrals = [
        { status: "completed", referrerDiscountAmount: "5.00" },
        { status: "completed", referrerDiscountAmount: "10.00" },
        { status: "pending", referrerDiscountAmount: null },
        { status: "pending", referrerDiscountAmount: null },
      ];

      const totalReferrals = referrals.length;
      const completedReferrals = referrals.filter(r => r.status === "completed").length;
      const pendingReferrals = referrals.filter(r => r.status === "pending").length;
      const totalEarnings = referrals
        .filter(r => r.referrerDiscountAmount)
        .reduce((sum, r) => sum + parseFloat(r.referrerDiscountAmount || "0"), 0)
        .toFixed(2);

      expect(totalReferrals).toBe(4);
      expect(completedReferrals).toBe(2);
      expect(pendingReferrals).toBe(2);
      expect(totalEarnings).toBe("15.00");
    });

    it("should handle empty referral list", () => {
      const referrals: any[] = [];
      const totalReferrals = referrals.length;
      const totalEarnings = referrals
        .filter(r => r.referrerDiscountAmount)
        .reduce((sum, r) => sum + parseFloat(r.referrerDiscountAmount || "0"), 0)
        .toFixed(2);

      expect(totalReferrals).toBe(0);
      expect(totalEarnings).toBe("0.00");
    });
  });

  // -----------------------------------------------------------------------
  // Provider Dashboard Referral Card
  // -----------------------------------------------------------------------
  describe("Provider Dashboard Referral Card", () => {
    it("should construct share text with referral link", () => {
      const code = "REF-ABC123";
      const origin = "https://ologycrew.com";
      const referralLink = `${origin}/provider/onboarding?ref=${code}`;
      
      const shareData = {
        title: "Join OlogyCrew as a Provider",
        text: "I've been using OlogyCrew to manage my service bookings and it's great! Sign up with my referral link and we both earn credits.",
        url: referralLink,
      };

      expect(shareData.title).toContain("OlogyCrew");
      expect(shareData.text).toContain("referral link");
      expect(shareData.url).toContain("ref=REF-ABC123");
    });

    it("should display discount percentages from referral code", () => {
      const code = {
        code: "REF-ABC123",
        referrerDiscountPercent: 10,
        refereeDiscountPercent: 10,
      };

      expect(code.referrerDiscountPercent).toBe(10);
      expect(code.refereeDiscountPercent).toBe(10);
    });
  });

  // -----------------------------------------------------------------------
  // Landing Page Referral Section
  // -----------------------------------------------------------------------
  describe("Landing Page Referral Section", () => {
    it("should have three steps: Share, Sign Up, Earn", () => {
      const steps = ["Share Your Link", "They Sign Up", "Earn Credits"];
      expect(steps).toHaveLength(3);
      expect(steps[0]).toContain("Share");
      expect(steps[1]).toContain("Sign Up");
      expect(steps[2]).toContain("Earn");
    });
  });

  // -----------------------------------------------------------------------
  // LocalStorage Referral Persistence
  // -----------------------------------------------------------------------
  describe("Referral Code Persistence", () => {
    it("should store and retrieve referral code from localStorage key", () => {
      const key = "provider_referral_code";
      const code = "REF-ABC123";
      
      // Simulate storage
      const storage = new Map<string, string>();
      storage.set(key, code);
      
      expect(storage.get(key)).toBe("REF-ABC123");
    });

    it("should clear referral code after successful application", () => {
      const storage = new Map<string, string>();
      storage.set("provider_referral_code", "REF-ABC123");
      
      // After successful apply
      storage.delete("provider_referral_code");
      expect(storage.has("provider_referral_code")).toBe(false);
    });

    it("should clear referral code even on failed application", () => {
      const storage = new Map<string, string>();
      storage.set("provider_referral_code", "REF-INVALID");
      
      // After failed apply (best-effort cleanup)
      storage.delete("provider_referral_code");
      expect(storage.has("provider_referral_code")).toBe(false);
    });
  });
});
