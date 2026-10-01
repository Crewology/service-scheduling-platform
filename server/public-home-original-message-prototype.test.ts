import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const original = readFileSync(resolve(root, "client/src/pages/prototype/PublicHomepageOriginalMessagePrototype.tsx"), "utf8");
const first = readFileSync(resolve(root, "client/src/pages/prototype/PublicHomepageRefreshPrototype.tsx"), "utf8");
const live = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");
const app = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");

function copyFromSource(value: string) {
  expect(live).toContain(value);
  expect(original).toContain(value);
}

describe("second people-centric public homepage concept", () => {
  it("registers a second isolated route while retaining both existing concepts and the live home", () => {
    expect(app).toContain('path="/preview/public-home-original" component={PublicHomepageOriginalMessagePrototype}');
    expect(app).toContain('path="/preview/public-home-refresh" component={PublicHomepageRefreshPrototype}');
    expect(app.indexOf('path="/preview/public-home-original"')).toBeLessThan(app.indexOf('path="/" component={Home}'));
    expect(first).toContain("Good work starts with");
    expect(original).toContain('href="/preview/public-home-refresh"');
    expect(original).toContain('href="/"');
    expect(original).toContain('<NavHeader forcePublic />');
    expect(original).toContain('<Footer forcePublic />');
  });

  it("keeps the original headline and provider-first message rather than generic demo copy", () => {
    for (const value of [
      "The digital home for your business", "Your Business.", "Your Customers.", "Your Money.",
      "Get discovered. Build your profile. Get booked. Get paid. Send invoices. Manage your time. Keep your customers.",
      "Why are you sending your customers all over the internet?",
      "Stop juggling Google, Calendly, Stripe, QuickBooks, and a dozen other tools. Put the entire business relationship in one place.",
      "Everything in one place", "A business presence and operating system",
      "Your OlogyCrew URL becomes the front door", "No Gatekeeping",
      "OlogyCrew isn't here to become your business. We're here to help you build yours.",
      "We provide the infrastructure. You own the relationship.",
      "Explore 48+ Service Categories", "Refer & Earn Rewards",
    ]) copyFromSource(value);
    for (const label of ["Your Profile", "Your Services", "Your Availability", "Your Bookings", "Your Payments", "Your Invoices"]) copyFromSource(label);
    expect(original).toContain("promises.map");
    expect(original).toContain("referralSteps.map");
    expect(original).toContain("rewardTiers.map");
  });

  it("uses real category, provider, and promotional data without manufactured reviews or booking", () => {
    expect(original).toContain("trpc.category.list.useQuery()");
    expect(original).toContain("trpc.provider.listFeatured.useQuery()");
    expect(original).toContain('trpc.promotion.getActiveForDisplay.useQuery({ tier: "homepage_feature" })');
    expect(original).toContain("!provider.isOfficial");
    expect(original).toContain("provider.categories?");
    expect(original).toContain("Number(provider.totalReviews) > 0");
    expect(original).toContain("categoriesError");
    expect(original).toContain("providersLoading");
    expect(original).not.toContain("trpc.booking.create");
    expect(original).not.toContain("trpc.quote.create");
  });

  it("retains the real discovery, profile, pricing, and referral routes", () => {
    expect(original).toContain('navigate(query ? `/browse?q=${encodeURIComponent(query)}` : "/browse")');
    expect(original).toContain('href={`/browse?q=${encodeURIComponent(service)}`}');
    expect(original).toContain('href={`/category/${category.slug}`}');
    expect(original).toContain('href={`/${provider.profileSlug}`}');
    expect(original).toContain('href="/pricing"');
    expect(original).toContain('href="/referral-program"');
  });

  it("uses distinct licensed-style editorial imagery, blue brand colors, and responsive accessible controls", () => {
    expect(original).toContain("/manus-storage/independent-designer-at-work_08f09cd1.jpg");
    expect(original).toContain("illustrative photography");
    expect(original).toContain("bg-page");
    expect(original).toContain("bg-[#123f63]");
    expect(original).toContain("bg-[#156a9a]");
    expect(original).toContain('role="search"');
    expect(original).toContain('type="search"');
    expect(original).toContain("focus-visible:ring-2");
    expect(original).toContain("sm:grid-cols-2");
    expect(original).toContain("lg:grid-cols-3");
  });
});
