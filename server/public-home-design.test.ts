import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const homeSource = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");

describe("public homepage design alignment", () => {
  it("uses the shared page canvas and a rounded dark-blue hero", () => {
    expect(homeSource).toContain('className="min-h-screen bg-page"');
    expect(homeSource).toContain('rounded-[2rem] bg-[#123f63]');
    expect(homeSource).toContain('lg:grid-cols-[1.05fr_0.95fr]');
    expect(homeSource).not.toContain("py-14 sm:py-20 md:py-32 bg-gradient-to-br");
  });

  it("places a clear Explore search composer inside the hero", () => {
    expect(homeSource).toContain('aria-label="Find services"');
    expect(homeSource).toContain('aria-label="Search services or providers"');
    expect(homeSource).toContain("Describe what you need.");
    expect(homeSource).toContain("Find services");
    expect(homeSource).toContain("`/browse?q=${encodeURIComponent(searchTerm.trim())}`");
  });

  it("uses the current rounded card, eyebrow, and spacing system", () => {
    expect(homeSource).toContain('className="container mt-8 space-y-8');
    expect(homeSource).toContain("rounded-3xl border border-slate-200 bg-white");
    expect(homeSource).toContain("uppercase tracking-[0.16em] text-blue-700");
    expect(homeSource).toContain("shadow-[0_20px_60px_-48px_rgba(15,23,42,0.55)]");
  });

  it("preserves the complete homepage content and public destinations", () => {
    for (const content of [
      "Your Profile",
      "Your Services",
      "Your Availability",
      "Your Bookings",
      "Your Payments",
      "Your Invoices",
      "Everything in one place",
      "No Gatekeeping",
      "Explore 48+ Service Categories",
      "Featured Professionals",
      "Refer & Earn Rewards",
      "Ready to build your digital home?",
    ]) {
      expect(homeSource).toContain(content);
    }

    expect(homeSource).toContain('href="/browse"');
    expect(homeSource).toContain('href="/pricing"');
    expect(homeSource).toContain('href="/referral-program"');
  });

  it("keeps mobile hierarchy compact and category cards consistent with Explore", () => {
    expect(homeSource).toContain("mt-6 hidden flex-wrap gap-2");
    expect(homeSource).toContain('aria-labelledby="home-categories-heading"');
    expect(homeSource).toContain("CATEGORY_ICONS[category.id]");
    expect(homeSource).toContain("grid grid-cols-2 gap-3");
    expect(homeSource).toContain("rounded-2xl border border-slate-200 bg-white");
  });
});
