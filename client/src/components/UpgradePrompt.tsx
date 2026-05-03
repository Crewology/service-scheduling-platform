import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Crown, Zap, Star, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { useState } from "react";

type UpgradeReason =
  | "service_limit"
  | "photo_limit"
  | "custom_slug"
  | "priority_search"
  | "analytics"
  | "featured_listing"
  | "custom_branding"
  | "premium_support"
  | "general";

interface UpgradePromptProps {
  open: boolean;
  onClose: () => void;
  reason: UpgradeReason;
  currentTier: "free" | "basic" | "premium";
  /** Current count for limit-based reasons (e.g., services used) */
  currentCount?: number;
  /** Max allowed for current tier */
  currentLimit?: number;
}

const REASON_MESSAGES: Record<UpgradeReason, { title: string; description: string; minTier: "basic" | "premium" }> = {
  service_limit: {
    title: "Service Limit Reached",
    description: "You've reached the maximum number of services for your current plan. Upgrade to add more services and grow your business.",
    minTier: "basic",
  },
  photo_limit: {
    title: "Photo Limit Reached",
    description: "Free plan allows 2 photos per service. Upgrade to add up to 5 photos and showcase your work better.",
    minTier: "basic",
  },
  custom_slug: {
    title: "Custom Profile URL",
    description: "Get a custom profile URL (e.g., ologycrew.com/your-business-name) to make your profile easier to share.",
    minTier: "basic",
  },
  priority_search: {
    title: "Priority Search Placement",
    description: "Appear higher in search results so more customers find your services first.",
    minTier: "basic",
  },
  analytics: {
    title: "Business Analytics",
    description: "Access detailed analytics about your profile views, booking trends, and revenue insights.",
    minTier: "basic",
  },
  featured_listing: {
    title: "Featured Listing Badge",
    description: "Stand out with a featured badge on your profile and services. Get top placement in search results.",
    minTier: "premium",
  },
  custom_branding: {
    title: "Custom Branding",
    description: "Add your own branding to your profile page for a more professional look.",
    minTier: "premium",
  },
  premium_support: {
    title: "Priority Support",
    description: "Get faster response times and dedicated support for your business needs.",
    minTier: "premium",
  },
  general: {
    title: "Upgrade Your Plan",
    description: "Unlock more features and grow your business with a premium plan.",
    minTier: "basic",
  },
};

const TIER_BENEFITS = {
  basic: {
    name: "Professional",
    price: "$19/mo",
    annualPrice: "$15.20/mo",
    icon: Zap,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    features: [
      "Up to 10 active services",
      "3 photos per service",
      "Custom profile URL",
      "Priority search placement",
      "Business analytics dashboard",
    ],
  },
  premium: {
    name: "Business",
    price: "$49/mo",
    annualPrice: "$39.20/mo",
    icon: Crown,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    features: [
      "Unlimited active services",
      "5 photos per service",
      "Featured listing badge",
      "Full analytics suite",
      "Custom branding",
      "Priority support",
    ],
  },
};

export function UpgradePrompt({ open, onClose, reason, currentTier, currentCount, currentLimit }: UpgradePromptProps) {
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const reasonInfo = REASON_MESSAGES[reason];

  const createCheckout = trpc.subscription.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => toast.error(err.message),
  });

  // Determine which tiers to show based on current tier and minimum required
  const showBasic = currentTier === "free" && (reasonInfo.minTier === "basic" || reasonInfo.minTier === "premium");
  const showPremium = currentTier !== "premium";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            {reasonInfo.title}
          </DialogTitle>
          <DialogDescription>
            {reasonInfo.description}
            {currentCount !== undefined && currentLimit !== undefined && (
              <span className="block mt-1 font-medium text-foreground">
                Currently using {currentCount} of {currentLimit} allowed.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3">
            <span className={`text-xs font-medium ${billingInterval === "month" ? "text-foreground" : "text-muted-foreground"}`}>
              Monthly
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={billingInterval === "year"}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                billingInterval === "year" ? "bg-primary" : "bg-muted"
              }`}
              onClick={() => setBillingInterval((prev) => (prev === "month" ? "year" : "month"))}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow-lg transition-transform ${
                  billingInterval === "year" ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-xs font-medium ${billingInterval === "year" ? "text-foreground" : "text-muted-foreground"}`}>
              Annual
            </span>
            {billingInterval === "year" && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] px-1.5">
                Save 20%
              </Badge>
            )}
          </div>

          {/* Tier cards */}
          <div className={`grid gap-3 ${showBasic && showPremium ? "grid-cols-2" : "grid-cols-1 max-w-xs mx-auto"}`}>
            {showBasic && (
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-full ${TIER_BENEFITS.basic.bgColor} flex items-center justify-center`}>
                    <Zap className={`h-3.5 w-3.5 ${TIER_BENEFITS.basic.color}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Professional</h4>
                    <p className="text-xs text-muted-foreground">
                      {billingInterval === "year" ? "$15.20/mo" : "$19/mo"}
                    </p>
                  </div>
                </div>
                <ul className="space-y-1 text-xs mb-3">
                  {TIER_BENEFITS.basic.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5">
                      <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => createCheckout.mutate({ tier: "basic", interval: billingInterval })}
                  disabled={createCheckout.isPending}
                >
                  {createCheckout.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Upgrade"}
                </Button>
              </div>
            )}

            {showPremium && (
              <div className="p-4 rounded-lg border-2 border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-full ${TIER_BENEFITS.premium.bgColor} flex items-center justify-center`}>
                    <Crown className={`h-3.5 w-3.5 ${TIER_BENEFITS.premium.color}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Business</h4>
                    <p className="text-xs text-muted-foreground">
                      {billingInterval === "year" ? "$39.20/mo" : "$49/mo"}
                    </p>
                  </div>
                  {reasonInfo.minTier === "premium" && (
                    <Badge className="ml-auto bg-amber-500 text-white text-[9px] px-1.5">Required</Badge>
                  )}
                </div>
                <ul className="space-y-1 text-xs mb-3">
                  {TIER_BENEFITS.premium.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5">
                      <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => createCheckout.mutate({ tier: "premium", interval: billingInterval })}
                  disabled={createCheckout.isPending}
                >
                  {createCheckout.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Upgrade"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline upgrade banner for use in dashboards and lists.
 * Shows a subtle prompt when provider is near or at their tier limit.
 */
export function UpgradeBanner({
  reason,
  currentTier,
  currentCount,
  maxCount,
  onUpgradeClick,
}: {
  reason: UpgradeReason;
  currentTier: "free" | "basic" | "premium";
  currentCount: number;
  maxCount: number;
  onUpgradeClick: () => void;
}) {
  if (currentTier === "premium") return null;

  const isAtLimit = currentCount >= maxCount;
  const isNearLimit = currentCount >= maxCount - 1 && currentCount < maxCount;

  if (!isAtLimit && !isNearLimit) return null;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${
        isAtLimit
          ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
          : "bg-muted/50 border-border text-muted-foreground"
      }`}
    >
      <Crown className={`h-4 w-4 shrink-0 ${isAtLimit ? "text-amber-500" : "text-muted-foreground"}`} />
      <span className="flex-1">
        {isAtLimit ? (
          <>
            You&apos;ve reached your <strong>{maxCount}-service limit</strong>.{" "}
            Upgrade to add more services.
          </>
        ) : (
          <>
            You&apos;re using <strong>{currentCount} of {maxCount}</strong> services.{" "}
            Upgrade for more.
          </>
        )}
      </span>
      <Button
        size="sm"
        variant={isAtLimit ? "default" : "outline"}
        className={isAtLimit ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
        onClick={onUpgradeClick}
      >
        Upgrade <ArrowRight className="h-3.5 w-3.5 ml-1" />
      </Button>
    </div>
  );
}
