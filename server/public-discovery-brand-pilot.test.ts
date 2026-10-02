import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const read = (file: string) => readFileSync(resolve(root, file), "utf8");
const tokens = read("client/src/styles/publicBrandTokens.css");
const styles = read("client/src/styles/publicDiscovery.css");
const explore = read("client/src/pages/Search.tsx");
const profile = read("client/src/pages/PublicProviderProfile.tsx");
const globalStyles = read("client/src/index.css");
const routes = read("client/src/App.tsx");

function onlyStyleBlocksWithPrefix(source: string, prefix: string) {
  return source.split("\n").filter(line => line.trim().startsWith(".") && !line.trim().startsWith(prefix));
}

describe("two-page public discovery brand pilot", () => {
  it("defines a passive and reusable people-first palette without replacing workspace semantic tokens", () => {
    for (const variable of [
      "--ology-brand-paper: #f5f2e9",
      "--ology-brand-surface: #fffdf7",
      "--ology-brand-ink: #183b3a",
      "--ology-brand-deep: #123332",
      "--ology-brand-coral: #bd4b35",
      "--ology-brand-leaf: #c5d75d",
      "--ology-brand-content: 1600px",
      "--ology-brand-focus: 3px solid #a43d29",
    ]) expect(tokens).toContain(variable);
    expect(tokens).not.toMatch(/\s--(primary|page|background):/);
    expect(globalStyles).toContain("--page: #f7faff;");
    expect(styles).toContain('@import "./publicBrandTokens.css"');
    expect(styles).toContain(".ology-discovery-page");
    expect(styles).toContain(".ology-provider-profile");
    expect(styles).not.toContain(".provider-workspace");
    expect(onlyStyleBlocksWithPrefix(styles, ".ology-")).toEqual([]);
  });

  it("keeps canonical Explore search, real results, promotions, saves, and adaptive booking intact", () => {
    expect(routes).toContain('<Route path="/browse" component={Browse} />');
    expect(explore).toContain('className="ology-discovery-page min-h-screen bg-page"');
    expect(explore).toContain('className="ology-explore-header"');
    for (const contract of [
      "trpc.category.list.useQuery",
      "trpc.service.search.useQuery",
      "trpc.provider.search.useQuery",
      "trpc.promotion.getActiveForDisplay.useQuery",
      "getExploreUrl(normalized)",
      "<ExploreCategoryCard",
      "<SaveProviderButton",
      "adaptiveServiceHref(service.id",
      'getAdaptiveServiceCtaLabel(decision, "Check availability")',
      'aria-controls="explore-advanced-filters"',
      "freeEstimatesOnly",
      "emergencyServiceOnly",
    ]) expect(explore).toContain(contract);
  });

  it("keeps both advanced-filter descriptions at WCAG AA contrast on the light panel", () => {
    // The hero's light-copy rule must target only its intro, never nested form help text.
    expect(styles).not.toContain(".ology-explore-header header p:not(:first-child)");
    expect(styles).toContain(".ology-explore-header > header > .relative.flex > div:first-child > p:last-child");
    expect(styles).toMatch(/#explore-advanced-filters \.ology-filter-help\s*\{\s*color: var\(--ology-brand-muted\);/);
    expect(styles).toContain('input[type="checkbox"] {\n  box-shadow: 0 0 0 1px var(--ology-brand-muted);');
    for (const id of ["explore-filter-free-estimates-help", "explore-filter-emergency-help"]) {
      expect(explore).toContain(`aria-describedby="${id}"`);
      expect(explore).toContain(`id="${id}" className="ology-filter-help`);
    }
    const muted = tokens.match(/--ology-brand-muted:\s*(#[0-9a-fA-F]{6})/i)?.[1];
    expect(muted).toBeTruthy();
    const luminance = (hex: string) => {
      const rgb = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
      return rgb.map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
        .reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
    };
    const lightestPanel = luminance("#ffffff");
    const ratio = (lightestPanel + 0.05) / (luminance(muted!) + 0.05);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("uses the same tokens on genuine profiles while preserving all existing trust and action paths", () => {
    expect(routes).toContain('<Route path="/p/:slug" component={PublicProviderProfile} />');
    expect(routes).toContain('<Route path="/:slug" component={PublicProviderProfile} />');
    expect(profile).toContain('ology-provider-profile min-h-screen bg-page${provider.isOfficial ? " ology-official-demo" : ""}');
    expect(profile).toContain('href="#services-section"');
    expect(profile).toContain("See {services.length} service");
    for (const contract of [
      "trpc.provider.getBySlug.useQuery",
      "trpc.provider.getPublicPortfolio.useQuery",
      "trpc.provider.getPublicPackages.useQuery",
      "trpc.provider.getPublicTipInfo.useQuery",
      "<TrustBadge",
      "<OfficialBadge",
      "<ShareProfile",
      "reviews.map",
      "<ServiceCardPhoto",
      "trpc.provider.requestQuote.useMutation",
      "trpc.message.startConversation.useMutation",
      "getProviderBrowseAndBookAction(",
      "adaptiveServiceHref(service.id",
      "<AdaptiveModeBadge decision={decision}",
      "Demo Provider — Free to Book",
      'data-testid="provider-quick-book-card"',
    ]) expect(profile).toContain(contract);
    expect(profile).not.toContain("4,812 independent pros");
  });

  it("keeps colored statuses distinct, responsive, and accessible without changing global dialogs", () => {
    expect(styles).toContain(".ology-explore-service-results [data-slot=\"button\"]");
    expect(styles).toContain(".ology-provider-services-link");
    expect(styles).toContain(".ology-provider-book-button");
    expect(styles).toContain(".ology-provider-main [data-slot=\"card\"]:not([class*=\"border-red\"]):not([class*=\"border-pink\"])");
    expect(styles).toContain(".ology-discovery-page :is(a, button, input, [role=\"combobox\"]):focus-visible");
    expect(styles).toContain("@media (max-width: 639px)");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(profile).toContain('min={new Date().toISOString().split("T")[0]}');
  });
});
