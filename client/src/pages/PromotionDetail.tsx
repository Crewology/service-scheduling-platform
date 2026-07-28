import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NavHeader } from "@/components/shared/NavHeader";
import { Link, useParams } from "wouter";
import {
  Sparkles,
  MapPin,
  Star,
  User,
  Share2,
  Copy,
  ExternalLink,
  Clock,
  CheckCircle2,
  Calendar,
  ArrowLeft,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

const TIER_LABELS: Record<string, { label: string; color: string; description: string }> = {
  quick_boost: { label: "Boosted", color: "bg-blue-100 text-blue-700 border-blue-200", description: "Quick Boost Professional" },
  category_spotlight: { label: "Spotlight", color: "bg-amber-100 text-amber-700 border-amber-200", description: "Category Spotlight Professional" },
  homepage_feature: { label: "Featured", color: "bg-purple-100 text-purple-700 border-purple-200", description: "Homepage Featured Professional" },
  smart_bundle: { label: "Premium", color: "bg-emerald-100 text-emerald-700 border-emerald-200", description: "Premium Featured Professional" },
};

function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const shareTwitter = () => {
    const text = encodeURIComponent(title);
    const link = encodeURIComponent(url);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${link}`, "_blank");
  };

  const shareFacebook = () => {
    const link = encodeURIComponent(url);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${link}`, "_blank");
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        variant="outline"
        size="sm"
        onClick={copyLink}
        className="gap-1.5"
      >
        {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied!" : "Copy Link"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={shareTwitter}
        className="gap-1.5"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Post on X
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={shareFacebook}
        className="gap-1.5"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        Share on Facebook
      </Button>
    </div>
  );
}

export default function PromotionDetail() {
  const { id } = useParams<{ id: string }>();
  const promotionId = parseInt(id || "0", 10);

  const { data, isLoading, error } = trpc.promotion.getById.useQuery(
    { id: promotionId },
    { enabled: promotionId > 0, retry: false }
  );

  const trackClick = trpc.promotion.trackClick.useMutation();
  const trackView = trpc.promotion.trackView.useMutation();

  // Track page view on load
  useEffect(() => {
    if (data?.promotion?.id) {
      trackView.mutate({ promotionId: data.promotion.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.promotion?.id]);

  const pageUrl = typeof window !== "undefined" ? `${window.location.origin}/featured/promo/${promotionId}` : "";

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <NavHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse space-y-4 max-w-lg w-full px-4">
            <div className="h-8 bg-muted rounded w-3/4 mx-auto" />
            <div className="h-4 bg-muted rounded w-1/2 mx-auto" />
            <div className="h-64 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <NavHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <Sparkles className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Promotion Not Available</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              This promotion may have expired or is no longer active. Check out other featured professionals instead.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/featured">
                <Button>View Featured Professionals</Button>
              </Link>
              <Link href="/browse">
                <Button variant="outline">Browse Services</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { promotion, provider, service } = data;
  const tierInfo = TIER_LABELS[promotion.tier] || TIER_LABELS.quick_boost;
  const providerUrl = provider.profileSlug ? `/p/${provider.profileSlug}` : `/provider/${provider.id}`;
  const shareTitle = `${promotion.headline} — ${provider.businessName} on OlogyCrew`;
  const promoDescription = promotion.description || "";

  // Update OG meta tags dynamically
  useEffect(() => {
    document.title = `${promotion.headline} — ${provider.businessName} | OlogyCrew`;
    
    // Set OG meta tags
    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("og:title", `${promotion.headline} — ${provider.businessName}`);
    setMeta("og:description", promotion.description);
    setMeta("og:url", pageUrl);
    setMeta("og:type", "website");
    setMeta("og:site_name", "OlogyCrew");

    // Twitter card
    const setTwitterMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setTwitterMeta("twitter:card", "summary_large_image");
    setTwitterMeta("twitter:title", `${promotion.headline} — ${provider.businessName}`);
    setTwitterMeta("twitter:description", promotion.description || "");
  }, [promotion, provider, pageUrl]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NavHeader />

      {/* Back navigation */}
      <div className="container pt-4">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Main promotion content */}
      <section className="py-8 sm:py-12">
        <div className="container max-w-3xl">
          <Card className="overflow-hidden shadow-lg">
            {/* Gradient header */}
            <div className="h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500" />

            <CardContent className="p-6 sm:p-8">
              {/* Provider header */}
              <div className="flex items-start gap-4 mb-6">
                <Link href={providerUrl}>
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:ring-2 ring-primary/20 transition-all">
                    <User className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="outline" className={`text-xs ${tierInfo.color}`}>
                      <Sparkles className="h-3 w-3 mr-1" />
                      {tierInfo.label}
                    </Badge>
                  </div>
                  <Link href={providerUrl}>
                    <h1 className="text-xl sm:text-2xl font-bold hover:text-primary transition-colors cursor-pointer">
                      {provider.businessName}
                    </h1>
                  </Link>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                    {provider.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {provider.city}{provider.state ? `, ${provider.state}` : ""}
                      </span>
                    )}
                    {parseFloat(provider.averageRating || "0") > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {parseFloat(provider.averageRating || "0").toFixed(1)} rating
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Promotion content */}
              <div className="bg-gradient-to-br from-purple-50/50 to-pink-50/50 rounded-xl p-5 sm:p-6 mb-6">
                <h2 className="text-lg sm:text-xl font-bold mb-2">{promotion.headline}</h2>
                <p className="text-muted-foreground leading-relaxed">{promotion.description}</p>
              </div>

              {/* Service details if linked */}
              {service && (
                <div className="flex items-center gap-3 p-4 bg-muted/40 rounded-lg mb-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{service.name}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {service.durationMinutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {service.durationMinutes} min
                        </span>
                      )}
                      {(service.basePrice || service.hourlyRate) && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          From ${parseFloat(service.basePrice || service.hourlyRate || "0").toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Link href={providerUrl} className="flex-1">
                  <Button
                    className="w-full gap-2"
                    size="lg"
                    onClick={() => trackClick.mutate({ promotionId: promotion.id })}
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Profile & Book
                  </Button>
                </Link>
                {service && (
                  <Link href={`/service/${service.id}`} className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      size="lg"
                      onClick={() => trackClick.mutate({ promotionId: promotion.id })}
                    >
                      <Calendar className="h-4 w-4" />
                      Book This Service
                    </Button>
                  </Link>
                )}
              </div>

              {/* Share section */}
              <div className="border-t pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <Share2 className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">Share this promotion</p>
                </div>
                <ShareButtons url={pageUrl} title={shareTitle} />
              </div>
            </CardContent>
          </Card>

          {/* More featured professionals CTA */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">Discover more top professionals</p>
            <div className="flex gap-3 justify-center">
              <Link href="/featured">
                <Button variant="outline" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  All Featured Professionals
                </Button>
              </Link>
              <Link href="/browse">
                <Button variant="ghost">Browse All Services</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
