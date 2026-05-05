import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  Check, 
  Crown, 
  Zap, 
  Star,
  ArrowLeft,
  Loader2,
  Shield,
  Camera,
  Search,
  Palette,
  Users,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { Link } from "wouter";
import { NavHeader } from "@/components/shared/NavHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PLANS = [
  {
    tier: "free" as const,
    name: "Starter",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Get started and list your services",
    icon: Star,
    features: [
      { text: "Up to 3 services listed", included: true },
      { text: "1 photo per service", included: true },
      { text: "Basic public profile", included: true },
      { text: "Standard search placement", included: true },
      { text: "1% transaction fee on bookings", included: true },
      { text: "Priority search placement", included: false },
      { text: "Unlimited photos", included: false },
      { text: "Custom branding", included: false },
      { text: "Analytics dashboard", included: false },
      { text: "Priority support", included: false },
    ],
    highlight: false,
  },
  {
    tier: "basic" as const,
    name: "Professional",
    monthlyPrice: 12,
    yearlyPrice: 120.96,
    description: "Grow your business with more visibility",
    icon: Zap,
    features: [
      { text: "Up to 10 services listed", included: true },
      { text: "3 photos per service", included: true },
      { text: "Enhanced public profile", included: true },
      { text: "Priority search placement", included: true },
      { text: "1% transaction fee on bookings", included: true },
      { text: "Basic analytics", included: true },
      { text: "Email support", included: true },
      { text: "Custom branding", included: false },
      { text: "Advanced analytics", included: false },
      { text: "Priority support", included: false },
    ],
    highlight: true,
  },
  {
    tier: "premium" as const,
    name: "Business",
    monthlyPrice: 20,
    yearlyPrice: 192.00,
    description: "Full suite for professional providers",
    icon: Crown,
    features: [
      { text: "Unlimited services", included: true },
      { text: "Unlimited photos per service", included: true },
      { text: "Premium public profile", included: true },
      { text: "Top search placement", included: true },
      { text: "1% transaction fee on bookings", included: true },
      { text: "Advanced analytics dashboard", included: true },
      { text: "Custom branding & colors", included: true },
      { text: "Featured provider badge", included: true },
      { text: "Priority support", included: true },
      { text: "Early access to new features", included: true },
    ],
    highlight: false,
  },
];

export default function SubscriptionManagement() {
  const { isAuthenticated } = useAuth();
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");

  const { data: currentSub, isLoading: subLoading } = trpc.subscription.mySubscription.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: provider } = trpc.provider.getMyProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const subscribe = trpc.subscription.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
      setSubscribing(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setSubscribing(null);
    },
  });

  const [downgradeTarget, setDowngradeTarget] = useState<"free" | "basic" | null>(null);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);

  const downgrade = trpc.subscription.downgrade.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setShowDowngradeDialog(false);
      setDowngradeTarget(null);
      window.location.reload();
    },
    onError: (err) => {
      toast.error(err.message);
      setShowDowngradeDialog(false);
      setDowngradeTarget(null);
    },
  });

  const manageSubscription = trpc.subscription.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const currentTier = currentSub?.currentTier || "free";

  const { data: trialStatus } = trpc.subscription.checkTrialStatus.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  const startTrial = trpc.subscription.startProfessionalTrial.useMutation({
    onSuccess: () => {
      toast.success("Professional trial started! You have 14 days of full access.");
      // Invalidate queries to refresh the page
      window.location.reload();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubscribe = (tier: string) => {
    if (tier === "free") return;
    setSubscribing(tier);
    subscribe.mutate({ 
      tier: tier as "basic" | "premium",
      interval: billingInterval,
    });
  };

  const formatPrice = (plan: typeof PLANS[0]) => {
    if (plan.tier === "free") return { main: "$0", sub: "forever" };
    if (billingInterval === "year") {
      const monthly = (plan.yearlyPrice / 12).toFixed(2);
      return { main: `$${monthly}`, sub: "/mo" };
    }
    return { main: `$${plan.monthlyPrice.toFixed(2)}`, sub: "/mo" };
  };

  const getAnnualSavings = (plan: typeof PLANS[0]) => {
    if (plan.tier === "free") return 0;
    return Math.round(plan.monthlyPrice * 12 - plan.yearlyPrice);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <NavHeader />
        <div className="container py-16 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">Provider Plans</h1>
          <p className="text-muted-foreground mb-8">Sign in to manage your subscription</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />

      <div className="container py-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/provider/dashboard">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg">
            Unlock more features to grow your business. All plans include a low 1% transaction fee.
          </p>
        </div>

        {/* Annual/Monthly Toggle */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            onClick={() => setBillingInterval("month")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              billingInterval === "month"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval("year")}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
              billingInterval === "year"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              billingInterval === "year"
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
            }`}>
              Save up to 20%
            </span>
          </button>
        </div>

        {/* Trial Status Banner */}
        {trialStatus?.isTrialing && (
          <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium text-sm">
                    Professional Trial — {trialStatus.daysRemaining} day{trialStatus.daysRemaining !== 1 ? 's' : ''} remaining
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {trialStatus.showUrgentNudge 
                      ? "Your trial is ending soon! Subscribe to keep your Professional features."
                      : "Enjoying your trial? Subscribe anytime to keep access after it ends."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {trialStatus?.trialExpired && currentTier === "free" && (
          <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium text-sm">Your Professional trial has ended</p>
                <p className="text-xs text-muted-foreground">
                  You're on the Starter plan. Subscribe to Professional to restore priority search, analytics, and more.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Start Trial CTA for free users who haven't tried yet */}
        {currentTier === "free" && !trialStatus?.isTrialing && !trialStatus?.trialExpired && (
          <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-primary/10 border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium text-sm">Try Professional free for 14 days</p>
                  <p className="text-xs text-muted-foreground">
                    No credit card required. Get 10 services, priority search, analytics, and custom URL.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                onClick={() => startTrial.mutate()}
                disabled={startTrial.isPending}
              >
                {startTrial.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start Free Trial"}
              </Button>
            </div>
          </div>
        )}

        {/* Current Plan Badge */}
        {currentTier !== "free" && (
          <div className="mb-8 p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">
                  Current Plan: <span className="text-primary capitalize">{currentTier}</span>
                </p>
                {currentSub?.subscription?.status === "active" && (
                  <p className="text-sm text-muted-foreground">
                    {currentSub.subscription.cancelAtPeriodEnd 
                      ? "Cancels at end of billing period" 
                      : "Active and renewing"}
                  </p>
                )}
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => manageSubscription.mutate()}
              disabled={manageSubscription.isPending}
            >
              {manageSubscription.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Manage Subscription"
              )}
            </Button>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12 pt-4">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = currentTier === plan.tier;
            const isDowngrade = 
              (currentTier === "premium" && plan.tier !== "premium") ||
              (currentTier === "basic" && plan.tier === "free");
            const price = formatPrice(plan);
            const savings = getAnnualSavings(plan);

            return (
              <Card 
                key={plan.tier}
                className={`relative flex flex-col overflow-visible ${
                  plan.highlight 
                    ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]" 
                    : ""
                } ${isCurrent ? "ring-2 ring-primary" : ""}`}
              >
                {/* Plan tags: Most Popular for Pro, Recommended for Business */}
                {plan.tier === "basic" && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-primary text-primary-foreground px-3 shadow-sm">Most Popular</Badge>
                  </div>
                )}
                {plan.tier === "premium" && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-amber-500 text-white border-0 px-3 shadow-sm">Recommended</Badge>
                  </div>
                )}
                {/* Current Plan tag - only show when user is signed in */}
                {isCurrent && isAuthenticated && currentTier !== "free" && (
                  <div className={`absolute ${plan.tier === "basic" || plan.tier === "premium" ? "top-3" : "-top-3"} left-1/2 -translate-x-1/2 z-10`}>
                    <Badge className="bg-green-600 text-white border-0 shadow-sm whitespace-nowrap">Current Plan</Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{price.main}</span>
                    <span className="text-muted-foreground">{price.sub}</span>
                  </div>
                  {billingInterval === "year" && plan.tier !== "free" && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Billed as ${plan.yearlyPrice.toFixed(2)}/year
                      </p>
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-0">
                        Save ${savings}/year
                      </Badge>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className={`h-4 w-4 mt-0.5 shrink-0 ${
                          feature.included ? "text-primary" : "text-muted-foreground/30"
                        }`} />
                        <span className={`text-sm ${
                          feature.included ? "" : "text-muted-foreground/50 line-through"
                        }`}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : plan.tier === "free" ? (
                    isDowngrade ? (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => {
                          setDowngradeTarget("free");
                          setShowDowngradeDialog(true);
                        }}
                        disabled={downgrade.isPending}
                      >
                        {downgrade.isPending && downgradeTarget === "free" ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</>
                        ) : "Downgrade"}
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        Get Started
                      </Button>
                    )
                  ) : (
                    <Button 
                      className={`w-full ${plan.tier === "basic" ? "" : ""}`}
                      variant={plan.tier === "basic" ? "default" : "outline"}
                      onClick={() => {
                        if (isDowngrade) {
                          setDowngradeTarget(plan.tier as "basic");
                          setShowDowngradeDialog(true);
                        } else {
                          handleSubscribe(plan.tier);
                        }
                      }}
                      disabled={subscribing === plan.tier || subscribe.isPending || (downgrade.isPending && downgradeTarget === plan.tier)}
                    >
                      {subscribing === plan.tier ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : isDowngrade ? (
                        "Downgrade"
                      ) : (
                        `Select ${plan.name}`
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Usage Stats */}
        {currentSub?.usage && (
          <div className="mb-12 p-6 rounded-lg border bg-card">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Your Usage
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Services</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        currentSub.usage.servicesUsed >= currentSub.usage.servicesLimit
                          ? "bg-red-500"
                          : "bg-primary"
                      }`}
                      style={{ width: `${Math.min(100, (currentSub.usage.servicesUsed / currentSub.usage.servicesLimit) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">
                    {currentSub.usage.servicesUsed}/{currentSub.usage.servicesLimit === 999 ? "∞" : currentSub.usage.servicesLimit}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">What happens when I upgrade?</h3>
              <p className="text-sm text-muted-foreground">
                Your new plan takes effect immediately. You'll be charged the prorated amount for the remainder of your billing cycle. All new features are available right away.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-sm text-muted-foreground">
                Yes, you can cancel your subscription at any time. Your plan will remain active until the end of your current billing period, then you'll be moved to the Free tier.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">How does annual billing work?</h3>
              <p className="text-sm text-muted-foreground">
                When you choose annual billing, you pay for 12 months upfront at a discount. Professional saves 16% ($10.08/mo billed annually at $120.96/year instead of $12/mo). Business saves 20% ($16.00/mo billed annually at $192.00/year instead of $20/mo).
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What happens when I downgrade?</h3>
              <p className="text-sm text-muted-foreground">
                When you downgrade, your current plan remains active until the end of your billing period. After that, you'll be moved to the lower tier. You won't be charged again for the higher plan.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What's the 1% transaction fee?</h3>
              <p className="text-sm text-muted-foreground">
                All plans include a 1% platform fee on each booking transaction. This covers payment processing infrastructure and platform maintenance. The fee is automatically deducted when your client pays.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Do I need a paid plan to accept payments?</h3>
              <p className="text-sm text-muted-foreground">
                No! All providers can accept payments through Stripe Connect on any plan, including Free. Paid plans unlock additional features like more service listings, photos, and priority placement.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Can I test with a demo payment?</h3>
              <p className="text-sm text-muted-foreground">
                Yes! Use the test card number 4242 4242 4242 4242 with any future expiry date and any CVC to simulate a payment.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Downgrade Confirmation Dialog */}
      <Dialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Downgrade
            </DialogTitle>
            <DialogDescription className="text-left space-y-3 pt-2">
              <p>
                You're about to downgrade from <strong>{currentTier === "premium" ? "Business" : "Professional"}</strong> to{" "}
                <strong>{downgradeTarget === "free" ? "Starter (Free)" : "Professional"}</strong>.
              </p>
              <p>
                This change takes effect <strong>immediately</strong>. You'll receive a prorated credit for the unused time on your current plan.
              </p>
              {downgradeTarget === "free" && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">You'll lose access to:</p>
                  <ul className="text-amber-700 dark:text-amber-300 space-y-1 text-xs">
                    <li>• Priority search placement</li>
                    <li>• Extra service listings (limited to 3)</li>
                    <li>• Additional photo uploads (limited to 1 per service)</li>
                    <li>• Analytics dashboard</li>
                    {currentTier === "premium" && <li>• Custom branding & featured badge</li>}
                  </ul>
                </div>
              )}
              {downgradeTarget === "basic" && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">You'll lose access to:</p>
                  <ul className="text-amber-700 dark:text-amber-300 space-y-1 text-xs">
                    <li>• Unlimited services (limited to 10)</li>
                    <li>• Custom branding & featured badge</li>
                    <li>• Priority support</li>
                    <li>• 5 photos per service (limited to 3)</li>
                  </ul>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDowngradeDialog(false);
                setDowngradeTarget(null);
              }}
              disabled={downgrade.isPending}
            >
              Keep Current Plan
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (downgradeTarget) {
                  downgrade.mutate({ targetTier: downgradeTarget });
                }
              }}
              disabled={downgrade.isPending}
            >
              {downgrade.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Downgrading...</>
              ) : (
                "Confirm Downgrade"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
