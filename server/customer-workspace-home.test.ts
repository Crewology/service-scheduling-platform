import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CUSTOMER_UPCOMING_STATUSES,
  customerDateKey,
  customerRebookHref,
  customerSearchHref,
} from "../shared/customerHomeLogic";

const projectRoot = resolve(import.meta.dirname, "..");
const homeSource = readFileSync(resolve(projectRoot, "client/src/pages/LoggedInHome.tsx"), "utf8");
const customerSource = readFileSync(resolve(projectRoot, "client/src/pages/CustomerWorkspaceHome.tsx"), "utf8");
const routerSource = readFileSync(resolve(projectRoot, "server/customerHomeRouter.ts"), "utf8");
const searchSource = readFileSync(resolve(projectRoot, "client/src/pages/Search.tsx"), "utf8");
const viewModeSource = readFileSync(resolve(projectRoot, "client/src/contexts/ViewModeContext.tsx"), "utf8");

describe("customer workspace home", () => {
  it("normalizes persisted booking dates", () => {
    expect(customerDateKey("2026-09-02")).toBe("2026-09-02");
    expect(customerDateKey(new Date("2026-09-02T12:00:00.000Z"))).toBe("2026-09-02");
  });

  it("recognizes actionable upcoming booking states", () => {
    expect([...CUSTOMER_UPCOMING_STATUSES]).toEqual(["pending", "confirmed", "in_progress"]);
  });

  it("builds a one-tap rebooking URL with provider context", () => {
    const href = customerRebookHref(330003, "chisolm-audio");
    expect(href).toBe("/service/330003?rebook=1&from_provider=chisolm-audio");
  });

  it("preserves need, place, and timing search context", () => {
    const href = customerSearchHref({
      query: "audio engineer for an event",
      location: "Atlanta, GA",
      timing: "This weekend",
    });
    const params = new URLSearchParams(href.split("?")[1]);
    expect(href.startsWith("/search?")).toBe(true);
    expect(params.get("q")).toBe("audio engineer for an event");
    expect(params.get("location")).toBe("Atlanta, GA");
    expect(params.get("timing")).toBe("This weekend");
  });

  it("replaces only the customer launchpad branch", () => {
    expect(homeSource).toContain("<CustomerWorkspaceHome />");
    expect(homeSource).toContain("<ProviderWorkspaceOverview />");
    expect(homeSource).not.toContain("CUSTOMER_TILES");
  });

  it("loads actions, upcoming bookings, and rebooking history from existing tables", () => {
    for (const table of ["bookings", "quoteRequests", "reviews", "serviceProviders", "services"]) {
      expect(routerSource).toContain(table);
    }
    expect(routerSource).toContain("eq(bookings.customerId, ctx.user.id)");
    expect(routerSource).toContain("eq(quoteRequests.customerId, ctx.user.id)");
  });

  it("prioritizes the approved need-first sections", () => {
    for (const section of ["What do you need help with?", "Needs your action", "Upcoming", "Book again", "Explore by need"]) {
      expect(customerSource).toContain(section);
    }
  });

  it("keeps secondary customer tools available without restoring the app grid", () => {
    for (const route of ["/saved-providers", "/my-quotes", "/receipts", "/referral-program", "/customer/subscription", "/messages"]) {
      expect(customerSource).toContain(route);
    }
  });

  it("uses honest empty and recovery states without fabricated service history", () => {
    expect(customerSource).toContain("You’re all caught up");
    expect(customerSource).toContain("No upcoming bookings");
    expect(customerSource).toContain("Your trusted providers will appear here");
    expect(customerSource).not.toContain("Maria Mobile Salon");
    expect(routerSource).not.toContain("Chisolm Audio");
  });

  it("preserves location and timing context on the live search screen", () => {
    expect(searchSource).toContain('urlParams.get("location")');
    expect(searchSource).toContain('urlParams.get("timing")');
    expect(searchSource).toContain("Requested timing:");
  });

  it("does not reset an admin-provider customer view while the profile is loading", () => {
    expect(viewModeSource).toContain("providerProfileLoading");
    expect(viewModeSource).toContain("if (isAdmin && providerProfileLoading) return;");
  });
});
