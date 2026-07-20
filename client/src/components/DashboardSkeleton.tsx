import { Card, CardContent, CardHeader } from "@/components/ui/card";

function SkeletonPulse({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded ${className || ""}`} />;
}

/**
 * Loading skeleton for the provider dashboard.
 * Shows placeholder cards that match the dashboard layout.
 */
export function ProviderDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <div className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center gap-4">
            <SkeletonPulse className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <SkeletonPulse className="h-6 w-48" />
              <SkeletonPulse className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>

      <div className="container py-6 space-y-6">
        {/* Stats row skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <SkeletonPulse className="h-4 w-20" />
                <SkeletonPulse className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-2 border-b pb-2">
          {[...Array(5)].map((_, i) => (
            <SkeletonPulse key={i} className="h-9 w-24 rounded-md" />
          ))}
        </div>

        {/* Content area skeleton */}
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <SkeletonPulse className="h-5 w-36" />
                <SkeletonPulse className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-3">
                <SkeletonPulse className="h-4 w-full" />
                <SkeletonPulse className="h-4 w-3/4" />
                <SkeletonPulse className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for the My Bookings page.
 * Shows placeholder booking cards.
 */
export function BookingsSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filter/tab bar skeleton */}
      <div className="flex gap-2 mb-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonPulse key={i} className="h-9 w-28 rounded-md" />
        ))}
      </div>

      {/* Booking cards skeleton */}
      {[...Array(5)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <SkeletonPulse className="h-12 w-12 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <SkeletonPulse className="h-5 w-40" />
                  <SkeletonPulse className="h-5 w-20 rounded-full" />
                </div>
                <SkeletonPulse className="h-4 w-56" />
                <div className="flex gap-4">
                  <SkeletonPulse className="h-4 w-28" />
                  <SkeletonPulse className="h-4 w-20" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default ProviderDashboardSkeleton;
