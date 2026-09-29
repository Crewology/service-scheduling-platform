import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const providerDashboard = readFileSync(resolve(root, "client/src/pages/ProviderDashboard.tsx"), "utf8");
const providerWorkspace = readFileSync(resolve(root, "client/src/pages/ProviderWorkspaceOverview.tsx"), "utf8");
const appRoutes = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");

describe("Provider Dashboard Bookings navigation", () => {
  it("routes both desktop and mobile Bookings controls to My Bookings", () => {
    const legacyDashboardLinks = providerDashboard.match(/<Link\s+href="\/my-bookings"/g) ?? [];
    const activeWorkspaceLinks = providerWorkspace.match(/label: "Bookings", icon: CalendarDays, href: "\/my-bookings"/g) ?? [];

    expect(legacyDashboardLinks).toHaveLength(2);
    expect(activeWorkspaceLinks).toHaveLength(2);
    expect(providerDashboard.match(/aria-label="Open My Bookings"/g)).toHaveLength(2);
    expect(providerDashboard).not.toContain('<TabsTrigger value="bookings"');
    expect(providerDashboard).not.toContain('{ value: "bookings", icon: Calendar, label: "Bookings" }');
    expect(providerWorkspace).not.toContain('label: "Bookings", icon: CalendarDays, href: "/provider/dashboard?tab=bookings"');
  });

  it("keeps the real My Bookings route and existing dashboard booking workspace intact", () => {
    expect(appRoutes).toContain('<Route path="/my-bookings" component={MyBookings} />');
    expect(providerDashboard).toContain('<TabsContent value="bookings"');
    expect(providerDashboard).toContain('trpc.booking.listForProvider.useQuery');
    expect(providerDashboard).toContain('href={`/booking/${booking.id}/detail`}');
  });
});
