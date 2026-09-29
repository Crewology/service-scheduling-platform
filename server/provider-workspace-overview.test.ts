import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACTIVE_PROVIDER_BOOKING_STATUSES,
  buildProviderSetupProgress,
  hasProviderScheduleConflict,
  providerDateKey,
  providerTimeMinutes,
} from "./providerOverviewLogic";

const projectRoot = resolve(import.meta.dirname, "..");
const homeSource = readFileSync(resolve(projectRoot, "client/src/pages/LoggedInHome.tsx"), "utf8");
const overviewSource = readFileSync(resolve(projectRoot, "client/src/pages/ProviderWorkspaceOverview.tsx"), "utf8");
const setupSource = readFileSync(resolve(projectRoot, "client/src/components/provider/ProviderSetupChecklist.tsx"), "utf8");
const dashboardSource = readFileSync(resolve(projectRoot, "client/src/pages/ProviderDashboard.tsx"), "utf8");
const shellSource = readFileSync(resolve(projectRoot, "client/src/components/provider/ProviderWorkspaceShell.tsx"), "utf8");
const routerSource = readFileSync(resolve(projectRoot, "server/providerOverviewRouter.ts"), "utf8");

describe("provider workspace Overview", () => {
  it("normalizes database dates to the provider-local date key", () => {
    expect(providerDateKey("2026-09-02T14:30:00.000Z")).toBe("2026-09-02");
    expect(providerDateKey(new Date("2026-09-02T14:30:00.000Z"))).toBe("2026-09-02");
  });

  it("converts schedule times for overlap comparison", () => {
    expect(providerTimeMinutes("10:30:00")).toBe(630);
    expect(providerTimeMinutes("17:00")).toBe(1020);
  });

  it("detects an overlapping provider schedule", () => {
    expect(hasProviderScheduleConflict([
      { time: "09:00", endTime: "11:00" },
      { time: "10:30", endTime: "12:00" },
    ])).toBe(true);
    expect(hasProviderScheduleConflict([
      { time: "09:00", endTime: "10:00" },
      { time: "10:00", endTime: "11:00" },
    ])).toBe(false);
  });

  it("treats only actionable booking statuses as active", () => {
    expect([...ACTIVE_PROVIDER_BOOKING_STATUSES]).toEqual(["pending", "confirmed", "in_progress"]);
  });

  it("builds the approved seven-step setup progress and chooses the next unfinished action", () => {
    const setup = buildProviderSetupProgress({
      hasPhoto: true,
      hasBio: true,
      hasCategories: true,
      hasServices: true,
      hasAvailability: true,
      hasPortfolio: false,
      hasStripe: false,
    });

    expect(setup.steps.map((step) => step.id)).toEqual([
      "photo",
      "bio",
      "categories",
      "services",
      "availability",
      "portfolio",
      "stripe",
    ]);
    expect(setup.completedCount).toBe(5);
    expect(setup.totalSteps).toBe(7);
    expect(setup.progress).toBe(71);
    expect(setup.nextStep).toMatchObject({
      id: "portfolio",
      actionLabel: "Upload",
      href: "/provider/services?portfolio=upload#portfolio-work-samples",
    });
  });

  it("marks setup complete when every authoritative criterion is satisfied", () => {
    const setup = buildProviderSetupProgress({
      hasPhoto: true,
      hasBio: true,
      hasCategories: true,
      hasServices: true,
      hasAvailability: true,
      hasPortfolio: true,
      hasStripe: true,
    });

    expect(setup.progress).toBe(100);
    expect(setup.nextStep).toBeNull();
  });

  it("replaces only the provider branch and preserves the focused customer workspace", () => {
    expect(homeSource).toContain("<ProviderWorkspaceOverview />");
    expect(homeSource).toContain("<CustomerWorkspaceHome />");
    expect(homeSource).not.toContain("PROVIDER_TILES");
    expect(homeSource).not.toContain("CUSTOMER_TILES");
  });

  it("keeps onboarding gating ahead of the live provider Overview", () => {
    expect(homeSource.indexOf("!onboardingStatus.steps1to4Complete")).toBeLessThan(
      homeSource.indexOf("<ProviderWorkspaceOverview />"),
    );
  });

  it("uses one real-data Overview query without restoring duplicate launchpad badge queries", () => {
    expect(overviewSource).toContain("trpc.providerOverview.get.useQuery");
    expect(setupSource).not.toContain("trpc.");
    expect(homeSource).not.toContain("getUnreadCount.useQuery");
    expect(homeSource).not.toContain("countUnread.useQuery");
  });

  it("places a compact expandable setup card between the welcome header and Needs Attention", () => {
    const setupIndex = overviewSource.indexOf("<ProviderSetupChecklist");
    expect(setupIndex).toBeGreaterThan(overviewSource.indexOf("Your page is live and bookable"));
    expect(setupIndex).toBeLessThan(overviewSource.indexOf('aria-labelledby="attention-heading"'));
    expect(setupSource).toContain("Complete your setup");
    expect(setupSource).toContain("View all steps");
    expect(setupSource).toContain('aria-expanded={expanded}');
    expect(setupSource).toContain("Dismiss setup checklist");
    expect(setupSource).toContain("setup.completedCount === setup.totalSteps");
    expect(dashboardSource).toContain('id="portfolio-work-samples"');
    expect(dashboardSource).toContain('params.get("portfolio") === "upload"');
    expect(dashboardSource).toContain("setShowPortfolioUpload(true)");
  });

  it("maps the four approved information groups and six provider destinations", () => {
    for (const section of ["Needs attention", "Today", "Quick actions", "Business pulse"]) {
      expect(overviewSource).toContain(section);
    }
    for (const destination of ["Overview", "Bookings", "Services", "My Calendar", "Money", "My Page"]) {
      expect(shellSource).toContain(`label: "${destination}"`);
    }
    expect(shellSource).toContain('{ key: "bookings", label: "Bookings", icon: CalendarDays, href: "/my-bookings" }');
    expect(shellSource).toContain('{ key: "services", label: "Services", icon: BriefcaseBusiness, href: "/provider/services" }');
    expect(shellSource).toContain('{ key: "calendar", label: "My Calendar", icon: CalendarClock, href: "/provider/calendar" }');
    expect(shellSource).toContain('{ key: "money", label: "Money", icon: CircleDollarSign, href: "/provider/finances" }');
    expect(shellSource).not.toContain("/provider/dashboard?tab=finances");
    expect(shellSource).not.toContain("/provider/dashboard?tab=schedule");
    expect(overviewSource).toContain('active="overview"');
  });

  it("builds attention and pulse data from existing database helpers", () => {
    for (const helper of ["getProviderBookings", "getServicesByProviderId", "getQuotesByProvider", "getProviderSubscription", "getProviderEarnings", "getCustomerRetention"]) {
      expect(routerSource).toContain(`${helper}(`);
    }
    expect(routerSource).toContain("getInvoicesByProvider(provider.id)");
    for (const helper of ["getProviderCategories", "getPortfolioByProvider", "getAvailabilityByProvider", "buildProviderSetupProgress"]) {
      expect(routerSource).toContain(`${helper}(`);
    }
  });

  it("contains real empty, setup, and conflict states rather than demo business metrics", () => {
    expect(overviewSource).toContain("You are caught up");
    expect(overviewSource).toContain("No services scheduled today");
    expect(overviewSource).toContain("No schedule conflicts detected today");
    expect(routerSource).toContain("Finish payment setup");
    expect(overviewSource).not.toContain("4,860");
  });
});
