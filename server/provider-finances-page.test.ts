import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const readSource = (path: string) => readFileSync(resolve(root, path), "utf8");

const appSource = readSource("client/src/App.tsx");
const tabPageSource = readSource("client/src/pages/ProviderTabPage.tsx");
const dashboardSource = readSource("client/src/pages/ProviderDashboard.tsx");
const workspaceSource = readSource("client/src/pages/ProviderWorkspaceOverview.tsx");
const workspaceShellSource = readSource("client/src/components/provider/ProviderWorkspaceShell.tsx");
const customersSource = readSource("client/src/pages/ProviderCustomers.tsx");
const crmReadModelSource = readSource("server/db/crm/readModel.ts");

describe("dedicated provider Finances page", () => {
  it("registers a provider-only canonical Finances route", () => {
    expect(appSource).toContain('import { ProviderBookings, ProviderServices, ProviderFinances, ProviderTools, ProviderPayouts');
    expect(appSource).toContain('<Route path="/provider/finances">{() => <ProviderOnlyGuard featureName="Finances"><ProviderFinances /></ProviderOnlyGuard>}</Route>');
    expect(appSource.indexOf('path="/provider/finances"')).toBeLessThan(appSource.indexOf('path="/:slug"'));
  });

  it("reuses the complete existing Finances tab instead of duplicating finance logic", () => {
    expect(tabPageSource).toContain("export function ProviderFinances()");
    expect(tabPageSource).toContain('<ProviderDashboard initialTab="finances" hideChrome={true} workspaceActive="money" />');
    for (const content of [
      "Total Earnings",
      "This Month",
      "Pending Payouts",
      "Completed Jobs",
      "Recent Completed Bookings",
      "StripeConnectSection",
      "Subscription Plan",
      "Manage Subscription",
    ]) {
      expect(dashboardSource).toContain(content);
      expect(tabPageSource).not.toContain(content);
    }
  });

  it("points provider workspace Money navigation to the canonical page", () => {
    expect(workspaceSource).toContain('active="overview"');
    expect(workspaceShellSource).toContain('{ key: "money", label: "Money", icon: CircleDollarSign, href: "/provider/finances" }');
    expect(customersSource).toContain('<ProviderWorkspaceShell\n      active="customers"');
    expect(workspaceShellSource).not.toContain("/provider/dashboard?tab=finances");
    expect(customersSource).not.toContain("/provider/dashboard?tab=finances");
  });

  it("uses the canonical Finances page for provider payment activity", () => {
    expect(crmReadModelSource).toContain('if (event.entityType === "payment") return "/provider/finances";');
  });

  it("preserves legacy payout and dashboard-tab entry points", () => {
    expect(appSource).toContain('path="/provider/payouts"');
    expect(tabPageSource).toContain("export function ProviderPayouts()");
    expect(dashboardSource).toContain('value="finances"');
    expect(dashboardSource).toContain('params.get("tab") || "bookings"');
  });
});
