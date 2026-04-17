import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useProtectedPage } from "@/hooks/useProtectedPage";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { NavHeader } from "@/components/shared/NavHeader";
import { PageHeader } from "@/components/shared/PageHeader";

export default function SubmitReview() {
  const [, params] = useRoute("/booking/:id/review");
  const [, navigate] = useLocation();
  const bookingId = params?.id ? parseInt(params.id) : 0;

  useProtectedPage();

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  const { data: booking, isLoading } = trpc.booking.getById.useQuery({ id: bookingId });
  const submitReview = trpc.review.create.useMutation({
    onSuccess: () => {
      toast.success("Review submitted successfully!");
      navigate(`/booking/${bookingId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit review");
    },
  });

  if (isLoading) {
    return <LoadingSpinner message="Loading booking details..." />;
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Booking Not Found</CardTitle>
            <CardDescription>The booking you're looking for doesn't exist.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (booking.status !== "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Cannot Review</CardTitle>
            <CardDescription>You can only review completed bookings.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(`/booking/${bookingId}`)}>
              Back to Booking
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    submitReview.mutate({
      bookingId,
      rating,
      reviewText: comment,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
        <NavHeader />
        <main className="py-12">
            <div className="container max-w-2xl">
                <PageHeader
                    title="Write a Review"
                    backHref="/my-bookings"
                    breadcrumbs={[{ label: "My Bookings", href: "/my-bookings" }, { label: "Write Review" }]}
                />
                <Card className="mt-8">
                    <CardContent className="pt-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Booking Info */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-muted-foreground">Service</p>
                            <p className="font-medium">Service #{booking.serviceId}</p>
                            <p className="text-sm text-muted-foreground mt-2">Date</p>
                            <p className="font-medium">{booking.bookingDate}</p>
                        </div>

                        {/* Rating */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                            Your Rating <span className="text-red-500">*</span>
                            </label>
                            <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                className="transition-transform hover:scale-110"
                                >
                                <Star
                                    className={`h-10 w-10 ${
                                    star <= (hoverRating || rating)
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-gray-300"
                                    }`}
                                />
                                </button>
                            ))}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                            {rating === 0 && "Select a rating"}
                            {rating === 1 && "Poor"}
                            {rating === 2 && "Fair"}
                            {rating === 3 && "Good"}
                            {rating === 4 && "Very Good"}
                            {rating === 5 && "Excellent"}
                            </p>
                        </div>

                        {/* Comment */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                            Your Review
                            </label>
                            <Textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Tell others about your experience with this service provider..."
                            rows={6}
                            className="resize-none"
                            />
                            <p className="text-sm text-muted-foreground mt-2">
                            Share details about the quality of service, professionalism, and overall experience.
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <Button
                            type="submit"
                            disabled={submitReview.isPending || rating === 0}
                            className="flex-1"
                            >
                            {submitReview.isPending ? "Submitting..." : "Submit Review"}
                            </Button>
                            <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate(`/booking/${bookingId}`)}
                            >
                            Cancel
                            </Button>
                        </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </main>
    </div>
  );
}
