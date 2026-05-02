import { useState } from "react";
import { Clock, Zap, ArrowRight, X, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

/**
 * TrialCountdownBanner — Shows during active Professional trial.
 * Displays days remaining, features unlocked, and upgrade CTA.
 * Becomes urgent (red) when <= 3 days remain.
 */
export function TrialCountdownBanner({
  daysRemaining,
  trialEndsAt,
  showUrgentNudge,
}: {
  daysRemaining: number;
  trialEndsAt: string | Date | null;
  showUrgentNudge?: boolean;
}) {
  const [, navigate] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const isUrgent = showUrgentNudge || daysRemaining <= 3;
  const endDate = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  return (
    <div
      className={`relative rounded-lg border px-4 py-3 mb-4 ${
        isUrgent
          ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
          : "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800"
      }`}
    >
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div
          className={`mt-0.5 rounded-full p-1.5 ${
            isUrgent
              ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400"
              : "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400"
          }`}
        >
          {isUrgent ? <AlertTriangle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">
              {isUrgent
                ? `Only ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} left on your trial!`
                : `Professional Trial — ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining`}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                isUrgent
                  ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                  : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
              }`}
            >
              <Clock className="h-3 w-3" />
              {endDate ? `Ends ${endDate}` : "Trial active"}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mt-1">
            {isUrgent
              ? "Don't lose access to priority search, 10 services, analytics, and custom URL. Subscribe now to keep your Professional features."
              : "You have access to 10 services, priority search placement, analytics, and custom profile URL during your trial."}
          </p>

          <div className="flex items-center gap-2 mt-2">
            <Button
              size="sm"
              variant={isUrgent ? "destructive" : "default"}
              className="h-7 text-xs"
              onClick={() => navigate("/provider/subscription")}
            >
              <Zap className="h-3 w-3 mr-1" />
              {isUrgent ? "Subscribe Now" : "Upgrade to Keep Features"}
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * TrialExpiredBanner — Shows after trial has ended and provider is back on Free.
 * Encourages conversion with a clear value proposition.
 */
export function TrialExpiredBanner() {
  const [, navigate] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3 mb-4">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground p-1"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="mt-0.5 rounded-full p-1.5 bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <span className="font-semibold text-sm">Your Professional trial has ended</span>
          <p className="text-xs text-muted-foreground mt-1">
            You're back on the Starter plan. Upgrade to Professional to restore priority search placement,
            10 service listings, business analytics, and your custom profile URL.
          </p>

          <div className="flex items-center gap-2 mt-2">
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => navigate("/provider/subscription")}
            >
              <Zap className="h-3 w-3 mr-1" />
              Upgrade to Professional — $19/mo
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * TrialStatusBanner — Auto-selects the right banner based on trial status.
 * Use this in the Provider Dashboard for a single integration point.
 */
export function TrialStatusBanner() {
  const { data: trialStatus } = trpc.subscription.checkTrialStatus.useQuery(undefined, {
    staleTime: 60_000,
  });

  if (!trialStatus) return null;

  if (trialStatus.isTrialing) {
    return (
      <TrialCountdownBanner
        daysRemaining={trialStatus.daysRemaining}
        trialEndsAt={trialStatus.trialEndsAt}
        showUrgentNudge={trialStatus.showUrgentNudge}
      />
    );
  }

  if (trialStatus.trialExpired) {
    return <TrialExpiredBanner />;
  }

  return null;
}
