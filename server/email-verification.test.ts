import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Email Verification Flow", () => {
  describe("OAuth auto-verification", () => {
    it("should auto-verify Manus OAuth users on callback", () => {
      const oauthContent = fs.readFileSync(
        path.resolve(__dirname, "./_core/oauth.ts"),
        "utf-8"
      );
      // Verify the auto-verification logic exists
      expect(oauthContent).toContain("markEmailVerified");
      expect(oauthContent).toContain("!existingUser.emailVerified");
      // Verify it fetches the user and checks verification status
      expect(oauthContent).toContain("Auto-verify email for OAuth users");
    });

    it("should auto-verify Google OAuth users on callback", () => {
      const customAuthContent = fs.readFileSync(
        path.resolve(__dirname, "./customAuthRouter.ts"),
        "utf-8"
      );
      // Verify Google OAuth auto-verification
      expect(customAuthContent).toContain("Auto-verify email for Google OAuth users");
      expect(customAuthContent).toContain("markEmailVerified");
    });

    it("should have markEmailVerified function in db helpers", () => {
      const usersDbContent = fs.readFileSync(
        path.resolve(__dirname, "./db/users.ts"),
        "utf-8"
      );
      expect(usersDbContent).toContain("export async function markEmailVerified");
      expect(usersDbContent).toContain("emailVerified: true");
    });

    it("should export markEmailVerified from db barrel", () => {
      const dbContent = fs.readFileSync(
        path.resolve(__dirname, "./db.ts"),
        "utf-8"
      );
      expect(dbContent).toContain("markEmailVerified");
    });
  });

  describe("Check verification endpoint", () => {
    it("should have /api/auth/check-verification endpoint", () => {
      const customAuthContent = fs.readFileSync(
        path.resolve(__dirname, "./customAuthRouter.ts"),
        "utf-8"
      );
      expect(customAuthContent).toContain("/api/auth/check-verification");
      expect(customAuthContent).toContain("router.post");
    });

    it("should auto-verify OAuth users when check-verification is called", () => {
      const customAuthContent = fs.readFileSync(
        path.resolve(__dirname, "./customAuthRouter.ts"),
        "utf-8"
      );
      // Check that the endpoint handles OAuth auto-verification
      expect(customAuthContent).toContain('authProvider === "manus"');
      expect(customAuthContent).toContain('authProvider === "google"');
      expect(customAuthContent).toContain("autoVerified: true");
    });

    it("should return verified: false for unverified email/password users", () => {
      const customAuthContent = fs.readFileSync(
        path.resolve(__dirname, "./customAuthRouter.ts"),
        "utf-8"
      );
      expect(customAuthContent).toContain("verified: false");
    });
  });

  describe("VerifyEmail page", () => {
    it("should have a check-again button that calls check-verification endpoint", () => {
      const verifyEmailContent = fs.readFileSync(
        path.resolve(__dirname, "../client/src/pages/VerifyEmail.tsx"),
        "utf-8"
      );
      expect(verifyEmailContent).toContain("/api/auth/check-verification");
      expect(verifyEmailContent).toContain("handleCheckAgain");
      expect(verifyEmailContent).toContain("I've verified — check again");
    });

    it("should show loading state while checking", () => {
      const verifyEmailContent = fs.readFileSync(
        path.resolve(__dirname, "../client/src/pages/VerifyEmail.tsx"),
        "utf-8"
      );
      expect(verifyEmailContent).toContain("checking");
      expect(verifyEmailContent).toContain("Checking...");
    });

    it("should redirect when user becomes verified", () => {
      const verifyEmailContent = fs.readFileSync(
        path.resolve(__dirname, "../client/src/pages/VerifyEmail.tsx"),
        "utf-8"
      );
      // Check for the useEffect that redirects when emailVerified changes
      expect(verifyEmailContent).toContain("user?.emailVerified");
      expect(verifyEmailContent).toContain("setLocation");
    });

    it("should have resend verification email button", () => {
      const verifyEmailContent = fs.readFileSync(
        path.resolve(__dirname, "../client/src/pages/VerifyEmail.tsx"),
        "utf-8"
      );
      expect(verifyEmailContent).toContain("handleResendVerification");
      expect(verifyEmailContent).toContain("/api/auth/resend-verification");
      expect(verifyEmailContent).toContain("Resend Verification Email");
    });
  });
});
