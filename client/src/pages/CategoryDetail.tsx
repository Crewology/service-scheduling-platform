import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { MapPin, Star, Clock, DollarSign, ArrowLeft, User, SlidersHorizontal, X, Search, CalendarDays } from "lucide-react";
import { Link, useParams } from "wouter";
import { NavHeader } from "@/components/shared/NavHeader";

const CATEGORY_ICONS: Record<number, string> = {
  15: "\ud83c\udfac", 170: "\ud83d\udc88", 7: "\u2702\ufe0f", 126: "\ud83d\udd12", 195: "\ud83d\udc83", 202: "\ud83d\udd28",
  23: "\ud83e\uddb7", 20: "\ud83c\udfb5", 22: "\ud83d\ude9b", 177: "\ud83c\udf89", 196: "\ud83d\udc41\ufe0f", 178: "\ud83d\udcb0",
  109: "\ud83c\udfcb\ufe0f", 197: "\ud83d\udccb", 9: "\ud83d\udd27", 193: "\ud83e\uddd8", 188: "\ud83e\uddf9", 200: "\u26a1",
  179: "\ud83c\udfe0", 171: "\ud83d\udc87", 174: "\ud83d\ude97", 176: "\ud83d\udd29", 111: "\ud83d\udd17", 10: "\ud83d\udc86",
  168: "\ud83d\ude99", 169: "\ud83d\udee0\ufe0f", 199: "\ud83c\udfaa", 158: "\ud83c\udfaf", 73: "\ud83c\udf7d\ufe0f", 12: "\ud83d\udcaa",
  11: "\ud83d\udc3e", 17: "\ud83d\udcf8", 148: "\ud83d\udca6", 26: "\ud83d\udcc5", 8: "\ud83d\udc85", 194: "\u2600\ufe0f",
  198: "\ud83d\udcbb", 19: "\ud83c\udfa5", 155: "\ud83d\udcf1", 201: "\ud83d\udda5\ufe0f", 205: "\ud83c\udf10",
};

function formatCurrency(value: string | number | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return `$${num.toFixed(2)}`;
}

function formatTime12(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

function AvailabilityQuickView({ providerId }: { providerId: number }) {
  const { data } = trpc.provider.getNextAvailable.useQuery({ providerId, days: 7 });
  if (!data || !data.hasAvailability) return null;

  return (
    <div className="mt-3 pt-3 border-t">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
        <CalendarDays className="w-3.5 h-3.5" /> Next Available
      </p>
      <div className="flex flex-wrap gap-1.5">
        {data.slots.map((slot, i) => (
          <Badge key={i} variant="outline" className="text-[11px] px-2 py-0.5 bg-green-50 border-green-200 text-green-700">
            {slot.dayName.slice(0, 3)} {formatTime12(slot.startTime)}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default function CategoryDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { data: category } = trpc.category.getBySlug.useQuery({ slug: slug! });
  const { data: services } = trpc.service.listByCategory.useQuery(
    { categoryId: category?.id! },
    { enabled: !!category?.id }
  );
  const { data: providers } = trpc.provider.listByCategory.useQuery(
    { categoryId: category?.id! },
    { enabled: !!category?.id }
  );

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");

  const hasActiveFilters = locationFilter || minRating > 0 || maxPrice !== null || serviceTypeFilter !== "all";

  const clearFilters = () => {
    setLocationFilter("");
    setMinRating(0);
    setMaxPrice(null);
    setServiceTypeFilter("all");
  };

  // Group services by provider, then filter
  const servicesByProvider = useMemo(() => {
    if (!services || !providers) return new Map();
    const map = new Map<number, { provider: any; services: any[] }>();
    for (const service of services) {
      // Price filter
      if (maxPrice !== null) {
        const price = parseFloat(service.basePrice || service.hourlyRate || "0");
        if (price > maxPrice && price > 0) continue;
      }
      // Service type filter
      if (serviceTypeFilter !== "all" && service.serviceType !== serviceTypeFilter) continue;

      if (!map.has(service.providerId)) {
        const prov = providers.find((p: any) => p.id === service.providerId);
        if (prov) map.set(service.providerId, { provider: prov, services: [] });
      }
      map.get(service.providerId)?.services.push(service);
    }

    // Now filter by provider-level criteria
    const filtered = new Map<number, { provider: any; services: any[] }>();
    for (const [id, entry] of Array.from(map.entries())) {
      const prov = entry.provider;
      // Location filter
      if (locationFilter) {
        const loc = [prov.city, prov.state, prov.zipCode].filter(Boolean).join(" ").toLowerCase();
        if (!loc.includes(locationFilter.toLowerCase())) continue;
      }
      // Rating filter
      if (minRating > 0) {
        const rating = parseFloat(prov.averageRating || "0");
        if (rating < minRating) continue;
      }
      filtered.set(id, entry);
    }
    return filtered;
  }, [services, providers, locationFilter, minRating, maxPrice, serviceTypeFilter]);

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const icon = CATEGORY_ICONS[category.id] || "\ud83d\udce6";

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />

      {/* Page Header */}
      <section className="py-12 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container">
          <Link href="/browse">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Browse
            </Button>
          </Link>
          
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">{icon}</span>
            <h1 className="text-4xl md:text-5xl font-bold">{category.name}</h1>
          </div>
          <p className="text-xl text-muted-foreground mb-6">
            {category.description}
          </p>
          
          <div className="flex flex-wrap gap-2">
            {category.isMobileEnabled && (
              <Badge variant="secondary" className="text-sm">Mobile Services Available</Badge>
            )}
            {category.isFixedLocationEnabled && (
              <Badge variant="secondary" className="text-sm">In-Shop Services Available</Badge>
            )}
            {category.isVirtualEnabled && (
              <Badge variant="secondary" className="text-sm">Virtual Services Available</Badge>
            )}
            {services && <Badge variant="outline" className="text-sm">{services.length} service{services.length !== 1 ? "s" : ""}</Badge>}
            {providers && <Badge variant="outline" className="text-sm">{providers.length} provider{providers.length !== 1 ? "s" : ""}</Badge>}
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="py-4 border-b bg-card/50 sticky top-0 z-10 backdrop-blur-sm">
        <div className="container">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-1.5"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full">
                  !
                </Badge>
              )}
            </Button>

            {/* Quick filter chips */}
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter by city, state, or zip..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="h-8 pl-8 text-sm"
                />
              </div>

              {/* Rating quick filters */}
              {[3, 4, 4.5].map((r) => (
                <Button
                  key={r}
                  variant={minRating === r ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={() => setMinRating(minRating === r ? 0 : r)}
                >
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {r}+
                </Button>
              ))}
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1 text-muted-foreground">
                <X className="w-3.5 h-3.5" /> Clear
              </Button>
            )}
          </div>

          {/* Expanded filter panel */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Price</label>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Any"
                    value={maxPrice ?? ""}
                    onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
                    className="h-8 text-sm"
                    min={0}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Service Type</label>
                <select
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                  value={serviceTypeFilter}
                  onChange={(e) => setServiceTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="in_person">In Person</option>
                  <option value="mobile">Mobile</option>
                  <option value="virtual">Virtual</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Min Rating</label>
                <select
                  className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                >
                  <option value={0}>Any Rating</option>
                  <option value={3}>3+ Stars</option>
                  <option value={3.5}>3.5+ Stars</option>
                  <option value={4}>4+ Stars</option>
                  <option value={4.5}>4.5+ Stars</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Location</label>
                <Input
                  placeholder="City, state, or zip"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Providers & Services */}
      <section className="py-12">
        <div className="container">
          {/* Active filter summary */}
          {hasActiveFilters && (
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <span>Showing {servicesByProvider.size} provider{servicesByProvider.size !== 1 ? "s" : ""}</span>
              {locationFilter && <Badge variant="secondary" className="text-xs">Near \"{locationFilter}\"</Badge>}
              {minRating > 0 && <Badge variant="secondary" className="text-xs"><Star className="w-3 h-3 mr-0.5 fill-amber-400 text-amber-400" /> {minRating}+</Badge>}
              {maxPrice !== null && <Badge variant="secondary" className="text-xs">Under ${maxPrice}</Badge>}
              {serviceTypeFilter !== "all" && <Badge variant="secondary" className="text-xs capitalize">{serviceTypeFilter.replace("_", " ")}</Badge>}
            </div>
          )}
          {servicesByProvider.size > 0 ? (
            <div className="space-y-8">
              {Array.from(servicesByProvider.entries()).map(([providerId, { provider, services: provServices }]) => (
                <Card key={providerId} className="overflow-hidden">
                  {/* Provider Header */}
                  <CardHeader className="bg-muted/30 border-b">
                    <Link href={provider.slug ? `/provider/${provider.slug}` : "#"}>
                      <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          {provider.profilePhotoUrl ? (
                            <img src={provider.profilePhotoUrl} alt={provider.businessName} className="w-full h-full rounded-xl object-cover" />
                          ) : (
                            <User className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg hover:text-primary transition-colors">
                            {provider.businessName}
                          </CardTitle>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                            {(provider.city || provider.state) && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                {[provider.city, provider.state].filter(Boolean).join(", ")}
                              </span>
                            )}
                            {parseFloat(provider.averageRating || "0") > 0 && (
                              <span className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                {parseFloat(provider.averageRating).toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button variant="outline" size="sm">View Profile</Button>
                      </div>
                    </Link>
                    <AvailabilityQuickView providerId={providerId} />
                  </CardHeader>

                  {/* Provider's Services in this category */}
                  <CardContent className="p-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {provServices.map((service: any) => (
                        <Link key={service.id} href={`/service/${service.id}`}>
                          <div className="p-3 rounded-lg border hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{service.name}</p>
                                {service.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{service.description}</p>
                                )}
                              </div>
                              <span className="font-bold text-sm text-primary flex-shrink-0">
                                {service.pricingModel === "fixed" && service.basePrice && formatCurrency(service.basePrice)}
                                {service.pricingModel === "hourly" && service.hourlyRate && `${formatCurrency(service.hourlyRate)}/hr`}
                                {service.pricingModel === "package" && service.basePrice && formatCurrency(service.basePrice)}
                                {service.pricingModel === "custom_quote" && "Quote"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs capitalize">
                                {service.serviceType.replace("_", " ")}
                              </Badge>
                              {service.durationMinutes && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {service.durationMinutes} min
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !services || services.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No services available in this category yet. Check back soon!
                </p>
              </CardContent>
            </Card>
          ) : (
            /* Fallback: show services without provider grouping */
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service: any) => (
                <Link key={service.id} href={`/service/${service.id}`}>
                  <Card className="hover:shadow-medium transition-all cursor-pointer group h-full">
                    <CardHeader>
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">
                        {service.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{service.description}</p>
                      <div className="font-semibold text-primary">
                        {service.pricingModel === "fixed" && service.basePrice && formatCurrency(service.basePrice)}
                        {service.pricingModel === "hourly" && service.hourlyRate && `${formatCurrency(service.hourlyRate)}/hr`}
                        {service.pricingModel === "custom_quote" && "Get Quote"}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
