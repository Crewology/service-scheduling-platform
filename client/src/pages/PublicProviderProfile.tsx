import { useState, useMemo, useRef, useCallback } from "react";
import { NavHeader } from "@/components/shared/NavHeader";
import { useParams, Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatDuration } from "../../../shared/duration";
import { getServiceTypeLabel } from "../../../shared/serviceTypeLabels";
import { adaptiveServiceHref, getAdaptiveBookingDecision } from "../../../shared/adaptiveBooking";
import { AdaptiveModeBadge } from "@/components/booking/AdaptiveModeBadge";
import { SaveProviderButton } from "@/components/SaveProviderButton";
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
import { OfficialBadge } from "@/components/OfficialBadge";
import { ShareProfile } from "@/components/ShareProfile";
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
  AlertTriangle,
  Phone,
  Sparkles,
  TrendingUp,
  Users,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useState as useStateLocal, useEffect as useEffectLocal } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { TrustBadge } from "@/components/TrustBadge";
import { PaymentMethods } from "@/components/PaymentMethods";

function formatCurrency(value: string | number | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  const hasRealCents = num % 1 !== 0;
  return hasRealCents ? `$${num.toFixed(2)}` : `$${Math.round(num)}`;
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
  109: "\ud83c\udfcb\ufe0f", 9: "\ud83d\udd27", 193: "\ud83e\uddd8", 188: "\ud83e\uddf9", 200: "\u26a1",
  179: "\ud83c\udfe0", 171: "\ud83d\udc87", 174: "\ud83d\ude97", 176: "\ud83d\udd29", 111: "\ud83d\udd17", 10: "\ud83d\udc86",
  168: "\ud83d\ude99", 169: "\ud83d\udee0\ufe0f", 199: "\ud83c\udfaa", 158: "\ud83c\udfaf", 73: "\ud83c\udf7d\ufe0f", 12: "\ud83d\udcaa",
  11: "\ud83d\udc3e", 17: "\ud83d\udcf8", 148: "\ud83d\udca6", 26: "\ud83d\udcc5", 8: "\ud83d\udc85", 194: "\u2600\ufe0f",
  198: "\ud83d\udcbb", 19: "\ud83c\udfa5", 155: "\ud83d\udcf1", 201: "\ud83d\udda5\ufe0f", 205: "\ud83c\udf10", 211: "\ud83d\udd27",
  212: "\u26a1", 213: "\u2744\ufe0f", 214: "\ud83e\ude9a", 215: "\ud83c\udfe0", 216: "\ud83d\udce3",
  210: "\ud83d\udd49\ufe0f", 218: "\ud83c\udf31",
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
  return <SaveProviderButton providerId={providerId} className="h-9 w-9" iconClassName="h-5 w-5" stopPropagation={false} />;
}

function PortfolioGrid({ portfolio, categories }: { portfolio: any[]; categories: any[] }) {
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());
  const handleImageError = useCallback((id: number) => {
    setBrokenImages(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const visibleItems = portfolio.filter(item => !brokenImages.has(item.id));

  if (visibleItems.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {visibleItems.map((item: any) => (
        <div key={item.id} className="group relative rounded-lg overflow-hidden border bg-card aspect-square cursor-pointer">
          {item.mediaType === "before_after" && item.beforeImageUrl ? (
            <div className="w-full h-full">
              <BeforeAfterCard beforeUrl={item.beforeImageUrl} afterUrl={item.imageUrl} />
              {/* Hidden images to detect load errors for before/after items */}
              <img
                src={item.imageUrl}
                alt=""
                className="hidden"
                onError={() => handleImageError(item.id)}
              />
              <img
                src={item.beforeImageUrl}
                alt=""
                className="hidden"
                onError={() => handleImageError(item.id)}
              />
            </div>
          ) : (
            <img
              src={item.imageUrl}
              alt={item.title || "Work sample"}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              onError={() => handleImageError(item.id)}
            />
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
  );
}

function TipCard({ providerId, providerName }: { providerId: number; providerName: string }) {
  const { data: tipInfo } = trpc.provider.getPublicTipInfo.useQuery({ providerId });
  const [showTip, setShowTip] = useState(false);

  if (!tipInfo) return null;

  const hasZelle = !!tipInfo.tipZelleHandle;
  const hasCashApp = !!tipInfo.tipCashAppHandle;
  const hasVenmo = !!tipInfo.tipVenmoHandle;

  return (
    <Card className="border-pink-200 bg-gradient-to-br from-pink-50/50 to-white dark:from-pink-950/20 dark:to-background">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
          <h3 className="font-semibold">Leave a Tip</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {tipInfo.tipThankYouMessage || `Show ${providerName} some appreciation — 100% goes directly to them, zero fees.`}
        </p>
        {!showTip ? (
          <Button
            variant="outline"
            className="w-full border-pink-300 text-pink-700 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-300 dark:hover:bg-pink-950/30"
            onClick={() => setShowTip(true)}
          >
            <Heart className="w-4 h-4 mr-2" /> Send a Tip
          </Button>
        ) : (
          <div className="space-y-2">
            {hasZelle && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-muted border">
                <span className="text-lg">💲</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Zelle</p>
                  <p className="text-sm font-medium truncate">{tipInfo.tipZelleHandle}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(tipInfo.tipZelleHandle!); toast.success("Copied!"); }}>
                  Copy
                </Button>
              </div>
            )}
            {hasCashApp && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-muted border">
                <span className="text-lg">💵</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Cash App</p>
                  <p className="text-sm font-medium truncate">{tipInfo.tipCashAppHandle}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(tipInfo.tipCashAppHandle!); toast.success("Copied!"); }}>
                  Copy
                </Button>
              </div>
            )}
            {hasVenmo && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-muted border">
                <span className="text-lg">🔵</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Venmo</p>
                  <p className="text-sm font-medium truncate">{tipInfo.tipVenmoHandle}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(tipInfo.tipVenmoHandle!); toast.success("Copied!"); }}>
                  Copy
                </Button>
              </div>
            )}
            <p className="text-xs text-center text-muted-foreground pt-1">
              Open your preferred app and send directly
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PublicProviderProfile() {
  const params = useParams<{ slug: string }>();
  const { data, isLoading, error } = trpc.provider.getBySlug.useQuery(
    { slug: params.slug || "" },
    { enabled: !!params.slug }
  );

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showDemoWelcome, setShowDemoWelcome] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [quoteTitle, setQuoteTitle] = useState("");
  const [quoteDescription, setQuoteDescription] = useState("");
  const [quoteDate, setQuoteDate] = useState("");
  const [quoteTime, setQuoteTime] = useState("");
  const [quoteLocation, setQuoteLocation] = useState("");
  const [quoteLocationType, setQuoteLocationType] = useState<"mobile" | "fixed_location" | "virtual">("mobile");
  const [quoteCategory, setQuoteCategory] = useState<number | undefined>(undefined);
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [directMessage, setDirectMessage] = useState("");

  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const startConversation = trpc.message.startConversation.useMutation({
    onSuccess: (data) => {
      toast.success("Message sent!");
      setShowMessageDialog(false);
      setDirectMessage("");
      setTimeout(() => setLocation(`/dm/${data.conversationId}`), 500);
    },
    onError: (err) => toast.error(err.message),
  });
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

  // These hooks MUST be called before any early returns to satisfy Rules of Hooks
  const providerId = data?.provider?.id;
  const { data: portfolio } = trpc.provider.getPublicPortfolio.useQuery(
    { providerId: providerId! },
    { enabled: !!providerId }
  );
  const { data: responseTime } = trpc.provider.getResponseTime.useQuery(
    { providerId: providerId! },
    { enabled: !!providerId }
  );
  const { data: packages } = trpc.provider.getPublicPackages.useQuery(
    { providerId: providerId! },
    { enabled: !!providerId }
  );

  // Show demo welcome popup on first visit to demo provider
  const isOfficial = data?.provider?.isOfficial;
  useEffectLocal(() => {
    if (isOfficial) {
      const dismissed = sessionStorage.getItem('demo_welcome_dismissed');
      if (!dismissed) {
        setShowDemoWelcome(true);
      }
    }
  }, [isOfficial]);

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
        <Button variant="outline" onClick={() => window.history.length > 1 ? window.history.back() : setLocation('/')}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
      </div>
    );
  }

  const { provider, services, reviews, categories, profilePhoto, trustProfile } = data;
  const avgRating = parseFloat(provider.averageRating || "0");
  const displayName = (name: string) =>
    name.split(" ").map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(" ");

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />

      {/* Demo Welcome Popup */}
      <Dialog open={showDemoWelcome} onOpenChange={(open) => {
        if (!open) {
          setShowDemoWelcome(false);
          sessionStorage.setItem('demo_welcome_dismissed', 'true');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100">
                <Sparkles className="w-4 h-4 text-amber-600" />
              </span>
              Welcome to the Demo Experience!
            </DialogTitle>
            <DialogDescription asChild>
              <div className="text-left space-y-3 pt-2">
                <p className="text-sm text-foreground/80">
                  This is a <strong>risk-free way to test the booking process</strong> on OlogyCrew. You can:
                </p>
                <ul className="text-sm text-muted-foreground space-y-2 pl-1">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Browse and book any demo service completely free</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Experience the full booking flow without entering payment info</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Cancel demo bookings anytime with one click</span>
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground pt-1">
                  No credit card needed. No charges. Just a preview of how easy it is to book real services.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                setShowDemoWelcome(false);
                sessionStorage.setItem('demo_welcome_dismissed', 'true');
              }}
            >
              Got it, let me explore!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ================================================================ */}
      {/* HERO — Profile Photo + Name + Bio + Stats                        */}
      {/* ================================================================ */}
      <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-background border-b overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="container max-w-5xl py-10 relative">
          <Button variant="ghost" size="sm" className="mb-6 text-muted-foreground hover:text-foreground" onClick={() => window.history.length > 1 ? window.history.back() : setLocation('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>

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
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">{provider.businessName}</h1>
                {provider.isOfficial && <OfficialBadge size="lg" />}
                {provider.trustLevel && provider.trustLevel !== "new" && (
                  <TrustBadge level={provider.trustLevel} size="md" />
                )}

                {/* Favorite Button */}
                <FavoriteButton providerId={provider.id} />
                {/* Share Button */}
                <ShareProfile
                  url={`/${provider.profileSlug || params.slug}`}
                  
                  title={provider.businessName || "Provider"}
                  description={provider.description || `Book services from ${provider.businessName} on OlogyCrew`}
                  size="sm"
                />
              </div>

              {provider.description && (
                <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">{provider.description}</p>
              )}

              {/* Response Time Badge */}
              {responseTime?.label && responseTime.avgMinutes !== null && (
                <div className="flex items-center gap-1.5 mt-2">
                  <Zap className="w-4 h-4 text-green-600" />
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
                {provider.offersEstimates && (
                  <Badge className="gap-1 text-xs bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                    <FileText className="w-3 h-3" /> Free Estimates
                  </Badge>
                )}
                {provider.offersEmergencyService && (
                  <Badge className="gap-1 text-xs bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
                    <AlertTriangle className="w-3 h-3" /> Emergency Service Available
                    {provider.emergencyHoursType === "24_7" && " — 24/7"}
                    {provider.emergencyHoursType === "after_hours" && " — After Hours"}
                    {provider.emergencyHoursType === "custom" && provider.emergencyHoursNote && ` — ${provider.emergencyHoursNote}`}
                  </Badge>
                )}
              </div>

              {/* Emergency Hours Note (for after_hours type with note) */}
              {provider.offersEmergencyService && provider.emergencyHoursType === "after_hours" && provider.emergencyHoursNote && (
                <p className="text-sm text-red-700 dark:text-red-400 mt-2 italic flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {provider.emergencyHoursNote}
                </p>
              )}

              {/* Estimate Note */}
              {provider.offersEstimates && provider.estimateNote && (
                <p className="text-sm text-green-700 dark:text-green-400 mt-2 italic">
                  {provider.estimateNote}
                </p>
              )}

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
      {/* OFFICIAL PROVIDER — Interactive Showcase (only for isOfficial)   */}
      {/* ================================================================ */}
      {provider.isOfficial && (
        <div className="border-b bg-gradient-to-r from-amber-50/50 via-orange-50/30 to-amber-50/50 dark:from-amber-950/20 dark:via-orange-950/10 dark:to-amber-950/20">
          <div className="container max-w-5xl py-8">
            {/* Demo Provider Banner */}
            <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-white/70 dark:bg-card/50 border border-amber-300/40 shadow-sm">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Sparkles className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-foreground">Demo Provider — Free to Book</h3>
                <p className="text-xs text-muted-foreground">This is a demo provider. Book any service below for free to experience how easy it is. No charges will be made.</p>
              </div>
              <Link href="/provider/onboarding">
                <Button size="sm" className="gap-1.5 shrink-0">
                  Become a Provider <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            {/* Animated Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <AnimatedStatCard icon={<Layers className="w-5 h-5" />} label="Categories" value={categories?.length || 0} suffix="+" color="blue" />
              <AnimatedStatCard icon={<Package className="w-5 h-5" />} label="Services" value={services.length} suffix="" color="purple" />
              <AnimatedStatCard icon={<Users className="w-5 h-5" />} label="Bookings" value={provider.totalBookings || 0} suffix="+" color="green" />
              <AnimatedStatCard icon={<TrendingUp className="w-5 h-5" />} label="Response" value={100} suffix="%" color="amber" />
            </div>

            {/* How It Works Steps */}
            <div className="bg-white/70 dark:bg-card/50 rounded-xl border border-border/50 p-5">
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> How Booking Works
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <HowItWorksStep step={1} title="Browse Services" description="Find the service you need from the list below" />
                <HowItWorksStep step={2} title="Pick a Time" description="Choose a date and available time slot" />
                <HowItWorksStep step={3} title="Confirm Details" description="Add your info and submit the request" />
                <HowItWorksStep step={4} title="Get Confirmed" description="Provider confirms and you're all set" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MAIN CONTENT                                                     */}
      {/* ================================================================ */}
      <div className="container max-w-5xl py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column — Services & Reviews */}
          <div id="services-section" className="lg:col-span-2 space-y-8">
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
                    const decision = getAdaptiveBookingDecision(service);
                    const serviceHref = adaptiveServiceHref(service.id, {
                      providerSlug: provider.profileSlug || provider.id,
                    });
                    return (
                      <Link key={service.id} href={serviceHref}>
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
                            <AdaptiveModeBadge decision={decision} copy="action" className="mt-2 text-[11px]" />
                            {service.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{service.description}</p>
                            )}
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {service.durationMinutes && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {formatDuration(service.durationMinutes)}
                                  </span>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {getServiceTypeLabel(service.serviceType, service.categoryId)}
                                </Badge>
                              </div>
                              <div className="font-bold text-primary">
                                {service.pricingModel === "fixed" && formatCurrency(service.basePrice)}
                                {service.pricingModel === "hourly" && `${formatCurrency(service.hourlyRate)}/hr`}
                                {service.pricingModel === "package" && formatCurrency(service.basePrice)}
                                {service.pricingModel === "custom_quote" && "Get Quote"}
                                {service.pricingModel === "consultation" && "Free"}
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
                <PortfolioGrid portfolio={portfolio} categories={categories} />
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
                                  <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
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
            {/* Emergency Service CTA — prominent, above everything */}
            {provider.offersEmergencyService && (
              <Card className="border-2 border-red-500 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 shadow-lg shadow-red-500/10 overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse" />
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-full bg-red-500 text-white">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-red-900 dark:text-red-100">Emergency Service</h3>
                      <p className="text-xs text-red-700 dark:text-red-300">
                        {provider.emergencyHoursType === "24_7" && "Available 24/7"}
                        {provider.emergencyHoursType === "after_hours" && (provider.emergencyHoursNote || "Available after hours")}
                        {provider.emergencyHoursType === "custom" && (provider.emergencyHoursNote || "Custom availability")}
                        {!provider.emergencyHoursType && "Available for emergencies"}
                      </p>
                    </div>
                  </div>
                  <Button
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md"
                    size="lg"
                    onClick={() => {
                      if (!user) {
                        window.location.href = getLoginUrl();
                        return;
                      }
                      if (user.id === provider.userId) {
                        toast.info("This is your own profile");
                        return;
                      }
                      setShowQuoteDialog(true);
                    }}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Request Emergency Service
                  </Button>
                  <p className="text-xs text-red-600/70 dark:text-red-400/70 text-center">
                    Urgent? Send a request now and the provider will be notified immediately.
                  </p>
                </CardContent>
              </Card>
            )}

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
                      {services.slice(0, 3).map((service: any) => {
                        const decision = getAdaptiveBookingDecision(service);
                        const serviceHref = adaptiveServiceHref(service.id, {
                          providerSlug: provider.profileSlug || provider.id,
                        });
                        return (
<Link key={service.id} href={serviceHref}>
                           <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                            <span className="text-sm font-medium truncate flex-1">{service.name}</span>
                            <span className="text-right text-sm font-semibold text-primary ml-2">
                              {service.pricingModel === "fixed" && formatCurrency(service.basePrice)}
                              {service.pricingModel === "hourly" && `${formatCurrency(service.hourlyRate)}/hr`}
                              {service.pricingModel === "package" && formatCurrency(service.basePrice)}
                              {service.pricingModel === "custom_quote" && "Quote"}
                              {service.pricingModel === "consultation" && "Free"}
                              <span className="block text-[10px] font-medium text-muted-foreground">
                                {decision.mode === "direct" ? "Book" : "Request"}
                              </span>
                            </span>
                          </div>
                        </Link>
                        );
                      })}
                    </div>
                    {services.length > 3 && (
                      <p className="text-xs text-muted-foreground text-center">
                        + {services.length - 3} more service{services.length - 3 !== 1 ? "s" : ""}
                      </p>
                    )}
                    <Separator />
                    <Button 
                      className="w-full"
                      onClick={() => {
                        const el = document.getElementById('services-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                    >
                      <Calendar className="w-4 h-4 mr-2" /> Browse & Book
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setShowQuoteDialog(true)}
                    >
                      <FileText className="w-4 h-4 mr-2" /> Request a Quote
                    </Button>
                    {!provider.isOfficial && (
                      <PaymentMethods size="sm" showSecure={false} className="mt-1" />
                    )}
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        if (!user) {
                          window.location.href = getLoginUrl();
                          return;
                        }
                        if (user.id === provider.userId) {
                          toast.info("This is your own profile");
                          return;
                        }
                        setShowMessageDialog(true);
                      }}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" /> Message Provider
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

                {/* Evidence and OlogyCrew activity are intentionally separate signals. */}
                {trustProfile && (
                  <>
                    <Separator />
                    {trustProfile.isOfficialDemo ? (
                      <div className="space-y-1">
                        <p className="flex items-center gap-1.5 text-sm font-medium text-blue-700">
                          <Shield className="w-4 h-4" /> Official OlogyCrew demo
                        </p>
                        <p className="text-xs text-muted-foreground">Demo profiles do not carry provider verification claims.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {trustProfile.publicEvidence.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evidence reviewed by OlogyCrew</p>
                            {trustProfile.publicEvidence.map(signal => (
                              <div key={signal.type} className="rounded-lg bg-emerald-50 p-2.5 text-sm text-emerald-900">
                                <p className="flex items-center gap-1.5 font-medium"><Shield className="h-4 w-4" /> {signal.label}</p>
                                {signal.expiresAt && <p className="mt-1 text-xs text-emerald-800">Current through {new Date(signal.expiresAt).toLocaleDateString()}</p>}
                                <p className="mt-1 text-xs text-emerald-800">{signal.publicExplanation}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">OlogyCrew activity</p>
                          <p className="text-sm">{trustProfile.activity.completedBookingsLabel}</p>
                          <p className="text-sm">{trustProfile.activity.reviewsLabel}</p>
                          {trustProfile.standing.level !== "new" && (
                            <div>
                              <p className="text-sm font-medium">{trustProfile.standing.label}</p>
                              <p className="text-xs text-muted-foreground">{trustProfile.standing.explanation} This is not credential verification.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Tip This Provider */}
            <TipCard providerId={provider.id} providerName={provider.businessName} />

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
      <div className="border-t mt-12 bg-slate-50">
        <div className="container max-w-5xl py-8 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Powered by <Link href="/"><span className="text-primary font-medium hover:underline">OlogyCrew</span></Link>
          </p>
          <p className="text-xs text-muted-foreground mb-3">The digital home for service professionals</p>
          <Link href="/pricing">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer">
              Get your own page — it's free to start →
            </span>
          </Link>
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
                  <SelectItem value="mobile">Mobile (provider comes to you)</SelectItem>
                  <SelectItem value="fixed_location">At provider's location</SelectItem>
                  <SelectItem value="virtual">Virtual / Remote</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                  <SelectItem value="teams">Microsoft Teams</SelectItem>
                  <SelectItem value="zoom">Zoom</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
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

      {/* ================================================================ */}
      {/* MESSAGE PROVIDER DIALOG                                          */}
      {/* ================================================================ */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Message {provider.businessName}
            </DialogTitle>
            <DialogDescription>
              Start a conversation with this provider. They'll receive a notification and can reply directly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="direct-message">Your Message *</Label>
              <Textarea
                id="direct-message"
                placeholder="Hi! I'm interested in your services. I'd like to know more about..."
                value={directMessage}
                onChange={(e) => setDirectMessage(e.target.value)}
                rows={4}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">
                {directMessage.length}/2000 characters
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowMessageDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!directMessage.trim()) {
                  toast.error("Please enter a message");
                  return;
                }
                startConversation.mutate({
                  recipientId: provider.userId,
                  messageText: directMessage.trim(),
                });
              }}
              disabled={startConversation.isPending || !directMessage.trim()}
            >
              {startConversation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Send Message
                </span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ================================================================ */
/* HELPER COMPONENTS — Official Profile Interactive Elements         */
/* ================================================================ */

function AnimatedStatCard({ icon, label, value, suffix, color }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix: string;
  color: "blue" | "purple" | "green" | "amber";
}) {
  const [displayValue, setDisplayValue] = useStateLocal(0);

  useEffectLocal(() => {
    if (value === 0) return;
    const duration = 1200;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  const colorMap = {
    blue: "bg-blue-50 border-blue-100 dark:bg-blue-950/30 dark:border-blue-900/30",
    purple: "bg-purple-50 border-purple-100 dark:bg-purple-950/30 dark:border-purple-900/30",
    green: "bg-green-50 border-green-100 dark:bg-green-950/30 dark:border-green-900/30",
    amber: "bg-amber-50 border-amber-100 dark:bg-amber-950/30 dark:border-amber-900/30",
  };

  const iconColorMap = {
    blue: "text-blue-600 dark:text-blue-400",
    purple: "text-purple-600 dark:text-purple-400",
    green: "text-green-600 dark:text-green-400",
    amber: "text-amber-600 dark:text-amber-400",
  };

  return (
    <div className={`rounded-xl border p-4 text-center transition-all hover:scale-105 ${colorMap[color]}`}>
      <div className={`inline-flex mb-2 ${iconColorMap[color]}`}>{icon}</div>
      <div className="text-2xl font-bold text-foreground">
        {displayValue}{suffix}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function HowItWorksStep({ step, title, description }: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center p-3 rounded-lg hover:bg-primary/5 transition-colors group">
      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mb-2 group-hover:scale-110 transition-transform">
        {step}
      </div>
      <h4 className="text-sm font-semibold text-foreground mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
