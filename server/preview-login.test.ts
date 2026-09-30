import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isUnpublishedPreviewHost } from "../client/src/lib/previewEnvironment";

const root = resolve(import.meta.dirname, "..");
const loginSource = readFileSync(resolve(root, "client/src/pages/Login.tsx"), "utf8");
const appSource = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");
const bannerSource = readFileSync(
  resolve(root, "client/src/components/shared/PreviewEnvironmentBanner.tsx"),
  "utf8",
);
const authRouterSource = readFileSync(resolve(root, "server/customAuthRouter.ts"), "utf8");
const userDbSource = readFileSync(resolve(root, "server/db/users.ts"), "utf8");

describe("unpublished preview login", () => {
  it("detects managed preview and loopback hosts without treating production as preview", () => {
    expect(isUnpublishedPreviewHost("3000-example.us1.manus.computer")).toBe(true);
    expect(isUnpublishedPreviewHost("localhost")).toBe(true);
    expect(isUnpublishedPreviewHost("127.0.0.1")).toBe(true);
    expect(isUnpublishedPreviewHost("ologycrew.com")).toBe(false);
    expect(isUnpublishedPreviewHost("www.ologycrew.com")).toBe(false);
    expect(isUnpublishedPreviewHost("ologycrew.com.attacker.example")).toBe(false);
  });

  it("guides preview users to a top-level tab and email/password authentication", () => {
    expect(loginSource).toContain("Sign in to test unpublished changes");
    expect(loginSource).toContain("Open preview in new tab");
    expect(loginSource).toContain("sign in to preview with email");
    expect(loginSource).toContain("Create or reset password");
    expect(loginSource).toContain('target="_blank"');
  });

  it("keeps Google OAuth on the registered production domain from preview", () => {
    expect(loginSource).toContain("Google sign-in on published site");
    expect(loginSource).toContain('ologyCrewPublicUrl("/forgot-password")');
    expect(loginSource).toContain("publishedLoginUrl");
    expect(loginSource).toContain("handleGoogleLogin");
  });

  it("allows an existing Google-only account to create a password without unlinking Google", () => {
    const resetBlock = userDbSource.slice(
      userDbSource.indexOf("export async function resetPassword"),
      userDbSource.indexOf("export async function updateUserPassword"),
    );
    expect(resetBlock).toContain("passwordHash: newPasswordHash");
    expect(resetBlock).not.toContain("googleId:");
    expect(resetBlock).not.toContain("authProvider:");
  });

  it("sends password-reset emails requested from preview back to the canonical production origin", () => {
    const forgotPasswordBlock = authRouterSource.slice(
      authRouterSource.indexOf('router.post("/api/auth/forgot-password"'),
      authRouterSource.indexOf('router.post("/api/auth/reset-password"'),
    );
    expect(forgotPasswordBlock).toContain("normalizeAuthOrigin(");
    expect(forgotPasswordBlock).toContain("requestOrigin(req)");
    expect(forgotPasswordBlock).toContain("${origin}/reset-password?token=${resetToken}");
  });

  it("shows a preview-only unpublished-code and live-data warning across the app", () => {
    expect(appSource).toContain("<PreviewEnvironmentBanner />");
    expect(bannerSource).toContain("Preview testing:");
    expect(bannerSource).toContain("unpublished code");
    expect(bannerSource).toContain("current OlogyCrew data");
  });
});
