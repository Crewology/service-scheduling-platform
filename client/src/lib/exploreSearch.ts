export type ExploreSort = "price" | "rating" | "distance";

export type ExploreSearchCriteria = {
  keyword: string;
  location: string;
  timing: string;
  categoryId?: number;
  priceRange: [number, number];
  sortBy: ExploreSort;
  freeEstimatesOnly: boolean;
  emergencyServiceOnly: boolean;
};

export type ExploreSearchIntent = "provider" | "service" | "broad";

export type ExploreCategorySummary = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
};

export type ExploreProviderSummary = {
  businessName?: string | null;
  categories?: Array<{ id: number; name: string }> | null;
};

export type ExploreServiceSummary = {
  categoryId?: number | null;
};

export const EMPTY_EXPLORE_CRITERIA: ExploreSearchCriteria = {
  keyword: "",
  location: "",
  timing: "",
  categoryId: undefined,
  priceRange: [0, 1000],
  sortBy: "rating",
  freeEstimatesOnly: false,
  emergencyServiceOnly: false,
};

function safeNumber(value: string | null, fallback: number) {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseExploreCriteria(search: string): ExploreSearchCriteria {
  const params = new URLSearchParams(search);
  const categoryId = safeNumber(params.get("category"), 0);
  const sort = params.get("sort");
  return {
    keyword: params.get("q") ?? "",
    location: params.get("location") ?? "",
    timing: params.get("timing") ?? "",
    categoryId: categoryId > 0 ? categoryId : undefined,
    priceRange: [
      Math.max(0, safeNumber(params.get("minPrice"), 0)),
      Math.max(0, safeNumber(params.get("maxPrice"), 1000)),
    ],
    sortBy: sort === "price" || sort === "distance" ? sort : "rating",
    freeEstimatesOnly: params.get("freeEstimates") === "1",
    emergencyServiceOnly: params.get("emergency") === "1",
  };
}

export function getExploreUrl(criteria: ExploreSearchCriteria): string {
  const params = new URLSearchParams();
  const keyword = criteria.keyword.trim();
  const location = criteria.location.trim();
  if (keyword) params.set("q", keyword);
  if (location) params.set("location", location);
  if (criteria.timing) params.set("timing", criteria.timing);
  if (criteria.categoryId) params.set("category", String(criteria.categoryId));
  if (criteria.priceRange[0] > 0) params.set("minPrice", String(criteria.priceRange[0]));
  if (criteria.priceRange[1] < 1000) params.set("maxPrice", String(criteria.priceRange[1]));
  if (criteria.sortBy !== "rating") params.set("sort", criteria.sortBy);
  if (criteria.freeEstimatesOnly) params.set("freeEstimates", "1");
  if (criteria.emergencyServiceOnly) params.set("emergency", "1");
  const query = params.toString();
  return query ? `/browse?${query}` : "/browse";
}

export function hasExploreSearchIntent(criteria: ExploreSearchCriteria): boolean {
  return Boolean(
    criteria.keyword.trim()
      || criteria.location.trim()
      || criteria.timing
      || criteria.categoryId
      || criteria.priceRange[0] > 0
      || criteria.priceRange[1] < 1000
      || criteria.freeEstimatesOnly
      || criteria.emergencyServiceOnly,
  );
}

export function inferExploreSearchIntent(
  keyword: string,
  providers: ExploreProviderSummary[] | undefined,
  services: ExploreServiceSummary[] | undefined,
): ExploreSearchIntent {
  const normalized = keyword.trim().toLocaleLowerCase();
  if (!normalized) return services?.length ? "service" : "broad";
  const matchingProviders = providers?.filter((provider) =>
    provider.businessName?.toLocaleLowerCase().includes(normalized),
  ) ?? [];
  const directProviderMatch = matchingProviders.some((provider) => provider.businessName?.toLocaleLowerCase() === normalized)
    || matchingProviders.length === 1;
  if (directProviderMatch) return "provider";
  return services?.length ? "service" : "broad";
}

export function getRelevantExploreCategories(
  categories: ExploreCategorySummary[] | undefined,
  services: ExploreServiceSummary[] | undefined,
  providers: ExploreProviderSummary[] | undefined,
  keyword: string,
  intent: ExploreSearchIntent,
  limit = 4,
): ExploreCategorySummary[] {
  if (!categories?.length) return [];
  const normalized = keyword.trim().toLocaleLowerCase();
  const relevantIds = new Set<number>();
  services?.forEach((service) => {
    if (service.categoryId) relevantIds.add(service.categoryId);
  });
  if (intent === "provider") {
    providers?.forEach((provider) => provider.categories?.forEach((category) => relevantIds.add(category.id)));
  }

  return categories
    .filter((category) => relevantIds.has(category.id) || (normalized && category.name.toLocaleLowerCase().includes(normalized)))
    .sort((left, right) => {
      const leftName = left.name.toLocaleLowerCase();
      const rightName = right.name.toLocaleLowerCase();
      const leftDirect = normalized && leftName.includes(normalized) ? 0 : 1;
      const rightDirect = normalized && rightName.includes(normalized) ? 0 : 1;
      if (leftDirect !== rightDirect) return leftDirect - rightDirect;
      if (leftName === "other") return 1;
      if (rightName === "other") return -1;
      return left.name.localeCompare(right.name);
    })
    .slice(0, limit);
}
