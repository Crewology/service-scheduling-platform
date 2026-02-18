import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";
import { formatDate } from "@/lib/dateUtils";

interface ReviewCardProps {
  review: {
    id: number;
    rating: number;
    reviewText?: string | null;
    createdAt: Date | string;
    customerName?: string | null;
    responseText?: string | null;
    respondedAt?: Date | string | null;
  };
  showProviderResponse?: boolean;
}

export function ReviewCard({ review, showProviderResponse = true }: ReviewCardProps) {
  const renderStars = (rating: number) => {
    return (
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
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Rating and Customer Info */}
        <div className="flex items-start justify-between mb-3">
          <div>
            {renderStars(review.rating)}
            <p className="font-semibold mt-2">{review.customerName || "Anonymous"}</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(new Date(review.createdAt))}
            </p>
          </div>
        </div>

        {/* Review Text */}
        {review.reviewText && (
          <p className="text-sm text-gray-700 mb-4">{review.reviewText}</p>
        )}

        {/* Provider Response */}
        {showProviderResponse && review.responseText && (
          <div className="mt-4 pt-4 border-t bg-gray-50 -mx-6 px-6 py-4 rounded-b-lg">
            <p className="text-sm font-semibold mb-1">Provider Response</p>
            <p className="text-sm text-gray-700">{review.responseText}</p>
            {review.respondedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Responded on {formatDate(new Date(review.respondedAt))}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
