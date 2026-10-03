import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const providerDashboard = readFileSync(resolve(root, "client/src/pages/ProviderDashboard.tsx"), "utf8");
const providerWorkspace = readFileSync(resolve(root, "client/src/pages/ProviderWorkspaceOverview.tsx"), "utf8");
const providerWorkspaceShell = readFileSync(resolve(root, "client/src/components/provider/ProviderWorkspaceShell.tsx"), "utf8");
const appRoutes = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");

describe("Provider Dashboard Bookings navigation", () => {
  it("routes both desktop and mobile Bookings controls to My Bookings", () => {
    const legacyDashboardLinks = providerDashboard.match(/<Link\s+href="\/my-bookings"/g) ?? [];
    const activeWorkspaceLinks = providerWorkspaceShell.match(/label: "Bookings", icon: CalendarDays, href: "\/my-bookings"/g) ?? [];

    expect(legacyDashboardLinks).toHaveLength(2);
    expect(activeWorkspaceLinks).toHaveLength(2);
    expect(providerDashboard.match(/aria-label="Open My Bookings"/g)).toHaveLength(2);
    expect(providerDashboard).not.toContain('<TabsTrigger value="bookings"');
    expect(providerDashboard).not.toContain('{ value: "bookings", icon: Calendar, label: "Bookings" }');
    expect(providerWorkspaceShell).not.toContain('label: "Bookings", icon: CalendarDays, href: "/provider/dashboard?tab=bookings"');
  });

  it("uses Bookings instead of Share page in the Provider Overview header at every breakpoint", () => {
    const overviewHeader = providerWorkspace.slice(
      providerWorkspace.indexOf('<section className="ology-provider-hero'),
      providerWorkspace.indexOf("<ProviderSetupChecklist"),
    );

    expect(overviewHeader).toContain('<Link href="/my-bookings" aria-label="Open My Bookings">');
    expect(overviewHeader).toContain('<CalendarDays className="mr-2 h-4 w-4" />Bookings');
    expect(overviewHeader).not.toContain("Share page");
    expect(providerWorkspace).toContain('title="Copy or share your public OlogyCrew business link"');
  });

  it("keeps the real My Bookings route and existing dashboard booking workspace intact", () => {
    expect(appRoutes).toContain('<Route path="/my-bookings" component={MyBookings} />');
    expect(providerDashboard).toContain('<TabsContent value="bookings"');
    expect(providerDashboard).toContain('trpc.booking.listForProvider.useQuery');
    expect(providerDashboard).toContain('href={`/booking/${booking.id}/detail`}');
  });
});

describe("Provider Dashboard My Page navigation", () => {
  it("routes the active Provider Workspace My Page item to the signed-in provider's public slug", () => {
    expect(providerWorkspace).toContain('profileSlug={data.provider.profileSlug}');
    expect(providerWorkspaceShell).toContain('item.key === "page" && profileSlug');
    expect(providerWorkspaceShell).toContain('{ key: "page", label: "My Page", icon: Store, href: "/provider/dashboard?tab=my-page" }');
  });

  it("routes both legacy desktop and mobile My Page controls to the public slug", () => {
    expect(providerDashboard).toContain('const providerPublicPageHref = provider.profileSlug ? `/${provider.profileSlug}` : null;');
    expect(providerDashboard.match(/aria-label="Open my public provider page"/g)).toHaveLength(2);
    expect(providerDashboard.match(/href=\{providerPublicPageHref\}/g)).toHaveLength(2);
  });

  it("retains setup access when a provider has not created a public slug", () => {
    expect(providerDashboard).toContain('<TabsTrigger value="my-page"');
    expect(providerDashboard).toContain('setActiveTab("my-page")');
    expect(appRoutes).toContain('<Route path="/:slug" component={PublicProviderProfile} />');
  });
});
