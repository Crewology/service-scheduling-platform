import { ReviewCard } from "./ReviewCard";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { EmptyState } from "./EmptyState";

interface Review {
  id: number;
  rating: number;
  reviewText?: string | null;
  createdAt: Date | string;
  customerName?: string | null;
  responseText?: string | null;
  respondedAt?: Date | string | null;
}

interface ReviewListProps {
  reviews: Review[];
  averageRating?: number;
  totalReviews?: number;
  showProviderResponse?: boolean;
  isLoading?: boolean;
}

export function ReviewList({
  reviews,
  averageRating,
  totalReviews,
  showProviderResponse = true,
  isLoading = false,
}: ReviewListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={Star}
        title="No reviews yet"
        description="Be the first to leave a review for this service"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      {averageRating !== undefined && totalReviews !== undefined && (
        <div className="flex items-center gap-4 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
            <span className="text-3xl font-bold">{averageRating.toFixed(1)}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Based on {totalReviews} {totalReviews === 1 ? "review" : "reviews"}
          </div>
        </div>
      )}

      {/* Review Cards */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            showProviderResponse={showProviderResponse}
          />
        ))}
      </div>
    </div>
  );
}
