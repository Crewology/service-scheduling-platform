import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { NavHeader } from "@/components/shared/NavHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Star, MapPin, ArrowLeft, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function SavedProviders() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { data: favorites, isLoading } = trpc.provider.myFavorites.useQuery(undefined, {
    enabled: !!user,
  });
  const utils = trpc.useUtils();
  const toggleFavorite = trpc.provider.toggleFavorite.useMutation({
    onSuccess: () => {
      utils.provider.myFavorites.invalidate();
    },
  });

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
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Saved Providers</h1>
            <p className="text-muted-foreground text-sm">
              {favorites?.length || 0} provider{(favorites?.length || 0) !== 1 ? "s" : ""} saved
            </p>
          </div>
        </div>

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
    </div>
  );
}
