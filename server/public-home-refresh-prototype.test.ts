import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const prototype = readFileSync(resolve(root, "client/src/pages/prototype/PublicHomepageRefreshPrototype.tsx"), "utf8");
const router = readFileSync(resolve(root, "client/src/App.tsx"), "utf8");
const home = readFileSync(resolve(root, "client/src/pages/Home.tsx"), "utf8");
const footer = readFileSync(resolve(root, "client/src/components/shared/Footer.tsx"), "utf8");
const proxy = readFileSync(resolve(root, "server/_core/storageProxy.ts"), "utf8");
const serverIndex = readFileSync(resolve(root, "server/_core/index.ts"), "utf8");

// This is a review-only alternative, not a replacement for the current public homepage.
describe("public homepage refresh prototype", () => {
  it("registers an isolated preview while keeping the existing live homepage and other prototypes", () => {
    expect(router).toContain('path="/preview/public-home-refresh" component={PublicHomepageRefreshPrototype}');
    expect(router).toContain('path="/" component={Home}');
    expect(router.indexOf('path="/preview/public-home-refresh"')).toBeLessThan(router.indexOf('path="/" component={Home}'));
    expect(router).toContain('path="/preview/customer-home"');
    expect(home).toContain("export default function Home");
    expect(prototype).toContain("Homepage design preview · Live homepage unchanged");
    expect(prototype).toContain('<NavHeader forcePublic />');
    expect(prototype).toContain('<Footer forcePublic />');
  });

  it("uses existing public live category and featured-provider queries with no demo or fake reviews", () => {
    expect(prototype).toContain("trpc.category.list.useQuery()");
    expect(prototype).toContain("trpc.provider.listFeatured.useQuery()");
    expect(prototype).toContain("!provider.isOfficial");
    expect(prototype).toContain("category.name");
    expect(prototype).toContain("provider.businessName");
    expect(prototype).toContain("provider.profileSlug");
    expect(prototype).toContain("provider.averageRating");
    expect(prototype).toContain("Number(provider.totalReviews) > 0");
    expect(prototype).not.toContain("4.9 ★");
    expect(prototype).not.toContain("12k+");
    expect(prototype).toContain("categoriesLoading");
    expect(prototype).toContain("providersError");
  });

  it("preserves real discovery, provider, and pricing journeys without preview-only transactions", () => {
    expect(prototype).toContain("navigate(query ? `/browse?q=${encodeURIComponent(query)}` : \"/browse\")");
    expect(prototype).toContain('href={`/category/${category.slug}`}');
    expect(prototype).toContain('href={`/${provider.profileSlug}`}');
    expect(prototype).toContain('<Footer forcePublic />');
    expect(footer).toContain('href="/pricing"');
    expect(prototype).not.toContain("See provider plans");
    expect(prototype).not.toContain("trpc.booking.create");
    expect(prototype).not.toContain("trpc.quote.create");
  });

  it("uses OlogyCrew's blue visual system and serves uploaded illustrative media as an image", () => {
    expect(prototype).toContain('bg-[#123f63]');
    expect(prototype).toContain('bg-[#156a9a]');
    expect(prototype).toContain("bg-page");
    expect(prototype).toContain('alt="Independent barber');
    expect(prototype).toContain("Illustrative photography");
    expect(prototype).toContain('lg:hidden');
    expect(prototype).toContain('focus-visible:ring-2');
    expect(prototype).toContain("/manus-storage/independent-barber-at-work_f3c2de21.jpg");
    expect(proxy).toContain('app.get("/manus-storage/*"');
    expect(proxy).toContain('res.redirect(307, url)');
    expect(serverIndex.indexOf("registerStorageProxy(app)")).toBeLessThan(serverIndex.indexOf("registerOAuthRoutes(app)"));
    expect(serverIndex.indexOf("registerStorageProxy(app)")).toBeLessThan(serverIndex.indexOf("await setupVite(app, server)"));
  });
});
