import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Referral Program Visibility Features", () => {
  describe("Homepage Refer & Earn Section", () => {
    const homePath = path.resolve(__dirname, "../client/src/pages/Home.tsx");
    const homeContent = fs.readFileSync(homePath, "utf-8");

    it("should have a Refer & Earn section on the homepage", () => {
      expect(homeContent).toContain("Refer & Earn");
    });

    it("should display the referral program badge", () => {
      expect(homeContent).toContain("Referral Program");
    });

    it("should show the three-step process (Share, Sign Up, Earn)", () => {
      expect(homeContent).toContain("Share Your Link");
      expect(homeContent).toContain("They Sign Up & Book");
      expect(homeContent).toContain("Earn & Level Up");
    });

    it("should display all four reward tiers", () => {
      expect(homeContent).toContain("Bronze");
      expect(homeContent).toContain("Silver");
      expect(homeContent).toContain("Gold");
      expect(homeContent).toContain("Platinum");
    });

    it("should show tier percentages", () => {
      expect(homeContent).toContain("10%");
      expect(homeContent).toContain("15%");
      expect(homeContent).toContain("20%");
      expect(homeContent).toContain("25%");
    });

    it("should link to the referral program landing page", () => {
      expect(homeContent).toContain("/referral-program");
    });

    it("should have a CTA button to learn more", () => {
      expect(homeContent).toContain("Learn More & Start Earning");
    });
  });

  describe("Navigation Credit Badge", () => {
    const navPath = path.resolve(__dirname, "../client/src/components/shared/NavHeader.tsx");
    const navContent = fs.readFileSync(navPath, "utf-8");

    it("should have a CreditBadge component", () => {
      expect(navContent).toContain("function CreditBadge()");
    });

    it("should query the referral credit balance", () => {
      expect(navContent).toContain("trpc.referral.getCreditBalance.useQuery");
    });

    it("should only show when authenticated and balance > 0", () => {
      expect(navContent).toContain("!isAuthenticated || creditAmount <= 0");
    });

    it("should display the Coins icon", () => {
      expect(navContent).toContain("Coins");
    });

    it("should link to the referrals page", () => {
      expect(navContent).toContain('href="/referrals"');
    });

    it("should include credit link in mobile menu", () => {
      expect(navContent).toContain("Referral Credits");
    });

    it("should handle object balance return type correctly", () => {
      expect(navContent).toContain('typeof balance === "object"');
      expect(navContent).toContain("balance.balance");
    });
  });

  describe("Public Referral Program Landing Page", () => {
    const pagePath = path.resolve(__dirname, "../client/src/pages/ReferralProgram.tsx");
    const pageContent = fs.readFileSync(pagePath, "utf-8");

    it("should exist as a page component", () => {
      expect(pageContent).toContain("export default function ReferralProgram()");
    });

    it("should have a hero section with compelling headline", () => {
      expect(pageContent).toContain("Share the Love");
      expect(pageContent).toContain("Earn Rewards");
    });

    it("should show referral link for authenticated users", () => {
      expect(pageContent).toContain("trpc.referral.getMyCode.useQuery");
      expect(pageContent).toContain("referralLink");
    });

    it("should have a copy link button", () => {
      expect(pageContent).toContain("copyLink");
      expect(pageContent).toContain("Referral link copied");
    });

    it("should show sign-in CTA for unauthenticated users", () => {
      expect(pageContent).toContain("Sign In to Start Earning");
      expect(pageContent).toContain("Sign Up & Get Your Link");
    });

    it("should display user stats when authenticated", () => {
      expect(pageContent).toContain("Total Referrals");
      expect(pageContent).toContain("Completed");
      expect(pageContent).toContain("Credits Earned");
      expect(pageContent).toContain("Current Tier");
    });

    it("should have a How It Works section", () => {
      expect(pageContent).toContain("How It Works");
      expect(pageContent).toContain("Share Your Link");
      expect(pageContent).toContain("They Join & Book");
      expect(pageContent).toContain("You Earn Credits");
    });

    it("should display the tier system with all four tiers", () => {
      expect(pageContent).toContain("Reward Tiers");
      expect(pageContent).toContain("The More You Refer, The More You Earn");
      // Check all tiers are present
      const tierNames = ["Bronze", "Silver", "Gold", "Platinum"];
      tierNames.forEach((name) => {
        expect(pageContent).toContain(name);
      });
    });

    it("should show tier progress for authenticated users", () => {
      expect(pageContent).toContain("trpc.referral.getMyTier.useQuery");
      expect(pageContent).toContain("referralsToNextTier");
    });

    it("should have a Program Benefits section", () => {
      expect(pageContent).toContain("Program Benefits");
      expect(pageContent).toContain("Refer Anyone");
      expect(pageContent).toContain("Credits at Checkout");
      expect(pageContent).toContain("Escalating Rewards");
      expect(pageContent).toContain("Automatic Rewards");
      expect(pageContent).toContain("90-Day Validity");
      expect(pageContent).toContain("No Limit");
    });

    it("should have a FAQ section", () => {
      expect(pageContent).toContain("Frequently Asked Questions");
      expect(pageContent).toContain("How do I get my referral link?");
      expect(pageContent).toContain("When do I receive my credits?");
      expect(pageContent).toContain("Can I refer service providers?");
      expect(pageContent).toContain("How do I use my credits?");
      expect(pageContent).toContain("Do credits expire?");
      expect(pageContent).toContain("How do tiers work?");
    });

    it("should have a final CTA section", () => {
      expect(pageContent).toContain("Ready to Start Earning?");
      expect(pageContent).toContain("Go to My Referrals");
    });

    it("should include the NavHeader", () => {
      expect(pageContent).toContain("<NavHeader />");
    });
  });

  describe("Route Registration", () => {
    const appPath = path.resolve(__dirname, "../client/src/App.tsx");
    const appContent = fs.readFileSync(appPath, "utf-8");

    it("should import the ReferralProgram page", () => {
      expect(appContent).toContain('import ReferralProgram from "./pages/ReferralProgram"');
    });

    it("should register the /referral-program route", () => {
      expect(appContent).toContain('/referral-program');
      expect(appContent).toContain("component={ReferralProgram}");
    });
  });
});
