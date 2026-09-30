import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const footerSource = readFileSync(
  resolve(root, "client/src/components/shared/Footer.tsx"),
  "utf8",
);

describe("public footer", () => {
  it("opens with clear customer and provider acquisition paths", () => {
    expect(footerSource).toContain("One platform, two clear paths");
    expect(footerSource).toContain("Looking for a service?");
    expect(footerSource).toContain("Explore trusted providers.");
    expect(footerSource).toContain("Growing a service business?");
    expect(footerSource).toContain("Get started as a provider.");
    expect(footerSource).toContain('href="/browse"');
    expect(footerSource).toContain('href="/pricing"');
  });

  it("uses public Explore, Provider, and Company & Support navigation groups", () => {
    for (const label of [
      "Explore Services",
      "Pricing",
      "Build Your Business Page",
      "Provider Plans",
      "Sign In",
      "Referral Program",
      "Help Center",
      "Contact Support",
    ]) {
      expect(footerSource).toContain(label);
    }

    expect(footerSource).toContain('aria-label="Explore footer navigation"');
    expect(footerSource).toContain('aria-label="Provider footer navigation"');
    expect(footerSource).toContain('aria-label="Company and support footer navigation"');
  });

  it("removes signed-in workspace destinations from public footer navigation", () => {
    for (const destination of [
      'href="/my-bookings"',
      'href="/provider/dashboard"',
      'href="/provider/services/new"',
      'href="/provider/availability"',
    ]) {
      expect(footerSource).not.toContain(destination);
    }

    for (const label of ["My Bookings", "My Dashboard", "Add Service", "Manage Availability"]) {
      expect(footerSource).not.toContain(label);
    }
  });

  it("keeps legal, install, and secure-payment information in the lower strip", () => {
    expect(footerSource).toContain('aria-label="Legal footer navigation"');
    expect(footerSource).toContain('href="/terms"');
    expect(footerSource).toContain('href="/privacy"');
    expect(footerSource).toContain("Install App");
    expect(footerSource).toContain("Secure checkout");
    expect(footerSource).toContain("<PaymentMethods");
  });
});
