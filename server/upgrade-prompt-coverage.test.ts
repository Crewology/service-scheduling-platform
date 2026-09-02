import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isPlanGateError } from "../client/src/lib/upgradeGate";

const root = resolve(process.cwd());
const source = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("shared upgrade recovery", () => {
  it("recognizes subscription FORBIDDEN responses without treating unrelated permission errors as plan gates", () => {
    expect(isPlanGateError({ data: { code: "FORBIDDEN" }, message: "Upgrade your plan to save more" })).toBe(true);
    expect(isPlanGateError({ data: { code: "FORBIDDEN" }, message: "You do not own this booking" })).toBe(false);
    expect(isPlanGateError({ data: { code: "BAD_REQUEST" }, message: "Upgrade your plan" })).toBe(false);
  });

  it("uses one saved-provider control with a customer upgrade modal across search, category, and public profile", () => {
    const control = source("client/src/components/SaveProviderButton.tsx");
    expect(control).toContain("isPlanGateError(error)");
    expect(control).toContain("<UpgradeModal");
    for (const page of ["Search.tsx", "CategoryDetail.tsx", "PublicProviderProfile.tsx"]) {
      expect(source(`client/src/pages/${page}`)).toContain("<SaveProviderButton");
    }
  });

  it("routes folder and bulk-quote limits into reason-aware customer upgrade guidance", () => {
    const savedProviders = source("client/src/pages/SavedProviders.tsx");
    const bulkQuote = source("client/src/components/BulkQuoteModal.tsx");
    const modal = source("client/src/components/UpgradeModal.tsx");
    expect(savedProviders).toContain('setUpgradeReason("folders")');
    expect(savedProviders).toContain('setUpgradeReason("bulk_quotes")');
    expect(bulkQuote).toContain("onUpgradeRequired?.()");
    expect(modal).toContain("Send Bulk Quote Requests");
  });

  it("routes custom profile URL restrictions into the provider upgrade dialog", () => {
    for (const page of ["ProviderMyPage.tsx", "ProviderDashboard.tsx"]) {
      const contents = source(`client/src/pages/${page}`);
      expect(contents).toContain('reason="custom_slug"');
      expect(contents).toContain("isPlanGateError");
    }
  });

  it("keeps existing explicit recovery for payment setup and customer analytics", () => {
    const providerDashboard = source("client/src/pages/ProviderDashboard.tsx");
    expect(providerDashboard).toContain("Payment account setup requires a Pro");
    expect(providerDashboard).toContain('reason="payments"');
    expect(providerDashboard).toContain("setUpgradeOpen(true)");
    expect(source("client/src/pages/BookingAnalytics.tsx")).toContain('error?.data?.code === "FORBIDDEN"');
  });
});
