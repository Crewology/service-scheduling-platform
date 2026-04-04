import { useState, useMemo, useRef } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Star,
  MapPin,
  Clock,
  ArrowLeft,
  CheckCircle,
  Shield,
  ExternalLink,
  Calendar,
  ChevronRight,
  Globe,
  Smartphone,
  Home,
  User,
  Heart,
  Zap,
  Package,
  FileText,
  DollarSign,
  MessageSquare,
  Send,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

function formatCurrency(value: string | number | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return `$${num.toFixed(2)}`;
}

// ============================================================================
// BEFORE/AFTER COMPARISON CARD (public profile)
// ============================================================================
function BeforeAfterCard({ beforeUrl, afterUrl }: { beforeUrl: string; afterUrl: string }) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-col-resize select-none overflow-hidden"
      onMouseMove={(e) => { if (e.buttons === 1) handleMove(e.clientX); }}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
    >
      <img src={afterUrl} alt="After" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
        <img src={beforeUrl} alt="Before" className="absolute inset-0 w-full h-full object-cover" style={{ minWidth: containerRef.current?.offsetWidth || '100%' }} />
      </div>
      <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg" style={{ left: `${sliderPos}%` }}>
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center">
          <span className="text-xs text-gray-500">↔</span>
        </div>
      </div>
      <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">Before</span>
      <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">After</span>
    </div>
  );
}

const CATEGORY_ICONS: Record<number, string> = {
  15: "\ud83c\udfac", 170: "\ud83d\udc88", 7: "\u2702\ufe0f", 126: "\ud83d\udd12", 195: "\ud83d\udc83", 202: "\ud83d\udd28",
  23: "\ud83e\uddb7", 20: "\ud83c\udfb5", 22: "\ud83d\ude9b", 177: "\ud83c\udf89", 196: "\ud83d\udc41\ufe0f", 178: "\ud83d\udcb0",
  109: "\ud83c\udfcb\ufe0f", 197: "\ud83d\udccb", 9: "\ud83d\udd27", 193: "\ud83e\uddd8", 188: "\ud83e\uddf9", 200: "\u26a1",
  179: "\ud83c\udfe0", 171: "\ud83d\udc87", 174: "\ud83d\ude97", 176: "\ud83d\udd29", 111: "\ud83d\udd17", 10: "\ud83d\udc86",
  168: "\ud83d\ude99", 169: "\ud83d\udee0\ufe0f", 199: "\ud83c\udfaa", 158: "\ud83c\udfaf", 73: "\ud83c\udf7d\ufe0f", 12: "\ud83d\udcaa",
  11: "\ud83d\udc3e", 17: "\ud83d\udcf8", 148: "\ud83d\udca6", 26: "\ud83d\udcc5", 8: "\ud83d\udc85", 194: "\u2600\ufe0f",
  198: "\ud83d\udcbb", 19: "\ud83c\udfa5", 155: "\ud83d\udcf1", 201: "\ud83d\udda5\ufe0f", 205: "\ud83c\udf10",
};

function ServiceCardPhoto({ serviceId }: { serviceId: number }) {
  const { data: photos } = trpc.service.getPhotos.useQuery({ serviceId });
  if (!photos || photos.length === 0) return null;
  return (
    <div className="aspect-[16/9] bg-muted overflow-hidden rounded-t-lg">
      <img src={photos[0].photoUrl} alt="Service" className="w-full h-full object-cover" />
    </div>
  );
}

function FavoriteButton({ providerId }: { providerId: number }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: favData } = trpc.provider.checkFavorite.useQuery(
    { providerId },
    { enabled: !!user }
  );
  const toggle = trpc.provider.toggleFavorite.useMutation({
    onSuccess: (result) => {
      utils.provider.checkFavorite.invalidate({ providerId });
      utils.provider.myFavorites.invalidate();
      toast.success(result.favorited ? "Added to saved providers" : "Removed from saved providers");
    },
  });
  if (!user) return null;
  const isFav = favData?.favorited ?? false;
  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-9 w-9 rounded-full ${isFav ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-red-500"}`}
      onClick={() => toggle.mutate({ providerId })}
      disabled={toggle.isPending}
    >
      <Heart className={`h-5 w-5 ${isFav ? "fill-current" : ""}`} />
    </Button>
  );
}

export default function PublicProviderProfile() {
  const params = useParams<{ slug: string }>();
  const { data, isLoading, error } = trpc.provider.getBySlug.useQuery(
    { slug: params.slug || "" },
    { enabled: !!params.slug }
  );

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [quoteTitle, setQuoteTitle] = useState("");
  const [quoteDescription, setQuoteDescription] = useState("");
  const [quoteDate, setQuoteDate] = useState("");
  const [quoteTime, setQuoteTime] = useState("");
  const [quoteLocation, setQuoteLocation] = useState("");
  const [quoteLocationType, setQuoteLocationType] = useState<"mobile" | "fixed_location" | "virtual">("mobile");
  const [quoteCategory, setQuoteCategory] = useState<number | undefined>(undefined);
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);

  const { user } = useAuth();
  const requestQuote = trpc.provider.requestQuote.useMutation({
    onSuccess: () => {
      toast.success("Quote request sent! The provider will respond shortly.");
      setShowQuoteDialog(false);
      setQuoteTitle("");
      setQuoteDescription("");
      setQuoteDate("");
      setQuoteTime("");
      setQuoteLocation("");
      setQuoteLocationType("mobile");
      setQuoteCategory(undefined);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleQuoteSubmit = () => {
    if (!data?.provider) return;
    if (!user) {
      window.location.href = getLoginUrl();
      return;
    }
    if (quoteTitle.length < 5) {
      toast.error("Title must be at least 5 characters");
      return;
    }
    if (quoteDescription.length < 20) {
      toast.error("Please describe your needs in at least 20 characters");
      return;
    }
    requestQuote.mutate({
      providerId: data.provider.id,
      categoryId: quoteCategory,
      title: quoteTitle,
      description: quoteDescription,
      preferredDate: quoteDate || undefined,
      preferredTime: quoteTime || undefined,
      locationType: quoteLocationType,
      location: quoteLocation || undefined,
    });
  };

  // Group services by category
  const servicesByCategory = useMemo(() => {
    if (!data?.services || !data?.categories) return new Map();
    const map = new Map<number, { category: any; services: any[] }>();
    for (const service of data.services) {
      if (!map.has(service.categoryId)) {
        const cat = data.categories.find((c: any) => c.id === service.categoryId);
        map.set(service.categoryId, { category: cat, services: [] });
      }
      map.get(service.categoryId)!.services.push(service);
    }
    return map;
  }, [data]);

  const filteredServices = useMemo(() => {
    if (!data?.services) return [];
    if (activeCategory === "all") return data.services;
    const catId = parseInt(activeCategory);
    return data.services.filter((s: any) => s.categoryId === catId);
  }, [data, activeCategory]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading profile...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Provider Not Found</h1>
        <p className="text-muted-foreground">This profile doesn't exist or has been removed.</p>
        <Link href="/">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Home</Button>
        </Link>
      </div>
    );
  }

  const { provider, services, reviews, categories, profilePhoto } = data;

  const { data: portfolio } = trpc.provider.getPublicPortfolio.useQuery(
    { providerId: provider.id },
    { enabled: !!provider.id }
  );
  const { data: responseTime } = trpc.provider.getResponseTime.useQuery(
    { providerId: provider.id },
    { enabled: !!provider.id }
  );
  const { data: packages } = trpc.provider.getPublicPackages.useQuery(
    { providerId: provider.id },
    { enabled: !!provider.id }
  );
  const avgRating = parseFloat(provider.averageRating || "0");
  const displayName = (name: string) =>
    name.split(" ").map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");

  return (
    <div className="min-h-screen bg-background">
      {/* ================================================================ */}
      {/* HERO — Profile Photo + Name + Bio + Stats                        */}
      {/* ================================================================ */}
      <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-background border-b overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="container max-w-5xl py-10 relative">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-6 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to OlogyCrew
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Profile Photo */}
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-2xl bg-muted border-2 border-background shadow-lg overflow-hidden shrink-0">
              {profilePhoto ? (
                <img src={profilePhoto} alt={provider.businessName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                  <span className="text-4xl font-bold text-primary">{provider.businessName.charAt(0)}</span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">{provider.businessName}</h1>
                {provider.verificationStatus === "verified" && (
                  <Badge className="gap-1 bg-blue-500 hover:bg-blue-600 text-white">
                    <CheckCircle className="w-3 h-3" /> Verified
                  </Badge>
                )}
                {/* Favorite Button */}
                <FavoriteButton providerId={provider.id} />
              </div>

              {provider.description && (
                <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">{provider.description}</p>
              )}

              {/* Response Time Badge */}
              {responseTime?.label && responseTime.avgMinutes !== null && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Zap className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600 font-medium">{responseTime.label}</span>
                </div>
              )}

              {/* Stats Row */}
              <div className="flex items-center gap-5 mt-4 flex-wrap">
                {(provider.city || provider.state) && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {[provider.city, provider.state].filter(Boolean).join(", ")}
                  </span>
                )}
                {avgRating > 0 && (
                  <span className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">{avgRating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({provider.totalReviews} reviews)</span>
                  </span>
                )}
                {provider.totalBookings > 0 && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {provider.totalBookings} bookings
                  </span>
                )}
              </div>

              {/* Service Mode Badges */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {provider.acceptsMobile && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Smartphone className="w-3 h-3" /> Mobile
                  </Badge>
                )}
                {provider.acceptsFixedLocation && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Home className="w-3 h-3" /> In-Person
                  </Badge>
                )}
                {provider.acceptsVirtual && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Globe className="w-3 h-3" /> Virtual
                  </Badge>
                )}
              </div>

              {/* Category Tags */}
              {categories && categories.length > 0 && (
                <div className="flex gap-2 mt-4 flex-wrap">
                  {categories.map((cat: any) => (
                    <Badge key={cat.id} variant="secondary" className="gap-1 text-xs py-1">
                      <span>{CATEGORY_ICONS[cat.id] || "\ud83d\udce6"}</span>
                      {displayName(cat.name)}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MAIN CONTENT                                                     */}
      {/* ================================================================ */}
      <div className="container max-w-5xl py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column — Services & Reviews */}
          <div className="lg:col-span-2 space-y-8">
            {/* Category Filter Tabs */}
            {categories && categories.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setActiveCategory("all")}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeCategory === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  All Services ({services.length})
                </button>
                {categories.map((cat: any) => {
                  const count = services.filter((s: any) => s.categoryId === cat.id).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id.toString())}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        activeCategory === cat.id.toString()
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {CATEGORY_ICONS[cat.id] || "\ud83d\udce6"} {displayName(cat.name)} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Services Grid */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">
                {activeCategory === "all"
                  ? "All Services"
                  : (() => {
                      const cat = categories?.find((c: any) => c.id === parseInt(activeCategory));
                      return cat ? `${CATEGORY_ICONS[cat.id] || ""} ${displayName(cat.name)}` : "Services";
                    })()}
              </h2>

              {filteredServices.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No services listed yet.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredServices.map((service: any) => {
                    const cat = categories?.find((c: any) => c.id === service.categoryId);
                    return (
                      <Link key={service.id} href={`/service/${service.id}`}>
                        <Card className="hover:border-primary/30 hover:shadow-md transition-all cursor-pointer overflow-hidden h-full">
                          <ServiceCardPhoto serviceId={service.id} />
                          <CardContent className="p-4">
                            {/* Category tag */}
                            {cat && activeCategory === "all" && (
                              <Badge variant="secondary" className="text-xs mb-2 gap-1">
                                {CATEGORY_ICONS[cat.id] || "\ud83d\udce6"} {displayName(cat.name)}
                              </Badge>
                            )}
                            <h3 className="font-semibold text-foreground">{service.name}</h3>
                            {service.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
                            )}
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {service.durationMinutes && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {service.durationMinutes} min
                                  </span>
                                )}
                                <Badge variant="outline" className="text-xs capitalize">
                                  {service.serviceType.replace("_", " ")}
                                </Badge>
                              </div>
                              <div className="font-bold text-primary">
                                {service.pricingModel === "fixed" && formatCurrency(service.basePrice)}
                                {service.pricingModel === "hourly" && `${formatCurrency(service.hourlyRate)}/hr`}
                                {service.pricingModel === "package" && formatCurrency(service.basePrice)}
                                {service.pricingModel === "custom_quote" && "Get Quote"}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Portfolio Section */}
            {portfolio && portfolio.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">Portfolio & Work Samples</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {portfolio.map((item: any) => (
                    <div key={item.id} className="group relative rounded-lg overflow-hidden border bg-card aspect-square cursor-pointer">
                      {item.mediaType === "before_after" && item.beforeImageUrl ? (
                        <BeforeAfterCard beforeUrl={item.beforeImageUrl} afterUrl={item.imageUrl} />
                      ) : (
                        <img src={item.imageUrl} alt={item.title || "Work sample"} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                        {item.mediaType === "before_after" && (
                          <Badge className="absolute top-2 left-2 text-[10px] bg-blue-500">Before & After</Badge>
                        )}
                        {item.title && <p className="text-white text-sm font-medium">{item.title}</p>}
                        {item.description && <p className="text-white/70 text-xs line-clamp-2">{item.description}</p>}
                        {item.categoryId && (
                          <span className="text-white/50 text-[10px] mt-1">
                            {CATEGORY_ICONS[item.categoryId] || ""} {categories?.find((c: any) => c.id === item.categoryId)?.name?.split(" ").map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ") || ""}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Service Packages Section */}
            {packages && packages.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" /> Service Packages
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {packages.map((pkg: any) => {
                    const discount = pkg.originalPrice && pkg.price
                      ? Math.round((1 - Number(pkg.price) / Number(pkg.originalPrice)) * 100)
                      : 0;
                    return (
                      <Card key={pkg.id} className="relative overflow-hidden border-2 hover:border-primary/30 transition-colors">
                        {discount > 0 && (
                          <div className="absolute top-3 right-3">
                            <Badge className="bg-green-500 hover:bg-green-600 text-white">
                              Save {discount}%
                            </Badge>
                          </div>
                        )}
                        <CardContent className="p-5">
                          <h3 className="text-lg font-bold mb-1">{pkg.name}</h3>
                          {pkg.description && (
                            <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
                          )}
                          <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-2xl font-bold text-primary">{formatCurrency(pkg.price)}</span>
                            {pkg.originalPrice && Number(pkg.originalPrice) > Number(pkg.price) && (
                              <span className="text-sm text-muted-foreground line-through">{formatCurrency(pkg.originalPrice)}</span>
                            )}
                          </div>
                          {pkg.services && pkg.services.length > 0 && (
                            <div className="space-y-1.5">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Includes:</p>
                              {pkg.services.map((svc: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                  <span>{svc.serviceName}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            {reviews.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    Reviews ({reviews.length})
                  </h2>
                  {avgRating > 0 && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${i < Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                        />
                      ))}
                      <span className="text-sm font-semibold ml-1">{avgRating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {reviews.map((review: any) => (
                    <Card key={review.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                          </div>
                        </div>
                        {review.reviewText && (
                          <p className="text-sm text-foreground leading-relaxed">{review.reviewText}</p>
                        )}
                        {review.responseText && (
                          <div className="mt-3 pl-4 border-l-2 border-primary/20 bg-muted/30 rounded-r-lg p-3">
                            <p className="text-xs font-medium text-primary mb-1">Provider Response</p>
                            <p className="text-sm text-muted-foreground">{review.responseText}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* RIGHT SIDEBAR — Quick Book + Business Info                    */}
          {/* ============================================================ */}
          <div className="space-y-4">
            {/* Quick Book Card */}
            <Card className="sticky top-4">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold text-lg">Book a Service</h3>
                {services.length > 0 ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Choose from {services.length} service{services.length !== 1 ? "s" : ""} across {categories?.length || 1} categor{(categories?.length || 1) !== 1 ? "ies" : "y"}
                    </p>
                    <div className="space-y-2">
                      {services.slice(0, 3).map((service: any) => (
                        <Link key={service.id} href={`/service/${service.id}`}>
                          <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                            <span className="text-sm font-medium truncate flex-1">{service.name}</span>
                            <span className="text-sm font-semibold text-primary ml-2">
                              {service.pricingModel === "fixed" && formatCurrency(service.basePrice)}
                              {service.pricingModel === "hourly" && `${formatCurrency(service.hourlyRate)}/hr`}
                              {service.pricingModel === "package" && formatCurrency(service.basePrice)}
                              {service.pricingModel === "custom_quote" && "Quote"}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                    {services.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        + {services.length - 3} more service{services.length - 3 !== 1 ? "s" : ""}
                      </p>
                    )}
                    <Separator />
                    <Link href="/browse">
                      <Button className="w-full">
                        <Calendar className="w-4 h-4 mr-2" /> Browse & Book
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setShowQuoteDialog(true)}
                    >
                      <FileText className="w-4 h-4 mr-2" /> Request a Quote
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No services available yet.</p>
                )}
              </CardContent>
            </Card>

            {/* Business Details */}
            <Card>
              <CardContent className="p-5 space-y-3">
                <h3 className="font-semibold">Business Details</h3>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p className="capitalize">Type: {provider.businessType.replace("_", " ")}</p>
                  {provider.serviceRadiusMiles && (
                    <p>Service area: {provider.serviceRadiusMiles} mile radius</p>
                  )}
                  {provider.yearsInBusiness && (
                    <p>{provider.yearsInBusiness}+ years experience</p>
                  )}
                  <p>Member since {new Date(provider.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
                </div>

                {/* Trust Badges */}
                {(provider.insuranceVerified || provider.backgroundCheckVerified || provider.verificationStatus === "verified") && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      {provider.verificationStatus === "verified" && (
                        <p className="flex items-center gap-1.5 text-sm text-blue-600">
                          <CheckCircle className="w-4 h-4" /> Identity Verified
                        </p>
                      )}
                      {provider.insuranceVerified && (
                        <p className="flex items-center gap-1.5 text-sm text-green-600">
                          <Shield className="w-4 h-4" /> Insurance Verified
                        </p>
                      )}
                      {provider.backgroundCheckVerified && (
                        <p className="flex items-center gap-1.5 text-sm text-green-600">
                          <Shield className="w-4 h-4" /> Background Check
                        </p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Categories Served */}
            {categories && categories.length > 0 && (
              <Card>
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-semibold">Categories Served</h3>
                  <div className="space-y-2">
                    {categories.map((cat: any) => {
                      const count = services.filter((s: any) => s.categoryId === cat.id).length;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setActiveCategory(cat.id.toString())}
                          className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted transition-colors text-left"
                        >
                          <span className="flex items-center gap-2 text-sm">
                            <span>{CATEGORY_ICONS[cat.id] || "\ud83d\udce6"}</span>
                            <span className="font-medium">{displayName(cat.name)}</span>
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {count} service{count !== 1 ? "s" : ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t mt-12">
        <div className="container max-w-5xl py-6 text-center text-sm text-muted-foreground">
          Powered by <Link href="/"><span className="text-primary hover:underline">OlogyCrew</span></Link> — Your service, your business, your way.
        </div>
      </div>

      {/* ================================================================ */}
      {/* REQUEST A QUOTE DIALOG                                           */}
      {/* ================================================================ */}
      <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Request a Custom Quote
            </DialogTitle>
            <DialogDescription>
              Describe what you need and {provider.businessName || "this provider"} will send you a personalized quote.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Category Selection */}
            {categories && categories.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="quote-category">Service Category</Label>
                <Select
                  value={quoteCategory?.toString() || ""}
                  onValueChange={(val) => setQuoteCategory(val ? parseInt(val) : undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat: any) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {CATEGORY_ICONS[cat.id] || "\ud83d\udce6"} {displayName(cat.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="quote-title">What do you need? *</Label>
              <Input
                id="quote-title"
                placeholder="e.g., Wedding DJ for 200 guests"
                value={quoteTitle}
                onChange={(e) => setQuoteTitle(e.target.value)}
                maxLength={200}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="quote-desc">Describe your requirements *</Label>
              <Textarea
                id="quote-desc"
                placeholder="Include details like event type, duration, special requirements, number of people, etc."
                value={quoteDescription}
                onChange={(e) => setQuoteDescription(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                {quoteDescription.length < 20 ? `${20 - quoteDescription.length} more characters needed` : "\u2713 Looks good"}
              </p>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="quote-date">Preferred Date</Label>
                <Input
                  id="quote-date"
                  type="date"
                  value={quoteDate}
                  onChange={(e) => setQuoteDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quote-time">Preferred Time</Label>
                <Input
                  id="quote-time"
                  type="time"
                  value={quoteTime}
                  onChange={(e) => setQuoteTime(e.target.value)}
                />
              </div>
            </div>

            {/* Location Type */}
            <div className="space-y-2">
              <Label>Service Location</Label>
              <Select
                value={quoteLocationType}
                onValueChange={(val) => setQuoteLocationType(val as "mobile" | "fixed_location" | "virtual")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile">\ud83d\ude97 Mobile (provider comes to you)</SelectItem>
                  <SelectItem value="fixed_location">\ud83c\udfe2 At provider's location</SelectItem>
                  <SelectItem value="virtual">\ud83d\udcbb Virtual / Remote</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location Address */}
            {quoteLocationType === "mobile" && (
              <div className="space-y-2">
                <Label htmlFor="quote-location">Your Address / Location</Label>
                <Input
                  id="quote-location"
                  placeholder="Enter your address or area"
                  value={quoteLocation}
                  onChange={(e) => setQuoteLocation(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowQuoteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleQuoteSubmit}
              disabled={requestQuote.isPending || quoteTitle.length < 5 || quoteDescription.length < 20}
            >
              {requestQuote.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Send Quote Request
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
