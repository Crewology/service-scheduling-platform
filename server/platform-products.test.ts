import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { injectOgTags } from "./_core/vite";
import { PEOPLE_FIRST_OG_IMAGE } from "./ogTags";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const template = read("client/index.html");

describe("public OlogyCrew platform page contracts", () => {
  it("renders one canonical people-first social card without a provider-slug lookup or private query", async () => {
    const html = await injectOgTags("/platform?ref=PRIVATE-CODE", template, "https://preview.example.invalid");
    expect(html).toContain("<title>The OlogyCrew Platform | Services, Bookings & Business Tools</title>");
    expect(html).toContain('name="description" content="Discover how OlogyCrew connects service discovery');
    expect(html).toContain('property="og:url" content="https://ologycrew.com/platform"');
    expect(html).toContain('property="og:image" content="' + PEOPLE_FIRST_OG_IMAGE + '"');
    expect(html).toContain('property="og:image:width" content="1200"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html).not.toContain("PRIVATE-CODE");
    expect(html).not.toContain("preview.example.invalid");
    expect(html).not.toContain("provider slug");
  });

  it("keeps the route public, links it from existing public nav surfaces and reserves its URL", () => {
    const app = read("client/src/App.tsx");
    const header = read("client/src/components/shared/NavHeader.tsx");
    const footer = read("client/src/components/shared/Footer.tsx");
    const provider = read("server/routers/providerRouter.ts");
    const sitemap = read("server/sitemap.ts");
    expect(app).toContain('<Route path="/platform" component={PlatformProducts} />');
    expect(app.indexOf('<Route path="/platform"')).toBeLessThan(app.indexOf('<Route path="/:slug"'));
    expect(app).toContain('compactPublicHome={location === "/" || location === "/for-providers" || isPlatformPage}');
    expect(header).toContain('<Link href="/platform" onClick={() => setMobileMenuOpen(false)}>');
    expect(footer).toContain('<Link href="/platform">The platform</Link>');
    expect(footer).toContain('<Link href="/platform" className={footerLinkClass}>The Platform</Link>');
    expect(sitemap).toContain('{ path: "/platform", priority: "0.8", changefreq: "monthly" }');
    expect(sitemap).toContain('"platform",');
    expect(provider).toContain('if (input.slug === "platform")');
    expect(app).toContain('!isHelpPage && !isPlatformPage && <PWAInstallBanner />');
  });

  it("keeps product styling page-scoped, responsive and motion-aware", () => {
    const css = read("client/src/pages/PlatformProducts.css");
    const page = read("client/src/pages/PlatformProducts.tsx");
    expect(css).toContain('.ology-platform a:focus-visible');
    expect(css).toContain('@media (max-width: 900px)');
    expect(css).toContain('@media (max-width: 540px)');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(page).toContain('id="platform-main"');
    expect(page).not.toMatch(/\bfetch\(|\baxios\(/);
    expect(page).not.toContain("Calendly");
    expect(page).not.toContain("guaranteed bookings");
  });
});
