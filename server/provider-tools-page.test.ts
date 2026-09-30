import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const readSource = (path: string) => readFileSync(resolve(root, path), "utf8");

const appSource = readSource("client/src/App.tsx");
const tabPageSource = readSource("client/src/pages/ProviderTabPage.tsx");
const dashboardSource = readSource("client/src/pages/ProviderDashboard.tsx");
const shellSource = readSource("client/src/components/provider/ProviderWorkspaceShell.tsx");

describe("standalone provider Business Tools page", () => {
  it("registers a provider-only canonical Business Tools route", () => {
    expect(appSource).toContain("ProviderTools");
    expect(appSource).toContain('<Route path="/provider/tools">{() => <ProviderOnlyGuard featureName="Business Tools"><ProviderTools /></ProviderOnlyGuard>}</Route>');
    expect(appSource.indexOf('path="/provider/tools"')).toBeLessThan(appSource.indexOf('path="/:slug"'));
  });

  it("reuses the complete existing More tab inside the shared workspace shell", () => {
    expect(tabPageSource).toContain("export function ProviderTools()");
    expect(tabPageSource).toContain('<ProviderDashboard initialTab="settings" hideChrome={true} workspaceActive="more" />');
    expect(tabPageSource).not.toContain("trpc.");
    expect(dashboardSource).toContain('title: "Business Tools"');

    for (const content of [
      "Customer Reviews",
      "Promo & Referral Codes",
      "TipSettingsSection",
      "FreeEstimatesSection",
      "EmergencyServiceSection",
      "ReferProviderCard",
      "VerificationDocumentsTab",
    ]) {
      expect(dashboardSource).toContain(content);
    }
  });

  it("points shared and legacy dashboard More controls to the canonical page", () => {
    expect(shellSource.match(/href="\/provider\/tools"/g)?.length).toBe(1);
    expect(shellSource).toContain('href: "/provider/tools"');
    expect(shellSource).toContain("Business Tools");
    expect(dashboardSource.match(/href="\/provider\/tools"/g)?.length).toBe(2);
    expect(dashboardSource.match(/aria-label="Open Business Tools"/g)?.length).toBe(2);
    expect(shellSource).not.toContain("/provider/dashboard?tab=settings");
  });

  it("redirects the legacy dashboard settings URL to canonical Business Tools", () => {
    expect(appSource).toContain("function ProviderDashboardRoute()");
    expect(appSource).toContain('new URLSearchParams(window.location.search).get("tab") === "settings"');
    expect(appSource).toContain('setLocation("/provider/tools", { replace: true })');
    expect(appSource).toContain('path="/provider/dashboard" component={ProviderDashboardRoute}');
    expect(appSource).toContain("if (isLegacyBusinessToolsUrl) return null");
  });

  it("retains the legacy settings implementation only as the canonical page content source", () => {
    expect(dashboardSource).toContain('params.get("tab") || "bookings"');
    expect(dashboardSource).toContain('<TabsContent value="settings"');
    expect(tabPageSource).toContain('<ProviderDashboard initialTab="settings" hideChrome={true} workspaceActive="more" />');
  });
});
