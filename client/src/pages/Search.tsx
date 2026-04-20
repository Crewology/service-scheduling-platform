import { useState, useEffect, useMemo } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { Link, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatDuration } from "../../../shared/duration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Search as SearchIcon, MapPin, DollarSign, Star, X, SlidersHorizontal, Clock, Building2, ArrowRight, BadgeCheck } from "lucide-react";
import { NavHeader } from "@/components/shared/NavHeader";

/**
 * Inline filter JSX block — extracted as a helper that returns JSX elements
 * (NOT a component) so React never unmounts/remounts the inputs on re-render.
 */
function renderFilters(opts: {
  keyword: string;
  setKeyword: (v: string) => void;
  categoryId: number | undefined;
  setCategoryId: (v: number | undefined) => void;
  priceRange: number[];
  setPriceRange: (v: number[]) => void;
  location: string;
  setLocation: (v: string) => void;
  sortBy: string;
  setSortBy: (v: "price" | "rating" | "distance") => void;
  categories: { id: number; name: string }[] | undefined;
  hasActiveFilters: boolean;
  clearAllFilters: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Keyword Search */}
      <div>
        <label className="text-sm font-medium mb-2 block">Search</label>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Service or provider name..."
            value={opts.keyword}
            onChange={(e) => opts.setKeyword(e.target.value)}
            className="pl-10 pr-8"
          />
          {opts.keyword && (
            <button
              onClick={() => opts.setKeyword("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors"
              aria-label="Clear keyword"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter */}
      <div>
        <label className="text-sm font-medium mb-2 block">Category</label>
        <Select
          value={opts.categoryId?.toString() || "all"}
          onValueChange={(value) => opts.setCategoryId(value === "all" ? undefined : parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {opts.categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.id.toString()}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div>
        <label className="text-sm font-medium mb-2 block">
          Price Range: ${opts.priceRange[0]} - ${opts.priceRange[1]}
        </label>
        <Slider
          min={0}
          max={500}
          step={10}
          value={opts.priceRange}
          onValueChange={opts.setPriceRange}
          className="mt-4"
        />
      </div>

      {/* Location Filter */}
      <div>
        <label className="text-sm font-medium mb-2 block">Location</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="City, state, or zip"
            value={opts.location}
            onChange={(e) => opts.setLocation(e.target.value)}
            className="pl-10 pr-8"
          />
          {opts.location && (
            <button
              onClick={() => opts.setLocation("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors"
              aria-label="Clear location"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Sort By */}
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
        <Button variant="outline" onClick={opts.clearAllFilters} className="w-full gap-2">
          <X className="h-4 w-4" />
          Clear All Filters
        </Button>
      )}
    </div>
  );
}

export default function Search() {
  // Read ?q= from URL (sent by homepage search bar)
  const searchString = useSearch();
  const urlParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const initialQuery = urlParams.get("q") || "";

  const [keyword, setKeyword] = useState(initialQuery);
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [sortBy, setSortBy] = useState<"price" | "rating" | "distance">("rating");
  const [location, setLocation] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Sync keyword when URL changes (e.g. navigating from homepage again)
  useEffect(() => {
    const q = new URLSearchParams(searchString).get("q");
    if (q) setKeyword(q);
  }, [searchString]);

  // Debounce keyword and location so API calls only fire after 300ms of inactivity
  const debouncedKeyword = useDebounce(keyword, 300);
  const debouncedLocation = useDebounce(location, 300);

  const { data: categories } = trpc.category.list.useQuery();

  // Determine if user has actively set any filter
  const hasSearchIntent = !!(debouncedKeyword || categoryId || debouncedLocation || priceRange[0] > 0 || priceRange[1] < 500);

  // Search services (uses debounced values to reduce API calls)
  // Only fire when user has entered a query or adjusted filters
  const { data: services, isLoading: servicesLoading } = trpc.service.search.useQuery({
    keyword: debouncedKeyword,
    categoryId,
    minPrice: priceRange[0],
    maxPrice: priceRange[1],
    sortBy,
    location: debouncedLocation || undefined,
  }, { enabled: hasSearchIntent });

  // Search providers by name (only when debounced keyword has 2+ chars)
  const trimmedKeyword = debouncedKeyword.trim();
  const { data: providers, isLoading: providersLoading } = trpc.provider.search.useQuery(
    { query: trimmedKeyword },
    { enabled: trimmedKeyword.length >= 2 }
  );

  const isLoading = (hasSearchIntent && servicesLoading) || (trimmedKeyword.length >= 2 && providersLoading);
  const hasActiveFilters = keyword || categoryId || location || priceRange[0] > 0 || priceRange[1] < 500;
  const hasProviderResults = providers && providers.length > 0;
  const hasServiceResults = services && services.length > 0;
  const hasAnyResults = hasProviderResults || hasServiceResults;

  const clearAllFilters = () => {
    setKeyword("");
    setCategoryId(undefined);
    setPriceRange([0, 500]);
    setLocation("");
    setSortBy("rating");
  };

  // Shared props for the filter block (rendered in both desktop sidebar and mobile drawer)
  const filterProps = {
    keyword,
    setKeyword,
    categoryId,
    setCategoryId,
    priceRange,
    setPriceRange,
    location,
    setLocation,
    sortBy,
    setSortBy,
    categories: categories as { id: number; name: string }[] | undefined,
    hasActiveFilters: !!hasActiveFilters,
    clearAllFilters,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader />
      {/* Page Title */}
      <div className="bg-white border-b">
        <div className="container py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">Search Services</h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                {keyword
                  ? `Results for "${keyword}"`
                  : "Find the perfect service provider for your needs"}
              </p>
            </div>
            {/* Mobile filter toggle */}
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden gap-1.5"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {showMobileFilters && (
        <div className="lg:hidden bg-white border-b shadow-sm">
          <div className="container py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Filters</h3>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-1 rounded-full hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {renderFilters(filterProps)}
            <Button
              className="w-full mt-4"
              onClick={() => setShowMobileFilters(false)}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      )}

      <div className="container py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Desktop Filters Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
                <CardDescription>Refine your search</CardDescription>
              </CardHeader>
              <CardContent>
                {renderFilters(filterProps)}
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-3 space-y-6">
            {!hasSearchIntent && !keyword ? (
              <div className="text-center py-16">
                <SearchIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-muted-foreground mb-2">Search for Services</h2>
                <p className="text-sm text-muted-foreground/70 max-w-md mx-auto">
                  Enter a service name, provider, or keyword in the search box, or use the filters to find what you need.
                </p>
              </div>
            ) : isLoading ? (
              <LoadingSpinner message="Searching..." />
            ) : !hasAnyResults ? (
              <EmptyState
                icon={SearchIcon}
                title="No results found"
                description={keyword ? `No providers or services match "${keyword}". Try a different name or keyword.` : "Try adjusting your filters or search terms"}
              />
            ) : (
              <>
                {/* Provider Results — shown above services when matching */}
                {hasProviderResults && (
                  <div>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Providers ({providers.length})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {providers.map((provider: any) => (
                        <Link key={provider.id} href={`/p/${provider.profileSlug || provider.slug}`}>
                          <Card className="hover:shadow-md transition-shadow cursor-pointer border-primary/20 hover:border-primary/40">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                {/* Provider avatar */}
                                <div className="shrink-0">
                                  {provider.profilePhotoUrl ? (
                                    <img
                                      src={provider.profilePhotoUrl}
                                      alt={provider.businessName}
                                      className="w-12 h-12 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                      <Building2 className="h-6 w-6 text-primary" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <h3 className="font-semibold text-sm truncate">{provider.businessName}</h3>
                                    {provider.verificationStatus === "verified" && (
                                      <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" />
                                    )}
                                  </div>
                                  {/* Categories */}
                                  {provider.categories && provider.categories.length > 0 && (
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                      {provider.categories.map((c: any) => c.name).join(", ")}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                    {parseFloat(provider.averageRating || "0") > 0 && (
                                      <span className="flex items-center gap-0.5">
                                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                        {parseFloat(provider.averageRating).toFixed(1)}
                                        <span className="text-muted-foreground/60">({provider.totalReviews})</span>
                                      </span>
                                    )}
                                    {provider.city && (
                                      <span className="flex items-center gap-0.5">
                                        <MapPin className="h-3 w-3" />
                                        {provider.city}{provider.state ? `, ${provider.state}` : ""}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Service Results */}
                {hasServiceResults && (
                  <div>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Services ({services.length})
                    </h2>
                    <div className="space-y-3">
                      {services.map((service: any) => (
                        <Card key={service.id} className="hover:shadow-md transition-shadow overflow-hidden">
                          <CardContent className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <Link href={`/service/${service.id}`}>
                                  <h3 className="text-base sm:text-lg font-semibold hover:text-primary cursor-pointer truncate">
                                    {service.name}
                                  </h3>
                                </Link>
                                {/* Provider business name */}
                                {service.businessName && (
                                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                                    <Building2 className="h-3.5 w-3.5" />
                                    {service.providerSlug ? (
                                      <Link href={`/p/${service.providerSlug}`}>
                                        <span className="hover:text-primary hover:underline cursor-pointer">
                                          {service.businessName}
                                        </span>
                                      </Link>
                                    ) : (
                                      <span>{service.businessName}</span>
                                    )}
                                  </p>
                                )}
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {service.description}
                                </p>

                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs sm:text-sm">
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                                    <span className="font-medium">
                                      {service.pricingModel === "fixed" && service.basePrice && `$${service.basePrice}`}
                                      {service.pricingModel === "hourly" && (service.hourlyRate || service.basePrice) && `$${service.hourlyRate || service.basePrice}/hr`}
                                      {service.pricingModel === "hourly" && !service.hourlyRate && !service.basePrice && "Hourly Rate"}
                                      {service.pricingModel === "fixed" && !service.basePrice && "Contact for Price"}
                                      {service.pricingModel === "package" && service.basePrice && `From $${service.basePrice}`}
                                      {service.pricingModel === "package" && !service.basePrice && "Package Pricing"}
                                      {service.pricingModel === "custom_quote" && "Custom Quote"}
                                    </span>
                                  </div>

                                  {service.durationMinutes && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                                      <span>{formatDuration(service.durationMinutes)}</span>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                                    <span className="capitalize">{service.serviceType?.replace("_", " ")}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Book Now button */}
                              <div className="sm:shrink-0">
                                <Link href={`/service/${service.id}`}>
                                  <Button className="w-full sm:w-auto">Book Now</Button>
                                </Link>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
