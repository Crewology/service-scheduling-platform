import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Search as SearchIcon, MapPin, DollarSign, Star, X, SlidersHorizontal, Clock } from "lucide-react";
import { NavHeader } from "@/components/shared/NavHeader";

export default function Search() {
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [sortBy, setSortBy] = useState<"price" | "rating" | "distance">("rating");
  const [location, setLocation] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const { data: categories } = trpc.category.list.useQuery();
  const { data: services, isLoading } = trpc.service.search.useQuery({
    keyword,
    categoryId,
    minPrice: priceRange[0],
    maxPrice: priceRange[1],
    sortBy,
    location: location || undefined,
  });

  const hasActiveFilters = keyword || categoryId || location || priceRange[0] > 0 || priceRange[1] < 500;

  const clearAllFilters = () => {
    setKeyword("");
    setCategoryId(undefined);
    setPriceRange([0, 500]);
    setLocation("");
    setSortBy("rating");
  };

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Keyword Search */}
      <div>
        <label className="text-sm font-medium mb-2 block">Keyword</label>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="e.g., massage, haircut"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-10 pr-8"
          />
          {keyword && (
            <button
              onClick={() => setKeyword("")}
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
          value={categoryId?.toString() || "all"}
          onValueChange={(value) => setCategoryId(value === "all" ? undefined : parseInt(value))}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map((cat) => (
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
          Price Range: ${priceRange[0]} - ${priceRange[1]}
        </label>
        <Slider
          min={0}
          max={500}
          step={10}
          value={priceRange}
          onValueChange={setPriceRange}
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
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="pl-10 pr-8"
          />
          {location && (
            <button
              onClick={() => setLocation("")}
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
        <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
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

      {hasActiveFilters && (
        <Button variant="outline" onClick={clearAllFilters} className="w-full gap-2">
          <X className="h-4 w-4" />
          Clear All Filters
        </Button>
      )}
    </div>
  );

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
                Find the perfect service provider for your needs
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
            <FilterContent />
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
                <FilterContent />
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {isLoading ? (
              <LoadingSpinner message="Searching services..." />
            ) : !services || services.length === 0 ? (
              <EmptyState
                icon={SearchIcon}
                title="No services found"
                description="Try adjusting your filters or search terms"
              />
            ) : (
              <div className="space-y-3 sm:space-y-4">
                <p className="text-sm text-muted-foreground">
                  Found {services.length} service{services.length !== 1 ? "s" : ""}
                </p>

                {services.map((service) => (
                  <Card key={service.id} className="hover:shadow-md transition-shadow overflow-hidden">
                    <CardContent className="p-4 sm:p-6">
                      {/* Mobile: stack vertically. Desktop: side by side */}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <Link href={`/service/${service.id}`}>
                            <h3 className="text-base sm:text-lg font-semibold hover:text-primary cursor-pointer truncate">
                              {service.name}
                            </h3>
                          </Link>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {service.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs sm:text-sm">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {service.pricingModel === "fixed" && `$${service.basePrice}`}
                                {service.pricingModel === "hourly" && `$${service.basePrice}/hr`}
                                {service.pricingModel === "package" && `From $${service.basePrice}`}
                                {service.pricingModel === "custom_quote" && "Custom Quote"}
                              </span>
                            </div>

                            {service.durationMinutes && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                                <span>{service.durationMinutes} min</span>
                              </div>
                            )}

                            <div className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                              <span className="capitalize">{service.serviceType?.replace("_", " ")}</span>
                            </div>
                          </div>
                        </div>

                        {/* Book Now button — full width on mobile, auto on desktop */}
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
