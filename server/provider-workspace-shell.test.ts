import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd());
const readSource = (path: string) => readFileSync(resolve(root, path), "utf8");

const shellSource = readSource("client/src/components/provider/ProviderWorkspaceShell.tsx");
const overviewSource = readSource("client/src/pages/ProviderWorkspaceOverview.tsx");
const bookingsSource = readSource("client/src/pages/MyBookings.tsx");
const dashboardSource = readSource("client/src/pages/ProviderDashboard.tsx");
const tabPageSource = readSource("client/src/pages/ProviderTabPage.tsx");

describe("shared Provider Workspace visual system", () => {
  it("centralizes desktop and mobile navigation with canonical provider destinations", () => {
    expect(shellSource).toContain('aria-label="Provider workspace navigation"');
    expect(shellSource).toContain('aria-label="Provider mobile navigation"');
    expect(shellSource).toContain('aria-current={selected ? "page" : undefined}');

    for (const href of [
      'href: "/"',
      'href: "/my-bookings"',
      'href: "/provider/services"',
      'href: "/provider/calendar"',
      'href: "/provider/finances"',
    ]) {
      expect(shellSource).toContain(href);
    }
    expect(shellSource).not.toContain('/provider/dashboard?tab=services" },');
    expect(shellSource).not.toContain('/provider/dashboard?tab=finances');
  });

  it("uses one shell across Overview, provider Bookings, Services, and Money", () => {
    expect(overviewSource).toContain('<ProviderWorkspaceShell\n      active="overview"');
    expect(bookingsSource).toContain('active="bookings"');
    expect(tabPageSource).toContain('workspaceActive="services"');
    expect(tabPageSource).toContain('workspaceActive="money"');
    expect(dashboardSource).toContain("<ProviderDashboardFrame");
    expect(dashboardSource).toContain("<ProviderWorkspacePageHeader");
  });

  it("keeps the large greeting unique to Overview and gives subpages compact headers", () => {
    expect(overviewSource).toContain("{greeting()}, {firstName}.");
    expect(bookingsSource).not.toContain("greeting()");
    expect(dashboardSource).not.toContain("greeting()");
    expect(bookingsSource).toContain('title="Bookings"');
    expect(dashboardSource).toContain('title: "Services"');
    expect(dashboardSource).toContain('title: "Money"');
  });

  it("applies the Bookings shell only in provider view and retains the customer container", () => {
    expect(bookingsSource).toContain('if (!providerMode) return <div className="container py-8 max-w-5xl">{children}</div>;');
    expect(bookingsSource).toContain('providerMode={bookingView === "provider" && canSwitch}');
    expect(bookingsSource).toContain('{bookingView !== "provider" || !canSwitch ? <div');
    expect(bookingsSource).toContain('bookingView === "customer" && customerSubscription?.currentTier === "business"');
    expect(bookingsSource).toContain("<CustomerQuotesSection />");
  });

  it("preserves existing service and finance implementations instead of duplicating data behavior", () => {
    for (const token of [
      "trpc.service.update.useMutation",
      "trpc.service.delete.useMutation",
      "PortfolioGallery",
      "PackagesList",
      "StripeConnectSection",
      "trpc.provider.earnings.useQuery",
      "Manage Subscription",
    ]) {
      expect(dashboardSource).toContain(token);
    }
    expect(tabPageSource).not.toContain("trpc.");
  });
});
