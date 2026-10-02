import { FormEvent, useState, useEffect, useMemo, useRef } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";
import {
  EMPTY_EXPLORE_CRITERIA,
  ExploreSearchCriteria,
  getExploreUrl,
  getRelevantExploreCategories,
  hasExploreSearchIntent,
  inferExploreSearchIntent,
  parseExploreCriteria,
} from "@/lib/exploreSearch";
import { formatDuration } from "../../../shared/duration";
import { getServiceTypeLabel } from "../../../shared/serviceTypeLabels";
import { adaptiveServiceHref, getAdaptiveBookingDecision, getAdaptiveServiceCtaLabel } from "../../../shared/adaptiveBooking";
import { AdaptiveModeBadge } from "@/components/booking/AdaptiveModeBadge";
import { SaveProviderButton } from "@/components/SaveProviderButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Search as SearchIcon, MapPin, DollarSign, Star, X, SlidersHorizontal, Clock, Building2, ArrowRight, RefreshCw, AlertCircle, Sparkles, Compass, CalendarDays, ChevronDown, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NavHeader } from "@/components/shared/NavHeader";
import { CustomerWorkspacePageHeader, CustomerWorkspaceShell } from "@/components/customer/CustomerWorkspaceShell";
import { TrustBadge } from "@/components/TrustBadge";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import "@/styles/publicDiscovery.css";

function renderAdvancedFilters(opts: {
  priceRange: number[];
  setPriceRange: (v: number[]) => void;
  sortBy: string;
  setSortBy: (v: "price" | "rating" | "distance") => void;
  hasActiveFilters: boolean;
  clearAllFilters: () => void;
  freeEstimatesOnly: boolean;
  setFreeEstimatesOnly: (v: boolean) => void;
  emergencyServiceOnly: boolean;
  setEmergencyServiceOnly: (v: boolean) => void;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      <div>
        <label className="text-sm font-medium mb-2 block">
          Price Range: ${opts.priceRange[0]} - ${opts.priceRange[1]}
        </label>
        <Slider
          min={0}
          max={1000}
          step={10}
          value={opts.priceRange}
          onValueChange={opts.setPriceRange}
          className="mt-4"
        />
      </div>

      <div className="rounded-xl border border-slate-200 p-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={opts.freeEstimatesOnly}
            onChange={(e) => opts.setFreeEstimatesOnly(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <span className="text-sm font-medium">Offers Free Estimates</span>
        </label>
        <p className="text-xs text-muted-foreground mt-1 ml-6">Only show providers who offer free estimates</p>
      </div>

      <div className="rounded-xl border border-slate-200 p-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={opts.emergencyServiceOnly}
            onChange={(e) => opts.setEmergencyServiceOnly(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
          />
          <span className="text-sm font-medium">Emergency Service Available</span>
        </label>
        <p className="text-xs text-muted-foreground mt-1 ml-6">Only show providers available for emergency calls</p>
      </div>

      <div>
        <label className="text-sm font-medium mb-2 block">Sort By</label>
        <Select value={opts.sortBy} onValueChange={(value: any) => opts.setSortBy(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rating">Highest Rated</SelectItem>
            <SelectItem value="price">Lowest Price</SelectItem>
            <SelectItem value="distance">Nearest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {opts.hasActiveFilters && (
        <Button type="button" variant="outline" onClick={opts.clearAllFilters} className="w-full gap-2 self-end md:w-auto xl:col-span-full xl:justify-self-end">
          <RotateCcw className="h-4 w-4" />
          Reset filters
        </Button>
      )}
    </div>
  );
}

function FavoriteButtonSearch({ providerId }: { providerId: number }) {
  return <SaveProviderButton providerId={providerId} />;
}

const EXPLORE_SUGGESTIONS = [
  "Audio engineer for an event",
  "Mobile barber tomorrow",
  "House cleaning this weekend",
  "Website help for my business",
];

function ExploreCategoryCard({ category }: { category: { id: number; name: string; slug: string; description?: string | null } }) {
  return (
    <Link href={`/category/${category.slug}`} className="group block h-full">
      <Card className="h-full rounded-2xl border-slate-200 bg-white shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)] transition-[transform,border-color,box-shadow] duration-200 group-hover:-translate-y-0.5 group-hover:border-blue-200 group-hover:shadow-md">
        <CardContent className="flex h-full flex-col p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl sm:text-2xl">
              {CATEGORY_ICONS[category.id] || "📋"}
            </span>
            <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
          </div>
          <h3 className="mt-4 text-sm font-bold leading-5 text-slate-950 transition-colors group-hover:text-[#174a73] sm:text-base">{category.name}</h3>
          <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500 sm:text-sm">{category.description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function Explore() {
  const { isAuthenticated } = useAuth();
  const searchString = useSearch();
  const [, setRoute] = useLocation();
  const criteriaFromUrl = useMemo(() => parseExploreCriteria(searchString), [searchString]);
  const [draftCriteria, setDraftCriteria] = useState<ExploreSearchCriteria>(() => criteriaFromUrl);
  const [appliedCriteria, setAppliedCriteria] = useState<ExploreSearchCriteria>(() => criteriaFromUrl);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftCriteria(criteriaFromUrl);
    setAppliedCriteria(criteriaFromUrl);
  }, [criteriaFromUrl]);

  const { keyword, location, timing: requestedTiming, categoryId, priceRange, sortBy, freeEstimatesOnly, emergencyServiceOnly } = appliedCriteria;

  const {
    data: categories,
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
    isRefetching: isRefetchingCategories,
  } = trpc.category.list.useQuery(undefined, {
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    staleTime: 60_000,
  });

  const hasSearchIntent = hasExploreSearchIntent(appliedCriteria);

  const { data: services, isLoading: servicesLoading, isError: servicesError, refetch: refetchServices, isRefetching: isRefetchingServices } = trpc.service.search.useQuery({
    keyword: keyword.trim(),
    categoryId,
    minPrice: priceRange[0] > 0 ? priceRange[0] : undefined,
    maxPrice: priceRange[1] < 1000 ? priceRange[1] : undefined,
    sortBy,
    location: location.trim() || undefined,
  }, {
    enabled: hasSearchIntent,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const trimmedKeyword = keyword.trim();
  const { data: providers, isLoading: providersLoading, isError: providersError, refetch: refetchProviders } = trpc.provider.search.useQuery(
    { query: trimmedKeyword },
    {
      enabled: trimmedKeyword.length >= 2,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    }
  );

  // Fetch active promotions for badge display
  const { data: activePromotions } = trpc.promotion.getActiveForDisplay.useQuery();
  const promotedProviderIds = useMemo(() => {
    if (!activePromotions) return new Set<number>();
    return new Set(activePromotions.map((p: any) => p.promotion.providerId));
  }, [activePromotions]);

  const isLoading = (hasSearchIntent && servicesLoading) || (trimmedKeyword.length >= 2 && providersLoading);
  const hasAdvancedFilters = Boolean(
    draftCriteria.priceRange[0] > 0
      || draftCriteria.priceRange[1] < 1000
      || draftCriteria.sortBy !== "rating"
      || draftCriteria.freeEstimatesOnly
      || draftCriteria.emergencyServiceOnly,
  );

  // Apply free estimates and emergency service filters client-side
  const filteredProviders = useMemo(() => {
    if (!providers) return undefined;
    let result = providers;
    if (freeEstimatesOnly) result = result.filter((p: any) => p.offersEstimates);
    if (emergencyServiceOnly) result = result.filter((p: any) => p.offersEmergencyService);
    return result;
  }, [providers, freeEstimatesOnly, emergencyServiceOnly]);

  const browseCategories = useMemo(
    () => categories?.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );
  const searchIntent = inferExploreSearchIntent(keyword, filteredProviders, services);
  const relevantCategories = useMemo(
    () => getRelevantExploreCategories(categories, services, filteredProviders, keyword, searchIntent),
    [categories, services, filteredProviders, keyword, searchIntent],
  );
  const hasProviderResults = Boolean(filteredProviders?.length);
  const hasServiceResults = Boolean(services?.length);
  const hasRelevantCategories = relevantCategories.length > 0;
  const hasAnyResults = hasProviderResults || hasServiceResults || hasRelevantCategories;

  const applyCriteria = (criteria: ExploreSearchCriteria, options?: { closeFilters?: boolean; scroll?: boolean }) => {
    const normalized: ExploreSearchCriteria = {
      ...criteria,
      keyword: criteria.keyword.trim(),
      location: criteria.location.trim(),
      priceRange: [criteria.priceRange[0], criteria.priceRange[1]],
    };
    setDraftCriteria(normalized);
    setAppliedCriteria(normalized);
    setRoute(getExploreUrl(normalized), { replace: true });
    if (options?.closeFilters) setFiltersOpen(false);
    if (options?.scroll && hasExploreSearchIntent(normalized)) {
      window.requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyCriteria(draftCriteria, { closeFilters: true, scroll: true });
  };

  const clearAllFilters = () => {
    applyCriteria({ ...EMPTY_EXPLORE_CRITERIA, priceRange: [0, 1000] });
  };

  const filterProps = {
    priceRange: draftCriteria.priceRange,
    setPriceRange: (value: number[]) => setDraftCriteria((current) => ({ ...current, priceRange: [value[0] ?? 0, value[1] ?? 1000] })),
    sortBy: draftCriteria.sortBy,
    setSortBy: (value: "price" | "rating" | "distance") => setDraftCriteria((current) => ({ ...current, sortBy: value })),
    hasActiveFilters: hasAdvancedFilters,
    clearAllFilters: () => setDraftCriteria((current) => ({
      ...current,
      priceRange: [0, 1000],
      sortBy: "rating",
      freeEstimatesOnly: false,
      emergencyServiceOnly: false,
    })),
    freeEstimatesOnly: draftCriteria.freeEstimatesOnly,
    setFreeEstimatesOnly: (value: boolean) => setDraftCriteria((current) => ({ ...current, freeEstimatesOnly: value })),
    emergencyServiceOnly: draftCriteria.emergencyServiceOnly,
    setEmergencyServiceOnly: (value: boolean) => setDraftCriteria((current) => ({ ...current, emergencyServiceOnly: value })),
  };
  const selectedCategory = categories?.find((category) => category.id === appliedCriteria.categoryId);
  const appliedFilterCount = [
    draftCriteria.priceRange[0] > 0 || draftCriteria.priceRange[1] < 1000,
    draftCriteria.sortBy !== "rating",
    draftCriteria.freeEstimatesOnly,
    draftCriteria.emergencyServiceOnly,
  ].filter(Boolean).length;

  const relevantCategorySection = hasRelevantCategories ? (
    <section aria-labelledby="matching-categories-heading">
      <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Matching categories</p>
          <h2 id="matching-categories-heading" className="mt-1 text-2xl font-bold tracking-tight">
            {searchIntent === "provider" ? "Services this provider offers" : "Start with the right category"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {searchIntent === "provider" ? "Explore this provider’s service areas or continue to their profile." : "These categories are most relevant to your search."}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {relevantCategories.map((category) => <ExploreCategoryCard key={category.id} category={category} />)}
      </div>
    </section>
  ) : null;

  const providerResultSection = hasProviderResults ? (
    <section aria-labelledby="provider-results-heading" className="ology-explore-provider-results">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Provider matches</p>
          <h2 id="provider-results-heading" className="mt-1 text-2xl font-bold tracking-tight">Providers ({filteredProviders?.length ?? 0})</h2>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filteredProviders?.map((provider: any) => {
          const providerHref = `/${provider.profileSlug || provider.slug}`;
          return (
            <Card key={provider.id} className="overflow-hidden rounded-2xl border-primary/20 bg-white shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)] transition-[transform,border-color,box-shadow] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  {provider.profilePhotoUrl ? (
                    <img src={provider.profilePhotoUrl} alt={provider.businessName} className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link href={providerHref} className="truncate font-bold text-slate-950 hover:text-primary">{provider.businessName}</Link>
                      {promotedProviderIds.has(provider.id) ? <Badge className="gap-0.5 bg-gradient-to-r from-purple-500 to-pink-500 px-1.5 py-0 text-[10px] text-white"><Sparkles className="h-2.5 w-2.5" />Promoted</Badge> : null}
                      {provider.trustLevel && provider.trustLevel !== "new" ? <TrustBadge level={provider.trustLevel} size="sm" showLabel={false} /> : null}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      {parseFloat(provider.averageRating || "0") > 0 ? <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />{parseFloat(provider.averageRating).toFixed(1)} <span className="text-slate-400">({provider.totalReviews})</span></span> : null}
                      {provider.city ? <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{provider.city}{provider.state ? `, ${provider.state}` : ""}</span> : null}
                    </div>
                  </div>
                  <FavoriteButtonSearch providerId={provider.id} />
                </div>

                {provider.categories?.length ? (
                  <div className="mt-4 grid grid-cols-2 gap-2" aria-label={`${provider.businessName} categories`}>
                    {provider.categories.slice(0, 4).map((category: any) => (
                      <Link key={category.id} href={`/browse?category=${category.id}`} className="flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-[#174a73]">
                        <span aria-hidden="true">{CATEGORY_ICONS[category.id] || "📋"}</span>
                        <span className="line-clamp-2">{category.name}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                  <div className="flex flex-wrap gap-1.5">
                    {provider.offersEstimates ? <Badge className="border-green-200 bg-green-100 text-[10px] text-green-800 hover:bg-green-100">Free estimates</Badge> : null}
                    {provider.offersEmergencyService ? <Badge className="border-red-200 bg-red-100 text-[10px] text-red-800 hover:bg-red-100">Emergency service</Badge> : null}
                  </div>
                  <Link href={providerHref} className="inline-flex items-center gap-1 text-sm font-semibold text-[#156a9a] hover:text-[#123f63]">View provider<ArrowRight className="h-4 w-4" /></Link>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  ) : null;

  const serviceResultSection = hasServiceResults ? (
    <section aria-labelledby="service-results-heading" className="ology-explore-service-results">
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Book or request a quote</p>
        <h2 id="service-results-heading" className="mt-1 text-2xl font-bold tracking-tight">Services ({services?.length ?? 0})</h2>
      </div>
      <div className="space-y-3">
        {services?.map((service: any) => {
          const decision = getAdaptiveBookingDecision(service);
          const serviceHref = adaptiveServiceHref(service.id, {
            providerSlug: service.providerSlug,
            intent: keyword,
            location,
            timing: requestedTiming,
          });
          return (
            <Card key={service.id} className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)] transition-shadow hover:shadow-md">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <Link href={serviceHref}><h3 className="truncate text-base font-semibold hover:text-primary sm:text-lg">{service.name}</h3></Link>
                    {service.businessName ? (
                      <div className="mt-1 flex items-center gap-2">
                        <Link href={service.providerSlug ? `/${service.providerSlug}` : "#"} className="flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-primary">
                          {service.providerProfilePhotoUrl ? <img src={service.providerProfilePhotoUrl} alt={service.businessName} className="h-6 w-6 shrink-0 rounded-full object-cover" /> : <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100"><Building2 className="h-3 w-3" /></span>}
                          {service.businessName}
                        </Link>
                      </div>
                    ) : null}
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{service.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm">
                      <AdaptiveModeBadge decision={decision} />
                      <div className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-slate-500 sm:h-4 sm:w-4" /><span className="font-medium">{service.pricingModel === "fixed" && service.basePrice && `$${service.basePrice}`}{service.pricingModel === "hourly" && (service.hourlyRate || service.basePrice) && `$${service.hourlyRate || service.basePrice}/hr`}{service.pricingModel === "hourly" && !service.hourlyRate && !service.basePrice && "Hourly Rate"}{service.pricingModel === "fixed" && !service.basePrice && "Contact for Price"}{service.pricingModel === "package" && service.basePrice && `From $${service.basePrice}`}{service.pricingModel === "package" && !service.basePrice && "Package Pricing"}{service.pricingModel === "custom_quote" && "Custom Quote"}{service.pricingModel === "consultation" && "Free Consultation"}</span></div>
                      {service.durationMinutes ? <div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-slate-500 sm:h-4 sm:w-4" /><span>{formatDuration(service.durationMinutes)}</span></div> : null}
                      <div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-slate-500 sm:h-4 sm:w-4" /><span>{getServiceTypeLabel(service.serviceType || "", service.categoryId)}</span></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:shrink-0">
                    <FavoriteButtonSearch providerId={service.providerId} />
                    <Button asChild className="h-auto min-h-10 w-full py-2 whitespace-normal text-center sm:w-auto">
                      <Link href={serviceHref}>{getAdaptiveServiceCtaLabel(decision, "Check availability")}</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  ) : null;

  return (
    <div className="ology-discovery-page min-h-screen bg-page">
      <NavHeader />
      <CustomerWorkspaceShell active="explore" showNavigation={isAuthenticated} maxWidth="max-w-[1600px]">
        <div className="ology-explore-header">
        <CustomerWorkspacePageHeader
          variant="discovery"
          eyebrow="Find the right service without guessing the category"
          title="What do you need help with?"
          description="Describe the service, project, provider, or event. We’ll help you find the best booking or quote path."
        >
          <form onSubmit={handleSearch} aria-label="Explore services and providers" className="max-w-5xl">
            <div className="overflow-hidden rounded-2xl bg-white text-slate-950 shadow-[0_24px_60px_-36px_rgba(3,20,38,0.8)]">
              <div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
                <div className="relative flex min-w-0 flex-1 items-center">
                  <SearchIcon className="pointer-events-none absolute left-3 h-5 w-5 text-slate-400" />
                  <Input
                    placeholder="Describe a service or enter a provider name"
                    value={draftCriteria.keyword}
                    onChange={(event) => setDraftCriteria((current) => ({ ...current, keyword: event.target.value }))}
                    className="h-12 border-0 bg-transparent pl-11 pr-10 text-base shadow-none focus-visible:ring-0"
                    aria-label="Search services or providers"
                  />
                  {draftCriteria.keyword ? (
                    <button
                      type="button"
                      onClick={() => applyCriteria({ ...appliedCriteria, keyword: "" })}
                      className="absolute right-2 rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <Button type="submit" className="h-11 shrink-0 bg-[#156a9a] px-6 text-white hover:bg-[#10577e] sm:h-12">
                  Find matches
                </Button>
              </div>

              <div className="grid border-t border-slate-200 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:divide-x md:divide-slate-200">
                <label className="relative flex min-h-12 items-center">
                  <MapPin className="pointer-events-none absolute left-3 h-4 w-4 text-[#156a9a]" />
                  <span className="sr-only">City or ZIP</span>
                  <Input
                    placeholder="City or ZIP"
                    value={draftCriteria.location}
                    onChange={(event) => setDraftCriteria((current) => ({ ...current, location: event.target.value }))}
                    className="h-12 border-0 bg-transparent pl-10 shadow-none focus-visible:ring-0"
                  />
                </label>
                <div className="relative flex min-h-12 items-center border-t border-slate-200 md:border-t-0">
                  <CalendarDays className="pointer-events-none absolute left-3 z-10 h-4 w-4 text-[#156a9a]" />
                  <Select value={draftCriteria.timing || "any"} onValueChange={(value) => setDraftCriteria((current) => ({ ...current, timing: value === "any" ? "" : value }))}>
                    <SelectTrigger className="h-12 w-full border-0 bg-transparent pl-10 shadow-none focus:ring-0">
                      <SelectValue placeholder="Any time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any time</SelectItem>
                      <SelectItem value="Today">Today</SelectItem>
                      <SelectItem value="Tomorrow">Tomorrow</SelectItem>
                      <SelectItem value="This weekend">This weekend</SelectItem>
                      <SelectItem value="This week">This week</SelectItem>
                      <SelectItem value="Flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-12 justify-between gap-2 rounded-none border-t border-slate-200 px-4 text-slate-700 hover:bg-slate-50 md:border-t-0"
                  aria-expanded={filtersOpen}
                  aria-controls="explore-advanced-filters"
                  onClick={() => setFiltersOpen((open) => !open)}
                >
                  <span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />Filters{appliedFilterCount ? <Badge className="h-5 min-w-5 justify-center rounded-full bg-[#156a9a] px-1.5 text-[10px] text-white">{appliedFilterCount}</Badge> : null}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
                </Button>
              </div>

              {filtersOpen ? (
                <div id="explore-advanced-filters" className="border-t border-slate-200 bg-slate-50/70 p-4 sm:p-5">
                  {renderAdvancedFilters(filterProps)}
                  <div className="mt-5 flex justify-end">
                    <Button type="submit" className="w-full bg-[#156a9a] text-white hover:bg-[#10577e] sm:w-auto">Apply filters</Button>
                  </div>
                </div>
              ) : null}
            </div>

            {hasSearchIntent ? (
              <div className="mt-3 flex flex-wrap gap-2" aria-label="Applied search criteria">
                {appliedCriteria.location ? <Button type="button" variant="outline" size="sm" className="h-8 rounded-full border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => applyCriteria({ ...appliedCriteria, location: "" })}><MapPin className="mr-1.5 h-3.5 w-3.5" />{appliedCriteria.location}<X className="ml-1.5 h-3.5 w-3.5" /></Button> : null}
                {appliedCriteria.timing ? <Button type="button" variant="outline" size="sm" className="h-8 rounded-full border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => applyCriteria({ ...appliedCriteria, timing: "" })}><CalendarDays className="mr-1.5 h-3.5 w-3.5" />{appliedCriteria.timing}<X className="ml-1.5 h-3.5 w-3.5" /></Button> : null}
                {selectedCategory ? <Button type="button" variant="outline" size="sm" className="h-8 rounded-full border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => applyCriteria({ ...appliedCriteria, categoryId: undefined })}>{selectedCategory.name}<X className="ml-1.5 h-3.5 w-3.5" /></Button> : null}
                {(appliedCriteria.priceRange[0] > 0 || appliedCriteria.priceRange[1] < 1000) ? <Button type="button" variant="outline" size="sm" className="h-8 rounded-full border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => applyCriteria({ ...appliedCriteria, priceRange: [0, 1000] })}>${appliedCriteria.priceRange[0]}–${appliedCriteria.priceRange[1]}<X className="ml-1.5 h-3.5 w-3.5" /></Button> : null}
                {appliedCriteria.freeEstimatesOnly ? <Button type="button" variant="outline" size="sm" className="h-8 rounded-full border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => applyCriteria({ ...appliedCriteria, freeEstimatesOnly: false })}>Free estimates<X className="ml-1.5 h-3.5 w-3.5" /></Button> : null}
                {appliedCriteria.emergencyServiceOnly ? <Button type="button" variant="outline" size="sm" className="h-8 rounded-full border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => applyCriteria({ ...appliedCriteria, emergencyServiceOnly: false })}>Emergency service<X className="ml-1.5 h-3.5 w-3.5" /></Button> : null}
                {appliedCriteria.sortBy !== "rating" ? <Button type="button" variant="outline" size="sm" className="h-8 rounded-full border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={() => applyCriteria({ ...appliedCriteria, sortBy: "rating" })}>Sort: {appliedCriteria.sortBy === "price" ? "Lowest price" : "Nearest"}<X className="ml-1.5 h-3.5 w-3.5" /></Button> : null}
                <Button type="button" variant="ghost" size="sm" className="h-8 rounded-full text-blue-100 hover:bg-white/10 hover:text-white" onClick={clearAllFilters}>Reset</Button>
              </div>
            ) : (
              <div className="ology-explore-suggestions mt-4 flex flex-wrap items-center gap-2 text-sm text-blue-100">
                <span className="font-semibold">Try:</span>
                {EXPLORE_SUGGESTIONS.map((suggestion) => (
                  <button key={suggestion} type="button" className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-left text-xs font-medium text-white transition-colors hover:bg-white/20" onClick={() => applyCriteria({ ...draftCriteria, keyword: suggestion }, { scroll: true })}>
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </form>
        </CustomerWorkspacePageHeader>
        </div>

      <div ref={resultsRef} className="mt-7 scroll-mt-24">
        {!hasSearchIntent ? (
          <section aria-labelledby="browse-categories-heading">
            <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Explore by category</p>
                <h2 id="browse-categories-heading" className="mt-1 text-2xl font-bold tracking-tight">Professional services for real needs</h2>
                <p className="mt-1 text-sm text-slate-500">Choose a category to view services, providers, pricing, and availability.</p>
              </div>
              <p className="text-sm font-medium text-slate-500">Or use the search above for a specific need.</p>
            </div>

            {categoriesLoading ? (
              <div className="rounded-3xl border border-slate-200 bg-white py-16 text-center">
                <div className="inline-flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 animate-spin text-[#156a9a]" />
                  <p className="text-slate-500">Loading categories...</p>
                </div>
              </div>
            ) : categoriesError ? (
              <div className="rounded-3xl border border-red-200 bg-red-50/60 py-14 text-center">
                <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-500" />
                <h3 className="text-lg font-semibold">Unable to load categories</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">Our service directory is temporarily unavailable. Please try again.</p>
                <Button onClick={() => refetchCategories()} disabled={isRefetchingCategories} className="mt-5 gap-2">
                  <RefreshCw className={`h-4 w-4 ${isRefetchingCategories ? "animate-spin" : ""}`} />
                  {isRefetchingCategories ? "Retrying..." : "Try again"}
                </Button>
              </div>
            ) : browseCategories && browseCategories.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {browseCategories.map((category) => <ExploreCategoryCard key={category.id} category={category} />)}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-14 text-center">
                <Compass className="mx-auto mb-4 h-10 w-10 text-slate-300" />
                <h3 className="font-semibold">Categories temporarily unavailable</h3>
                <p className="mt-1 text-sm text-slate-500">Describe what you need above to search services directly.</p>
              </div>
            )}
          </section>
        ) : (
        <div className="space-y-8">
          {isLoading ? (
            <LoadingSpinner message="Searching..." />
          ) : (servicesError || providersError) ? (
            <div className="rounded-3xl border border-red-200 bg-white py-12 text-center">
              <div className="mx-auto max-w-md">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
                <h3 className="mb-2 text-lg font-semibold">Search temporarily unavailable</h3>
                <p className="mb-4 text-slate-500">We're having trouble connecting to our servers. This usually resolves in a few seconds.</p>
                <Button onClick={() => { refetchServices(); refetchProviders(); }} disabled={isRefetchingServices} className="gap-2">
                  <RefreshCw className={`h-4 w-4 ${isRefetchingServices ? "animate-spin" : ""}`} />
                  {isRefetchingServices ? "Retrying..." : "Try again"}
                </Button>
              </div>
            </div>
          ) : !hasAnyResults ? (
            <div className="rounded-3xl border border-slate-200 bg-white py-6">
              <EmptyState
                icon={SearchIcon}
                title="No results found"
                description={keyword ? `No providers, services, or categories match "${keyword}". Try a broader description or reset a filter.` : "Try adjusting your filters or search terms"}
              />
            </div>
          ) : (
            <>
              <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)] sm:flex-row sm:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Search results</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {keyword ? <>Best matches for <span className="font-semibold text-slate-950">“{keyword}”</span></> : "Best matches for your selected filters"}
                  </p>
                </div>
                <Button type="button" variant="outline" className="gap-2 bg-white" onClick={() => { setFiltersOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                  <SlidersHorizontal className="h-4 w-4" />Refine search
                </Button>
              </div>

              {searchIntent === "provider" ? (
                <>
                  {providerResultSection}
                  {relevantCategorySection}
                  {serviceResultSection}
                </>
              ) : (
                <>
                  {relevantCategorySection}
                  {serviceResultSection}
                  {providerResultSection}
                </>
              )}
            </>
          )}
        </div>
        )}
      </div>
      </CustomerWorkspaceShell>
    </div>
  );
}
