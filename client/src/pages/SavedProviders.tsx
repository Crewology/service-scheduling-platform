import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { NavHeader } from "@/components/shared/NavHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Star, MapPin, ArrowLeft, Loader2, Crown, Zap, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import UpgradeModal from "@/components/UpgradeModal";

export default function SavedProviders() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const { data: favorites, isLoading } = trpc.provider.myFavorites.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: subInfo } = trpc.customerSubscription.getSubscription.useQuery(undefined, {
    enabled: !!user,
  });

  const utils = trpc.useUtils();
  const toggleFavorite = trpc.provider.toggleFavorite.useMutation({
    onSuccess: () => {
      utils.provider.myFavorites.invalidate();
      utils.customerSubscription.getSubscription.invalidate();
    },
    onError: (err) => {
      if (err.data?.code === "FORBIDDEN") {
        setUpgradeOpen(true);
      } else {
        toast.error(err.message);
      }
    },
  });

  const tier = subInfo?.currentTier || "free";
  const limit = subInfo?.usage?.savedProviderLimit ?? 10;
  const count = favorites?.length || 0;
  const isUnlimited = limit === -1;
  const usagePercent = isUnlimited ? 0 : Math.min((count / limit) * 100, 100);
  const isNearLimit = !isUnlimited && count >= limit - 2;

  const tierConfig: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
    free: { label: "Free", icon: Heart, color: "text-muted-foreground", bgColor: "bg-muted" },
    pro: { label: "Pro", icon: Zap, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    business: { label: "Business", icon: Crown, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  };
  const currentTierConfig = tierConfig[tier] || tierConfig.free;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <div className="container py-16 text-center">
          <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Saved Providers</h1>
          <p className="text-muted-foreground mb-6">Sign in to save your favorite providers</p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <div className="container py-8 max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Saved Providers</h1>
              <p className="text-muted-foreground text-sm">
                {count} provider{count !== 1 ? "s" : ""} saved
              </p>
            </div>
          </div>
          <Badge variant="outline" className={`gap-1.5 px-3 py-1 ${currentTierConfig.color}`}>
            <currentTierConfig.icon className="h-3.5 w-3.5" />
            {currentTierConfig.label} Plan
          </Badge>
        </div>

        {/* Usage Bar */}
        {!isUnlimited && (
          <Card className={`mb-6 ${isNearLimit ? "border-amber-500/50" : ""}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {count} / {limit} providers saved
                  </span>
                  {isNearLimit && count < limit && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                      Almost full
                    </Badge>
                  )}
                  {count >= limit && (
                    <Badge variant="outline" className="text-red-600 border-red-300 text-xs">
                      Limit reached
                    </Badge>
                  )}
                </div>
                {tier === "free" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary gap-1.5 h-8"
                    onClick={() => setUpgradeOpen(true)}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Upgrade
                  </Button>
                )}
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    count >= limit ? "bg-red-500" : isNearLimit ? "bg-amber-500" : "bg-primary"
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              {count >= limit && (
                <p className="text-xs text-muted-foreground mt-2">
                  Upgrade to <strong>Pro</strong> for 50 providers or <strong>Business</strong> for unlimited.{" "}
                  <button onClick={() => setUpgradeOpen(true)} className="text-primary hover:underline font-medium">
                    View plans
                  </button>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Unlimited badge for Business users */}
        {isUnlimited && (
          <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/10">
                <Crown className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Business Plan — Unlimited Saved Providers</p>
                <p className="text-xs text-muted-foreground">Save as many providers as you need for your projects.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Provider Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-16 w-16 rounded-full bg-muted mb-4" />
                  <div className="h-5 w-3/4 bg-muted rounded mb-2" />
                  <div className="h-4 w-1/2 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !favorites || favorites.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No saved providers yet</h2>
            <p className="text-muted-foreground mb-6">
              Browse services and tap the heart icon to save providers you like
            </p>
            <Button onClick={() => navigate("/browse")}>Browse Services</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((fav: any) => (
              <Card key={fav.favoriteId} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {fav.profilePhotoUrl ? (
                        <img
                          src={fav.profilePhotoUrl}
                          alt={fav.businessName}
                          className="h-14 w-14 rounded-full object-cover border-2 border-background shadow"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                          {fav.businessName?.charAt(0) || "?"}
                        </div>
                      )}
                      <div>
                        <Link href={fav.profileSlug ? `/p/${fav.profileSlug}` : "#"}>
                          <h3 className="font-semibold hover:text-primary transition-colors cursor-pointer">
                            {fav.businessName}
                          </h3>
                        </Link>
                        {(fav.city || fav.state) && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {[fav.city, fav.state].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => {
                        toggleFavorite.mutate({ providerId: fav.providerId });
                        toast.success("Removed from saved providers");
                      }}
                    >
                      <Heart className="h-5 w-5 fill-current" />
                    </Button>
                  </div>

                  {fav.averageRating && Number(fav.averageRating) > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">{Number(fav.averageRating).toFixed(1)}</span>
                      <span className="text-xs text-muted-foreground">({fav.totalReviews} reviews)</span>
                    </div>
                  )}

                  {fav.categories && fav.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {fav.categories.slice(0, 3).map((cat: any) => (
                        <span
                          key={cat.id}
                          className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                        >
                          {cat.name}
                        </span>
                      ))}
                      {fav.categories.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{fav.categories.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {fav.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {fav.description}
                    </p>
                  )}

                  <div className="mt-4">
                    <Link href={fav.profileSlug ? `/p/${fav.profileSlug}` : "#"}>
                      <Button variant="outline" size="sm" className="w-full">
                        View Profile
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <UpgradeModal
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        currentTier={tier}
        currentCount={count}
        limit={limit === -1 ? undefined : limit}
      />
    </div>
  );
}
