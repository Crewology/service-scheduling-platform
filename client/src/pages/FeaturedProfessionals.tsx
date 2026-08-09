import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NavHeader } from "@/components/shared/NavHeader";
import { Link } from "wouter";
import { Sparkles, MapPin, Star, User, Share2, Copy, ExternalLink, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

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
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={copyLink}
        className="gap-1.5 text-xs"
      >
        {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied!" : "Copy Link"}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={shareTwitter}
        className="gap-1.5 text-xs"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Share
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={shareFacebook}
        className="gap-1.5 text-xs"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        Share
      </Button>
    </div>
  );
}

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  quick_boost: { label: "Boosted", color: "bg-blue-100 text-blue-700 border-blue-200" },
  category_spotlight: { label: "Spotlight", color: "bg-amber-100 text-amber-700 border-amber-200" },
  homepage_feature: { label: "Featured", color: "bg-purple-100 text-purple-700 border-purple-200" },
  smart_bundle: { label: "Premium", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

export default function FeaturedProfessionals() {
  const { data: featured, isLoading } = trpc.promotion.getActiveForDisplay.useQuery();
  const pageUrl = typeof window !== "undefined" ? `${window.location.origin}/featured` : "";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NavHeader />

      {/* Hero Section */}
      <section className="py-10 sm:py-14 bg-gradient-to-br from-purple-50 via-background to-pink-50">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-800 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              Featured Professionals
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 text-balance">
              Discover Top Service Professionals
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
              These professionals have been highlighted for their exceptional service quality. 
              Browse and connect with the best in your area.
            </p>
            <ShareButtons url={pageUrl} title="Check out these top-rated professionals on OlogyCrew!" />
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-10 sm:py-14">
        <div className="container">
          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-14 h-14 rounded-xl bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-4 bg-muted rounded w-full mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !featured || featured.length === 0 ? (
            <div className="text-center py-16">
              <Sparkles className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Featured Professionals Right Now</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Check back soon — service professionals are regularly featured here for their outstanding work.
              </p>
              <Link href="/browse">
                <Button>Browse All Services</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-muted-foreground">
                  {featured.length} professional{featured.length !== 1 ? "s" : ""} currently featured
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {featured.map((item: any) => {
                  const tierInfo = TIER_LABELS[item.promotion.tier] || TIER_LABELS.quick_boost;
                  const providerUrl = item.provider.profileSlug
                    ? `/${item.provider.profileSlug}`
                    : `/provider/${item.provider.id}`;
                  const fullProviderUrl = typeof window !== "undefined"
                    ? `${window.location.origin}${providerUrl}`
                    : providerUrl;

                  return (
                    <Card key={item.promotion.id} className="overflow-hidden group hover:shadow-lg transition-all">
                      <div className="h-1.5 bg-gradient-to-r from-purple-500 to-pink-500" />
                      <CardContent className="p-5">
                        {/* Provider Info */}
                        <div className="flex items-start gap-3 mb-3">
                          <Link href={providerUrl}>
                            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer group-hover:ring-2 ring-primary/20 transition-all">
                              {item.provider.profilePhotoUrl ? (
                                <img
                                  src={item.provider.profilePhotoUrl}
                                  alt={item.provider.businessName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <User className="h-7 w-7 text-primary" />
                              )}
                            </div>
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link href={providerUrl}>
                              <h3 className="font-semibold text-base group-hover:text-primary transition-colors truncate cursor-pointer">
                                {item.provider.businessName}
                              </h3>
                            </Link>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                              {item.provider.city && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {item.provider.city}{item.provider.state ? `, ${item.provider.state}` : ""}
                                </span>
                              )}
                              {parseFloat(item.provider.averageRating || "0") > 0 && (
                                <span className="flex items-center gap-0.5">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                  {parseFloat(item.provider.averageRating).toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className={`text-[10px] shrink-0 ${tierInfo.color}`}>
                            {tierInfo.label}
                          </Badge>
                        </div>

                        {/* Promotion Content */}
                        <div className="mb-4">
                          <p className="text-sm font-medium mb-1">{item.promotion.headline}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.promotion.description}</p>
                        </div>

                        {/* Service info if linked */}
                        {item.service && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 bg-muted/50 rounded-md px-2.5 py-1.5">
                            <Clock className="h-3 w-3 shrink-0" />
                            <span className="truncate">{item.service.name}</span>
                            {item.service.basePrice && (
                              <span className="ml-auto font-medium text-foreground">${parseFloat(item.service.basePrice).toFixed(0)}</span>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Link href={providerUrl} className="flex-1">
                            <Button size="sm" className="w-full gap-1.5">
                              <ExternalLink className="h-3.5 w-3.5" />
                              View Profile
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigator.clipboard.writeText(fullProviderUrl);
                              toast.success("Provider link copied!");
                            }}
                            title="Share this provider"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* CTA for providers */}
      <section className="py-10 sm:py-14 bg-muted/30 border-t">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl sm:text-2xl font-bold mb-3">Are You a Service Professional?</h2>
            <p className="text-muted-foreground mb-6">
              Get featured on this page and boost your visibility to thousands of potential customers. 
              Our AI-powered promotion tools help you stand out.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/provider/promotions">
                <Button className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Boost Your Business
                </Button>
              </Link>
              <Link href="/browse">
                <Button variant="outline">Browse All Services</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
