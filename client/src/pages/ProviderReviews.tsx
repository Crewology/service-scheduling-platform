import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ReviewCard } from "@/components/shared/ReviewCard";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { MessageSquare } from "lucide-react";

export default function ProviderReviews() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [respondingTo, setRespondingTo] = useState<number | null>(null);
  const [responseText, setResponseText] = useState("");

  const { data: provider } = trpc.provider.getMine.useQuery(
    undefined,
    { enabled: !!user }
  );

  const { data: reviews, refetch } = trpc.review.listByProvider.useQuery(
    { providerId: provider?.id || 0 },
    { enabled: !!provider }
  );

  const addResponse = trpc.review.addResponse.useMutation({
    onSuccess: () => {
      toast.success("Response added successfully");
      setRespondingTo(null);
      setResponseText("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add response");
    },
  });

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (!provider) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <EmptyState
              icon={MessageSquare}
              title="Provider Profile Required"
              description="You need to create a provider profile to manage reviews."
            />
            <div className="mt-4">
              <Button onClick={() => setLocation("/provider/onboard")}>
                Become a Provider
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmitResponse = (reviewId: number) => {
    if (!responseText.trim()) {
      toast.error("Please enter a response");
      return;
    }

    addResponse.mutate({
      reviewId,
      responseText: responseText,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container">
          <div className="flex items-center justify-between h-16">
            <Button variant="ghost" onClick={() => setLocation("/provider/dashboard")}>
              ← Back to Dashboard
            </Button>
            <h1 className="text-xl font-bold">SkillLink</h1>
            <div className="w-32"></div>
          </div>
        </div>
      </header>

      <div className="container py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Customer Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {!reviews || reviews.length === 0 ? (
              <EmptyState
                icon={MessageSquare}
                title="No Reviews Yet"
                description="You haven't received any customer reviews yet. Complete bookings to start receiving feedback."
              />
            ) : (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="space-y-4">
                    <ReviewCard
                      review={review}
                      showProviderResponse={true}
                    />

                    {/* Response Form */}
                    {!review.responseText && (
                      <div className="ml-8 pl-4 border-l-2">
                        {respondingTo === review.id ? (
                          <div className="space-y-3">
                            <Textarea
                              value={responseText}
                              onChange={(e) => setResponseText(e.target.value)}
                              placeholder="Write your response..."
                              rows={4}
                            />
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleSubmitResponse(review.id)}
                                disabled={addResponse.isPending}
                              >
                                {addResponse.isPending ? "Submitting..." : "Submit Response"}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setRespondingTo(null);
                                  setResponseText("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRespondingTo(review.id)}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Respond to Review
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
