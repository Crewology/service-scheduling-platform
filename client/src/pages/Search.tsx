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
import { Search as SearchIcon, MapPin, DollarSign, Star } from "lucide-react";
import { NavHeader } from "@/components/shared/NavHeader";

export default function Search() {
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [sortBy, setSortBy] = useState<"price" | "rating" | "distance">("rating");
  const [location, setLocation] = useState("");

  const { data: categories } = trpc.category.list.useQuery();
  const { data: services, isLoading } = trpc.service.search.useQuery({
    keyword,
    categoryId,
    minPrice: priceRange[0],
    maxPrice: priceRange[1],
    sortBy,
    location: location || undefined,
  });

  const handleSearch = () => {
    // Trigger search by updating state
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavHeader />
      {/* Page Title */}
      <div className="bg-white border-b">
        <div className="container py-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Search Services</h1>
          <p className="text-muted-foreground">
            Find the perfect service provider for your needs
          </p>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
                <CardDescription>Refine your search</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Keyword Search */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Keyword</label>
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="e.g., massage, haircut"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      className="pl-10"
                    />
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
                      className="pl-10"
                    />
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

                <Button onClick={handleSearch} className="w-full">
                  Apply Filters
                </Button>
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
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Found {services.length} service{services.length !== 1 ? "s" : ""}
                </p>

                {services.map((service) => (
                  <Card key={service.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <Link href={`/service/${service.id}`}>
                            <h3 className="text-lg font-semibold hover:text-primary cursor-pointer">
                              {service.name}
                            </h3>
                          </Link>
                          <p className="text-sm text-muted-foreground mt-1">
                            {service.description}
                          </p>

                          <div className="flex items-center gap-4 mt-4 text-sm">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {service.pricingModel === "fixed" && `$${service.basePrice}`}
                                {service.pricingModel === "hourly" && `$${service.basePrice}/hr`}
                                {service.pricingModel === "package" && `From $${service.basePrice}`}
                                {service.pricingModel === "custom_quote" && "Custom Quote"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              <span>4.8 (24 reviews)</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span>{service.serviceType}</span>
                            </div>
                          </div>
                        </div>

                        <Link href={`/service/${service.id}`}>
                          <Button>Book Now</Button>
                        </Link>
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
