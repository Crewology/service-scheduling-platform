import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { filterDemoServices, selectFeaturedDemoServices } from "../client/src/lib/demoProfileCatalog";

const project = resolve(import.meta.dirname, "..");
const profile = readFileSync(resolve(project, "client/src/pages/PublicProviderProfile.tsx"), "utf8");
const css = readFileSync(resolve(project, "client/src/styles/publicDiscovery.css"), "utf8");
const app = readFileSync(resolve(project, "client/src/App.tsx"), "utf8");
const embed = readFileSync(resolve(project, "client/src/pages/EmbedBooking.tsx"), "utf8");

const services = Array.from({ length: 54 }, (_, index) => ({
  id: 1600000 + index,
  name: `Demo service ${index}`,
  categoryId: index + 1,
  description: index === 5 ? "Family portraits" : null,
}));
services[0].name = "Demo Handyman Visit";
services[1].name = "Demo AV Setup Consultation";
services[2].name = "Demo Barber Haircut";
services[3].name = "Demo Home Cleaning";
const categories = services.map((service, index) => ({ id: service.categoryId, name: index === 5 ? "Photography Services" : `Category ${index}` }));

describe("official demo provider decluttering", () => {
  it("features only four real existing records in an editorial order and never fabricates service IDs", () => {
    const featured = selectFeaturedDemoServices(services);
    expect(featured.map(service => service.id)).toEqual([
      services[2].id, services[3].id, services[1].id, services[0].id,
    ]);
    expect(featured.every(service => services.includes(service))).toBe(true);
    expect(selectFeaturedDemoServices(services.slice(0, 2))).toEqual([services[1], services[0]]);
  });

  it("keeps the complete 54-service catalog searchable by service, description, and category", () => {
    expect(filterDemoServices(services, categories, "all", "")).toEqual(services);
    expect(filterDemoServices(services, categories, "all", "barber")).toEqual([services[2]]);
    expect(filterDemoServices(services, categories, "all", "family portraits")).toEqual([services[5]]);
    expect(filterDemoServices(services, categories, "all", "photography services")).toEqual([services[5]]);
    expect(filterDemoServices(services, categories, String(services[5].categoryId), "FAMILY")).toEqual([services[5]]);
    expect(filterDemoServices(services, categories, String(services[2].categoryId), "portraits")).toEqual([]);
    expect(filterDemoServices(services, [undefined, ...categories], "all", "Demo Handyman Visit")).toEqual([services[0]]);
  });

  it("gates the compact hero, service sample, search/catalog and redundant-category removal to official demo profiles", () => {
    expect(profile).toContain('provider.isOfficial ? " ology-official-demo" : ""');
    expect(profile).toContain('provider.isOfficial && !demoCatalogOpen');
    expect(profile).toContain("selectFeaturedDemoServices(data.services)");
    expect(profile).toContain('filterDemoServices(data.services, data.categories || [], activeCategory, demoSearch)');
    expect(profile).toContain("adaptiveServiceHref(service.id");
    expect(profile).toContain("getProviderBrowseAndBookAction(");
    expect(profile).toContain('id="services-section"');
    expect(profile).toContain("Browse all {services.length} demo services");
    expect(profile).toContain('id="demo-service-search"');
    expect(profile).toContain('id="demo-category-filter"');
    expect(profile).toContain('!provider.isOfficial && categories && categories.length > 1');
    expect(profile.match(/!provider\.isOfficial && categories && categories\.length > 0/g)).toHaveLength(2);
    expect(css).toContain(".ology-provider-profile.ology-official-demo .ology-provider-hero-inner");
  });

  it("never auto-opens the optional four-step guide and does not show fabricated response or zero-booking statistics", () => {
    expect(profile).toContain('const [showDemoWelcome, setShowDemoWelcome] = useState(false)');
    expect(profile).toContain('onClick={() => setShowDemoWelcome(true)}');
    expect(profile).toContain('Demo Provider — Free to Book');
    expect(profile).toContain('No payment or charges.');
    expect(profile).toContain('<HowItWorksStep step={4}');
    expect(profile).not.toContain("demo_welcome_dismissed");
    expect(profile).not.toContain("<AnimatedStatCard");
    expect(profile).toContain('trustProfile.isOfficialDemo');
    expect(profile).toContain('!provider.isOfficial && provider.trustLevel');
    expect(app).toContain('const isDemoProfile = location === "/demo-ologycrew" || location === "/p/demo-ologycrew"');
    expect(app).toContain('!isPrototype && !isDemoProfile && !isPricingPage && !isHelpPage && !isPlatformPage && <PWAInstallBanner />');
    expect(app).toContain('!location.startsWith("/embed") && !isPrototype && <PreviewEnvironmentBanner />');
  });

  it("omits the pictured promotion from every public provider profile without removing core actions", () => {
    expect(profile).not.toContain("ology-provider-bottom");
    expect(profile).not.toContain('Powered by <Link href="/">');
    expect(profile).not.toContain("The digital home for service professionals");
    expect(profile).not.toContain("Get your own page — it's free to start →");
    expect(css).not.toContain("ology-provider-bottom");
    expect(profile).toContain('id="services-section"');
    expect(profile).toContain("adaptiveServiceHref(service.id");
    expect(profile).toContain("Demo Provider — Free to Book");
    expect(profile).toContain('<Link href="/provider/onboarding">');
    expect(app).toContain("<Footer");
    expect(embed).toContain("Powered by OlogyCrew"); // Separate booking-widget attribution, not the pictured strip.
  });
});
