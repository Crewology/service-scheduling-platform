import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PROTOTYPE_ROUTES,
  createPrototypeBookingUrl,
  inferPrototypeBookingMode,
} from "../client/src/lib/uxPrototype";

const projectRoot = resolve(import.meta.dirname, "..");

describe("focused UX prototype", () => {
  describe("adaptive booking intent", () => {
    it("routes standardized services to direct booking", () => {
      expect(inferPrototypeBookingMode("Mobile barber tomorrow")).toBe("direct");
      expect(inferPrototypeBookingMode("A1 lead audio engineer")).toBe("direct");
      expect(inferPrototypeBookingMode("House cleaning this weekend")).toBe("direct");
    });

    it("routes complex projects and events to quote requests", () => {
      expect(inferPrototypeBookingMode("Audio engineer for a church event")).toBe("quote");
      expect(inferPrototypeBookingMode("Custom home renovation project")).toBe("quote");
      expect(inferPrototypeBookingMode("Repair and audio enhancement")).toBe("quote");
    });

    it("allows an explicit booking mode to override inferred intent", () => {
      const url = createPrototypeBookingUrl({
        query: "Custom event production",
        mode: "direct",
      });
      expect(url).toContain("mode=direct");
    });

    it("preserves search context and one-tap rebooking state", () => {
      const url = createPrototypeBookingUrl({
        query: "A1 Lead Audio Engineer",
        location: "Atlanta, GA",
        timing: "Choose a new date",
        mode: "direct",
        rebook: true,
      });
      const queryString = url.split("?")[1];
      const params = new URLSearchParams(queryString);

      expect(url.startsWith(PROTOTYPE_ROUTES.booking)).toBe(true);
      expect(params.get("query")).toBe("A1 Lead Audio Engineer");
      expect(params.get("location")).toBe("Atlanta, GA");
      expect(params.get("timing")).toBe("Choose a new date");
      expect(params.get("rebook")).toBe("1");
    });
  });

  describe("isolated review routes", () => {
    const appSource = readFileSync(resolve(projectRoot, "client/src/App.tsx"), "utf8");

    it("registers all prototype routes before the public slug fallback", () => {
      for (const route of Object.values(PROTOTYPE_ROUTES)) {
        expect(appSource).toContain(`path="${route}"`);
        expect(appSource.indexOf(`path="${route}"`)).toBeLessThan(appSource.indexOf('path="/:slug"'));
      }
    });

    it("keeps prototype pages free from live install and help overlays", () => {
      expect(appSource).toContain('const isPrototype = location.startsWith("/preview/")');
      expect(appSource).toContain("!isPrototype && <PWAInstallBanner />");
      expect(appSource).toContain("!isPrototype && <HelpChatWidget />");
    });

    it("does not replace the current production routes", () => {
      expect(appSource).toContain('path="/provider/dashboard"');
      expect(appSource).toContain('path="/my-bookings"');
      expect(appSource).toContain('path="/service/:id"');
    });
  });

  describe("prototype experience sections", () => {
    const providerSource = readFileSync(resolve(projectRoot, "client/src/pages/prototype/ProviderOverviewPrototype.tsx"), "utf8");
    const customerSource = readFileSync(resolve(projectRoot, "client/src/pages/prototype/CustomerHomePrototype.tsx"), "utf8");
    const bookingSource = readFileSync(resolve(projectRoot, "client/src/pages/prototype/AdaptiveBookingPrototype.tsx"), "utf8");

    it("prioritizes provider attention and quick actions", () => {
      expect(providerSource).toContain("Needs attention");
      expect(providerSource).toContain("Quick actions");
      expect(providerSource).toContain("Business pulse");
    });

    it("prioritizes customer search and one-tap rebooking", () => {
      expect(customerSource).toContain("What do you need help with?");
      expect(customerSource).toContain("Book again");
      expect(customerSource).toContain("rebook(provider)");
    });

    it("includes both adaptive conversion outcomes", () => {
      expect(bookingSource).toContain("Direct booking path");
      expect(bookingSource).toContain("Quote request path");
      expect(bookingSource).toContain("switchMode");
    });
  });
});
