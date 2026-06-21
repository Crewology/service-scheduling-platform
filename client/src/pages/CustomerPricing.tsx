import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { NavHeader } from "@/components/shared/NavHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Heart, Crown, Zap, Check, X,
  FolderHeart, BarChart3, Headphones, Send,
  Star, Shield, Loader2, AlertTriangle,
  Briefcase, Users, Layers, Camera, Search,
  MessageSquare, Bell, Palette, TrendingUp,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── PROVIDER PLANS ────────────────────────────────────────────────────────────

const providerPlans = [
  {
    tier: "free" as const,
    name: "Starter",
    monthlyPrice: 0,
    yearlyPrice: 0,
    icon: Star,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    borderColor: "border-border",
    description: "Get started and list your services — no cost, no commitment.",
    highlights: [
      { text: "1 service category", icon: Layers },
      { text: "Up to 3 services", icon: Briefcase },
      { text: "1 photo per service", icon: Camera },
    ],
    features: [
      { text: "Basic public profile", included: true },
      { text: "Standard search placement", included: true },
      { text: "Booking management", included: true },
      { text: "Customer messaging", included: true },
      { text: "1% transaction fee", included: true },
      { text: "Priority search placement", included: false },
      { text: "Analytics dashboard", included: false },
      { text: "Custom branding", included: false },
      { text: "Featured listing badge", included: false },
      { text: "Priority support", included: false },
    ],
  },
  {
    tier: "basic" as const,
    name: "Pro",
    monthlyPrice: 12,
    yearlyPrice: 10.08,
    icon: Zap,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    popular: true,
    description: "For providers offering multiple service categories — grow your reach.",
    highlights: [
      { text: "Up to 5 categories", icon: Layers },
      { text: "Up to 10 services", icon: Briefcase },
      { text: "3 photos per service", icon: Camera },
    ],
    features: [
      { text: "Enhanced public profile", included: true },
      { text: "Custom profile URL slug", included: true },
      { text: "Priority search placement", included: true },
      { text: "Business analytics", included: true },
      { text: "1% transaction fee", included: true },
      { text: "Email support", included: true },
      { text: "Booking management", included: true },
      { text: "Customer messaging", included: true },
      { text: "Custom branding", included: false },
      { text: "Featured listing badge", included: false },
    ],
  },
  {
    tier: "premium" as const,
    name: "Business",
    monthlyPrice: 20,
    yearlyPrice: 16.00,
    icon: Crown,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    description: "Unlimited everything for established businesses and full-service pros.",
    highlights: [
      { text: "Unlimited categories", icon: Layers },
      { text: "Unlimited services", icon: Briefcase },
      { text: "5 photos per service", icon: Camera },
    ],
    features: [
      { text: "Premium public profile", included: true },
      { text: "Custom branding & colors", included: true },
      { text: "Featured listing badge", included: true },
      { text: "Top search placement", included: true },
      { text: "Full analytics suite", included: true },
      { text: "1% transaction fee", included: true },
      { text: "Priority support", included: true },
      { text: "Email notifications", included: true },
      { text: "Early access to new features", included: true },
      { text: "Custom profile URL slug", included: true },
    ],
  },
];

// ─── CUSTOMER PLANS ────────────────────────────────────────────────────────────

const customerPlans = [
  {
    tier: "free" as const,
    name: "Free",
    monthlyPrice: 0,
    yearlyPrice: 0,
    icon: Heart,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    borderColor: "border-border",
    description: "Perfect for individuals booking personal services occasionally.",
    highlights: [
      { text: "Save up to 5 providers", icon: Heart },
      { text: "Book any service", icon: Briefcase },
      { text: "Message providers", icon: MessageSquare },
    ],
    features: [
      { text: "Browse all providers & services", included: true },
      { text: "Book and pay securely", included: true },
      { text: "Message your providers", included: true },
      { text: "Booking notifications", included: true },
      { text: "Priority booking requests", included: false },
      { text: "Provider folders", included: false },
      { text: "Bulk quote requests", included: false },
      { text: "Booking analytics", included: false },
      { text: "Dedicated support", included: false },
    ],
  },
  {
    tier: "pro" as const,
    name: "Pro",
    monthlyPrice: 12,
    yearlyPrice: 10.08,
    icon: Zap,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    popular: true,
    description: "For frequent bookers and small event planners managing multiple providers.",
    highlights: [
      { text: "Save up to 50 providers", icon: Heart },
      { text: "Priority booking", icon: Star },
      { text: "Organize into folders", icon: FolderHeart },
    ],
    features: [
      { text: "Everything in Free", included: true },
      { text: "Priority booking requests", included: true },
      { text: "Organize providers into folders", included: true },
      { text: "Up to 5 bulk quote requests", included: true },
      { text: "Email support", included: true },
      { text: "Booking analytics", included: false },
      { text: "Spend reports", included: false },
      { text: "Dedicated support", included: false },
    ],
  },
  {
    tier: "business" as const,
    name: "Business",
    monthlyPrice: 20,
    yearlyPrice: 16.00,
    icon: Crown,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    description: "For logistics managers, agencies, and production companies booking large crews.",
    highlights: [
      { text: "Unlimited saved providers", icon: Heart },
      { text: "Bulk quote requests", icon: Send },
      { text: "Booking analytics", icon: BarChart3 },
    ],
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Unlimited saved providers", included: true },
      { text: "Unlimited bulk quote requests", included: true },
      { text: "Booking analytics & spend reports", included: true },
      { text: "Dedicated support", included: true },
    ],
  },
];

// ─── COMPONENT ─────────────────────────────────────────────────────────────────

export default function CustomerPricing() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [audience, setAudience] = useState<"provider" | "customer">("provider");
  const [yearly, setYearly] = useState(false);

  // Customer subscription state
  const { data: customerSubInfo } = trpc.customerSubscription.getSubscription.useQuery(undefined, {
    enabled: !!user,
  });

  const customerCreateCheckout = trpc.customerSubscription.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err) => toast.error(err.message),
  });

  const customerCreatePortal = trpc.customerSubscription.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err) => toast.error(err.message),
  });

  const [downgradeTarget, setDowngradeTarget] = useState<string | null>(null);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);

  const customerDowngrade = trpc.customerSubscription.downgrade.useMutation({
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

  // Provider subscription state
  const { data: providerSubInfo } = trpc.subscription.mySubscription.useQuery(undefined, {
    enabled: !!user,
  });

  const providerCreateCheckout = trpc.subscription.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err) => toast.error(err.message),
  });

  const providerCreatePortal = trpc.subscription.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
    },
    onError: (err) => toast.error(err.message),
  });

  const providerDowngrade = trpc.subscription.downgrade.useMutation({
    onSuccess: () => {
      toast.success("Plan downgraded successfully");
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

  const customerCurrentTier = customerSubInfo?.currentTier || "free";
  const providerCurrentTier = providerSubInfo?.currentTier || "free";

  const isProvider = !!providerSubInfo || user?.role === "provider";

  return (
    <div className="min-h-screen bg-background">
      <NavHeader />
      <div className="container py-12 max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-3">Plans That Grow With You</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Whether you're providing services or booking them — choose the plan that fits your needs.
          </p>
        </div>

        {/* Audience Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center bg-muted rounded-lg p-1 gap-1">
            <button
              onClick={() => setAudience("provider")}
              className={`px-5 py-2.5 rounded-md text-sm font-medium transition-all ${
                audience === "provider"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Briefcase className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
              I Provide Services
            </button>
            <button
              onClick={() => setAudience("customer")}
              className={`px-5 py-2.5 rounded-md text-sm font-medium transition-all ${
                audience === "customer"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="h-4 w-4 inline-block mr-1.5 -mt-0.5" />
              I Book Services
            </button>
          </div>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <button
            onClick={() => setYearly(false)}
            className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
              !yearly ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
              yearly ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Yearly
          </button>
          {yearly && (
            <Badge variant="secondary" className="text-green-600 bg-green-500/10 border-green-500/20">
              Save up to 20%
            </Badge>
          )}
        </div>

        {/* ─── PROVIDER PLANS ─────────────────────────────────────────────── */}
        {audience === "provider" && (
          <>
            <div className="text-center mb-8">
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                Grow your business on OlogyCrew. All plans include booking management, customer messaging, and secure payments with just a 1% transaction fee.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 mb-16">
              {providerPlans.map((plan) => {
                const isCurrent = providerCurrentTier === plan.tier && isProvider;
                const isDowngrade = isProvider && (
                  (providerCurrentTier === "premium" && plan.tier !== "premium") ||
                  (providerCurrentTier === "basic" && plan.tier === "free")
                );
                const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;

                return (
                  <Card
                    key={plan.tier}
                    className={`relative flex flex-col overflow-visible ${
                      plan.popular ? `${plan.borderColor} border-2 shadow-lg` : ""
                    } ${isCurrent ? "ring-2 ring-primary" : ""}`}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-blue-500 text-white border-0 px-4 py-1 shadow-sm">
                        Most Popular
                      </Badge>
                    )}
                    {isCurrent && (
                      <Badge className={`absolute ${plan.popular ? "top-4" : "-top-3"} left-1/2 -translate-x-1/2 z-10 bg-green-600 text-white border-0 px-3 py-1 shadow-sm whitespace-nowrap`}>
                        Current Plan
                      </Badge>
                    )}

                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-2 rounded-lg ${plan.bgColor}`}>
                          <plan.icon className={`h-5 w-5 ${plan.color}`} />
                        </div>
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col">
                      {/* Price */}
                      <div className="mb-5">
                        {price === 0 ? (
                          <div className="text-3xl font-bold">Free</div>
                        ) : (
                          <div>
                            <span className="text-3xl font-bold">${price.toFixed(2)}</span>
                            <span className="text-muted-foreground">/mo</span>
                            {yearly && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Billed ${(price * 12).toFixed(2)}/year
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Key highlights */}
                      <div className="rounded-lg border p-3 mb-5 space-y-2">
                        {plan.highlights.map((h, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <h.icon className={`h-4 w-4 shrink-0 ${plan.color}`} />
                            <span className="font-medium">{h.text}</span>
                          </div>
                        ))}
                      </div>

                      {/* Feature list */}
                      <ul className="space-y-2 mb-6 flex-1">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2.5 text-sm">
                            {feature.included ? (
                              <Check className={`h-4 w-4 shrink-0 ${plan.color}`} />
                            ) : (
                              <X className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                            )}
                            <span className={feature.included ? "" : "text-muted-foreground/60"}>
                              {feature.text}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      {plan.tier === "free" ? (
                        isCurrent ? (
                          <Button variant="outline" disabled className="w-full">
                            Current Plan
                          </Button>
                        ) : isDowngrade ? (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              setDowngradeTarget("free");
                              setShowDowngradeDialog(true);
                            }}
                            disabled={providerDowngrade.isPending}
                          >
                            Downgrade
                          </Button>
                        ) : (
                          <Button variant="outline" className="w-full" onClick={() => navigate("/provider/onboarding")}>
                            Get Started Free
                          </Button>
                        )
                      ) : isCurrent ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => providerCreatePortal.mutate()}
                          disabled={providerCreatePortal.isPending}
                        >
                          {providerCreatePortal.isPending ? "Loading..." : "Manage Subscription"}
                        </Button>
                      ) : isDowngrade ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setDowngradeTarget(plan.tier);
                            setShowDowngradeDialog(true);
                          }}
                          disabled={providerDowngrade.isPending}
                        >
                          Downgrade
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          variant={plan.popular ? "default" : "outline"}
                          onClick={() => {
                            if (!user) {
                              toast.info("Please sign in first to subscribe.");
                              return;
                            }
                            providerCreateCheckout.mutate({
                              tier: plan.tier as "basic" | "premium",
                              interval: yearly ? "year" : "month",
                            });
                          }}
                          disabled={providerCreateCheckout.isPending}
                        >
                          {providerCreateCheckout.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          {providerCreateCheckout.isPending ? "Loading..." : `Select ${plan.name}`}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* ─── CUSTOMER PLANS ─────────────────────────────────────────────── */}
        {audience === "customer" && (
          <>
            <div className="text-center mb-8">
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                Booking services on OlogyCrew is always free. Upgrade for priority access, organization tools, and analytics when you're managing multiple providers or large crews.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 mb-16">
              {customerPlans.map((plan) => {
                const isCurrent = customerCurrentTier === plan.tier;
                const isDowngrade = (customerCurrentTier === "business" && plan.tier !== "business") ||
                  (customerCurrentTier === "pro" && plan.tier === "free");
                const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;

                return (
                  <Card
                    key={plan.tier}
                    className={`relative flex flex-col overflow-visible ${
                      plan.popular ? `${plan.borderColor} border-2 shadow-lg` : ""
                    } ${isCurrent ? "ring-2 ring-primary" : ""}`}
                  >
                    {plan.popular && (
                      <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 bg-blue-500 text-white border-0 px-4 py-1 shadow-sm">
                        Most Popular
                      </Badge>
                    )}
                    {isCurrent && user && (
                      <Badge className={`absolute ${plan.popular ? "top-4" : "-top-3"} left-1/2 -translate-x-1/2 z-10 bg-green-600 text-white border-0 px-3 py-1 shadow-sm whitespace-nowrap`}>
                        Current Plan
                      </Badge>
                    )}

                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-2 rounded-lg ${plan.bgColor}`}>
                          <plan.icon className={`h-5 w-5 ${plan.color}`} />
                        </div>
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col">
                      {/* Price */}
                      <div className="mb-5">
                        {price === 0 ? (
                          <div className="text-3xl font-bold">Free</div>
                        ) : (
                          <div>
                            <span className="text-3xl font-bold">${price.toFixed(2)}</span>
                            <span className="text-muted-foreground">/mo</span>
                            {yearly && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Billed ${(price * 12).toFixed(2)}/year
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Key highlights */}
                      <div className="rounded-lg border p-3 mb-5 space-y-2">
                        {plan.highlights.map((h, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <h.icon className={`h-4 w-4 shrink-0 ${plan.color}`} />
                            <span className="font-medium">{h.text}</span>
                          </div>
                        ))}
                      </div>

                      {/* Feature list */}
                      <ul className="space-y-2 mb-6 flex-1">
                        {plan.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2.5 text-sm">
                            {feature.included ? (
                              <Check className={`h-4 w-4 shrink-0 ${plan.color}`} />
                            ) : (
                              <X className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                            )}
                            <span className={feature.included ? "" : "text-muted-foreground/60"}>
                              {feature.text}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      {plan.tier === "free" ? (
                        isCurrent ? (
                          <Button variant="outline" disabled className="w-full">
                            Current Plan
                          </Button>
                        ) : isDowngrade ? (
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => {
                              setDowngradeTarget("free");
                              setShowDowngradeDialog(true);
                            }}
                            disabled={customerDowngrade.isPending}
                          >
                            Downgrade
                          </Button>
                        ) : (
                          <Button variant="outline" className="w-full" onClick={() => navigate("/browse")}>
                            Start Booking Free
                          </Button>
                        )
                      ) : isCurrent ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => customerCreatePortal.mutate()}
                          disabled={customerCreatePortal.isPending}
                        >
                          {customerCreatePortal.isPending ? "Loading..." : "Manage Subscription"}
                        </Button>
                      ) : isDowngrade ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setDowngradeTarget(plan.tier);
                            setShowDowngradeDialog(true);
                          }}
                          disabled={customerDowngrade.isPending}
                        >
                          Downgrade
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          variant={plan.popular ? "default" : "outline"}
                          onClick={() => {
                            if (!user) {
                              toast.info("Please sign in first to subscribe.");
                              return;
                            }
                            customerCreateCheckout.mutate({
                              tier: plan.tier as "pro" | "business",
                              interval: yearly ? "year" : "month",
                            });
                          }}
                          disabled={customerCreateCheckout.isPending}
                        >
                          {customerCreateCheckout.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          {customerCreateCheckout.isPending ? "Loading..." : `Select ${plan.name}`}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* ─── FAQ ────────────────────────────────────────────────────────── */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {audience === "provider" ? (
              <>
                {[
                  {
                    q: "What counts as a service category?",
                    a: "A category is a type of service you offer (e.g., Barber, Mobile Auto Detailing, Photography). Each category can have multiple individual services listed under it.",
                  },
                  {
                    q: "Can I accept payments on the free plan?",
                    a: "Yes! All providers can accept payments through Stripe Connect on any plan, including Starter. Paid plans unlock additional features like more categories, photos, and priority placement.",
                  },
                  {
                    q: "What is the 1% transaction fee?",
                    a: "OlogyCrew takes a small 1% fee on each booking transaction to maintain the platform. This applies to all plans equally — no hidden fees.",
                  },
                  {
                    q: "Can I cancel or downgrade anytime?",
                    a: "Yes! You can cancel or downgrade at any time. Your plan remains active until the end of your billing period, then you'll move to the lower tier.",
                  },
                  {
                    q: "Is there a free trial for Pro?",
                    a: "Yes — new providers get a 14-day free trial of the Pro plan to experience priority placement, analytics, and multi-category listings before committing.",
                  },
                ].map((faq, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-1">{faq.q}</h3>
                      <p className="text-sm text-muted-foreground">{faq.a}</p>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : (
              <>
                {[
                  {
                    q: "Is booking really free?",
                    a: "Yes! Browsing providers, booking services, messaging, and paying securely is completely free. You only pay for the services you book — no platform fees for customers.",
                  },
                  {
                    q: "Who needs the Pro or Business plan?",
                    a: "If you book multiple providers regularly, manage events, or coordinate large crews (like a logistics manager with 100+ techs), the paid plans give you organization tools, priority access, and analytics.",
                  },
                  {
                    q: "What are saved providers?",
                    a: "Save your favorite providers for quick, easy rebooking. Free users can save up to 5, Pro gets 50, and Business gets unlimited.",
                  },
                  {
                    q: "Can I cancel anytime?",
                    a: "Yes! Cancel or downgrade at any time. Your plan stays active until the end of your billing period.",
                  },
                  {
                    q: "What payment methods do you accept?",
                    a: "We accept all major credit and debit cards through Stripe's secure payment processing.",
                  },
                ].map((faq, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-1">{faq.q}</h3>
                      <p className="text-sm text-muted-foreground">{faq.a}</p>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        </div>


      </div>

      {/* ─── DOWNGRADE DIALOG ───────────────────────────────────────────── */}
      <Dialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Downgrade
            </DialogTitle>
            <DialogDescription className="text-left space-y-3 pt-2">
              <p>
                Are you sure you want to downgrade? This change takes effect <strong>immediately</strong>.
                You'll receive a prorated credit for the unused time on your current plan.
              </p>
              {audience === "provider" && downgradeTarget === "free" && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">You'll lose access to:</p>
                  <ul className="text-amber-700 dark:text-amber-300 space-y-1 text-xs">
                    <li>• Extra service categories (limited to 1)</li>
                    <li>• Extra services (limited to 3)</li>
                    <li>• Priority search placement</li>
                    <li>• Analytics dashboard</li>
                  </ul>
                </div>
              )}
              {audience === "customer" && downgradeTarget === "free" && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">You'll lose access to:</p>
                  <ul className="text-amber-700 dark:text-amber-300 space-y-1 text-xs">
                    <li>• Priority booking requests</li>
                    <li>• Extra saved providers (limited to 5)</li>
                    <li>• Provider folders</li>
                    <li>• Bulk quote requests</li>
                  </ul>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDowngradeDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (audience === "provider") {
                  providerDowngrade.mutate({ targetTier: downgradeTarget as "free" | "basic" });
                } else {
                  customerDowngrade.mutate({ targetTier: downgradeTarget as "free" | "pro" });
                }
              }}
              disabled={providerDowngrade.isPending || customerDowngrade.isPending}
            >
              {(providerDowngrade.isPending || customerDowngrade.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirm Downgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
