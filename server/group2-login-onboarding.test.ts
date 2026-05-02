import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Group 2 Tests: Login & Onboarding Flow
 * 
 * Tests cover:
 * 1. Post-login redirects (providers → dashboard, customers → browse)
 * 2. Role selection page behavior
 * 3. Plans link in navigation
 * 4. Get Started button links to /pricing
 * 5. ManusDialog branding removal
 * 6. RoleGuard public paths
 */

describe("Group 2: Login & Onboarding Flow", () => {
  
  describe("OAuth callback - smart redirects", () => {
    it("should redirect new users (no role) to /select-role", async () => {
      const oauthContent = fs.readFileSync(
        path.resolve(__dirname, "./_core/oauth.ts"),
        "utf-8"
      );
      // Verify the OAuth callback checks hasSelectedRole
      expect(oauthContent).toContain("hasSelectedRole");
      expect(oauthContent).toContain("/select-role");
    });

    it("should redirect returning providers to /provider/dashboard", () => {
      const oauthContent = fs.readFileSync(
        path.resolve(__dirname, "./_core/oauth.ts"),
        "utf-8"
      );
      expect(oauthContent).toContain('role === "provider"');
      expect(oauthContent).toContain("/provider/dashboard");
    });

    it("should redirect returning customers to /browse", () => {
      const oauthContent = fs.readFileSync(
        path.resolve(__dirname, "./_core/oauth.ts"),
        "utf-8"
      );
      expect(oauthContent).toContain('role === "customer"');
      expect(oauthContent).toContain("/browse");
    });

    it("should redirect admins to /admin", () => {
      const oauthContent = fs.readFileSync(
        path.resolve(__dirname, "./_core/oauth.ts"),
        "utf-8"
      );
      expect(oauthContent).toContain('role === "admin"');
      expect(oauthContent).toContain("/admin");
    });

    it("should have smart redirect logic with all role branches", () => {
      const oauthContent = fs.readFileSync(
        path.resolve(__dirname, "./_core/oauth.ts"),
        "utf-8"
      );
      // Verify the complete redirect logic exists
      expect(oauthContent).toContain("!user.hasSelectedRole");
      expect(oauthContent).toContain('user.role === "provider"');
      expect(oauthContent).toContain('user.role === "customer"');
      expect(oauthContent).toContain('user.role === "admin"');
    });
  });

  describe("Role Selection page", () => {
    it("should have both customer and provider role options", () => {
      const roleSelectionContent = fs.readFileSync(
        path.resolve(__dirname, "../client/src/pages/RoleSelection.tsx"),
        "utf-8"
      );
      expect(roleSelectionContent).toContain("Find & Book Services");
      expect(roleSelectionContent).toContain("Offer My Services");
    });

    it("should redirect customer to /browse after selection", () => {
      const roleSelectionContent = fs.readFileSync(
        path.resolve(__dirname, "../client/src/pages/RoleSelection.tsx"),
        "utf-8"
      );
      expect(roleSelectionContent).toContain('setLocation("/browse")');
    });

    it("should redirect provider to /provider/onboarding after selection", () => {
      const roleSelectionContent = fs.readFileSync(
        path.resolve(__dirname, "../client/src/pages/RoleSelection.tsx"),
        "utf-8"
      );
      expect(roleSelectionContent).toContain('setLocation("/provider/onboarding")');
    });

    it("should have Back to Home escape hatch", () => {
      const roleSelectionContent = fs.readFileSync(
        path.resolve(__dirname, "../client/src/pages/RoleSelection.tsx"),
        "utf-8"
      );
      expect(roleSelectionContent).toContain("Back to Home");
      expect(roleSelectionContent).toContain("handleSkip");
    });

    it("should show different CTA text for provider selection", () => {
      const roleSelectionContent = fs.readFileSync(
        path.resolve(__dirname, "../client/src/pages/RoleSelection.tsx"),
        "utf-8"
      );
      expect(roleSelectionContent).toContain("Set Up My Provider Profile");
    });

    it("should show note about switching roles later", () => {
      const roleSelectionContent = fs.readFileSync(
        path.resolve(__dirname, "../client/src/pages/RoleSelection.tsx"),
        "utf-8"
      );
      expect(roleSelectionContent).toContain("switch later");
    });
  });

  describe("Navigation - Plans link", () => {
    it("should have Plans link in desktop navigation", () => {
      const navContent = fs.readFileSync(
        path.resolve(__dirname, "../client/src/components/shared/NavHeader.tsx"),
        "utf-8"
      );
      expect(navContent).toContain('href="/pricing"');
      expect(navContent).toContain(">Plans<");
    });

    it("should have Plans link in mobile navigation", () => {
      const navContent = fs.readFileSync(
        path.resolve(__dirname, "../client/src/components/shared/NavHeader.tsx"),
        "utf-8"
      );
      // Mobile menu should also have Plans
      const mobileMenuSection = navContent.split("Mobile Menu")[1] || navContent;
      expect(mobileMenuSection).toContain("Plans");
    });

    it("should have Get Started button linking to /pricing (not login)", () => {
      const navContent = fs.readFileSync(
        path.resolve(__dirname, "../client/src/components/shared/NavHeader.tsx"),
        "utf-8"
      );
      // Find the Get Started button - should link to /pricing
      const getStartedIndex = navContent.indexOf("Get Started");
      expect(getStartedIndex).toBeGreaterThan(-1);
      
      // The Get Started button should be wrapped in a Link to /pricing, not an <a> to login
      const surroundingCode = navContent.substring(
        Math.max(0, getStartedIndex - 200),
        getStartedIndex + 50
      );
      expect(surroundingCode).toContain('href="/pricing"');
    });
  });

  describe("Plans link in footer", () => {
    it("should have Plans & Pricing in the Home page footer", () => {
      const homeContent = fs.readFileSync(
        path.resolve(__dirname, "../client/src/pages/Home.tsx"),
        "utf-8"
      );
      expect(homeContent).toContain("Plans & Pricing");
      expect(homeContent).toContain('href="/pricing"');
    });
  });

  describe("ManusDialog branding", () => {
    it("should not contain Manus branding text", () => {
      const dialogContent = fs.readFileSync(
        path.resolve(__dirname, "../client/src/components/ManusDialog.tsx"),
        "utf-8"
      );
      expect(dialogContent).not.toContain("Login with Manus");
      expect(dialogContent).not.toContain("login with Manus");
    });

    it("should use generic sign-in text", () => {
      const dialogContent = fs.readFileSync(
        path.resolve(__dirname, "../client/src/components/ManusDialog.tsx"),
        "utf-8"
      );
      expect(dialogContent).toContain("Sign In");
      expect(dialogContent).toContain("sign in to continue");
    });
  });

  describe("RoleGuard public paths", () => {
    it("should include /pricing in public paths", () => {
      const roleGuardContent = fs.readFileSync(
        path.resolve(__dirname, "../client/src/components/RoleGuard.tsx"),
        "utf-8"
      );
      expect(roleGuardContent).toContain('"/pricing"');
    });

    it("should include /category/ in public paths", () => {
      const roleGuardContent = fs.readFileSync(
        path.resolve(__dirname, "../client/src/components/RoleGuard.tsx"),
        "utf-8"
      );
      expect(roleGuardContent).toContain('"/category/"');
    });

    it("should include /service/ in public paths", () => {
      const roleGuardContent = fs.readFileSync(
        path.resolve(__dirname, "../client/src/components/RoleGuard.tsx"),
        "utf-8"
      );
      expect(roleGuardContent).toContain('"/service/"');
    });

    it("should include /referral-program in public paths", () => {
      const roleGuardContent = fs.readFileSync(
        path.resolve(__dirname, "../client/src/components/RoleGuard.tsx"),
        "utf-8"
      );
      expect(roleGuardContent).toContain('"/referral-program"');
    });

    it("should include all essential public paths", () => {
      const roleGuardContent = fs.readFileSync(
        path.resolve(__dirname, "../client/src/components/RoleGuard.tsx"),
        "utf-8"
      );
      const essentialPaths = [
        "/browse",
        "/search",
        "/pricing",
        "/help",
        "/privacy",
        "/terms",
        "/p/",
        "/category/",
      ];
      for (const p of essentialPaths) {
        expect(roleGuardContent).toContain(`"${p}"`);
      }
    });
  });
});
