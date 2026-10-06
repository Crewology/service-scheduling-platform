import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const page = () => read("client/src/pages/UserProfile.tsx");
const css = () => read("client/src/pages/UserProfile.css");

describe("My Account people-first palette", () => {
  it("is opt-in on the shared /account page rather than changing global or role themes", () => {
    expect(page()).toContain('import "./UserProfile.css"');
    expect(page()).toContain('className="min-h-screen bg-page ology-account-page"');
    expect(page()).toContain('ology-account-content');
    expect(css()).toContain('@import "../styles/publicBrandTokens.css"');
    expect(css()).toContain('.ology-account-page');
    expect(css()).not.toMatch(/(^|\n)\s*:(?:root|global)\s*\{/);
    expect(css()).not.toMatch(/(^|\n)\s*\.dark\s*\{/);
  });

  it("has distinct informational, completion, onboarding and security surfaces while preserving destructive red", () => {
    for (const selector of [
      ".ology-account-tip", ".ology-account-completion", ".ology-account-profile",
      ".ology-account-password", ".ology-account-security", ".ology-account-onboarding",
      ".ology-account-danger",
    ]) {
      expect(css()).toContain(selector);
      expect(page()).toContain(selector.slice(1));
    }
    expect(css()).toContain('var(--ology-brand-paper)');
    expect(css()).toContain('var(--ology-brand-deep)');
    expect(css()).toContain('var(--ology-brand-leaf)');
    expect(css()).toContain('var(--ology-brand-coral-hover)');
    expect(css()).toContain(':focus-visible');
    expect(css()).toContain('@media (prefers-reduced-motion: reduce)');
    expect(page()).toContain('border-red-200');
    expect(page()).toContain('variant="destructive"');
    expect(page()).toContain('bg-red-500');
    expect(page()).toContain('bg-green-500');
  });

  it("retains actual profile, security and deletion workflows and the provider-only business field", () => {
    const source = page();
    for (const call of [
      "trpc.auth.updateProfile.useMutation", "trpc.auth.uploadProfilePhoto.useMutation",
      "trpc.auth.removeProfilePhoto.useMutation", "trpc.provider.update.useMutation",
      "trpc.auth.get2FAStatus.useQuery", "trpc.auth.enable2FA.useMutation",
      "trpc.auth.disable2FA.useMutation", "trpc.auth.changePassword.useMutation",
      "trpc.auth.deleteAccount.useMutation",
    ]) expect(source).toContain(call);
    expect(source).toContain('<ImageCropper');
    expect(source).toContain('user?.role === "provider"');
    expect(source).toContain('user?.role !== "admin" && <DeleteAccountSection />');
    expect(source).toContain('confirmText !== "DELETE" || deleteAccount.isPending');
    expect(source).toContain('This information is never shared publicly.');
    expect(source).toContain('type="file"');
  });
});
