import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const home = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");
const concept = readFileSync(resolve(root, "client/src/pages/PublicHomepageConceptThree.tsx"), "utf8");
const styles = readFileSync(resolve(root, "client/src/pages/prototype/PublicHomepageDemoPrototype.css"), "utf8");
const footer = readFileSync(resolve(root, "client/src/components/shared/Footer.tsx"), "utf8");

// The approved new design intentionally replaces the previous blue public homepage;
// authenticated customer/provider dashboards and all other app canvases stay untouched.
describe("public homepage Concept 3 design alignment", () => {
  it("preserves the public/authenticated home split and uses the unchanged shared header", () => {
    expect(home).toContain("if (isAuthenticated && user) return <LoggedInHome />");
    expect(home).toContain("return <PublicHomepageConceptThree />");
    expect(concept).toContain("<NavHeader forcePublic={forcePublicHeader} />");
    expect(concept).toContain("forcePublicHeader = false");
  });

  it("uses the approved warm-paper layout without changing global application theme tokens", () => {
    expect(concept).toContain('className="min-h-screen bg-[#f5f2e9]"');
    for (const section of ["or-hero-frame", "or-proof", "or-cats", "or-provider-grid", "or-craft", "or-steps", "or-pathways-grid"]) expect(concept).toContain(section);
    expect(styles).toContain("--or-paper: #f5f2e9");
    expect(styles).toContain(".or-hero-frame{height:560px");
    expect(styles).toContain("@media(max-width:640px)");
    expect(styles).toContain("@media(prefers-reduced-motion:reduce)");
    expect(styles).not.toContain(".or-site-header{");
  });

  it("retains the demo's content hierarchy with only truth-safe changes", () => {
    for (const phrase of [
      "Good work", "starts with", "people.", "Good people for", "the work at hand.",
      "People who care about the details.", "Good work has a name, a face, and a story.",
      "Find your person.", "Then make a plan.", "One platform, two clear paths", "Find your way in.", "Your work deserves a home of its own.",
    ]) expect(concept).toContain(phrase);
    for (const invented of ["4,812", "4.83 / 5", "Harbor & Hearth Plumbing", "Stillwater Massage Studio", "Velvet & Vine Hair", "Verified"]) expect(concept).not.toContain(invented);
  });

  it("uses real category and public provider queries with no manufactured profile pricing or reviews", () => {
    expect(concept).toContain("trpc.category.list.useQuery()");
    expect(concept).toContain("trpc.provider.listFeatured.useQuery()");
    expect(concept).toContain("!provider.isOfficial");
    expect(concept).toContain("provider.profileSlug");
    expect(concept).toContain("Number(provider.totalReviews) > 0");
    expect(concept).toContain("provider.profilePhotoUrl");
    expect(concept).toContain("categoriesLoading");
    expect(concept).toContain("providersError");
    expect(concept).not.toContain("sampleProviders");
  });

  it("keeps Explore, genuine profile, pricing, referral, and legal destinations", () => {
    expect(concept).toContain('role="search"');
    expect(concept).toContain("navigate(query ? `/browse?q=${encodeURIComponent(query)}` : \"/browse\")");
    expect(concept).toContain('href={`/category/${category.slug}`}');
    expect(concept).toContain("const href = `/${provider.profileSlug}`");
    expect(concept).toContain('href="/pricing"');
    expect(concept).toContain('href="/browse">Explore services');
    expect(concept).toContain('id="home-customer-path-heading"');
    expect(concept).toContain('id="home-provider-heading"');
    expect(footer).toContain('href="/referral-program"');
    expect(footer).toContain('href="/terms"');
    expect(footer).toContain('href="/privacy"');
    expect(footer).toContain("compactPublicHome && !isAuthenticated");
  });
});
