import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const shell = read("client/src/components/provider/ProviderWorkspaceShell.tsx");
const theme = read("client/src/components/provider/ProviderWorkspaceTheme.css");
const overview = read("client/src/pages/ProviderWorkspaceOverview.css");
const bookings = read("client/src/pages/MyBookings.tsx");
const calendar = read("client/src/pages/ProviderCalendar.tsx");
const customers = read("client/src/pages/ProviderCustomers.tsx");
const detail = read("client/src/pages/ProviderCustomerDetail.tsx");
const dashboard = read("client/src/pages/ProviderDashboard.tsx");
const tabs = read("client/src/pages/ProviderTabPage.tsx");
const analytics = read("client/src/pages/ProviderAnalyticsPage.tsx");
const analyticsCss = read("client/src/pages/ProviderAnalyticsPage.css");
const welcome = read("client/src/components/customers/CustomersWelcomePopover.tsx");

const providerRoutes: Array<[string, string]> = [
  ["bookings", bookings], ["services", dashboard], ["calendar", calendar], ["money", dashboard],
  ["customers", customers], ["customers-detail", detail], ["more", dashboard],
];

describe("provider workspace palette extension", () => {
  it("opt-ins all shell routes while keeping the global bg-page token and unique Overview hero", () => {
    expect(shell).toContain('import "./ProviderWorkspaceTheme.css"');
    expect(shell).toContain('"min-h-[calc(100vh-4rem)] bg-page"');
    expect(shell).toContain('"ology-provider-workspace-surface"');
    expect(shell).toContain('active === "overview" ? "ology-provider-overview-surface" : undefined');
    expect(theme).toContain('@import "../../styles/publicBrandTokens.css"');
    expect(theme).toContain('background: var(--ology-brand-paper)');
    expect(theme).toContain('background: var(--ology-brand-surface)');
    expect(theme).not.toContain(":root {");
    expect(theme).not.toContain(".dark {");
    expect(overview).toContain("Overview-only accents complement ProviderWorkspaceTheme");
    for (const [route, source] of providerRoutes) {
      expect(source, `missing shell for ${route}`).toContain("<ProviderWorkspaceShell");
    }
  });

  it("keeps provider navigation, header actions and compact page titles intact", () => {
    expect(shell).toContain('aria-label="Provider workspace navigation"');
    expect(shell).toContain('aria-label="Provider mobile navigation"');
    expect(shell).toContain('aria-current={selected ? "page" : undefined}');
    expect(shell).toContain("ology-provider-workspace-heading");
    expect(theme).toContain('.ology-provider-workspace-heading [data-slot="button"]');
    for (const href of ["/my-bookings", "/provider/services", "/provider/calendar", "/provider/finances", "/provider/tools"]) {
      expect(shell).toContain(href);
    }
    expect(bookings).toContain('title="Bookings"');
    expect(calendar).toContain('title="My Calendar"');
    expect(customers).toContain('title="Customers"');
    expect(tabs).toContain('workspaceActive="money"');
    expect(tabs).toContain('workspaceActive="more"');
    expect(dashboard).toContain("StripeConnectSection");
  });

  it("styles neutral cards, active tabs and focus without overriding warnings, private-note actions or destructive buttons", () => {
    expect(theme).toContain('main [data-slot="card"].bg-card');
    expect(theme).toContain('[data-slot="tabs-trigger"][data-state="active"]');
    expect(theme).toContain('main nav[aria-label="Customers sections"] a[aria-current="page"]');
    expect(theme).toContain("main .ology-provider-workspace-info");
    expect(calendar).toContain('className="ology-provider-workspace-info mt-5 mb-6');
    expect(customers).toContain('className="ology-provider-workspace-info mt-5');
    expect(detail).toContain('className="ology-provider-workspace-info mt-5');
    expect(theme).toContain(':focus-visible');
    expect(theme).toContain('outline: 3px solid var(--ology-brand-coral-hover)');
    expect(theme).toContain('outline-color: var(--ology-brand-leaf)');
    expect(theme).toContain('@media (prefers-reduced-motion: reduce)');
    expect(theme).not.toContain(".bg-amber-50 {");
    expect(theme).not.toContain(".bg-red-50 {");
    expect(theme).not.toContain('button.bg-destructive');
    expect(calendar).toContain("STATUS_COLORS");
    expect(calendar).toContain("setShowSyncPanel(!showSyncPanel)");
    expect(customers).toContain("access.data.readOnlyReason");
    expect(detail).toContain("draftSendReadiness.allowed");
    expect(detail).toContain('variant="destructive"');
    expect(detail).toContain("confirmSend: true");
    expect(welcome).toContain('className="bg-[#123332] px-5 py-4 text-white"');
    expect(welcome).toContain('aria-label="Dismiss Customers welcome"');
    expect(welcome).toContain("Nothing sends automatically");
  });

  it("keeps My Bookings separate for customers and Analytics as a read-only report", () => {
    expect(bookings).toContain("if (!providerMode)");
    expect(bookings).toContain("<CustomerWorkspaceShell");
    expect(bookings).toContain("<ProviderWorkspaceShell");
    expect(bookings).toContain('providerMode={bookingView === "provider" && canSwitch}');
    expect(analytics).toContain('import "./ProviderAnalyticsPage.css"');
    expect(analytics).toContain("min-h-screen bg-page ology-provider-analytics-page");
    expect(analytics).toContain("trpc.provider.analytics.useQuery");
    expect(analytics).toContain('fill="#ef4444"');
    expect(analytics.split('breadcrumbs={[{ label: "Analytics" }]}').length - 1).toBe(3);
    expect(analytics).not.toContain('label: "Home", href: "/"');
    expect(analyticsCss).toContain(".ology-provider-analytics-page");
    expect(analyticsCss).not.toContain(":root {");
  });
});
