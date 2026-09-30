import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EMPTY_EXPLORE_CRITERIA,
  getExploreUrl,
  getRelevantExploreCategories,
  hasExploreSearchIntent,
  inferExploreSearchIntent,
  parseExploreCriteria,
} from "../client/src/lib/exploreSearch";

const root = resolve(import.meta.dirname, "..");
const exploreSource = readFileSync(resolve(root, "client/src/pages/Search.tsx"), "utf8");
const shellSource = readFileSync(resolve(root, "client/src/components/customer/CustomerWorkspaceShell.tsx"), "utf8");

describe("unified Explore search composer", () => {
  it("round-trips submitted search and filter criteria through the canonical Explore URL", () => {
    const criteria = {
      ...EMPTY_EXPLORE_CRITERIA,
      keyword: "audio engineer",
      location: "Atlanta, GA",
      timing: "This weekend",
      categoryId: 15,
      priceRange: [100, 750] as [number, number],
      sortBy: "distance" as const,
      freeEstimatesOnly: true,
      emergencyServiceOnly: true,
    };
    const url = getExploreUrl(criteria);
    expect(url).toBe("/browse?q=audio+engineer&location=Atlanta%2C+GA&timing=This+weekend&category=15&minPrice=100&maxPrice=750&sort=distance&freeEstimates=1&emergency=1");
    expect(parseExploreCriteria(url.slice(url.indexOf("?")))).toEqual(criteria);
  });

  it("treats timing and any meaningful filter as explicit search intent", () => {
    expect(parseExploreCriteria("").priceRange).toEqual([0, 1000]);
    expect(hasExploreSearchIntent(EMPTY_EXPLORE_CRITERIA)).toBe(false);
    expect(hasExploreSearchIntent({ ...EMPTY_EXPLORE_CRITERIA, timing: "Tomorrow" })).toBe(true);
    expect(hasExploreSearchIntent({ ...EMPTY_EXPLORE_CRITERIA, freeEstimatesOnly: true })).toBe(true);
  });

  it("puts direct provider-name matches first and service searches first otherwise", () => {
    const providers = [{ businessName: "Chisolm Audio", categories: [{ id: 15, name: "Audio Visual Crew" }] }];
    const services = [{ categoryId: 15 }];
    expect(inferExploreSearchIntent("Chisolm Audio", providers, services)).toBe("provider");
    expect(inferExploreSearchIntent("audio", [{ businessName: "Chisolm Audio" }, { businessName: "Audio Pros" }], services)).toBe("service");
    expect(inferExploreSearchIntent("church sound", providers, services)).toBe("service");
    expect(inferExploreSearchIntent("unknown", [], [])).toBe("broad");
  });

  it("reuses only relevant category cards and keeps Other last", () => {
    const categories = [
      { id: 99, name: "Other", slug: "other" },
      { id: 20, name: "DJ & Music Services", slug: "dj" },
      { id: 15, name: "Audio Visual Crew", slug: "audio" },
      { id: 188, name: "Home Cleaning", slug: "cleaning" },
    ];
    expect(getRelevantExploreCategories(categories, [{ categoryId: 15 }, { categoryId: 20 }], [], "audio", "service")).toEqual([
      categories[2],
      categories[1],
    ]);
    expect(getRelevantExploreCategories(categories, [], [{ businessName: "Studio", categories: [{ id: 99, name: "Other" }, { id: 20, name: "DJ & Music Services" }] }], "Studio", "provider")).toEqual([
      categories[1],
      categories[0],
    ]);
  });

  it("places one submitted composer inside the discovery header instead of a separate filter sidebar", () => {
    expect(shellSource).toContain("children?: ReactNode");
    expect(exploreSource).toContain('<form onSubmit={handleSearch} aria-label="Explore services and providers"');
    expect(exploreSource).toContain('placeholder="Describe a service or enter a provider name"');
    expect(exploreSource).toContain("Find matches");
    expect(exploreSource).toContain('aria-controls="explore-advanced-filters"');
    expect(exploreSource).toContain("renderAdvancedFilters(filterProps)");
    expect(exploreSource).toContain("Apply filters");
    expect(exploreSource).not.toContain("Desktop Filters Sidebar");
    expect(exploreSource).not.toContain("useDebounce");
  });

  it("keeps category cards in both browse and results and associates categories with provider cards", () => {
    expect(exploreSource.match(/<ExploreCategoryCard/g)).toHaveLength(2);
    expect(exploreSource).toContain("relevantCategorySection");
    expect(exploreSource).toContain('aria-label={`${provider.businessName} categories`}');
    expect(exploreSource).toContain('href={`/browse?category=${category.id}`}');
    expect(exploreSource).toContain('searchIntent === "provider"');
    expect(exploreSource.indexOf("{providerResultSection}")).toBeLessThan(exploreSource.indexOf("{relevantCategorySection}"));
  });

  it("preserves the existing search, save, booking, ranking, and filter data paths", () => {
    for (const token of [
      "trpc.service.search.useQuery",
      "trpc.provider.search.useQuery",
      "trpc.promotion.getActiveForDisplay.useQuery",
      "getAdaptiveBookingDecision(service)",
      "getAdaptiveServiceCtaLabel",
      "<SaveProviderButton",
      "freeEstimatesOnly",
      "emergencyServiceOnly",
      "sortBy",
    ]) expect(exploreSource).toContain(token);
  });
});
