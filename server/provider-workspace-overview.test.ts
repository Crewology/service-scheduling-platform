import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACTIVE_PROVIDER_BOOKING_STATUSES,
  hasProviderScheduleConflict,
  providerDateKey,
  providerTimeMinutes,
} from "./providerOverviewLogic";

const projectRoot = resolve(import.meta.dirname, "..");
const homeSource = readFileSync(resolve(projectRoot, "client/src/pages/LoggedInHome.tsx"), "utf8");
const overviewSource = readFileSync(resolve(projectRoot, "client/src/pages/ProviderWorkspaceOverview.tsx"), "utf8");
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

  it("replaces only the provider branch and preserves the customer launchpad", () => {
    expect(homeSource).toContain("<ProviderWorkspaceOverview />");
    expect(homeSource).toContain("const CUSTOMER_TILES");
    expect(homeSource).toContain("const tiles = CUSTOMER_TILES");
  });

  it("keeps onboarding gating ahead of the live provider Overview", () => {
    expect(homeSource.indexOf("!onboardingStatus.steps1to4Complete")).toBeLessThan(
      homeSource.indexOf("<ProviderWorkspaceOverview />"),
    );
  });

  it("uses one real-data Overview query and disables duplicate customer badge queries", () => {
    expect(overviewSource).toContain("trpc.providerOverview.get.useQuery");
    expect(homeSource).toContain("enabled: !isProviderView");
  });

  it("maps the four approved information groups and six provider destinations", () => {
    for (const section of ["Needs attention", "Today", "Quick actions", "Business pulse"]) {
      expect(overviewSource).toContain(section);
    }
    for (const destination of ["Overview", "Bookings", "Services", "Calendar", "Money", "My Page"]) {
      expect(overviewSource).toContain(`label: "${destination}"`);
    }
  });

  it("builds attention and pulse data from existing database helpers", () => {
    for (const helper of ["getProviderBookings", "getServicesByProviderId", "getQuotesByProvider", "getProviderSubscription", "getProviderEarnings", "getCustomerRetention"]) {
      expect(routerSource).toContain(`${helper}(`);
    }
    expect(routerSource).toContain("getInvoicesByProvider(provider.id)");
  });

  it("contains real empty, setup, and conflict states rather than demo business metrics", () => {
    expect(overviewSource).toContain("You are caught up");
    expect(overviewSource).toContain("No services scheduled today");
    expect(overviewSource).toContain("No schedule conflicts detected today");
    expect(routerSource).toContain("Finish payment setup");
    expect(overviewSource).not.toContain("4,860");
  });
});
