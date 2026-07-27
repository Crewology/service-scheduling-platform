import { useAuth } from "@/_core/hooks/useAuth";
import { NavHeader } from "@/components/shared/NavHeader";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { Star, MessageSquare } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";

export default function CustomerReviews() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: reviews, isLoading } = trpc.review.listByCustomer.useQuery(
    undefined,
    { enabled: !!user }
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl("/my-reviews");
    return null;
  }

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <div className="container py-6">
        <PageHeader
          title="My Reviews"
          subtitle="Reviews you've written for service providers"
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : !reviews || reviews.length === 0 ? (
          <EmptyState
            icon={Star}
            title="No reviews yet"
            description="After completing a booking, you can leave a review for your service provider."
            actionLabel="Browse Services"
            onAction={() => setLocation("/browse")}
          />
        ) : (
          <div className="space-y-4 mt-6">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      {renderStars(review.rating)}
                      <p className="font-semibold mt-2 text-foreground">
                        {review.providerName || "Service Provider"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(new Date(review.createdAt))}
                      </p>
                    </div>
                  </div>

                  {review.reviewText && (
                    <p className="text-foreground mt-2">{review.reviewText}</p>
                  )}

                  {review.responseText && (
                    <div className="mt-4 pl-4 border-l-2 border-primary/30 bg-muted/30 rounded-r-md p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-medium text-primary">
                          Provider Response
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {review.responseText}
                      </p>
                      {review.respondedAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(new Date(review.respondedAt))}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
